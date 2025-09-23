import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Star, Clock, CheckCircle, MessageSquare, Search, User, BookOpen, TrendingUp, AlertCircle, ChefHat } from 'lucide-react'
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
import { Alert, AlertDescription } from './ui/alert'
import { useAuth } from './AuthContext'
import { toast } from 'sonner@2.0.3'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { projectId } from '../utils/supabase/info'

interface Recipe {
  id: string
  title: string
  description: string
  ingredients: string[]
  instructions: string[]
  prep_time: number
  cook_time: number
  total_time: number
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  cuisine_type?: string
  dietary_restrictions?: string[]
  tags?: string[]
  images?: string[]
  video_url?: string
  nutritional_info?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    fiber?: number
  }
  created_at: string
  updated_at: string
}

interface Submission {
  id: string
  assignment_id: string
  assignment_title: string
  student_id: string
  student_name: string
  student_avatar?: string
  title: string
  description: string
  recipe_id?: string
  recipe?: Recipe
  recipe_ingredients?: string
  recipe_instructions?: string
  cooking_notes?: string
  difficulty_encountered?: string
  time_taken?: number
  status: 'pending' | 'in_review' | 'reviewed' | 'revision_needed'
  submitted_at: string
  is_late_submission: boolean
  submission_media?: {
    id: string
    file_path: string
    file_type: string
    caption?: string
  }[]
  // Feedback details
  feedback?: {
    overall_rating?: number
    overall_score?: number
    feedback_text?: string
    published_at?: string
  }
}

interface StudentStats {
  id: string
  name: string
  email: string
  avatar?: string
  submissions_count: number
  avg_rating: number
  last_submission: string
  pending_reviews: number
}

