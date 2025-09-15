import { supabase } from './client'

export interface Assignment {
  id: string
  instructor_id: string
  title: string
  description: string
  instructions?: string
  category_id?: string
  assignment_type: 'recipe' | 'technique' | 'project' | 'exam'
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  estimated_time: number
  max_score: number
  due_date: string
  is_active: boolean
  allow_late_submissions: boolean
  rubric?: any
  required_media_count: number
  allow_video: boolean
  allow_multiple_files: boolean
  created_at?: string
  updated_at?: string
}

export interface StudentSubmission {
  id: string
  assignment_id: string
  student_id: string
  title: string
  description: string
  recipe_ingredients?: string
  recipe_instructions?: string
  cooking_notes?: string
  difficulty_encountered?: string
  time_taken?: number
  status: 'pending' | 'in_review' | 'reviewed' | 'revision_needed'
  submitted_at: string
  last_modified_at: string
  is_late_submission: boolean
  submission_metadata?: any
  created_at?: string
  updated_at?: string
}

export interface InstructorFeedback {
  id: string
  submission_id: string
  instructor_id: string
  overall_rating: number
  overall_score?: number
  feedback_text: string
  rubric_scores?: any
  technique_feedback?: string
  presentation_feedback?: string
  creativity_feedback?: string
  improvement_suggestions?: string
  review_time_minutes?: number
  is_draft: boolean
  published_at?: string
  created_at?: string
  updated_at?: string
}

export interface SubmissionMedia {
  id: string
  submission_id: string
  file_name: string
  file_path: string
  file_type: 'image' | 'video' | 'document'
  file_size?: number
  mime_type?: string
  caption?: string
  display_order: number
  uploaded_at: string
}

// Assignment Management Functions

export async function createAssignment(assignment: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('assignments')
    .insert([assignment])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getInstructorAssignments(instructorId: string) {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      assignment_categories(name, color)
    `)
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateAssignment(id: string, updates: Partial<Assignment>) {
  const { data, error } = await supabase
    .from('assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAssignment(id: string) {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Student Assignment Functions

export async function getStudentAssignments(studentId: string) {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      assignment_categories(name, color),
      profiles!instructor_id(name),
      assignment_enrollments!inner(student_id)
    `)
    .eq('assignment_enrollments.student_id', studentId)
    .eq('is_active', true)
    .order('due_date', { ascending: true })

  if (error) throw error
  return data
}

export async function enrollStudentInAssignment(assignmentId: string, studentId: string) {
  const { data, error } = await supabase
    .from('assignment_enrollments')
    .insert([{
      assignment_id: assignmentId,
      student_id: studentId
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// Submission Management Functions

export async function createSubmission(submission: Omit<StudentSubmission, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('student_submissions')
    .insert([submission])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getStudentSubmissions(studentId: string) {
  const { data, error } = await supabase
    .from('student_submissions')
    .select(`
      *,
      assignments(
        title,
        max_score,
        due_date,
        instructor_id,
        profiles!instructor_id(name)
      ),
      instructor_feedback(
        overall_rating,
        overall_score,
        feedback_text,
        published_at
      ),
      submission_media(*)
    `)
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getInstructorSubmissions(instructorId: string) {
  const { data, error } = await supabase
    .from('student_submissions')
    .select(`
      *,
      assignments!inner(
        title,
        max_score,
        instructor_id
      ),
      profiles!student_id(
        name,
        avatar_url
      ),
      instructor_feedback(
        overall_rating,
        overall_score,
        feedback_text,
        published_at
      ),
      submission_media(*)
    `)
    .eq('assignments.instructor_id', instructorId)
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateSubmission(id: string, updates: Partial<StudentSubmission>) {
  const { data, error } = await supabase
    .from('student_submissions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Media Upload Functions

export async function uploadSubmissionMedia(file: File, submissionId: string, caption?: string) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${submissionId}/${Date.now()}.${fileExt}`
  
  // Upload file to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('submission-media')
    .upload(fileName, file)

  if (uploadError) throw uploadError

  // Create media record
  const { data, error } = await supabase
    .from('submission_media')
    .insert([{
      submission_id: submissionId,
      file_name: file.name,
      file_path: uploadData.path,
      file_type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
      file_size: file.size,
      mime_type: file.type,
      caption: caption,
      display_order: 0
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getSubmissionMediaUrl(filePath: string) {
  const { data } = supabase.storage
    .from('submission-media')
    .getPublicUrl(filePath)

  return data.publicUrl
}

// Feedback Functions

export async function createFeedback(feedback: Omit<InstructorFeedback, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('instructor_feedback')
    .insert([feedback])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateFeedback(id: string, updates: Partial<InstructorFeedback>) {
  const { data, error } = await supabase
    .from('instructor_feedback')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function publishFeedback(feedbackId: string) {
  const { data, error } = await supabase
    .from('instructor_feedback')
    .update({
      is_draft: false,
      published_at: new Date().toISOString()
    })
    .eq('id', feedbackId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Analytics Functions

export async function getSubmissionStats(instructorId?: string, studentId?: string) {
  let query = supabase.from('student_submissions').select('status')

  if (instructorId) {
    query = query
      .select('status, assignments!inner(instructor_id)')
      .eq('assignments.instructor_id', instructorId)
  }

  if (studentId) {
    query = query.eq('student_id', studentId)
  }

  const { data, error } = await query

  if (error) throw error

  const stats = {
    total: data.length,
    pending: data.filter(s => s.status === 'pending').length,
    in_review: data.filter(s => s.status === 'in_review').length,
    reviewed: data.filter(s => s.status === 'reviewed').length,
    revision_needed: data.filter(s => s.status === 'revision_needed').length
  }

  return stats
}

export async function getAssignmentCategories() {
  const { data, error } = await supabase
    .from('assignment_categories')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

// Utility Functions

export function formatSubmissionStatus(status: string): string {
  const statusMap = {
    'pending': 'Pending Review',
    'in_review': 'Under Review',
    'reviewed': 'Reviewed',
    'revision_needed': 'Needs Revision'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

export function calculateGradeFromRating(rating: number, maxScore: number = 100): number {
  return Math.round((rating / 5) * maxScore)
}

export function isSubmissionLate(submittedAt: string, dueDate: string): boolean {
  return new Date(submittedAt) > new Date(dueDate)
}

export function getTimeUntilDue(dueDate: string): string {
  const due = new Date(dueDate)
  const now = new Date()
  const diff = due.getTime() - now.getTime()
  
  if (diff < 0) return 'Overdue'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`
  return 'Due soon'
}