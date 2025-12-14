"use client";

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/lib/theme-context';
import '../../account/account.css';
import './team-room.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Send, LogOut, Smile, Camera, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { VoiceChat } from '@/components/ui/voice-chat';
import '@/components/ui/voice-chat.css';

// TradingView Chart Component with proper iframe implementation
const TradingChart = ({ teamId }: { teamId: string }) => {
  const [chartReady, setChartReady] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    // Set chart as ready after a short delay to simulate loading
    const timer = setTimeout(() => {
      setChartReady(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [teamId]);

  if (chartError) {
    return (
      <div className="chart-error-state">
        <div className="error-icon">📊</div>
        <p>Chart Error: {chartError}</p>
        <button 
          onClick={() => {
            setChartError(null);
            setChartReady(false);
            // Force re-render
            window.location.reload();
          }}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!chartReady) {
    return (
      <div className="chart-loading-state">
        <div className="loading-spinner"></div>
        <p>Loading TradingView Chart...</p>
        <p className="loading-details">Connecting to TradingView servers...</p>
      </div>
    );
  }

  // TradingView iframe with proper configuration
  const tradingViewUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_${teamId}&symbol=FX%3AEURUSD&interval=15&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=%5B%5D&hideideas=1&theme=dark&style=1&timezone=Etc%2FUTC&locale=en&withdateranges=1&hide_side_toolbar=0&allow_symbol_change=1&calendar=1&support_host=https%3A%2F%2Fwww.tradingview.com`;

  return (
    <div className="tradingview-widget-container">
      <iframe
        src={tradingViewUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '0.5rem',
          backgroundColor: '#1f2937'
        }}
        frameBorder="0"
        allowTransparency={true}
        scrolling="no"
        allow="fullscreen"
        title="TradingView Chart"
      />
    </div>
  );
};

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  message_type?: string;
  image_url?: string;
  image_path?: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface Team {
  id: string;
  name: string;
  description: string;
}

interface UserProfile {
  username: string;
  full_name: string;
  id: string;
  avatar_url?: string;
}

export default function TeamRoomPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;
  const { isDarkMode, isLoaded } = useTheme();

  // Early return for theme loading
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

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Connected');
  
  const [newMessage, setNewMessage] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeTeamRoom();
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [teamId]);

  // Auto-scroll to bottom when messages change (only on initial load)
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length > 0]); // Only trigger when we first get messages

  const initializeTeamRoom = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setError('Please log in to access team rooms');
        router.push('/auth/login');
        return;
      }

      setCurrentUser(user);

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
      }

      // Check team membership
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select(`
          *,
          teams (
            id,
            name,
            description
          )
        `)
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        setError('You are not a member of this team or the team does not exist');
        setLoading(false);
        return;
      }

      setTeam(membership.teams as Team);

      // Load team members
      const { data: membersData } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles (
            username,
            full_name
          )
        `)
        .eq('team_id', teamId);

      setMembers(membersData || []);

      // Load messages
      await loadMessages();
      
      // Start polling for new messages
      startPolling();

      setLoading(false);
    } catch (err) {
      console.error('Team room initialization error:', err);
      setError('Failed to load team room. Please try again.');
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('team_messages')
        .select(`
          id,
          user_id,
          content,
          message_type,
          image_url,
          image_path,
          created_at,
          team_id
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!messagesError && messagesData) {
        // Get user profiles with avatars
        const userIds = [...new Set(messagesData.map(msg => msg.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds);
        
        // Combine messages with profile data
        const messagesWithProfiles = messagesData.map(message => ({
          ...message,
          profiles: profiles?.find(p => p.id === message.user_id)
        }));
        
        setMessages(messagesWithProfiles);
        setConnectionStatus('Connected');
        setIsOnline(true);
      }
    } catch (err) {
      console.error('Load messages error:', err);
      setConnectionStatus('Reconnecting...');
      setIsOnline(false);
    }
  };

  const startPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    pollIntervalRef.current = setInterval(loadMessages, 3000);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setSelectedImage(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !currentUser || isSendingMessage) return;

    const messageToSend = newMessage.trim();
    setIsSendingMessage(true);
    setError('');
    
    try {
      let imageUrl = null;
      let imagePath = null;

      // Upload image if selected
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `teams/${teamId}/${currentUser.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('team-images')
          .upload(fileName, selectedImage);

        if (uploadError) {
          setError(`Failed to upload image: ${uploadError.message}`);
          setIsSendingMessage(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('team-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
        imagePath = fileName;
      }

      const { data, error } = await supabase
        .from('team_messages')
        .insert({
          team_id: teamId,
          user_id: currentUser.id,
          content: messageToSend || null,
          message_type: selectedImage ? 'image' : 'text',
          image_url: imageUrl,
          image_path: imagePath
        })
        .select();

      if (error) {
        setError(`Failed to send message: ${error.message}`);
        setIsSendingMessage(false);
        return;
      }

      // Clear input and image
      setNewMessage('');
      removeSelectedImage();
      setShowEmojiPicker(false);
      
      // Reload messages without auto-scrolling
      setTimeout(() => {
        loadMessages();
      }, 500);
      
    } catch (err) {
      console.error('Send message error:', err);
      setError(`Failed to send message: ${err}`);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    
    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className={`loading-container ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading team room...</p>
        </div>
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className={`loading-container ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="text-center">
          <p className="error-text">{error}</p>
          <Button onClick={() => router.push('/teams')} className="btn-primary mt-4">
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`team-room-page ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      {/* Team Room Header */}
      <div className="team-room-header">
        <div className="header-left">
          <button onClick={() => router.push('/teams')} className="back-button">
            <ArrowLeft className="w-4 h-4" />
            Back to Teams
          </button>
          
          <div className="team-info">
            <h1 className="team-name">{team?.name}</h1>
            <Badge variant="outline" className={`connection-status ${isOnline ? 'connected' : 'reconnecting'}`}>
              {connectionStatus}
            </Badge>
          </div>
        </div>

        <div className="header-controls">
          <button onClick={handleLogout} className="btn-logout">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="team-room-content">
        {/* Chart Section */}
        <div className="chart-section">
          <TradingChart teamId={teamId} />
        </div>

        {/* Chat Section */}
        <div className="chat-section">
          {/* Voice Chat Section */}
          {currentUser && userProfile && (
            <VoiceChat
              teamId={teamId}
              userId={currentUser.id}
              userName={userProfile.full_name || userProfile.username}
            />
          )}

          <div className="chat-header">
            <h3>Team Chat</h3>
            <Badge variant="outline" className={`connection-status ${isOnline ? 'connected' : 'reconnecting'}`}>
              {isOnline ? '🟢 Live' : '🔴 Offline'}
            </Badge>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="chat-message"
                >
                  <div className="message-avatar-container">
                    {message.profiles?.avatar_url ? (
                      <img src={message.profiles.avatar_url} alt="Avatar" className="message-avatar" />
                    ) : (
                      <div className="message-avatar-placeholder">
                        {(message.profiles?.full_name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="message-body">
                    <div className="message-header">
                      <span className="message-author">
                        {message.profiles?.full_name || message.profiles?.username || 'Unknown User'}
                      </span>
                      <span className="message-time">
                        {formatTime(message.created_at)}
                      </span>
                    </div>

                    {message.content && (
                      <div className="message-content">
                        {message.content}
                      </div>
                    )}

                    {message.image_url && (
                      <div className="message-image">
                        <img
                          src={message.image_url}
                          alt="Shared image"
                          className="chat-image"
                          onClick={() => setLightboxImage(message.image_url!)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {/* Invisible div to scroll to */}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="chat-input-form">
            {/* Image Preview */}
            {selectedImage && imagePreview && (
              <div className="image-preview-container">
                <div className="image-preview">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="preview-image"
                  />
                  <div className="image-info">
                    <div className="image-name">{selectedImage.name}</div>
                    <div className="image-size">{formatFileSize(selectedImage.size)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={removeSelectedImage}
                    className="remove-image-button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="chat-input-container">
              {/* Image Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="image-button"
                disabled={isSendingMessage}
                title="Upload image"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Emoji Picker */}
              <div className="emoji-container">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="emoji-button"
                  disabled={isSendingMessage}
                >
                  <Smile className="w-4 h-4" />
                </button>
                
                {showEmojiPicker && (
                  <div className="emoji-picker">
                    <div className="emoji-grid">
                      {[
                        '😀', '😂', '😍', '🤔', '😎', '👍', 
                        '👎', '❤️', '🔥', '💯', '🚀', '📈', 
                        '📉', '💰', '🎯', '⚡', '💪', '🎉', 
                        '👌', '🤝', '💡', '⭐', '🏆', '🎊',
                        '🤑', '💎', '🌟', '✨', '🎪', '🎭'
                      ].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="emoji-item"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Input
                ref={inputRef}
                type="text"
                placeholder={selectedImage ? "Add a caption..." : "Type a message..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="chat-input"
                disabled={isSendingMessage}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />

              <button
                type="submit"
                className={`send-button ${!isOnline ? 'offline' : ''}`}
                disabled={(!newMessage.trim() && !selectedImage) || isSendingMessage || !isOnline}
              >
                {isSendingMessage ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            {!isOnline && (
              <div className="offline-indicator">
                You're offline. Messages will be sent when connection is restored.
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div 
          className="lightbox-overlay"
          onClick={() => setLightboxImage(null)}
        >
          <img 
            src={lightboxImage} 
            alt="Enlarged image" 
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxImage(null)}
            className="lightbox-close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}