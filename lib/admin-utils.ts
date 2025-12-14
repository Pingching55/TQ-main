// Admin/Moderator utility functions for forum management

import { supabase } from './supabase';

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  assigned_by: string;
  assigned_at: string;
}

export interface ModerationLog {
  id: string;
  moderator_id: string;
  action_type: 'delete_post' | 'delete_comment' | 'restore_post' | 'restore_comment' | 'ban_user' | 'unban_user';
  target_type: 'post' | 'comment' | 'user';
  target_id: string;
  reason?: string;
  created_at: string;
}

// Check if current user has admin or moderator role
export const checkUserRole = async (): Promise<'admin' | 'moderator' | 'user' | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: roleData, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .order('role', { ascending: true }) // admin comes before moderator alphabetically
      .limit(1)
      .single();

    if (error || !roleData) {
      return 'user'; // Default role
    }

    return roleData.role;
  } catch (err) {
    console.error('Error checking user role:', err);
    return 'user';
  }
};

// Check if user is admin or moderator
export const isModerator = async (): Promise<boolean> => {
  const role = await checkUserRole();
  return role === 'admin' || role === 'moderator';
};

// Check if user is admin
export const isAdmin = async (): Promise<boolean> => {
  const role = await checkUserRole();
  return role === 'admin';
};

// Soft delete a post (moderator action)
export const moderatePost = async (
  postId: string, 
  reason: string, 
  action: 'delete' | 'restore' = 'delete'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is moderator
    const canModerate = await isModerator();
    if (!canModerate) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const { error } = await supabase
      .from('posts')
      .update({
        is_deleted: action === 'delete',
        deleted_by: action === 'delete' ? user.id : null,
        deleted_at: action === 'delete' ? new Date().toISOString() : null,
        moderation_reason: action === 'delete' ? reason : null,
      })
      .eq('id', postId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'An error occurred' };
  }
};

// Soft delete a comment (moderator action)
export const moderateComment = async (
  commentId: string, 
  reason: string, 
  action: 'delete' | 'restore' = 'delete'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is moderator
    const canModerate = await isModerator();
    if (!canModerate) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const { error } = await supabase
      .from('comments')
      .update({
        is_deleted: action === 'delete',
        deleted_by: action === 'delete' ? user.id : null,
        deleted_at: action === 'delete' ? new Date().toISOString() : null,
        moderation_reason: action === 'delete' ? reason : null,
      })
      .eq('id', commentId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'An error occurred' };
  }
};

// Assign role to user (admin only)
export const assignUserRole = async (
  userId: string, 
  role: 'admin' | 'moderator' | 'user'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if current user is admin
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return { success: false, error: 'Only admins can assign roles' };
    }

    // Remove existing roles for this user
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Add new role (unless it's 'user' which is default)
    if (role !== 'user') {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          assigned_by: user.id,
        });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'An error occurred' };
  }
};

// Get moderation logs (admin/moderator only)
export const getModerationLogs = async (limit: number = 50): Promise<ModerationLog[]> => {
  try {
    const canModerate = await isModerator();
    if (!canModerate) {
      return [];
    }

    const { data, error } = await supabase
      .from('moderation_logs')
      .select(`
        *,
        moderator:moderator_id (
          username,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error loading moderation logs:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error loading moderation logs:', err);
    return [];
  }
};

// Get all users with their roles (admin only)
export const getUsersWithRoles = async (): Promise<Array<{
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
}>> => {
  try {
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return [];
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        full_name,
        email,
        user_roles (
          role
        )
      `);

    if (error) {
      console.error('Error loading users:', error);
      return [];
    }

    return (data || []).map(user => ({
      ...user,
      role: user.user_roles?.[0]?.role || 'user'
    }));
  } catch (err) {
    console.error('Error loading users:', err);
    return [];
  }
};

// Bulk delete posts by user (admin only)
export const bulkDeleteUserPosts = async (
  userId: string, 
  reason: string
): Promise<{ success: boolean; error?: string; deletedCount?: number }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return { success: false, error: 'Only admins can bulk delete posts' };
    }

    // Get all posts by user
    const { data: userPosts, error: fetchError } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!userPosts || userPosts.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Soft delete all posts
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        is_deleted: true,
        deleted_by: user.id,
        deleted_at: new Date().toISOString(),
        moderation_reason: reason,
      })
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, deletedCount: userPosts.length };
  } catch (err) {
    return { success: false, error: 'An error occurred' };
  }
};