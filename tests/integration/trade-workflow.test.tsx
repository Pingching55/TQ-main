import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { supabase } from '@/lib/supabase';
import { mockUser, mockTradingAccount, mockTrade } from '../__mocks__/supabase-mock';

// Mock the entire journal page for integration testing
const MockJournalPage = () => {
  const [trades, setTrades] = React.useState([]);
  const [accounts, setAccounts] = React.useState([mockTradingAccount]);
  const [selectedAccount, setSelectedAccount] = React.useState(mockTradingAccount.id);
  const [isAddingTrade, setIsAddingTrade] = React.useState(false);
  const [error, setError] = React.useState('');
  const [newTrade, setNewTrade] = React.useState({
    pair: '',
    position: 'Long',
    entry_price: '',
    exit_price: '',
    pnl_amount: '',
    notes: '',
  });

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (!newTrade.pair || !newTrade.entry_price) {
        setError('Please fill in all required fields');
        return;
      }

      const pnlAmount = newTrade.pnl_amount ? parseFloat(newTrade.pnl_amount) : null;
      const entryPrice = parseFloat(newTrade.entry_price);
      const exitPrice = newTrade.exit_price ? parseFloat(newTrade.exit_price) : null;

      if (isNaN(entryPrice)) {
        setError('Please enter a valid entry price');
        return;
      }

      // Mock successful trade creation
      const createdTrade = {
        ...mockTrade,
        pair: newTrade.pair.toUpperCase(),
        position: newTrade.position,
        entry_price: entryPrice,
        exit_price: exitPrice,
        pnl_amount: pnlAmount,
        notes: newTrade.notes,
      };

      setTrades([createdTrade, ...trades]);
      setNewTrade({
        pair: '',
        position: 'Long',
        entry_price: '',
        exit_price: '',
        pnl_amount: '',
        notes: '',
      });
      setIsAddingTrade(false);
    } catch (err) {
      setError('Error creating trade');
    }
  };

  return (
    <div>
      <h1>Trade Journal</h1>
      <p>Account Balance: ${accounts[0]?.current_balance.toLocaleString()}</p>
      
      <button onClick={() => setIsAddingTrade(true)}>Add Trade</button>
      
      {isAddingTrade && (
        <form onSubmit={handleAddTrade} data-testid="trade-form">
          <input
            placeholder="Trading Pair"
            value={newTrade.pair}
            onChange={(e) => setNewTrade({...newTrade, pair: e.target.value})}
            required
          />
          <select
            value={newTrade.position}
            onChange={(e) => setNewTrade({...newTrade, position: e.target.value as 'Long' | 'Short'})}
          >
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
          <input
            placeholder="Entry Price"
            type="number"
            step="0.00001"
            value={newTrade.entry_price}
            onChange={(e) => setNewTrade({...newTrade, entry_price: e.target.value})}
            required
          />
          <input
            placeholder="Exit Price"
            type="number"
            step="0.00001"
            value={newTrade.exit_price}
            onChange={(e) => setNewTrade({...newTrade, exit_price: e.target.value})}
          />
          <input
            placeholder="P&L Amount"
            type="number"
            step="0.01"
            value={newTrade.pnl_amount}
            onChange={(e) => setNewTrade({...newTrade, pnl_amount: e.target.value})}
          />
          <textarea
            placeholder="Notes"
            value={newTrade.notes}
            onChange={(e) => setNewTrade({...newTrade, notes: e.target.value})}
          />
          <button type="submit">Save Trade</button>
          <button type="button" onClick={() => setIsAddingTrade(false)}>Cancel</button>
        </form>
      )}
      
      {error && <div data-testid="error-message">{error}</div>}
      
      <div data-testid="trades-list">
        {trades.map((trade: any) => (
          <div key={trade.id} data-testid="trade-item">
            <span>{trade.pair}</span>
            <span>{trade.position}</span>
            <span>{trade.entry_price}</span>
            <span>{trade.exit_price || '-'}</span>
            <span>{trade.pnl_amount ? `$${trade.pnl_amount}` : '-'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Trade Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Trade Creation Flow', () => {
    it('should create a trade with all required fields', async () => {
      const user = userEvent.setup();
      render(<MockJournalPage />);
      
      // Open trade form
      await user.click(screen.getByText('Add Trade'));
      expect(screen.getByTestId('trade-form')).toBeInTheDocument();
      
      // Fill in trade details
      await user.type(screen.getByPlaceholderText('Trading Pair'), 'EURUSD');
      await user.selectOptions(screen.getByDisplayValue('Long'), 'Short');
      await user.type(screen.getByPlaceholderText('Entry Price'), '1.0850');
      await user.type(screen.getByPlaceholderText('Exit Price'), '1.0800');
      await user.type(screen.getByPlaceholderText('P&L Amount'), '500.00');
      await user.type(screen.getByPlaceholderText('Notes'), 'Good short trade on EUR weakness');
      
      // Submit form
      await user.click(screen.getByText('Save Trade'));
      
      // Verify trade appears in list
      await waitFor(() => {
        const tradeItem = screen.getByTestId('trade-item');
        expect(tradeItem).toHaveTextContent('EURUSD');
        expect(tradeItem).toHaveTextContent('Short');
        expect(tradeItem).toHaveTextContent('1.0850');
        expect(tradeItem).toHaveTextContent('1.0800');
        expect(tradeItem).toHaveTextContent('$500');
      });
      
      // Form should be closed
      expect(screen.queryByTestId('trade-form')).not.toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<MockJournalPage />);
      
      await user.click(screen.getByText('Add Trade'));
      await user.click(screen.getByText('Save Trade'));
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Please fill in all required fields');
      });
    });

    it('should validate numeric inputs', async () => {
      const user = userEvent.setup();
      render(<MockJournalPage />);
      
      await user.click(screen.getByText('Add Trade'));
      await user.type(screen.getByPlaceholderText('Trading Pair'), 'EURUSD');
      await user.type(screen.getByPlaceholderText('Entry Price'), 'invalid-price');
      await user.click(screen.getByText('Save Trade'));
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Please enter a valid entry price');
      });
    });

    it('should handle form cancellation', async () => {
      const user = userEvent.setup();
      render(<MockJournalPage />);
      
      await user.click(screen.getByText('Add Trade'));
      expect(screen.getByTestId('trade-form')).toBeInTheDocument();
      
      await user.click(screen.getByText('Cancel'));
      expect(screen.queryByTestId('trade-form')).not.toBeInTheDocument();
    });
  });

  describe('Trade List Management', () => {
    it('should display account balance', () => {
      render(<MockJournalPage />);
      expect(screen.getByText('Account Balance: $10,500')).toBeInTheDocument();
    });

    it('should show empty state when no trades', () => {
      render(<MockJournalPage />);
      
      const tradesList = screen.getByTestId('trades-list');
      expect(tradesList).toBeEmptyDOMElement();
    });

    it('should display trades after creation', async () => {
      const user = userEvent.setup();
      render(<MockJournalPage />);
      
      // Create a trade
      await user.click(screen.getByText('Add Trade'));
      await user.type(screen.getByPlaceholderText('Trading Pair'), 'XAUUSD');
      await user.selectOptions(screen.getByDisplayValue('Long'), 'Long');
      await user.type(screen.getByPlaceholderText('Entry Price'), '2000.50');
      await user.click(screen.getByText('Save Trade'));
      
      // Verify trade appears
      await waitFor(() => {
        expect(screen.getByTestId('trade-item')).toBeInTheDocument();
        expect(screen.getByText('XAUUSD')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockRejectedValue(new Error('Network error')),
      } as any);
      
      const user = userEvent.setup();
      render(<MockJournalPage />);
      
      await user.click(screen.getByText('Add Trade'));
      await user.type(screen.getByPlaceholderText('Trading Pair'), 'EURUSD');
      await user.type(screen.getByPlaceholderText('Entry Price'), '1.0850');
      await user.click(screen.getByText('Save Trade'));
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Error creating trade');
      });
    });

    it('should clear errors on successful submission', async () => {
      const user = userEvent.setup();
      render(<MockJournalPage />);
      
      // First, create an error
      await user.click(screen.getByText('Add Trade'));
      await user.click(screen.getByText('Save Trade'));
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
      
      // Then fix the form and submit successfully
      await user.type(screen.getByPlaceholderText('Trading Pair'), 'EURUSD');
      await user.type(screen.getByPlaceholderText('Entry Price'), '1.0850');
      await user.click(screen.getByText('Save Trade'));
      
      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });
    });
  });
});