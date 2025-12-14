/*
  # Create trades table with proper error handling

  1. New Tables
    - `trades` table with all required fields
    - Proper foreign key constraints
    - Check constraints for position values

  2. Security
    - Enable RLS on trades table
    - Add policies for authenticated users to manage their own trades
    - Ensure users can only access trades for their own accounts

  3. Indexes
    - Add indexes for better performance
*/

-- Drop existing trades table if it exists (to start fresh)
DROP TABLE IF EXISTS trades CASCADE;

-- Create trades table
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

-- Create policies for trades table
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

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX trades_user_id_idx ON trades(user_id);
CREATE INDEX trades_account_id_idx ON trades(trading_account_id);
CREATE INDEX trades_date_idx ON trades(date);
CREATE INDEX trades_pair_idx ON trades(pair);

-- Grant necessary permissions
GRANT ALL ON trades TO authenticated;
GRANT USAGE ON SEQUENCE trades_id_seq TO authenticated;