/*
  # Fix trades table insert issues

  This migration ensures the trades table works properly for inserts
  and returns data correctly.

  1. Tables
    - Ensure trades table exists with proper structure
    - Fix any permission issues

  2. Security
    - Ensure RLS policies work correctly
    - Grant proper permissions

  3. Test
    - Verify insert operations work
*/

-- Ensure trades table exists with correct structure
CREATE TABLE IF NOT EXISTS trades (
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

-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can read own trades" ON trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
DROP POLICY IF EXISTS "Users can update own trades" ON trades;
DROP POLICY IF EXISTS "Users can delete own trades" ON trades;

-- Create fresh policies with proper permissions
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

-- Ensure proper permissions are granted
GRANT ALL ON trades TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create trigger for updated_at if function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;
    CREATE TRIGGER update_trades_updated_at
      BEFORE UPDATE ON trades
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS trades_user_id_idx ON trades(user_id);
CREATE INDEX IF NOT EXISTS trades_account_id_idx ON trades(trading_account_id);
CREATE INDEX IF NOT EXISTS trades_date_idx ON trades(date);
CREATE INDEX IF NOT EXISTS trades_pair_idx ON trades(pair);

-- Test that insert works and returns data
DO $$
DECLARE
  test_user_id uuid;
  test_account_id uuid;
  test_trade_id uuid;
BEGIN
  -- Get a test user and account
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
        'Migration test trade'
      ) RETURNING id INTO test_trade_id;
      
      IF test_trade_id IS NOT NULL THEN
        -- Delete the test trade
        DELETE FROM trades WHERE id = test_trade_id;
        RAISE NOTICE 'Trades table insert/select test passed successfully';
      ELSE
        RAISE NOTICE 'Trades table insert test failed - no ID returned';
      END IF;
    ELSE
      RAISE NOTICE 'No trading account found for testing';
    END IF;
  ELSE
    RAISE NOTICE 'No user found for testing';
  END IF;
END $$;