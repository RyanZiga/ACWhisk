-- ACWhisk Student Submissions and Feedback System Schema
-- This file sets up the complete database structure for student submissions and instructor feedback

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for better data consistency
CREATE TYPE submission_status AS ENUM ('pending', 'in_review', 'reviewed', 'revision_needed');
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE assignment_type AS ENUM ('recipe', 'technique', 'project', 'exam');

-- Assignment Categories table
CREATE TABLE IF NOT EXISTS assignment_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#667EEA', -- hex color for UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignments table (created by instructors)
CREATE TABLE IF NOT EXISTS assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT,
    category_id UUID REFERENCES assignment_categories(id),
    assignment_type assignment_type DEFAULT 'recipe',
    difficulty_level difficulty_level DEFAULT 'beginner',
    estimated_time INTEGER, -- in minutes
    max_score INTEGER DEFAULT 100,
    due_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    allow_late_submissions BOOLEAN DEFAULT true,
    rubric JSONB, -- flexible rubric structure
    required_media_count INTEGER DEFAULT 1,
    allow_video BOOLEAN DEFAULT true,
    allow_multiple_files BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student Submissions table
CREATE TABLE IF NOT EXISTS student_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    recipe_ingredients TEXT,
    recipe_instructions TEXT,
    cooking_notes TEXT,
    difficulty_encountered TEXT,
    time_taken INTEGER, -- actual time taken in minutes
    status submission_status DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_late_submission BOOLEAN DEFAULT false,
    submission_metadata JSONB, -- for flexible additional data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one submission per student per assignment
    UNIQUE(assignment_id, student_id)
);

