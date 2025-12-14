"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme-context';
import '../account/account.css';
import './community.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, Users, LogOut, Moon, Sun, User, BarChart3, BookOpen, Newspaper, Edit, Trash2, Send } from 'lucide-react';
import { MobileNav } from '@/components/ui/mobile-nav';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Channel {
  id: string;
  name: string;
  description: string;
  icon: string;
  created_at: string;
}

interface Post {
  id: string;
  user_id: string;
  channel_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
  image_path?: string;
  author_email?: string;
  author_username?: string;
  author?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  comments_count?: number;
}

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
  image_path?: string;
  author_email?: string;
  author_username?: string;
  author_full_name?: string;
  author?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface UserProfile {
  username: string;
  full_name: string;
  id: string;
  avatar_url?: string;
}

export default function CommunityPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, isLoaded } = useTheme();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isViewingPost, setIsViewingPost] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    channel_id: '',
    image: null as File | null
  });

  const [newComment, setNewComment] = useState({
    content: '',
    image: null as File | null
  });

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return (
      <div className="loading-container theme-dark">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (userProfile) {
      loadChannels();
    }
  }, [userProfile]);

  useEffect(() => {
    if (selectedChannel) {
      loadPosts(selectedChannel);
      setNewPost(prev => ({ ...prev, channel_id: selectedChannel }));
    }
  }, [selectedChannel]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Ensure current user has a profile (create if missing)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        console.log('Current user has no profile, creating one...');
        const username = user.email?.split('@')[0] || `user_${user.id.substring(0, 8)}`;
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: username,
            phone_number: '',
            username: username,
            email: user.email || '',
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          setError('Error creating user profile');
          setLoading(false);
          return;
        }

        setUserProfile({
          id: user.id,
          username: username,
          full_name: username
        });
      } else {
        setUserProfile(existingProfile);
      }
      setLoading(false);
    } catch (err) {
      setError('An error occurred');
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading channels:', error);
        return;
      }

      setChannels(data || []);
      if (data && data.length > 0) {
        setSelectedChannel(data[0].id);
      }
    } catch (err) {
      console.error('Error loading channels:', err);
    }
  };

  const loadPosts = async (channelId: string) => {
    try {
      console.log('=== LOADING POSTS DEBUG ===');
      console.log('Channel ID:', channelId);
      console.log('User profile:', userProfile);

      // Get posts with author profiles
      const { data: allPosts, error: postsError } = await supabase
        .from('posts')
        .select('*, author_email, author_username')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });

      // Fetch avatar URLs for all post authors
      if (allPosts && allPosts.length > 0) {
        const userIds = [...new Set(allPosts.map(post => post.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds);

        // Map profiles to posts
        allPosts.forEach(post => {
          const profile = profiles?.find(p => p.id === post.user_id);
          if (profile) {
            post.author_avatar_url = profile.avatar_url;
          }
        });
      }

      if (postsError) {
        console.error('Error loading posts:', postsError);
        setError(`Database error: ${postsError.message}`);
        return;
      }

      console.log('All posts loaded:', allPosts?.length || 0);
      
      // Use author info directly from posts table (no need for complex queries)
      const postsWithAuthors = (allPosts || []).map(post => {
        console.log('Post author info:', {
          email: post.author_email,
          username: post.author_username,
          user_id: post.user_id
        });
        
        return {
          ...post,
          author: {
            username: post.author_username || `user_${post.user_id.substring(0, 8)}`,
            full_name: post.author_username || 'Unknown User',
            avatar_url: (post as any).author_avatar_url
          }
        };
      });
      
      console.log('Posts with author info:', postsWithAuthors);

      // Get comment counts for each post
      const postsWithCounts = await Promise.all(
        postsWithAuthors.map(async (post) => {
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          // Try to get full name from profiles first
          let displayName = post.author_email || 'Unknown User';
          
          // If we have author_username, try to get the full name from profiles
          if (post.author_username) {
            // We'll fetch the profile to get the full_name
            // For now, use username as display name (better than email)
            displayName = post.author_username;
          }
          
          return {
            ...post,
            comments_count: count || 0,
            author: {
              username: post.author?.username || `user_${post.user_id.substring(0, 8)}`,
              full_name: displayName,
              avatar_url: post.author?.avatar_url
            }
          };
        })
      );

      console.log('Final posts with counts:', postsWithCounts);
      setPosts(postsWithCounts);
    } catch (err) {
      console.error('Error loading posts:', err);
    }
  };

  const loadComments = async (postId: string) => {
    try {
      // Get comments
      const { data, error } = await supabase
        .from('comments')
        .select('*, author_email, author_username, author_full_name, image_url, image_path')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading comments:', error);
        return;
      }

      // Fetch avatar URLs for all comment authors
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(comment => comment.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds);

        // Use author info directly from comments table
        const commentsWithAuthors = data.map(comment => {
          const profile = profiles?.find(p => p.id === comment.user_id);
          return {
            ...comment,
            author: {
              username: comment.author_username || `user_${comment.user_id.substring(0, 8)}`,
              full_name: comment.author_full_name || comment.author_username || 'Unknown User',
              avatar_url: profile?.avatar_url
            }
          };
        });

        setComments(commentsWithAuthors);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('Creating post with data:', newPost);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      if (!newPost.channel_id || !newPost.title.trim() || !newPost.content.trim()) {
        setError('Please fill in all required fields');
        return;
      }

      console.log('Inserting post for user:', user.id, 'in channel:', newPost.channel_id);

      let imageUrl = null;
      let imagePath = null;

      // Upload image if provided
      if (newPost.image) {
        const fileExt = newPost.image.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, newPost.image);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          setError('Error uploading image');
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
        imagePath = fileName;
      }
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          channel_id: newPost.channel_id,
          title: newPost.title.trim(),
          content: newPost.content.trim(),
          image_url: imageUrl,
          image_path: imagePath,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating post:', error);
        setError('Error creating post');
        return;
      }

      console.log('Post created successfully:', data);

      setNewPost({ title: '', content: '', channel_id: selectedChannel, image: null });
      setIsCreatingPost(false);
      // Reload posts for the current channel
      loadPosts(selectedChannel);
    } catch (err) {
      setError('An error occurred while creating the post');
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.content.trim() || !selectedPost) return;

    console.log('Creating comment:', newComment.content, 'on post:', selectedPost.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      let imageUrl = null;
      let imagePath = null;

      // Upload image if provided
      if (newComment.image) {
        const fileExt = newComment.image.name.split('.').pop();
        const fileName = `comments/${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, newComment.image);

        if (uploadError) {
          console.error('Error uploading comment image:', uploadError);
          setError('Error uploading image');
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
        imagePath = fileName;
      }

      const { error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          post_id: selectedPost.id,
          content: newComment.content.trim(),
          image_url: imageUrl,
          image_path: imagePath,
        });

      if (error) {
        setError('Error creating comment');
        return;
      }

      console.log('Comment created successfully');
      setNewComment({ content: '', image: null });
      loadComments(selectedPost.id);
      loadPosts(selectedChannel); // Refresh to update comment counts
    } catch (err) {
      setError('An error occurred while creating the comment');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user?.id); // Only delete own posts

      if (error) {
        setError('Error deleting post');
        return;
      }

      loadPosts(selectedChannel);
      if (selectedPost?.id === postId) {
        setIsViewingPost(false);
        setSelectedPost(null);
      }
    } catch (err) {
      setError('An error occurred while deleting the post');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user?.id); // Only delete own comments

      if (error) {
        setError('Error deleting comment');
        return;
      }

      if (selectedPost) {
        loadComments(selectedPost.id);
        loadPosts(selectedChannel); // Refresh to update comment counts
      }
    } catch (err) {
      setError('An error occurred while deleting the comment');
    }
  };

  const handleViewPost = (post: Post) => {
    setSelectedPost(post);
    setIsViewingPost(true);
    loadComments(post.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`loading-container ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading community...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className={`loading-container ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="text-center">
          <p className="error-text">Error loading profile</p>
          <Button onClick={() => router.push('/auth/login')} className="btn-primary mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`account-page ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      {/* Top Navigation */}
      <nav className="nav-bar">
        <div className="nav-container">
          <div className="nav-content">
            {/* Logo */}
            <div className="nav-logo">
              <h1>TradeQuest</h1>
            </div>

            {/* Navigation Tabs */}
            <div className="nav-tabs">
              <button
                onClick={() => router.push('/dashboard')}
                className="nav-tab"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => router.push('/journal')}
                className="nav-tab"
              >
                <BookOpen className="w-4 h-4" />
                Journal
              </button>
              <button
                onClick={() => router.push('/news')}
                className="nav-tab"
              >
                <Newspaper className="w-4 h-4" />
                News
              </button>
              <button className="nav-tab active">
                <Users className="w-4 h-4" />
                Community
              </button>
              <button
                onClick={() => router.push('/teams')}
                className="nav-tab"
              >
                <Users className="w-4 h-4" />
                Teams
              </button>
              <button
                onClick={() => router.push('/account')}
                className="nav-tab"
              >
                <User className="w-4 h-4" />
                Account
              </button>
            </div>

            {/* Right side */}
            <div className="nav-actions">
              <span className="nav-username">{userProfile.username}</span>
              <button onClick={handleLogout} className="btn-logout">
                <LogOut className="w-4 h-4" />
                Logout
              </button>

              {/* Mobile Navigation */}
              <MobileNav
                logo={<h1 style={{ color: 'var(--accent-primary)', fontSize: '1.25rem', fontWeight: 'bold' }}>TradeQuest</h1>}
                actions={
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{userProfile.username}</span>
                    </div>
                    <button onClick={handleLogout} className="btn-logout" style={{ width: '100%', justifyContent: 'center' }}>
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                }
              >
                <div className="mobile-nav-items">
                  <button onClick={() => router.push('/dashboard')} className="mobile-nav-item">
                    <BarChart3 />
                    Dashboard
                  </button>
                  <button onClick={() => router.push('/journal')} className="mobile-nav-item">
                    <BookOpen />
                    Journal
                  </button>
                  <button onClick={() => router.push('/news')} className="mobile-nav-item">
                    <Newspaper />
                    News
                  </button>
                  <button className="mobile-nav-item active">
                    <Users />
                    Community
                  </button>
                  <button onClick={() => router.push('/teams')} className="mobile-nav-item">
                    <Users />
                    Teams
                  </button>
                  <button onClick={() => router.push('/account')} className="mobile-nav-item">
                    <User />
                    Account
                  </button>
                </div>
              </MobileNav>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Community Header */}
        <div className="community-header">
          <div>
            <h1 className="community-title">Trading Community</h1>
            <p className="community-subtitle">Connect, share, and learn with fellow traders</p>
          </div>
          
          <div className="community-actions">
            <Dialog open={isCreatingPost} onOpenChange={setIsCreatingPost}>
              <DialogTrigger asChild>
                <button className="btn-primary">
                  <Plus className="w-4 h-4" />
                  New Post
                </button>
              </DialogTrigger>
              <DialogContent className="post-dialog">
                <DialogHeader>
                  <DialogTitle>Create New Post</DialogTitle>
                  <DialogDescription>
                    Share your thoughts with the community
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePost} className="post-form">
                  <div className="form-group">
                    <Label htmlFor="postTitle" className="form-label">Title</Label>
                    <Input
                      id="postTitle"
                      type="text"
                      placeholder="Enter post title"
                      value={newPost.title}
                      onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                      className="form-input"
                      maxLength={200}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <Label htmlFor="postContent" className="form-label">Content</Label>
                    <Textarea
                      id="postContent"
                      placeholder="Share your thoughts..."
                      value={newPost.content}
                      onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                      className="form-textarea"
                      maxLength={2000}
                      rows={6}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <Label htmlFor="postImage" className="form-label">Image (Optional)</Label>
                    <Input
                      id="postImage"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewPost({...newPost, image: e.target.files?.[0] || null})}
                      className="form-input"
                    />
                    {newPost.image && (
                      <p className="text-sm text-gray-500 mt-1">
                        Selected: {newPost.image.name}
                      </p>
                    )}
                  </div>

                  <div className="form-actions">
                    <Button type="submit" className="btn-primary-form">
                      Create Post
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsCreatingPost(false)}
                      className="btn-outline-form"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Channel Tabs */}
        <div className="channel-tabs">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={`channel-tab ${selectedChannel === channel.id ? 'active' : ''}`}
            >
              <span className="channel-icon">{channel.icon}</span>
              <div className="channel-info">
                <span className="channel-name">{channel.name}</span>
                <span className="channel-description">{channel.description}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Posts Section */}
        <div className="posts-section">
          {posts.length === 0 ? (
            <div className="empty-state">
              <MessageSquare className="empty-icon" />
              <p>No posts yet in this channel</p>
              <p className="empty-subtitle">Be the first to start a discussion!</p>
              <button onClick={() => setIsCreatingPost(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                Create First Post
              </button>
            </div>
          ) : (
            <div className="posts-list">
              {posts.map((post) => (
                <Card key={post.id} className="post-card">
                  <CardHeader className="post-header">
                    <div className="post-meta">
                      <div className="author-avatar-container">
                        {post.author?.avatar_url ? (
                          <img src={post.author.avatar_url} alt="Avatar" className="author-avatar" />
                        ) : (
                          <div className="author-avatar-placeholder">
                            {(post.author?.full_name || 'U')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="author-info">
                        <span className="author-name">{post.author?.full_name || 'Unknown User'}</span>
                        <span className="author-username">@{post.author?.username || 'unknown'}</span>
                      </div>
                      {/* Only show delete button to post owner */}
                      {post.user_id === userProfile?.id && (
                        <div className="post-actions">
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="btn-delete"
                            title="Delete post"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <CardTitle className="post-title">
                      <button 
                        onClick={() => handleViewPost(post)}
                        className="post-title-link"
                      >
                        {post.title}
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="post-content">
                    <p className="post-preview">
                      {post.content.length > 200 
                        ? `${post.content.substring(0, 200)}...` 
                        : post.content
                      }
                    </p>
                    {post.image_url && (
                      <div className="post-image-preview">
                        <img 
                          src={post.image_url} 
                          alt="Post image" 
                          className="post-image"
                          style={{ 
                            maxWidth: '100%', 
                            height: 'auto', 
                            borderRadius: '8px', 
                            marginTop: '12px',
                            cursor: 'pointer'
                          }}
                          onClick={() => setLightboxImage(post.image_url!)}
                        />
                      </div>
                    )}
                    <div className="post-footer">
                      <span className="post-date">{formatDate(post.created_at)}</span>
                      <div className="post-stats">
                        <span className="comment-count">
                          <MessageSquare className="w-4 h-4" />
                          {post.comments_count || 0} comments
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Post Detail Dialog */}
        <Dialog open={isViewingPost} onOpenChange={setIsViewingPost}>
          <DialogContent className="post-detail-dialog">
            {selectedPost && (
              <>
                <DialogHeader>
                  <DialogTitle className="post-detail-title">{selectedPost.title}</DialogTitle>
                  <div className="post-detail-meta">
                    <span className="author-name">{selectedPost.author?.full_name}</span>
                    <span className="post-date">{formatDate(selectedPost.created_at)}</span>
                  </div>
                </DialogHeader>
                
                <div className="post-detail-content">
                  <p>{selectedPost.content}</p>
                  {selectedPost.image_url && (
                    <div className="post-detail-image">
                      <img 
                        src={selectedPost.image_url} 
                        alt="Post image" 
                        style={{ 
                          maxWidth: '100%', 
                          height: 'auto', 
                          borderRadius: '8px', 
                          marginTop: '16px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          cursor: 'pointer'
                        }}
                        onClick={() => setLightboxImage(selectedPost.image_url!)}
                      />
                    </div>
                  )}
                </div>

                <div className="comments-section">
                  <h3 className="comments-title">Comments ({comments.length})</h3>
                  
                  <form onSubmit={handleCreateComment} className="comment-form">
                    <div className="comment-input-group">
                      <Textarea
                        placeholder="Write a comment..."
                        value={newComment.content}
                        onChange={(e) => setNewComment({...newComment, content: e.target.value})}
                        className="comment-input"
                        rows={3}
                      />
                      <div className="comment-form-actions">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setNewComment({...newComment, image: e.target.files?.[0] || null})}
                          className="comment-image-input"
                          style={{ fontSize: '0.75rem', padding: '0.5rem' }}
                        />
                        {newComment.image && (
                          <p className="text-xs text-gray-500">
                            📎 {newComment.image.name}
                          </p>
                        )}
                      </div>
                      <Button type="submit" className="comment-submit" disabled={!newComment.content.trim()}>
                        <Send className="w-4 h-4" />
                        Comment
                      </Button>
                    </div>
                  </form>

                  <div className="comments-list">
                    {comments.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-avatar-container">
                          {comment.author?.avatar_url ? (
                            <img src={comment.author.avatar_url} alt="Avatar" className="comment-avatar" />
                          ) : (
                            <div className="comment-avatar-placeholder">
                              {(comment.author?.full_name || 'U')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="comment-body">
                          <div className="comment-header">
                            <div className="comment-author">
                              <span className="author-name">{comment.author?.full_name}</span>
                              <span className="comment-date">{formatDate(comment.created_at)}</span>
                            </div>
                            {/* Only show delete button to comment owner */}
                            {comment.user_id === userProfile?.id && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="btn-delete-comment"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="comment-content">{comment.content}</p>
                          {comment.image_url && (
                            <div className="comment-image">
                              <img
                                src={comment.image_url}
                                alt="Comment image"
                                style={{
                                  maxWidth: '300px',
                                  height: 'auto',
                                  borderRadius: '8px',
                                  marginTop: '8px',
                                  cursor: 'pointer',
                                  border: '1px solid var(--border-color)'
                                }}
                                onClick={() => setLightboxImage(comment.image_url!)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Lightbox */}
        {lightboxImage && (
          <div 
            className="lightbox-overlay"
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              cursor: 'pointer'
            }}
          >
            <img 
              src={lightboxImage} 
              alt="Enlarged image" 
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxImage(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}