export function StudentFeedback() {
  const { user, session } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [students, setStudents] = useState<StudentStats[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [rating, setRating] = useState(0)
  const [score, setScore] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('submissions')

  useEffect(() => {
    if (user && user.role === 'instructor' && session?.access_token) {
      fetchSubmissions()
    }
  }, [user, session])

  const fetchSubmissions = async () => {
    try {
      if (!session?.access_token) {
        console.log('No session or access token available')
        setSubmissions([])
        setLoading(false)
        return
      }

      console.log('Fetching instructor submissions with recipes...')
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cfac176d/submissions/instructor/${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Submissions fetch response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Submissions fetch successful:', data)
        let submissions = data.submissions || []
        
        // Fetch recipes for submissions that have recipe_id
        if (submissions.length > 0) {
          submissions = await fetchRecipesForSubmissions(submissions)
        }
        
        setSubmissions(submissions)
        
        // Calculate student stats from submissions
        calculateStudentStats(submissions)
      } else {
        const errorText = await response.text()
        console.error('Failed to fetch submissions:', response.status, errorText)
        setSubmissions([])
        
        if (response.status === 401) {
          toast.error('Authentication failed. Please sign in again.')
        } else if (response.status === 403) {
          toast.error('Access denied. Only instructors can view submissions.')
        } else {
          toast.error(`Failed to load submissions: ${response.status}`)
        }
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
      setSubmissions([])
      toast.error('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecipesForSubmissions = async (submissions: Submission[]): Promise<Submission[]> => {
    if (!session?.access_token) return submissions

    try {
      // Get unique recipe IDs from submissions
      const recipeIds = [...new Set(
        submissions
          .filter(sub => sub.recipe_id)
          .map(sub => sub.recipe_id!)
      )]

      if (recipeIds.length === 0) return submissions

      console.log('Fetching recipes for submissions:', recipeIds)

      // Fetch recipes in batch
      const recipePromises = recipeIds.map(async (recipeId) => {
        try {
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cfac176d/recipes/${recipeId}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const recipeData = await response.json()
            return { id: recipeId, ...recipeData.recipe }
          } else {
            console.warn(`Failed to fetch recipe ${recipeId}:`, response.status)
            return null
          }
        } catch (error) {
          console.warn(`Error fetching recipe ${recipeId}:`, error)
          return null
        }
      })

      const recipes = await Promise.all(recipePromises)
      const recipeMap = new Map<string, Recipe>()
      
      recipes.forEach(recipe => {
        if (recipe) {
          recipeMap.set(recipe.id, recipe)
        }
      })

      console.log('Fetched recipes:', recipeMap.size)

      // Attach recipes to submissions
      return submissions.map(submission => ({
        ...submission,
        recipe: submission.recipe_id ? recipeMap.get(submission.recipe_id) : undefined
      }))

    } catch (error) {
      console.error('Error fetching recipes for submissions:', error)
      return submissions
    }
  }

  const calculateStudentStats = (submissionList: Submission[]) => {
    const studentMap = new Map<string, StudentStats>()

    submissionList.forEach(submission => {
      const studentId = submission.student_id
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          id: studentId,
          name: submission.student_name,
          email: `${submission.student_name.toLowerCase().replace(' ', '.')}@student.edu`,
          avatar: submission.student_avatar,
          submissions_count: 0,
          avg_rating: 0,
          last_submission: submission.submitted_at,
          pending_reviews: 0
        })
      }

      const student = studentMap.get(studentId)!
      student.submissions_count++
      
      if (submission.status === 'pending') {
        student.pending_reviews++
      }

      if (new Date(submission.submitted_at) > new Date(student.last_submission)) {
        student.last_submission = submission.submitted_at
      }
    })

    // Calculate average ratings
    studentMap.forEach((student, studentId) => {
      const studentSubmissions = submissionList.filter(s => s.student_id === studentId && s.feedback?.overall_rating)
      if (studentSubmissions.length > 0) {
        const totalRating = studentSubmissions.reduce((sum, s) => sum + (s.feedback?.overall_rating || 0), 0)
        student.avg_rating = totalRating / studentSubmissions.length
      }
    })

    setStudents(Array.from(studentMap.values()))
  }

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = submission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.assignment_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (submission.recipe?.title && submission.recipe.title.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleSubmitFeedback = async () => {
    if (!selectedSubmission || !feedbackText.trim() || rating === 0) {
      toast.error('Please provide both rating and feedback')
      return
    }

    if (!session?.access_token) {
      toast.error('Authentication required')
      return
    }

    setSubmittingFeedback(true)

    try {
      const feedbackData = {
        submission_id: selectedSubmission.id,
        overall_rating: rating,
        overall_score: score ? parseInt(score) : Math.round((rating / 5) * 100),
        feedback_text: feedbackText,
        is_draft: false
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cfac176d/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feedbackData)
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Feedback submitted successfully:', data)
        
        // Update local state
        setSubmissions(prev => prev.map(sub => 
          sub.id === selectedSubmission.id
            ? { 
                ...sub, 
                status: 'reviewed' as const, 
                feedback: {
                  overall_rating: rating,
                  overall_score: feedbackData.overall_score,
                  feedback_text: feedbackText,
                  published_at: new Date().toISOString()
                }
              }
            : sub
        ))

        // Recalculate student stats
        const updatedSubmissions = submissions.map(sub => 
          sub.id === selectedSubmission.id
            ? { 
                ...sub, 
                status: 'reviewed' as const, 
                feedback: {
                  overall_rating: rating,
                  overall_score: feedbackData.overall_score,
                  feedback_text: feedbackText,
                  published_at: new Date().toISOString()
                }
              }
            : sub
        )
        calculateStudentStats(updatedSubmissions)

        setFeedbackText('')
        setRating(0)
        setScore('')
        setSelectedSubmission(null)
        toast.success('Feedback submitted successfully!')
      } else {
        const errorText = await response.text()
        console.error('Failed to submit feedback:', response.status, errorText)
        toast.error('Failed to submit feedback')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error('Failed to submit feedback')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const getStatusBadge = (status: string, isLate = false) => {
    if (isLate) {
      return <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 border-orange-500/30">
        <AlertCircle className="w-3 h-3 mr-1" />
        Late Submission
      </Badge>
    }

    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
          <Clock className="w-3 h-3 mr-1" />
          Pending Review
        </Badge>
      case 'in_review':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border-blue-500/30">
          <MessageSquare className="w-3 h-3 mr-1" />
          In Review
        </Badge>
      case 'reviewed':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Reviewed
        </Badge>
      case 'revision_needed':
        return <Badge variant="secondary" className="bg-red-500/20 text-red-600 border-red-500/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Needs Revision
        </Badge>
      default:
        return null
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600'
      case 'medium':
        return 'text-yellow-600'
      case 'hard':
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
  const inReviewCount = submissions.filter(s => s.status === 'in_review').length
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

  if (!user || user.role !== 'instructor') {
    return (
      <div className="flex items-center justify-center py-12">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only instructors can access the student feedback section.
          </AlertDescription>
        </Alert>
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
            Review student recipe submissions and provide constructive feedback
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="glass-card p-3 text-center min-w-[80px]">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="glass-card p-3 text-center min-w-[80px]">
            <div className="text-2xl font-bold text-blue-600">{inReviewCount}</div>
            <div className="text-xs text-muted-foreground">In Review</div>
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
            Submissions ({submissions.length})
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Students ({students.length})
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
                      placeholder="Search by submission title, assignment, recipe, or student name..."
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
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="revision_needed">Needs Revision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Submissions Found</h3>
                <p className="text-muted-foreground">
                  {submissions.length === 0 
                    ? 'No student submissions have been received yet.'
                    : 'No submissions match your current filters.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
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
                              {formatDate(submission.submitted_at)}
                            </p>
                          </div>
                        </div>

                        {/* Submission Info */}
                        <div className="flex-1">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                            <div className="space-y-1">
                              <h4 className="font-semibold text-lg">{submission.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                Assignment: {submission.assignment_title}
                              </p>
                              {submission.recipe && (
                                <div className="flex items-center gap-2">
                                  <ChefHat className="w-4 h-4 text-primary" />
                                  <p className="text-sm font-medium text-primary">
                                    Recipe: {submission.recipe.title}
                                  </p>
                                </div>
                              )}
                              <p className="text-muted-foreground line-clamp-2">
                                {submission.description}
                              </p>
                              {submission.time_taken && (
                                <p className="text-sm text-muted-foreground">
                                  Time taken: {submission.time_taken} minutes
                                </p>
                              )}
                              {submission.recipe && (
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className={`font-medium ${getDifficultyColor(submission.recipe.difficulty)}`}>
                                    {submission.recipe.difficulty}
                                  </span>
                                  <span>Total Time: {submission.recipe.total_time} min</span>
                                  <span>Servings: {submission.recipe.servings}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col lg:items-end gap-2">
                              {getStatusBadge(submission.status, submission.is_late_submission)}
                              {submission.feedback?.overall_rating && (
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= submission.feedback!.overall_rating!
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                  <span className="text-sm text-muted-foreground ml-1">
                                    ({submission.feedback.overall_score}%)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Recipe Images Preview */}
                          {submission.recipe?.images && submission.recipe.images.length > 0 && (
                            <div className="flex gap-2 mt-4">
                              {submission.recipe.images.slice(0, 3).map((image, index) => (
                                <div
                                  key={index}
                                  className="w-16 h-16 rounded-lg overflow-hidden bg-muted"
                                >
                                  <ImageWithFallback
                                    src={image}
                                    alt={`Recipe ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                              {submission.recipe.images.length > 3 && (
                                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                                  +{submission.recipe.images.length - 3}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Feedback Display */}
                          {submission.feedback?.feedback_text && (
                            <div className="mt-4 p-3 bg-accent/30 rounded-lg">
                              <p className="text-sm text-muted-foreground font-medium mb-1">Your Feedback:</p>
                              <p className="text-sm">{submission.feedback.feedback_text}</p>
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
                                <DialogTitle>{submission.title}</DialogTitle>
                                <DialogDescription>
                                  Review student submission details and provide constructive feedback.
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-6">
                                {/* Student and Submission Details */}
                                <div className="flex items-center gap-4">
                                  <Avatar className="w-16 h-16">
                                    <AvatarImage src={submission.student_avatar} alt={submission.student_name} />
                                    <AvatarFallback>{submission.student_name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="text-xl font-semibold">{submission.student_name}</h3>
                                    <p className="text-muted-foreground">
                                      Submitted on {formatDate(submission.submitted_at)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Assignment: {submission.assignment_title}
                                    </p>
                                    {submission.recipe && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <ChefHat className="w-4 h-4 text-primary" />
                                        <p className="text-sm font-medium text-primary">
                                          Recipe: {submission.recipe.title}
                                        </p>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                      {getStatusBadge(submission.status, submission.is_late_submission)}
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                {/* Recipe Details */}
                                {submission.recipe && (
                                  <div className="space-y-4">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                      <ChefHat className="w-5 h-5 text-primary" />
                                      Recipe Details
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="space-y-3">
                                        <div>
                                          <h5 className="font-medium mb-2">Recipe Information</h5>
                                          <div className="space-y-1 text-sm text-muted-foreground">
                                            <p><span className="font-medium">Title:</span> {submission.recipe.title}</p>
                                            <p><span className="font-medium">Description:</span> {submission.recipe.description}</p>
                                            <p><span className="font-medium">Cuisine:</span> {submission.recipe.cuisine_type || 'Not specified'}</p>
                                            <p><span className={`font-medium ${getDifficultyColor(submission.recipe.difficulty)}`}>
                                              Difficulty:</span> {submission.recipe.difficulty}
                                            </p>
                                          </div>
                                        </div>

                                        <div>
                                          <h5 className="font-medium mb-2">Timing & Servings</h5>
                                          <div className="space-y-1 text-sm text-muted-foreground">
                                            <p><span className="font-medium">Prep Time:</span> {submission.recipe.prep_time} min</p>
                                            <p><span className="font-medium">Cook Time:</span> {submission.recipe.cook_time} min</p>
                                            <p><span className="font-medium">Total Time:</span> {submission.recipe.total_time} min</p>
                                            <p><span className="font-medium">Servings:</span> {submission.recipe.servings}</p>
                                          </div>
                                        </div>

                                        {submission.recipe.tags && submission.recipe.tags.length > 0 && (
                                          <div>
                                            <h5 className="font-medium mb-2">Tags</h5>
                                            <div className="flex flex-wrap gap-1">
                                              {submission.recipe.tags.map((tag, index) => (
                                                <Badge key={index} variant="secondary" className="text-xs">
                                                  {tag}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div className="space-y-3">
                                        {submission.recipe.ingredients.length > 0 && (
                                          <div>
                                            <h5 className="font-medium mb-2">Ingredients</h5>
                                            <ul className="text-sm text-muted-foreground space-y-1">
                                              {submission.recipe.ingredients.map((ingredient, index) => (
                                                <li key={index} className="flex items-start gap-2">
                                                  <span className="text-primary mt-1.5 w-1 h-1 rounded-full bg-current"></span>
                                                  {ingredient}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {submission.recipe.nutritional_info && (
                                          <div>
                                            <h5 className="font-medium mb-2">Nutritional Info (per serving)</h5>
                                            <div className="space-y-1 text-sm text-muted-foreground">
                                              {submission.recipe.nutritional_info.calories && (
                                                <p><span className="font-medium">Calories:</span> {submission.recipe.nutritional_info.calories}</p>
                                              )}
                                              {submission.recipe.nutritional_info.protein && (
                                                <p><span className="font-medium">Protein:</span> {submission.recipe.nutritional_info.protein}g</p>
                                              )}
                                              {submission.recipe.nutritional_info.carbs && (
                                                <p><span className="font-medium">Carbs:</span> {submission.recipe.nutritional_info.carbs}g</p>
                                              )}
                                              {submission.recipe.nutritional_info.fat && (
                                                <p><span className="font-medium">Fat:</span> {submission.recipe.nutritional_info.fat}g</p>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {submission.recipe.instructions.length > 0 && (
                                      <div>
                                        <h5 className="font-medium mb-2">Instructions</h5>
                                        <ol className="text-sm text-muted-foreground space-y-2">
                                          {submission.recipe.instructions.map((instruction, index) => (
                                            <li key={index} className="flex gap-3">
                                              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                                                {index + 1}
                                              </span>
                                              <span className="pt-0.5">{instruction}</span>
                                            </li>
                                          ))}
                                        </ol>
                                      </div>
                                    )}

                                    {/* Recipe Images */}
                                    {submission.recipe.images && submission.recipe.images.length > 0 && (
                                      <div>
                                        <h5 className="font-medium mb-3">Recipe Images</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {submission.recipe.images.map((image, index) => (
                                            <div
                                              key={index}
                                              className="aspect-video rounded-lg overflow-hidden bg-muted"
                                            >
                                              <ImageWithFallback
                                                src={image}
                                                alt={`Recipe step ${index + 1}`}
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <Separator />
                                  </div>
                                )}

                                {/* Submission Content */}
                                <div className="space-y-4">
                                  <h4 className="font-semibold mb-2">Student Submission</h4>
                                  
                                  <div>
                                    <h5 className="font-medium mb-2">Submission Description</h5>
                                    <p className="text-muted-foreground">{submission.description}</p>
                                  </div>

                                  {submission.recipe_ingredients && (
                                    <div>
                                      <h5 className="font-medium mb-2">Ingredients Used</h5>
                                      <p className="text-muted-foreground whitespace-pre-wrap">{submission.recipe_ingredients}</p>
                                    </div>
                                  )}

                                  {submission.recipe_instructions && (
                                    <div>
                                      <h5 className="font-medium mb-2">Cooking Process</h5>
                                      <p className="text-muted-foreground whitespace-pre-wrap">{submission.recipe_instructions}</p>
                                    </div>
                                  )}

                                  {submission.cooking_notes && (
                                    <div>
                                      <h5 className="font-medium mb-2">Cooking Notes</h5>
                                      <p className="text-muted-foreground whitespace-pre-wrap">{submission.cooking_notes}</p>
                                    </div>
                                  )}

                                  {submission.difficulty_encountered && (
                                    <div>
                                      <h5 className="font-medium mb-2">Challenges Encountered</h5>
                                      <p className="text-muted-foreground whitespace-pre-wrap">{submission.difficulty_encountered}</p>
                                    </div>
                                  )}

                                  {submission.time_taken && (
                                    <div>
                                      <h5 className="font-medium mb-2">Time Taken</h5>
                                      <p className="text-muted-foreground">{submission.time_taken} minutes</p>
                                    </div>
                                  )}

                                  {/* Submission Media */}
                                  {submission.submission_media && submission.submission_media.length > 0 && (
                                    <div>
                                      <h5 className="font-medium mb-3">Submission Photos</h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {submission.submission_media
                                          .filter(media => media.file_type.startsWith('image/'))
                                          .map((media, index) => (
                                            <div
                                              key={media.id}
                                              className="aspect-video rounded-lg overflow-hidden bg-muted"
                                            >
                                              <ImageWithFallback
                                                src={media.file_path}
                                                alt={media.caption || `Submission image ${index + 1}`}
                                                className="w-full h-full object-cover"
                                              />
                                              {media.caption && (
                                                <p className="text-xs text-muted-foreground mt-1 px-1">
                                                  {media.caption}
                                                </p>
                                              )}
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Current Feedback */}
                                {submission.feedback?.feedback_text && (
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
                                                star <= (submission.feedback?.overall_rating || 0)
                                                  ? 'fill-yellow-400 text-yellow-400'
                                                  : 'text-gray-300'
                                              }`}
                                            />
                                          ))}
                                          <span className="text-sm text-muted-foreground ml-1">
                                            Score: {submission.feedback.overall_score}%
                                          </span>
                                        </div>
                                      </div>
                                      <p>{submission.feedback.feedback_text}</p>
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
                                            className="hover:scale-110 transition-transform"
                                          >
                                            <Star
                                              className={`w-6 h-6 ${
                                                star <= rating
                                                  ? 'fill-yellow-400 text-yellow-400'
                                                  : 'text-gray-300 hover:text-yellow-200'
                                              }`}
                                            />
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Score */}
                                    <div>
                                      <label className="text-sm font-medium mb-2 block">
                                        Score (0-100, optional)
                                      </label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="Leave empty to auto-calculate from rating"
                                        value={score}
                                        onChange={(e) => setScore(e.target.value)}
                                        className="w-full"
                                      />
                                    </div>

                                    {/* Feedback Text */}
                                    <div>
                                      <label className="text-sm font-medium mb-2 block">
                                        Feedback Comments (required)
                                      </label>
                                      <Textarea
                                        placeholder="Provide detailed feedback on the student's work, including what they did well and areas for improvement..."
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        rows={4}
                                        className="w-full"
                                      />
                                    </div>

                                    {/* Submit Button */}
                                    <div className="flex gap-3 pt-4">
                                      <Button
                                        onClick={handleSubmitFeedback}
                                        disabled={submittingFeedback || rating === 0 || !feedbackText.trim()}
                                        className="flex-1"
                                      >
                                        {submittingFeedback ? (
                                          <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                            Submitting...
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Submit Feedback
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedSubmission(null)
                                          setFeedbackText('')
                                          setRating(0)
                                          setScore('')
                                        }}
                                      >
                                        Cancel
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
            </div>
          )}
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <div className="grid gap-4">
            {students.map((student) => (
              <Card key={student.id} className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={student.avatar} alt={student.name} />
                      <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">{student.name}</h3>
                      <p className="text-muted-foreground">{student.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Last submission: {formatDate(student.last_submission)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{student.submissions_count}</div>
                      <div className="text-xs text-muted-foreground">Submissions</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-yellow-600">{student.pending_reviews}</div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-lg font-bold">{student.avg_rating.toFixed(1)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Rating</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{submissions.length}</div>
                  <div className="text-sm text-muted-foreground">Total Submissions</div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
                  <div className="text-sm text-muted-foreground">Pending Reviews</div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{reviewedCount}</div>
                  <div className="text-sm text-muted-foreground">Completed Reviews</div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{students.length}</div>
                  <div className="text-sm text-muted-foreground">Active Students</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Review Progress */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Review Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Reviewed</span>
                    <span>{reviewedCount} of {submissions.length}</span>
                  </div>
                  <Progress value={submissions.length > 0 ? (reviewedCount / submissions.length) * 100 : 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Pending</span>
                    <span>{pendingCount} remaining</span>
                  </div>
                  <Progress value={submissions.length > 0 ? (pendingCount / submissions.length) * 100 : 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StudentFeedback