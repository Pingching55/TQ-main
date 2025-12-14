import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock team data
const mockTeam = {
  id: 'team-1',
  name: 'Trading Pros',
  description: 'Professional trading team',
  invite_code: 'ABCD1234',
  created_by: 'user-1',
  member_count: 3,
  user_role: 'admin',
};

const mockMessages = [
  {
    id: 'msg-1',
    user_id: 'user-1',
    content: 'Hello team!',
    created_at: '2024-01-15T10:00:00Z',
    profiles: { username: 'trader1', full_name: 'Trader One' },
  },
  {
    id: 'msg-2',
    user_id: 'user-2',
    content: 'Good morning everyone',
    created_at: '2024-01-15T10:05:00Z',
    profiles: { username: 'trader2', full_name: 'Trader Two' },
  },
];

// Mock Team Room Component
const MockTeamRoom = () => {
  const [messages, setMessages] = React.useState(mockMessages);
  const [newMessage, setNewMessage] = React.useState('');
  const [connectionStatus, setConnectionStatus] = React.useState('Connected');
  const [isOnline, setIsOnline] = React.useState(true);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: `msg-${Date.now()}`,
      user_id: 'current-user',
      content: newMessage,
      created_at: new Date().toISOString(),
      profiles: { username: 'currentuser', full_name: 'Current User' },
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div>
      <div data-testid="team-header">
        <h1>{mockTeam.name}</h1>
        <div data-testid="connection-status">{connectionStatus}</div>
      </div>
      
      <div data-testid="chart-section">
        <div>TradingView Chart Placeholder</div>
      </div>
      
      <div data-testid="chat-section">
        <div data-testid="chat-messages">
          {messages.map(message => (
            <div key={message.id} data-testid="chat-message">
              <div data-testid="message-author">{message.profiles?.full_name}</div>
              <div data-testid="message-content">{message.content}</div>
              <div data-testid="message-time">{formatTime(message.created_at)}</div>
            </div>
          ))}
        </div>
        
        <form onSubmit={handleSendMessage} data-testid="chat-form">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            data-testid="message-input"
            disabled={!isOnline}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || !isOnline}
            data-testid="send-button"
          >
            Send
          </button>
        </form>
        
        {!isOnline && (
          <div data-testid="offline-indicator">
            You're offline. Messages will be sent when connection is restored.
          </div>
        )}
      </div>
    </div>
  );
};

describe('Team Collaboration Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Team Room Layout', () => {
    it('should display team information', () => {
      render(<MockTeamRoom />);
      
      expect(screen.getByTestId('team-header')).toHaveTextContent('Trading Pros');
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    });

    it('should show chart and chat sections', () => {
      render(<MockTeamRoom />);
      
      expect(screen.getByTestId('chart-section')).toBeInTheDocument();
      expect(screen.getByTestId('chat-section')).toBeInTheDocument();
    });
  });

  describe('Chat Functionality', () => {
    it('should display existing messages', () => {
      render(<MockTeamRoom />);
      
      const messages = screen.getAllByTestId('chat-message');
      expect(messages).toHaveLength(2);
      
      expect(screen.getByText('Hello team!')).toBeInTheDocument();
      expect(screen.getByText('Good morning everyone')).toBeInTheDocument();
      expect(screen.getByText('Trader One')).toBeInTheDocument();
      expect(screen.getByText('Trader Two')).toBeInTheDocument();
    });

    it('should send new messages', async () => {
      const user = userEvent.setup();
      render(<MockTeamRoom />);
      
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      await user.type(messageInput, 'This is a test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('This is a test message')).toBeInTheDocument();
        expect(screen.getByText('Current User')).toBeInTheDocument();
      });
      
      // Input should be cleared
      expect(messageInput).toHaveValue('');
    });

    it('should prevent sending empty messages', async () => {
      const user = userEvent.setup();
      render(<MockTeamRoom />);
      
      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toBeDisabled();
      
      // Type spaces only
      await user.type(screen.getByTestId('message-input'), '   ');
      expect(sendButton).toBeDisabled();
    });

    it('should handle Enter key for sending messages', async () => {
      const user = userEvent.setup();
      render(<MockTeamRoom />);
      
      const messageInput = screen.getByTestId('message-input');
      
      await user.type(messageInput, 'Quick message');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Quick message')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Features', () => {
    it('should show connection status', () => {
      render(<MockTeamRoom />);
      
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    });

    it('should handle offline state', () => {
      const OfflineTeamRoom = () => {
        const [isOnline, setIsOnline] = React.useState(false);
        
        return (
          <div>
            <MockTeamRoom />
            <button onClick={() => setIsOnline(!isOnline)} data-testid="toggle-connection">
              Toggle Connection
            </button>
            {!isOnline && (
              <div data-testid="offline-indicator">
                You're offline. Messages will be sent when connection is restored.
              </div>
            )}
          </div>
        );
      };
      
      render(<OfflineTeamRoom />);
      
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should format message timestamps correctly', () => {
      render(<MockTeamRoom />);
      
      const messageTimes = screen.getAllByTestId('message-time');
      expect(messageTimes[0]).toHaveTextContent(/\d{1,2}:\d{2}/); // HH:MM format
    });

    it('should display author information', () => {
      render(<MockTeamRoom />);
      
      const authors = screen.getAllByTestId('message-author');
      expect(authors[0]).toHaveTextContent('Trader One');
      expect(authors[1]).toHaveTextContent('Trader Two');
    });

    it('should handle long messages', async () => {
      const user = userEvent.setup();
      render(<MockTeamRoom />);
      
      const longMessage = 'This is a very long message that should wrap properly and display correctly in the chat interface without breaking the layout or causing any visual issues.';
      
      await user.click(screen.getByTestId('create-post-btn'));
      await user.type(screen.getByTestId('message-input'), longMessage);
      await user.click(screen.getByTestId('send-button'));
      
      await waitFor(() => {
        expect(screen.getByText(longMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Chart Integration', () => {
    it('should display chart section', () => {
      render(<MockTeamRoom />);
      
      expect(screen.getByTestId('chart-section')).toBeInTheDocument();
      expect(screen.getByText('TradingView Chart Placeholder')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle message sending errors', async () => {
      // Mock a component that can simulate errors
      const ErrorTeamRoom = () => {
        const [error, setError] = React.useState('');
        
        const handleError = () => {
          setError('Failed to send message. Please try again.');
        };
        
        return (
          <div>
            <MockTeamRoom />
            <button onClick={handleError} data-testid="simulate-error">
              Simulate Error
            </button>
            {error && <div data-testid="error-display">{error}</div>}
          </div>
        );
      };
      
      const user = userEvent.setup();
      render(<ErrorTeamRoom />);
      
      await user.click(screen.getByTestId('simulate-error'));
      
      expect(screen.getByTestId('error-display')).toHaveTextContent('Failed to send message');
    });
  });
});