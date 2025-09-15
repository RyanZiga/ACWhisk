import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Star, Clock, CheckCircle, MessageSquare, Filter, Search, User, Calendar, BookOpen, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Progress } from './ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Separator } from './ui/separator'
import { supabase } from '../utils/supabase/client'
import { useAuth } from './AuthContext'
import { toast } from 'sonner@2.0.3'

interface Submission {
  id: string
  student_id: string
  student_name: string
  student_avatar?: string
  recipe_title: string
  recipe_description: string
  submission_date: string
  status: 'pending' | 'reviewed' | 'in_progress'
  rating?: number
  feedback?: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  estimated_time: number
  images?: string[]
  video_url?: string
}

interface Student {
  id: string
  name: string
  email: string
  avatar?: string
  submissions_count: number
  avg_rating: number
  last_submission: string
  progress_level: 'beginner' | 'intermediate' | 'advanced'
}

export function StudentFeedback() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [rating, setRating] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('submissions')

  useEffect(() => {
    if (user && user.role === 'instructor') {
      fetchSubmissionsAndStudents()
    }
  }, [user])

  const fetchSubmissionsAndStudents = async () => {
    try {
      // In a real implementation, this would fetch from Supabase using the new schema
      // Here's how the query would look:
      /*
      const { data: submissions, error } = await supabase
        .from('student_submissions')
        .select(`
          *,
          assignments!inner(
            title,
            instructor_id,
            max_score
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
          submission_media(
            file_path,
            file_type,
            caption
          )
        `)
        .eq('assignments.instructor_id', user.id)
        .order('submitted_at', { ascending: false })
      */
      
      // Mock data for demonstration
      fetchMockData()
    } catch (error) {
      console.error('Error fetching submissions:', error)
      toast.error('Failed to load submissions')
      setLoading(false)
    }
  }

  const fetchMockData = () => {
    const mockSubmissions: Submission[] = [
      {
        id: '1',
        student_id: 'student1',
        student_name: 'Emily Chen',
        student_avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c8cd?w=150&h=150&fit=crop&crop=face',
        recipe_title: 'Classic French Onion Soup',
        recipe_description: 'A traditional French onion soup with caramelized onions, beef broth, and gruyere cheese.',
        submission_date: '2024-01-15T10:30:00Z',
        status: 'pending',
        difficulty_level: 'intermediate',
        category: 'Soups',
        estimated_time: 90,
        images: [
          'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
          'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&h=300&fit=crop'
        ]
      },
      {
        id: '2',
        student_id: 'student2',
        student_name: 'Marcus Rodriguez',
        student_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        recipe_title: 'Homemade Pasta with Marinara',
        recipe_description: 'Fresh handmade pasta served with a rich tomato marinara sauce.',
        submission_date: '2024-01-14T14:20:00Z',
        status: 'in_progress',
        rating: 4,
        feedback: 'Great technique on the pasta making! Consider adding more herbs to the sauce.',
        difficulty_level: 'beginner',
        category: 'Italian',
        estimated_time: 60,
        images: [
          'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop'
        ]
      },
      {
        id: '3',
        student_id: 'student3',
        student_name: 'Sarah Thompson',
        student_avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        recipe_title: 'Chocolate Soufflé',
        recipe_description: 'Light and airy chocolate soufflé with a molten center.',
        submission_date: '2024-01-13T16:45:00Z',
        status: 'reviewed',
        rating: 5,
        feedback: 'Excellent execution! Perfect rise and texture. Your technique has improved significantly.',
        difficulty_level: 'advanced',
        category: 'Desserts',
        estimated_time: 45,
        images: [
          'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop'
        ]
      },
      {
        id: '4',
        student_id: 'student1',
        student_name: 'Emily Chen',
        student_avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c8cd?w=150&h=150&fit=crop&crop=face',
        recipe_title: 'Thai Green Curry',
        recipe_description: 'Authentic Thai green curry with coconut milk and fresh vegetables.',
        submission_date: '2024-01-12T11:15:00Z',
        status: 'pending',
        difficulty_level: 'intermediate',
        category: 'Thai',
        estimated_time: 75,
        images: [
          'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop'
        ]
      }
    ]

    const mockStudents: Student[] = [
      {
        id: 'student1',
        name: 'Emily Chen',
        email: 'emily.chen@email.com',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c8cd?w=150&h=150&fit=crop&crop=face',
        submissions_count: 8,
        avg_rating: 4.2,
        last_submission: '2024-01-15T10:30:00Z',
        progress_level: 'intermediate'
      },
      {
        id: 'student2',
        name: 'Marcus Rodriguez',
        email: 'marcus.rodriguez@email.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        submissions_count: 5,
        avg_rating: 3.8,
        last_submission: '2024-01-14T14:20:00Z',
        progress_level: 'beginner'
      },
      {
        id: 'student3',
        name: 'Sarah Thompson',
        email: 'sarah.thompson@email.com',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        submissions_count: 12,
        avg_rating: 4.7,
        last_submission: '2024-01-13T16:45:00Z',
        progress_level: 'advanced'
      }
    ]

    setSubmissions(mockSubmissions)
    setStudents(mockStudents)
    setLoading(false)
  }

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = submission.recipe_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.student_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter
    const matchesDifficulty = difficultyFilter === 'all' || submission.difficulty_level === difficultyFilter
    
    return matchesSearch && matchesStatus && matchesDifficulty
  })

  const handleSubmitFeedback = async () => {
    if (!selectedSubmission || !feedbackText.trim() || rating === 0) {
      toast.error('Please provide both rating and feedback')
      return
    }

    try {
      // In a real implementation, this would create/update feedback in Supabase:
      /*
      const { error } = await supabase
        .from('instructor_feedback')
        .upsert({
          submission_id: selectedSubmission.id,
          instructor_id: user.id,
          overall_rating: rating,
          overall_score: Math.round((rating / 5) * 100), // Convert rating to score
          feedback_text: feedbackText,
          published_at: new Date().toISOString()
        })

      if (error) throw error

      // Also update the submission status
      await supabase
        .from('student_submissions')
        .update({ 
          status: 'reviewed',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSubmission.id)
      */

      // Mock implementation
      setSubmissions(prev => prev.map(sub => 
        sub.id === selectedSubmission.id
          ? { ...sub, status: 'reviewed' as const, rating, feedback: feedbackText }
          : sub
      ))

      setFeedbackText('')
      setRating(0)
      setSelectedSubmission(null)
      toast.success('Feedback submitted successfully!')
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error('Failed to submit feedback')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
          <Clock className="w-3 h-3 mr-1" />
          Pending Review
        </Badge>
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border-blue-500/30">
          <MessageSquare className="w-3 h-3 mr-1" />
          In Progress
        </Badge>
      case 'reviewed':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Reviewed
        </Badge>
      default:
        return null
    }
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'text-green-600'
      case 'intermediate':
        return 'text-yellow-600'
      case 'advanced':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const pendingCount = submissions.filter(s => s.status === 'pending').length
  const inProgressCount = submissions.filter(s => s.status === 'in_progress').length
  const reviewedCount = submissions.filter(s => s.status === 'reviewed').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading student submissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Student Feedback</h1>
          <p className="text-muted-foreground">
            Review student submissions and provide constructive feedback
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="glass-card p-3 text-center min-w-[80px]">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="glass-card p-3 text-center min-w-[80px]">
            <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="glass-card p-3 text-center min-w-[80px]">
            <div className="text-2xl font-bold text-green-600">{reviewedCount}</div>
            <div className="text-xs text-muted-foreground">Reviewed</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="submissions" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-card p-1">
          <TabsTrigger value="submissions" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Submissions
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-6">
          {/* Filters */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by recipe title or student name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Filter by difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulty</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Submissions List */}
          <div className="grid gap-4">
            {filteredSubmissions.map((submission) => (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="glass-card hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Student Info */}
                      <div className="flex items-center gap-3 lg:min-w-[200px]">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={submission.student_avatar} alt={submission.student_name} />
                          <AvatarFallback>{submission.student_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{submission.student_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(submission.submission_date)}
                          </p>
                        </div>
                      </div>

                      {/* Recipe Info */}
                      <div className="flex-1">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-lg">{submission.recipe_title}</h4>
                            <p className="text-muted-foreground line-clamp-2">
                              {submission.recipe_description}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className={`font-medium ${getDifficultyColor(submission.difficulty_level)}`}>
                                {submission.difficulty_level}
                              </span>
                              <span className="text-muted-foreground">
                                {submission.category}
                              </span>
                              <span className="text-muted-foreground">
                                {submission.estimated_time} min
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col lg:items-end gap-2">
                            {getStatusBadge(submission.status)}
                            {submission.rating && (
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= submission.rating!
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Images Preview */}
                        {submission.images && submission.images.length > 0 && (
                          <div className="flex gap-2 mt-4">
                            {submission.images.slice(0, 3).map((image, index) => (
                              <div
                                key={index}
                                className="w-16 h-16 rounded-lg overflow-hidden bg-muted"
                              >
                                <img
                                  src={image}
                                  alt={`Recipe ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            {submission.images.length > 3 && (
                              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                                +{submission.images.length - 3}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Feedback Display */}
                        {submission.feedback && (
                          <div className="mt-4 p-3 bg-accent/30 rounded-lg">
                            <p className="text-sm text-muted-foreground font-medium mb-1">Your Feedback:</p>
                            <p className="text-sm">{submission.feedback}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 lg:flex-col">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSubmission(submission)}
                              className="flex-1 lg:flex-none"
                            >
                              {submission.status === 'reviewed' ? 'View Details' : 'Review'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-modal">
                            <DialogHeader>
                              <DialogTitle>{submission.recipe_title}</DialogTitle>
                              <DialogDescription>
                                Review student submission details and provide constructive feedback.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-6">
                              {/* Student and Recipe Details */}
                              <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                  <AvatarImage src={submission.student_avatar} alt={submission.student_name} />
                                  <AvatarFallback>{submission.student_name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="text-xl font-semibold">{submission.student_name}</h3>
                                  <p className="text-muted-foreground">
                                    Submitted on {formatDate(submission.submission_date)}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {getStatusBadge(submission.status)}
                                    <span className={`text-sm font-medium ${getDifficultyColor(submission.difficulty_level)}`}>
                                      {submission.difficulty_level}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              {/* Recipe Description */}
                              <div>
                                <h4 className="font-semibold mb-2">Recipe Description</h4>
                                <p className="text-muted-foreground">{submission.recipe_description}</p>
                                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                  <span>Category: {submission.category}</span>
                                  <span>Estimated Time: {submission.estimated_time} minutes</span>
                                </div>
                              </div>

                              {/* Images */}
                              {submission.images && submission.images.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-3">Recipe Images</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {submission.images.map((image, index) => (
                                      <div
                                        key={index}
                                        className="aspect-video rounded-lg overflow-hidden bg-muted"
                                      >
                                        <img
                                          src={image}
                                          alt={`Recipe step ${index + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Current Feedback */}
                              {submission.feedback && (
                                <div>
                                  <h4 className="font-semibold mb-2">Current Feedback</h4>
                                  <div className="p-4 bg-accent/30 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-sm font-medium">Rating:</span>
                                      <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <Star
                                            key={star}
                                            className={`w-4 h-4 ${
                                              star <= (submission.rating || 0)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                    <p>{submission.feedback}</p>
                                  </div>
                                </div>
                              )}

                              {/* Feedback Form */}
                              {submission.status !== 'reviewed' && (
                                <div className="space-y-4">
                                  <h4 className="font-semibold">Provide Feedback</h4>
                                  
                                  {/* Rating */}
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">
                                      Rating (required)
                                    </label>
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          type="button"
                                          onClick={() => setRating(star)}
                                          className="p-1"
                                        >
                                          <Star
                                            className={`w-6 h-6 transition-colors ${
                                              star <= rating
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300 hover:text-yellow-300'
                                            }`}
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Feedback Text */}
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">
                                      Detailed Feedback (required)
                                    </label>
                                    <Textarea
                                      placeholder="Provide constructive feedback on the student's recipe, technique, presentation, and areas for improvement..."
                                      value={feedbackText}
                                      onChange={(e) => setFeedbackText(e.target.value)}
                                      rows={4}
                                    />
                                  </div>

                                  <div className="flex gap-2 pt-4">
                                    <Button
                                      onClick={handleSubmitFeedback}
                                      disabled={!feedbackText.trim() || rating === 0}
                                      className="flex-1"
                                    >
                                      Submit Feedback
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {filteredSubmissions.length === 0 && (
              <Card className="glass-card">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No submissions found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' || difficultyFilter !== 'all'
                      ? 'Try adjusting your search criteria or filters.'
                      : 'Students haven\'t submitted any recipes yet.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <div className="grid gap-4">
            {students.map((student) => (
              <Card key={student.id} className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={student.avatar} alt={student.name} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold">{student.name}</h3>
                        <p className="text-muted-foreground">{student.email}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className={`font-medium ${getDifficultyColor(student.progress_level)}`}>
                            {student.progress_level}
                          </span>
                          <span className="text-muted-foreground">
                            Last submission: {formatDate(student.last_submission)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{student.submissions_count}</span>
                        <span className="text-sm text-muted-foreground">submissions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= Math.round(student.avg_rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {student.avg_rating.toFixed(1)} avg
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{submissions.length}</div>
                <p className="text-xs text-muted-foreground">+2 from last week</p>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.2</div>
                <p className="text-xs text-muted-foreground">+0.3 from last week</p>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{students.length}</div>
                <p className="text-xs text-muted-foreground">+1 from last week</p>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">86%</div>
                <p className="text-xs text-muted-foreground">+5% from last week</p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Student Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={student.avatar} alt={student.name} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{student.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress 
                        value={(student.avg_rating / 5) * 100} 
                        className="w-24" 
                      />
                      <span className="text-sm text-muted-foreground min-w-[40px]">
                        {student.avg_rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Add default export for lazy loading compatibility
export default StudentFeedback