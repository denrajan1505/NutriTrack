-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MEAL LOGS
-- =============================================
CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL DEFAULT 'meal', -- breakfast, lunch, dinner, snack, whatsapp
  description TEXT,
  calories NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat NUMERIC(8,2) NOT NULL DEFAULT 0,
  fiber NUMERIC(8,2),
  meal_quality_score INTEGER CHECK (meal_quality_score BETWEEN 0 AND 100),
  food_items TEXT[],
  image_url TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, logged_at);

-- =============================================
-- USER GOALS
-- =============================================
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL DEFAULT 'maintenance',
  daily_calorie_target INTEGER NOT NULL DEFAULT 2000,
  daily_protein_target INTEGER NOT NULL DEFAULT 120,
  daily_carbs_target INTEGER NOT NULL DEFAULT 250,
  daily_fat_target INTEGER NOT NULL DEFAULT 65,
  daily_water_target NUMERIC(4,1) NOT NULL DEFAULT 2.5,
  current_weight NUMERIC(6,2),
  target_weight NUMERIC(6,2),
  height NUMERIC(6,2),
  age INTEGER,
  activity_level TEXT DEFAULT 'moderate',
  gender TEXT DEFAULT 'male',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_goals_user ON user_goals(user_id, created_at DESC);

-- =============================================
-- WATER LOGS
-- =============================================
CREATE TABLE water_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_liters NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_water_logs_user_date ON water_logs(user_id, date);

-- =============================================
-- WHATSAPP USERS
-- =============================================
CREATE TABLE whatsapp_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_users ENABLE ROW LEVEL SECURITY;

-- Meal logs policies
CREATE POLICY "Users can view own meals" ON meal_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meals" ON meal_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own meals" ON meal_logs FOR DELETE USING (auth.uid() = user_id);

-- User goals policies
CREATE POLICY "Users can view own goals" ON user_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON user_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON user_goals FOR UPDATE USING (auth.uid() = user_id);

-- Water logs policies
CREATE POLICY "Users can view own water" ON water_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own water" ON water_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own water" ON water_logs FOR UPDATE USING (auth.uid() = user_id);

-- WhatsApp users policies
CREATE POLICY "Users can view own whatsapp" ON whatsapp_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own whatsapp" ON whatsapp_users FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own whatsapp" ON whatsapp_users FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('meal-images', 'meal-images', true);

CREATE POLICY "Users can upload meal images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'meal-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view meal images" ON storage.objects
  FOR SELECT USING (bucket_id = 'meal-images');
