import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Check if we're in development and provide helpful error message
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey || 
    supabaseUrl === 'https://your-project-id.supabase.co' || 
    supabaseAnonKey === 'your-anon-key-here' || 
    supabaseUrl === 'https://placeholder.supabase.co' || 
    supabaseAnonKey === 'placeholder-key')) {
  
  console.error('🔧 SUPABASE SETUP REQUIRED:');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ Authentication will not work until Supabase is properly configured!');
  console.error('');
  console.error('📋 SETUP STEPS:');
  console.error('1. Click "Connect to Supabase" button in the top-right corner of this page');
  console.error('2. This will automatically set up your Supabase project and database');
  console.error('3. Once connected, you can create an account and sign in');
  console.error('');
  console.error('🔗 Current Status:');
  console.error(`   Supabase URL: ${supabaseUrl}`);
  console.error(`   API Key: ${supabaseAnonKey.substring(0, 20)}...`);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Show user-friendly message on the page
  if (typeof document !== 'undefined') {
    const showSetupMessage = () => {
      const existingMessage = document.getElementById('supabase-setup-message');
      if (existingMessage) return;
      
      const messageDiv = document.createElement('div');
      messageDiv.id = 'supabase-setup-message';
      messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
        z-index: 9999;
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 0.875rem;
        line-height: 1.5;
        border: 1px solid rgba(255, 255, 255, 0.2);
      `;
      messageDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
          <span style="font-size: 1.25rem;">🔧</span>
          <strong style="font-weight: 600;">Supabase Setup Required</strong>
        </div>
        <p style="margin: 0 0 0.75rem 0; opacity: 0.95;">
          Authentication is disabled until Supabase is connected.
        </p>
        <p style="margin: 0; font-weight: 500; background: rgba(255, 255, 255, 0.15); padding: 0.5rem; border-radius: 0.375rem;">
          👆 Click "Connect to Supabase" in the top-right corner
        </p>
      `;
      document.body.appendChild(messageDiv);
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (document.getElementById('supabase-setup-message')) {
          document.body.removeChild(messageDiv);
        }
      }, 10000);
    };
    
    // Show message when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showSetupMessage);
    } else {
      showSetupMessage();
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone_number: string;
          username: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone_number: string;
          username: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone_number?: string;
          username?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      trading_accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          initial_balance: number;
          current_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          initial_balance: number;
          current_balance: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          initial_balance?: number;
          current_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          trading_account_id: string;
          date: string;
          pair: string;
          position: 'Long' | 'Short';
          entry_price: number;
          exit_price: number | null;
          pnl_amount: number | null;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trading_account_id: string;
          date: string;
          pair: string;
          position: 'Long' | 'Short';
          entry_price: number;
          exit_price?: number | null;
          pnl_amount?: number | null;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trading_account_id?: string;
          date?: string;
          pair?: string;
          position?: 'Long' | 'Short';
          entry_price?: number;
          exit_price?: number | null;
          pnl_amount?: number | null;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
  channels: {
    Row: {
      id: string;
      name: string;
      description: string;
      icon: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      name: string;
      description: string;
      icon?: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      name?: string;
      description?: string;
      icon?: string;
      created_at?: string;
    };
  };
  posts: {
    Row: {
      id: string;
      user_id: string;
      channel_id: string;
      title: string;
      content: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      channel_id: string;
      title: string;
      content: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      channel_id?: string;
      title?: string;
      content?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
  comments: {
    Row: {
      id: string;
      user_id: string;
      post_id: string;
      content: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      post_id: string;
      content: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      post_id?: string;
      content?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
};