-- Submission Media (images, videos, documents)
CREATE TABLE IF NOT EXISTS submission_media (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    submission_id UUID REFERENCES student_submissions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'image', 'video', 'document'
    file_size INTEGER,
    mime_type VARCHAR(100),
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Instructor Feedback table
CREATE TABLE IF NOT EXISTS instructor_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    submission_id UUID REFERENCES student_submissions(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    overall_score INTEGER, -- numerical score out of max_score
    feedback_text TEXT NOT NULL,
    
    -- Detailed rubric scores (flexible JSON structure)
    rubric_scores JSONB,
    
    -- Specific feedback categories
    technique_feedback TEXT,
    presentation_feedback TEXT,
    creativity_feedback TEXT,
    improvement_suggestions TEXT,
    
    -- Instructor's time tracking
    review_time_minutes INTEGER,
    
    -- Feedback status
    is_draft BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one feedback per instructor per submission
    UNIQUE(submission_id, instructor_id)
);

-- Student responses to feedback (for iterative learning)
CREATE TABLE IF NOT EXISTS feedback_responses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    feedback_id UUID REFERENCES instructor_feedback(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    action_plan TEXT, -- what the student plans to improve
    has_questions BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignment enrollments (which students are assigned to which assignments)
CREATE TABLE IF NOT EXISTS assignment_enrollments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one enrollment per student per assignment
    UNIQUE(assignment_id, student_id)
);

-- Submission views/analytics
CREATE TABLE IF NOT EXISTS submission_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    submission_id UUID REFERENCES student_submissions(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES auth.users(id),
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_duration_seconds INTEGER,
    action_taken VARCHAR(50) -- 'viewed', 'started_review', 'completed_review'
);

-- Insert default assignment categories
INSERT INTO assignment_categories (name, description, color) VALUES
    ('Soups & Stews', 'Liquid-based dishes including broths, soups, and stews', '#FF6B6B'),
    ('Main Courses', 'Primary dishes including meats, seafood, and vegetarian entrees', '#4ECDC4'),
    ('Desserts', 'Sweet treats, pastries, cakes, and confections', '#FFE66D'),
    ('Appetizers', 'Small plates, starters, and finger foods', '#FF8B94'),
    ('Baking & Pastry', 'Bread, pastries, and baked goods', '#95E1D3'),
    ('International Cuisine', 'Dishes from various world cuisines', '#A8E6CF'),
    ('Techniques', 'Specific cooking techniques and methods', '#C7CEEA'),
    ('Knife Skills', 'Cutting techniques and knife handling', '#F38BA8'),
    ('Plating & Presentation', 'Food styling and presentation techniques', '#DDB892')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignments_instructor_id ON assignments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON assignments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON student_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON student_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON student_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON student_submissions(submitted_at);

CREATE INDEX IF NOT EXISTS idx_feedback_submission_id ON instructor_feedback(submission_id);
CREATE INDEX IF NOT EXISTS idx_feedback_instructor_id ON instructor_feedback(instructor_id);
CREATE INDEX IF NOT EXISTS idx_feedback_published ON instructor_feedback(published_at) WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_submission_id ON submission_media(submission_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_assignment_id ON assignment_enrollments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON assignment_enrollments(student_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE assignment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_analytics ENABLE ROW LEVEL SECURITY;

-- Assignment Categories: Read access for all authenticated users
CREATE POLICY "assignment_categories_read" ON assignment_categories
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "assignment_categories_admin" ON assignment_categories
    FOR ALL TO authenticated USING (
        EXISTS(
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Assignments: Instructors can create/modify their own, students can view assigned ones
CREATE POLICY "assignments_instructor_manage" ON assignments
    FOR ALL TO authenticated USING (
        instructor_id = auth.uid() OR
        EXISTS(
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "assignments_student_read" ON assignments
    FOR SELECT TO authenticated USING (
        EXISTS(
            SELECT 1 FROM assignment_enrollments 
            WHERE assignment_enrollments.assignment_id = assignments.id 
            AND assignment_enrollments.student_id = auth.uid()
        ) OR
        EXISTS(
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('instructor', 'admin')
        )
    );

-- Student Submissions: Students manage their own, instructors view assigned ones
CREATE POLICY "submissions_student_manage" ON student_submissions
    FOR ALL TO authenticated USING (
        student_id = auth.uid() OR
        EXISTS(
            SELECT 1 FROM assignments a 
            WHERE a.id = assignment_id 
            AND a.instructor_id = auth.uid()
        ) OR
        EXISTS(
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Submission Media: Same as submissions
CREATE POLICY "submission_media_access" ON submission_media
    FOR ALL TO authenticated USING (
        EXISTS(
            SELECT 1 FROM student_submissions s 
            WHERE s.id = submission_media.submission_id 
            AND (
                s.student_id = auth.uid() OR
                EXISTS(
                    SELECT 1 FROM assignments a 
                    WHERE a.id = s.assignment_id 
                    AND a.instructor_id = auth.uid()
                ) OR
                EXISTS(
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'admin'
                )
            )
        )
    );

-- Instructor Feedback: Instructors manage their own feedback
CREATE POLICY "feedback_instructor_manage" ON instructor_feedback
    FOR ALL TO authenticated USING (
        instructor_id = auth.uid() OR
        EXISTS(
            SELECT 1 FROM student_submissions s 
            WHERE s.id = submission_id 
            AND s.student_id = auth.uid()
        ) OR
        EXISTS(
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Feedback Responses: Students can respond to feedback on their submissions
CREATE POLICY "feedback_responses_student" ON feedback_responses
    FOR ALL TO authenticated USING (
        student_id = auth.uid() OR
        EXISTS(
            SELECT 1 FROM instructor_feedback f 
            WHERE f.id = feedback_id 
            AND f.instructor_id = auth.uid()
        ) OR
        EXISTS(
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Assignment Enrollments: Instructors and admins can manage
CREATE POLICY "enrollments_manage" ON assignment_enrollments
    FOR ALL TO authenticated USING (
        student_id = auth.uid() OR
        EXISTS(
            SELECT 1 FROM assignments a 
            WHERE a.id = assignment_id 
            AND a.instructor_id = auth.uid()
        ) OR
        EXISTS(
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Submission Analytics: Instructors and admins only
CREATE POLICY "analytics_instructor_admin" ON submission_analytics
    FOR ALL TO authenticated USING (
        instructor_id = auth.uid() OR
        EXISTS(
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Functions for automated tasks

-- Function to automatically mark late submissions
CREATE OR REPLACE FUNCTION mark_late_submissions()
RETURNS void AS $$
BEGIN
    UPDATE student_submissions 
    SET is_late_submission = true,
        updated_at = NOW()
    WHERE submitted_at > (
        SELECT due_date 
        FROM assignments 
        WHERE assignments.id = student_submissions.assignment_id
    )
    AND is_late_submission = false;
END;
$$ LANGUAGE plpgsql;

-- Function to update submission status when feedback is published
CREATE OR REPLACE FUNCTION update_submission_status_on_feedback()
RETURNS trigger AS $$
BEGIN
    IF NEW.published_at IS NOT NULL AND OLD.published_at IS NULL THEN
        UPDATE student_submissions 
        SET status = 'reviewed',
            updated_at = NOW()
        WHERE id = NEW.submission_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update submission status when feedback is published
DROP TRIGGER IF EXISTS trigger_update_submission_status ON instructor_feedback;
CREATE TRIGGER trigger_update_submission_status
    AFTER UPDATE ON instructor_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_submission_status_on_feedback();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all relevant tables
DROP TRIGGER IF EXISTS trigger_assignments_updated_at ON assignments;
CREATE TRIGGER trigger_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_submissions_updated_at ON student_submissions;
CREATE TRIGGER trigger_submissions_updated_at
    BEFORE UPDATE ON student_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_feedback_updated_at ON instructor_feedback;
CREATE TRIGGER trigger_feedback_updated_at
    BEFORE UPDATE ON instructor_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON assignment_categories;
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON assignment_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create helpful views for common queries

-- View for instructor dashboard statistics
CREATE OR REPLACE VIEW instructor_submission_stats AS
SELECT 
    a.instructor_id,
    a.id as assignment_id,
    a.title as assignment_title,
    COUNT(s.id) as total_submissions,
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN s.status = 'in_review' THEN 1 END) as in_review_count,
    COUNT(CASE WHEN s.status = 'reviewed' THEN 1 END) as reviewed_count,
    COUNT(CASE WHEN s.status = 'revision_needed' THEN 1 END) as revision_needed_count,
    AVG(f.overall_rating) as avg_rating,
    AVG(f.overall_score) as avg_score
FROM assignments a
LEFT JOIN student_submissions s ON a.id = s.assignment_id
LEFT JOIN instructor_feedback f ON s.id = f.submission_id AND f.published_at IS NOT NULL
GROUP BY a.instructor_id, a.id, a.title;

-- View for student dashboard
CREATE OR REPLACE VIEW student_submission_overview AS
SELECT 
    s.student_id,
    s.id as submission_id,
    s.title as submission_title,
    s.status,
    s.submitted_at,
    a.title as assignment_title,
    a.due_date,
    a.max_score,
    s.is_late_submission,
    f.overall_rating,
    f.overall_score,
    f.published_at as feedback_published_at,
    CASE 
        WHEN f.published_at IS NOT NULL THEN true 
        ELSE false 
    END as has_feedback
FROM student_submissions s
JOIN assignments a ON s.assignment_id = a.id
LEFT JOIN instructor_feedback f ON s.id = f.submission_id AND f.published_at IS NOT NULL;

COMMENT ON SCHEMA public IS 'ACWhisk Student Submissions and Feedback System - Complete database schema for managing student assignments, submissions, and instructor feedback in a culinary learning platform.';