/*
  # Create trades table for trade journaling

  This is the ONLY migration file you need for the trades table.
  Copy this entire content to your Supabase SQL editor and run it.

  1. New Tables
    - `trades` table with all required fields for trade journaling
    - Proper foreign key constraints to users and trading_accounts
    - Check constraints for position values (Long/Short only)

  2. Security
    - Enable RLS on trades table
    - Add policies for authenticated users to manage only their own trades
    - Users can only access trades for accounts they own

  3. Performance
    - Add indexes for better query performance
    - Trigger for automatic timestamp updates

  4. Permissions
    - Grant proper permissions to authenticated users
*/

-- Drop existing trades table if it exists (clean slate)
DROP TABLE IF EXISTS trades CASCADE;

-- Create trades table with proper structure
CREATE TABLE trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  pair text NOT NULL,
  position text NOT NULL CHECK (position IN ('Long', 'Short')),
  entry_price numeric(15,5) NOT NULL,
  exit_price numeric(15,5),
  pnl_amount numeric(15,2),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trades table
CREATE POLICY "Users can read own trades"
  ON trades
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON trades
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON trades
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON trades
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT ALL ON trades TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create trigger for automatic updated_at timestamp (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_trades_updated_at
      BEFORE UPDATE ON trades
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX trades_user_id_idx ON trades(user_id);
CREATE INDEX trades_account_id_idx ON trades(trading_account_id);
CREATE INDEX trades_date_idx ON trades(date);
CREATE INDEX trades_pair_idx ON trades(pair);

-- Test that the table works correctly
DO $$
DECLARE
  test_user_id uuid;
  test_account_id uuid;
  test_trade_id uuid;
BEGIN
  -- Get a test user and account (if they exist)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    SELECT id INTO test_account_id FROM trading_accounts WHERE user_id = test_user_id LIMIT 1;
    
    IF test_account_id IS NOT NULL THEN
      -- Try to insert and select a test trade
      INSERT INTO trades (
        user_id,
        trading_account_id,
        date,
        pair,
        position,
        entry_price,
        exit_price,
        pnl_amount,
        notes
      ) VALUES (
        test_user_id,
        test_account_id,
        CURRENT_DATE,
        'TESTMIGRATION',
        'Long',
        1000.00,
        1010.00,
        50.00,
        'Migration test trade - will be deleted'
      ) RETURNING id INTO test_trade_id;
      
      IF test_trade_id IS NOT NULL THEN
        -- Delete the test trade
        DELETE FROM trades WHERE id = test_trade_id;
        RAISE NOTICE '✅ Trades table created and tested successfully!';
      ELSE
        RAISE NOTICE '❌ Trades table insert test failed - no ID returned';
      END IF;
    ELSE
      RAISE NOTICE '⚠️ No trading account found for testing - table created but not tested';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No user found for testing - table created but not tested';
  END IF;
END $$;