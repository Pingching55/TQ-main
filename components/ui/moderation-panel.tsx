"use client";

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Badge } from './badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Shield, Trash2, RotateCcw, UserX, UserCheck, AlertTriangle, Eye, Settings } from 'lucide-react';
import { 
  checkUserRole, 
  moderatePost, 
  moderateComment, 
  assignUserRole, 
  getModerationLogs, 
  getUsersWithRoles,
  bulkDeleteUserPosts,
  type ModerationLog 
} from '@/lib/admin-utils';

interface ModerationPanelProps {
  onModerationAction?: () => void;
}

export function ModerationPanel({ onModerationAction }: ModerationPanelProps) {
  const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [moderationLogs, setModerationLogs] = useState<ModerationLog[]>([]);
  const [users, setUsers] = useState<Array<any>>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [newRole, setNewRole] = useState<'admin' | 'moderator' | 'user'>('user');
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const role = await checkUserRole();
      setUserRole(role);
      
      if (role === 'admin' || role === 'moderator') {
        loadModerationLogs();
        if (role === 'admin') {
          loadUsers();
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error checking permissions:', err);
      setLoading(false);
    }
  };

  const loadModerationLogs = async () => {
    try {
      const logs = await getModerationLogs(100);
      setModerationLogs(logs);
    } catch (err) {
      console.error('Error loading moderation logs:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await getUsersWithRoles();
      setUsers(usersData);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !newRole) return;
    
    setError('');
    setSuccess('');
    
    try {
      const result = await assignUserRole(selectedUser, newRole);
      
      if (result.success) {
        setSuccess(`Role ${newRole} assigned successfully`);
        loadUsers();
        setSelectedUser('');
        setNewRole('user');
      } else {
        setError(result.error || 'Failed to assign role');
      }
    } catch (err) {
      setError('An error occurred while assigning role');
    }
  };

  const handleBulkDeletePosts = async () => {
    if (!selectedUser || !bulkDeleteReason.trim()) return;
    
    setError('');
    setSuccess('');
    
    try {
      const result = await bulkDeleteUserPosts(selectedUser, bulkDeleteReason);
      
      if (result.success) {
        setSuccess(`Deleted ${result.deletedCount} posts`);
        setBulkDeleteReason('');
        setSelectedUser('');
        loadModerationLogs();
        onModerationAction?.();
      } else {
        setError(result.error || 'Failed to delete posts');
      }
    } catch (err) {
      setError('An error occurred while deleting posts');
    }
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderator': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userRole || (userRole !== 'admin' && userRole !== 'moderator')) {
    return null; // Don't show panel to regular users
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Shield className="w-4 h-4" />
          Moderation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Moderation Panel
            <Badge variant="outline" className={getRoleBadgeColor(userRole)}>
              {userRole}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Manage forum content and user roles
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="logs">Moderation Logs</TabsTrigger>
            {userRole === 'admin' && <TabsTrigger value="users">Manage Users</TabsTrigger>}
            {userRole === 'admin' && <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>}
          </TabsList>

          {/* Moderation Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Recent Moderation Actions
                </CardTitle>
                <CardDescription>
                  Track all moderation activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {moderationLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No moderation actions yet</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {moderationLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            {log.action_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Moderator:</span> {log.moderator_id}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Target:</span> {log.target_type} ({log.target_id.substring(0, 8)}...)
                        </div>
                        {log.reason && (
                          <div className="text-sm mt-1">
                            <span className="font-medium">Reason:</span> {log.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab (Admin Only) */}
          {userRole === 'admin' && (
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    User Role Management
                  </CardTitle>
                  <CardDescription>
                    Assign admin and moderator roles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="userSelect">Select User</Label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name} (@{user.username}) - {user.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="roleSelect">Assign Role</Label>
                      <Select value={newRole} onValueChange={(value: 'admin' | 'moderator' | 'user') => setNewRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleAssignRole} 
                    disabled={!selectedUser || !newRole}
                    className="w-full"
                  >
                    Assign Role
                  </Button>
                </CardContent>
              </Card>

              {/* Users List */}
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                        <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Bulk Actions Tab (Admin Only) */}
          {userRole === 'admin' && (
            <TabsContent value="bulk" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Bulk Actions
                  </CardTitle>
                  <CardDescription>
                    Perform bulk moderation actions (use with caution)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="bulkUserSelect">Select User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} (@{user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="bulkReason">Reason for Action</Label>
                    <Textarea
                      id="bulkReason"
                      placeholder="Enter reason for bulk deletion..."
                      value={bulkDeleteReason}
                      onChange={(e) => setBulkDeleteReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleBulkDeletePosts}
                    disabled={!selectedUser || !bulkDeleteReason.trim()}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All Posts by User
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}