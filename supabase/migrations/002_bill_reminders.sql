-- Create bill_reminders table
CREATE TABLE IF NOT EXISTS bill_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bill_reminders_shop_id ON bill_reminders(shop_id);

-- Enable RLS
ALTER TABLE bill_reminders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own shop bill reminders"
  ON bill_reminders FOR SELECT
  USING (shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can insert bill reminders"
  ON bill_reminders FOR INSERT
  WITH CHECK (shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can update own shop bill reminders"
  ON bill_reminders FOR UPDATE
  USING (shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can delete own shop bill reminders"
  ON bill_reminders FOR DELETE
  USING (shop_id IN (SELECT get_user_shop_ids()));
