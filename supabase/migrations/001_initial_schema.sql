-- SlipSense Database Schema + RLS Policies
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
  CREATE TYPE slip_job_status AS ENUM ('processing', 'done', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE confidence_level AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shop_role AS ENUM ('owner', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_members (
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role shop_role NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (shop_id, user_id)
);

CREATE TABLE IF NOT EXISTS slip_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  status slip_job_status NOT NULL DEFAULT 'processing',
  extracted_data JSONB,
  confidence confidence_level,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  slip_job_id UUID REFERENCES slip_jobs(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  counterparty TEXT,
  note TEXT,
  confidence confidence_level,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shop_members_user_id ON shop_members(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_shop_id ON transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON transactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_slip_jobs_shop_id ON slip_jobs(shop_id);
CREATE INDEX IF NOT EXISTS idx_insights_shop_id ON insights(shop_id);

-- Helper function: get user's shop IDs
CREATE OR REPLACE FUNCTION get_user_shop_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id FROM shop_members WHERE user_id = auth.uid();
$$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE slip_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Shops policies
CREATE POLICY "Users can view their shops"
  ON shops FOR SELECT
  USING (id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can insert shops"
  ON shops FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can update their shops"
  ON shops FOR UPDATE
  USING (id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Owners can delete their shops"
  ON shops FOR DELETE
  USING (id IN (SELECT get_user_shop_ids()));

-- Shop members policies
CREATE POLICY "Users can view shop memberships"
  ON shop_members FOR SELECT
  USING (user_id = auth.uid() OR shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can insert shop memberships"
  ON shop_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Slip jobs policies
CREATE POLICY "Users can view own shop slip jobs"
  ON slip_jobs FOR SELECT
  USING (shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can insert slip jobs"
  ON slip_jobs FOR INSERT
  WITH CHECK (shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can update own shop slip jobs"
  ON slip_jobs FOR UPDATE
  USING (shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can delete own shop slip jobs"
  ON slip_jobs FOR DELETE
  USING (shop_id IN (SELECT get_user_shop_ids()));

-- Transactions policies
CREATE POLICY "Users can view own shop transactions"
  ON transactions FOR SELECT
  USING (shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can update own shop transactions"
  ON transactions FOR UPDATE
  USING (shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can delete own shop transactions"
  ON transactions FOR DELETE
  USING (shop_id IN (SELECT get_user_shop_ids()));

-- Insights policies
CREATE POLICY "Users can view own shop insights"
  ON insights FOR SELECT
  USING (shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can insert insights"
  ON insights FOR INSERT
  WITH CHECK (shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can delete own shop insights"
  ON insights FOR DELETE
  USING (shop_id IN (SELECT get_user_shop_ids()));

-- Storage bucket for slip images
INSERT INTO storage.buckets (id, name, public)
VALUES ('slips', 'slips', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload slips to their shop folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'slips'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own slips"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'slips'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own slips"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'slips'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, phone, display_name)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'ร้านของฉัน')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
