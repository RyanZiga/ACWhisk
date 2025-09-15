-- Enhanced Digital Portfolio Schema for ACWhisk
-- This adds the additional tables needed for the Digital Portfolio feature

-- Create enhanced portfolios table (updating existing one)
DROP TABLE IF EXISTS portfolio_items CASCADE;
DROP TABLE IF EXISTS user_skills CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;

-- Update portfolios table structure
ALTER TABLE portfolios DROP COLUMN IF EXISTS images;
ALTER TABLE portfolios DROP COLUMN IF EXISTS skills;
ALTER TABLE portfolios DROP COLUMN IF EXISTS achievements;

-- Create portfolio_items table
CREATE TABLE IF NOT EXISTS portfolio_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('recipe', 'achievement', 'certification', 'project')),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_skills table
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  level INTEGER CHECK (level >= 0 AND level <= 100) DEFAULT 0,
  category TEXT DEFAULT 'general',
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  badge_type TEXT DEFAULT 'general',
  verified BOOLEAN DEFAULT false,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at triggers for new tables
CREATE TRIGGER update_portfolio_items_updated_at 
  BEFORE UPDATE ON portfolio_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_skills_updated_at 
  BEFORE UPDATE ON user_skills 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for portfolio_items
CREATE POLICY "Users can view portfolio items from public portfolios" 
  ON portfolio_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM portfolios p 
      WHERE p.id = portfolio_items.portfolio_id 
      AND p.is_public = true
    )
  );

CREATE POLICY "Users can view own portfolio items" 
  ON portfolio_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM portfolios p 
      WHERE p.id = portfolio_items.portfolio_id 
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create portfolio items for own portfolios" 
  ON portfolio_items FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios p 
      WHERE p.id = portfolio_items.portfolio_id 
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own portfolio items" 
  ON portfolio_items FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM portfolios p 
      WHERE p.id = portfolio_items.portfolio_id 
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own portfolio items" 
  ON portfolio_items FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM portfolios p 
      WHERE p.id = portfolio_items.portfolio_id 
      AND p.user_id = auth.uid()
    )
  );

-- Create RLS policies for user_skills
CREATE POLICY "Anyone can view user skills" 
  ON user_skills FOR SELECT USING (true);

CREATE POLICY "Users can create own skills" 
  ON user_skills FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills" 
  ON user_skills FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills" 
  ON user_skills FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_achievements
CREATE POLICY "Anyone can view user achievements" 
  ON user_achievements FOR SELECT USING (true);

CREATE POLICY "Users can create own achievements" 
  ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements" 
  ON user_achievements FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own achievements" 
  ON user_achievements FOR DELETE USING (auth.uid() = user_id);

-- Insert some sample skills categories and achievements for new users
CREATE OR REPLACE FUNCTION seed_user_portfolio_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Add some starter skills
  INSERT INTO user_skills (user_id, name, level, category) VALUES
    (NEW.id, 'Knife Skills', 20, 'techniques'),
    (NEW.id, 'Food Safety', 15, 'fundamentals'),
    (NEW.id, 'Recipe Development', 10, 'creativity'),
    (NEW.id, 'Flavor Pairing', 5, 'advanced')
  ON CONFLICT (user_id, name) DO NOTHING;
  
  -- Add welcome achievement
  INSERT INTO user_achievements (user_id, title, description, badge_type) VALUES
    (NEW.id, 'Welcome to ACWhisk!', 'Joined the ACWhisk culinary community', 'milestone')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to seed portfolio data for new users
CREATE TRIGGER on_profile_created_seed_portfolio
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION seed_user_portfolio_data();

-- Create some sample achievements that users can earn
CREATE TABLE IF NOT EXISTS achievement_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  badge_type TEXT DEFAULT 'general',
  criteria JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample achievement templates
INSERT INTO achievement_templates (title, description, badge_type, criteria) VALUES
  ('First Recipe', 'Created your first recipe', 'milestone', '{"recipes_created": 1}'),
  ('Recipe Master', 'Created 10 recipes', 'achievement', '{"recipes_created": 10}'),
  ('Community Helper', 'Helped 5 fellow cooks in the forum', 'community', '{"forum_replies": 5}'),
  ('Popular Chef', 'Received 50 likes on your recipes', 'social', '{"total_likes": 50}'),
  ('Skill Builder', 'Reached 80% proficiency in 5 skills', 'mastery', '{"high_skills": 5}'),
  ('Portfolio Showcase', 'Added 15 items to your portfolio', 'portfolio', '{"portfolio_items": 15}')
ON CONFLICT DO NOTHING;

-- Create view for portfolio statistics
CREATE OR REPLACE VIEW portfolio_stats AS
SELECT 
  p.id as portfolio_id,
  p.user_id,
  p.title,
  p.is_public,
  COUNT(DISTINCT pi.id) as total_items,
  COUNT(DISTINCT CASE WHEN pi.type = 'recipe' THEN pi.id END) as recipe_count,
  COUNT(DISTINCT CASE WHEN pi.type = 'achievement' THEN pi.id END) as achievement_count,
  COUNT(DISTINCT CASE WHEN pi.type = 'certification' THEN pi.id END) as certification_count,
  COUNT(DISTINCT CASE WHEN pi.type = 'project' THEN pi.id END) as project_count,
  COUNT(DISTINCT us.id) as skills_count,
  ROUND(AVG(us.level), 0) as avg_skill_level,
  COUNT(DISTINCT ua.id) as achievements_count,
  p.created_at,
  p.updated_at
FROM portfolios p
LEFT JOIN portfolio_items pi ON p.id = pi.portfolio_id
LEFT JOIN user_skills us ON p.user_id = us.user_id
LEFT JOIN user_achievements ua ON p.user_id = ua.user_id
GROUP BY p.id, p.user_id, p.title, p.is_public, p.created_at, p.updated_at;