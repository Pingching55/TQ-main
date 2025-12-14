"use client";

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Badge } from './badge';
import { Trash2, RotateCcw, Shield, AlertTriangle } from 'lucide-react';
import { checkUserRole, moderatePost, moderateComment } from '@/lib/admin-utils';

interface PostModerationControlsProps {
  postId?: string;
  commentId?: string;
  isDeleted?: boolean;
  onModerationAction?: () => void;
  className?: string;
}

export function PostModerationControls({ 
  postId, 
  commentId, 
  isDeleted = false, 
  onModerationAction,
  className = ""
}: PostModerationControlsProps) {
  const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const role = await checkUserRole();
      setUserRole(role);
      setLoading(false);
    } catch (err) {
      console.error('Error checking permissions:', err);
      setLoading(false);
    }
  };

  const handleModeration = async (action: 'delete' | 'restore') => {
    if (!reason.trim() && action === 'delete') {
      setError('Please provide a reason for deletion');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      let result;
      
      if (postId) {
        result = await moderatePost(postId, reason, action);
      } else if (commentId) {
        result = await moderateComment(commentId, reason, action);
      } else {
        setError('No target specified');
        setActionLoading(false);
        return;
      }

      if (result.success) {
        setIsOpen(false);
        setReason('');
        onModerationAction?.();
      } else {
        setError(result.error || 'Moderation action failed');
      }
    } catch (err) {
      setError('An error occurred during moderation');
    }

    setActionLoading(false);
  };

  if (loading || !userRole || (userRole !== 'admin' && userRole !== 'moderator')) {
    return null; // Don't show controls to regular users
  }

  const targetType = postId ? 'post' : 'comment';
  const actionText = isDeleted ? 'Restore' : 'Delete';
  const actionIcon = isDeleted ? RotateCcw : Trash2;
  const ActionIcon = actionIcon;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`gap-1 text-xs ${className} ${
            isDeleted 
              ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' 
              : 'text-red-600 hover:text-red-700 hover:bg-red-50'
          }`}
        >
          <ActionIcon className="w-3 h-3" />
          {actionText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {actionText} {targetType}
          </DialogTitle>
          <DialogDescription>
            {isDeleted 
              ? `Restore this ${targetType} to make it visible again`
              : `This will hide the ${targetType} from public view`
            }
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {!isDeleted && (
            <div>
              <Label htmlFor="moderationReason">Reason for {actionText.toLowerCase()}</Label>
              <Textarea
                id="moderationReason"
                placeholder={`Enter reason for ${actionText.toLowerCase()}ing this ${targetType}...`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required={!isDeleted}
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button 
              variant={isDeleted ? "default" : "destructive"}
              onClick={() => handleModeration(isDeleted ? 'restore' : 'delete')}
              disabled={actionLoading || (!isDeleted && !reason.trim())}
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <ActionIcon className="w-4 h-4 mr-2" />
              )}
              {actionText} {targetType}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}