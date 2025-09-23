import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { 
  Upload, 
  Clock, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  FileText, 
  Image, 
  Video, 
  Star,
  MessageSquare,
  Timer,
  ChefHat,
  BookOpen
} from 'lucide-react'
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
import { getSupabaseClient } from '../utils/supabase/client'
import { useAuth } from './AuthContext'
import { toast } from 'sonner@2.0.3'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface Assignment {
  id: string
  title: string
  description: string
  instructions?: string
  category: string
  assignment_type: 'recipe' | 'technique' | 'project' | 'exam'
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  estimated_time: number
  max_score: number
  due_date: string
  is_active: boolean
  allow_late_submissions: boolean
  required_media_count: number
  allow_video: boolean
  allow_multiple_files: boolean
  instructor_name: string
  created_at: string
}

interface Submission {
  id: string
  assignment_id: string
  title: string
  description: string
  recipe_ingredients?: string
  recipe_instructions?: string
  cooking_notes?: string
  difficulty_encountered?: string
  time_taken?: number
  status: 'pending' | 'in_review' | 'reviewed' | 'revision_needed'
  submitted_at: string
  is_late_submission: boolean
  assignment_title: string
  feedback?: {
    overall_rating?: number
    overall_score?: number
    feedback_text?: string
    published_at?: string
  }
}

interface SubmissionFormData {
  title: string
  description: string
  recipe_ingredients: string
  recipe_instructions: string
  cooking_notes: string
  difficulty_encountered: string
  time_taken: number
}

export function StudentSubmissions() {
  const { user, session } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('available')
  
  const [formData, setFormData] = useState<SubmissionFormData>({
    title: '',
    description: '',
    recipe_ingredients: '',
    recipe_instructions: '',
    cooking_notes: '',
    difficulty_encountered: '',
    time_taken: 0
  })

  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreview, setMediaPreview] = useState<string[]>([])

  useEffect(() => {
    if (user && session) {
      fetchAssignments()
      fetchSubmissions()
    }
  }, [user, session])

  const fetchAssignments = async () => {
    try {
      if (!session?.access_token) {
        console.log('No session or access token available')
        setAssignments([])
        setLoading(false)
        return
      }

      console.log('Fetching assignments with access token:', session.access_token.substring(0, 20) + '...')
      console.log('User ID:', user?.id)
      console.log('User role:', user?.role)
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cfac176d/assignments`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Assignment fetch response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Assignment fetch successful:', data)
        setAssignments(data.assignments || [])
      } else {
        const errorText = await response.text()
        console.error('Failed to fetch assignments:', response.status, errorText)
        setAssignments([])
        
        if (response.status === 401) {
          toast.error('Authentication failed. Please sign in again.')
        } else {
          toast.error(`Failed to load assignments: ${response.status}`)
        }
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
      setAssignments([])
      toast.error('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const createTestAssignment = async () => {
    if (!session?.access_token) {
      toast.error('No authentication available')
      return
    }

    try {
      const testAssignment = {
        title: 'Classic Chocolate Chip Cookies',
        description: 'Learn to make perfect chocolate chip cookies from scratch with proper technique and timing.',
        instructions: 'Follow the recipe exactly as written. Pay attention to mixing technique and baking time. Take photos of each major step.',
        category: 'Baking & Pastry',
        assignment_type: 'recipe',
        difficulty_level: 'beginner',
        estimated_time: 90,
        max_score: 100,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        is_active: true,
        allow_late_submissions: true,
        required_media_count: 3,
        allow_video: true,
        allow_multiple_files: true
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cfac176d/assignments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testAssignment)
      })

      if (response.ok) {
        toast.success('Test assignment created!')
        fetchAssignments()
      } else {
        const errorText = await response.text()
        console.error('Failed to create test assignment:', response.status, errorText)
        toast.error('Failed to create test assignment')
      }
    } catch (error) {
      console.error('Error creating test assignment:', error)
      toast.error('Error creating test assignment')
    }
  }

  const fetchSubmissions = async () => {
    try {
      // TODO: Replace with actual Supabase query to fetch user submissions
      // For now, set empty array to avoid mock data errors
      
      setSubmissions([])
    } catch (error) {
      console.error('Error fetching submissions:', error)
      toast.error('Failed to load submissions')
    }
  }

  const handleFileUpload = (files: FileList) => {
    const newFiles = Array.from(files)
    const totalFiles = mediaFiles.length + newFiles.length

    if (selectedAssignment && totalFiles > selectedAssignment.required_media_count + 2) {
      toast.error(`Maximum ${selectedAssignment.required_media_count + 2} files allowed`)
      return
    }

    // Create preview URLs
    const newPreviews = newFiles.map(file => {
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file)
      }
      return '' // For videos, we'd need different handling
    })

    setMediaFiles(prev => [...prev, ...newFiles])
    setMediaPreview(prev => [...prev, ...newPreviews])
  }

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreview(prev => {
      const newPreviews = prev.filter((_, i) => i !== index)
      // Cleanup URL
      if (prev[index]) {
        URL.revokeObjectURL(prev[index])
      }
      return newPreviews
    })
  }

  const handleSubmit = async () => {
    if (!selectedAssignment || !user) return

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please provide a title for your submission')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Please provide a description of your work')
      return
    }

    if (mediaFiles.length < selectedAssignment.required_media_count) {
      toast.error(`Please upload at least ${selectedAssignment.required_media_count} media files`)
      return
    }

    setSubmitting(true)

    try {
      // Here you would upload files to Supabase Storage and create the submission
      // For now, we'll simulate the process
      
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate upload time
      
      const newSubmission: Submission = {
        id: Date.now().toString(),
        assignment_id: selectedAssignment.id,
        title: formData.title,
        description: formData.description,
        recipe_ingredients: formData.recipe_ingredients,
        recipe_instructions: formData.recipe_instructions,
        cooking_notes: formData.cooking_notes,
        difficulty_encountered: formData.difficulty_encountered,
        time_taken: formData.time_taken,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        is_late_submission: new Date() > new Date(selectedAssignment.due_date),
        assignment_title: selectedAssignment.title
      }

      setSubmissions(prev => [...prev, newSubmission])
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        recipe_ingredients: '',
        recipe_instructions: '',
        cooking_notes: '',
        difficulty_encountered: '',
        time_taken: 0
      })
      setMediaFiles([])
      setMediaPreview([])
      setSelectedAssignment(null)
      
      toast.success('Assignment submitted successfully!')
      setActiveTab('submitted')
    } catch (error) {
      console.error('Error submitting assignment:', error)
      toast.error('Failed to submit assignment')
    } finally {
      setSubmitting(false)
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
          Under Review
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

  const isOverdue = (dueDate: string) => {
    return new Date() > new Date(dueDate)
  }

  const getTimeUntilDue = (dueDate: string) => {
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

  const availableAssignments = assignments.filter(a => 
    a.is_active && !submissions.some(s => s.assignment_id === a.id)
  )

  const submittedAssignments = submissions

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading your assignments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Assignments</h1>
          <p className="text-muted-foreground">
            Submit your culinary work and track your progress
          </p>
        </div>
        
        {/* Debug button for testing */}
        {user?.role === 'instructor' && (
          <Button 
            onClick={createTestAssignment}
            variant="outline"
            size="sm"
            className="self-start"
          >
            Create Test Assignment
          </Button>
        )}
        
        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="glass-card p-3 text-center min-w-[100px]">
            <div className="text-2xl font-bold text-blue-600">{availableAssignments.length}</div>
            <div className="text-xs text-muted-foreground">Available</div>
          </div>
          <div className="glass-card p-3 text-center min-w-[100px]">
            <div className="text-2xl font-bold text-green-600">{submissions.filter(s => s.status === 'reviewed').length}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="glass-card p-3 text-center min-w-[100px]">
            <div className="text-2xl font-bold text-yellow-600">{submissions.filter(s => s.status === 'pending').length}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-card p-1">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Available ({availableAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="submitted" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Submitted ({submittedAssignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {availableAssignments.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="text-center py-12">
                <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Available Assignments</h3>
                <p className="text-muted-foreground">
                  You've completed all available assignments! Check back later for new challenges.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {availableAssignments.map((assignment) => (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="glass-card hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              <h3 className="text-xl font-semibold mb-2">{assignment.title}</h3>
                              <p className="text-muted-foreground mb-3 line-clamp-2">
                                {assignment.description}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <Timer className="w-4 h-4" />
                                  {assignment.estimated_time} min
                                </span>
                                <span className={`font-medium ${getDifficultyColor(assignment.difficulty_level)}`}>
                                  {assignment.difficulty_level}
                                </span>
                                <span className="text-muted-foreground">
                                  {assignment.category}
                                </span>
                                <span className="text-muted-foreground">
                                  by {assignment.instructor_name}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="outline" className={`${
                                isOverdue(assignment.due_date) ? 'border-red-500 text-red-600' : 'border-green-500 text-green-600'
                              }`}>
                                <Calendar className="w-3 h-3 mr-1" />
                                {getTimeUntilDue(assignment.due_date)}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                Due: {formatDate(assignment.due_date)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Image className="w-4 h-4" />
                              {assignment.required_media_count}+ photos required
                            </span>
                            {assignment.allow_video && (
                              <span className="flex items-center gap-1">
                                <Video className="w-4 h-4" />
                                Video allowed
                              </span>
                            )}
                            <span>Max Score: {assignment.max_score}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 lg:flex-col lg:min-w-[120px]">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setSelectedAssignment(assignment)}
                                className="flex-1"
                              >
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-modal">
                              <DialogHeader>
                                <DialogTitle>{assignment.title}</DialogTitle>
                                <DialogDescription>
                                  View assignment details, requirements, and instructions.
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-6">
                                <div>
                                  <h4 className="font-semibold mb-2">Assignment Description</h4>
                                  <p className="text-muted-foreground">{assignment.description}</p>
                                </div>
                                
                                {assignment.instructions && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Instructions</h4>
                                    <p className="text-muted-foreground">{assignment.instructions}</p>
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold mb-2">Requirements</h4>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                      <li>• Minimum {assignment.required_media_count} photos</li>
                                      <li>• Estimated time: {assignment.estimated_time} minutes</li>
                                      <li>• Difficulty: {assignment.difficulty_level}</li>
                                      <li>• Category: {assignment.category}</li>
                                      {assignment.allow_video && <li>• Video submissions accepted</li>}
                                      {assignment.allow_late_submissions && <li>• Late submissions allowed</li>}
                                    </ul>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-2">Grading</h4>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                      <div>Maximum Score: {assignment.max_score} points</div>
                                      <div>Due Date: {formatDate(assignment.due_date)}</div>
                                      <div>Instructor: {assignment.instructor_name}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedAssignment(assignment)
                                  setFormData(prev => ({...prev, title: assignment.title}))
                                }}
                                className="flex items-center gap-2 flex-1"
                              >
                                <Upload className="w-4 h-4" />
                                Submit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-modal">
                              <DialogHeader>
                                <DialogTitle>Submit: {selectedAssignment?.title}</DialogTitle>
                                <DialogDescription>
                                  Complete and submit your assignment with photos, descriptions, and cooking notes.
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-6">
                                {selectedAssignment && (
                                  <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                      <strong>Due:</strong> {formatDate(selectedAssignment.due_date)} • 
                                      <strong> Required:</strong> {selectedAssignment.required_media_count}+ photos • 
                                      <strong> Max Score:</strong> {selectedAssignment.max_score} points
                                    </AlertDescription>
                                  </Alert>
                                )}
                                
                                <div className="grid gap-4">
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">
                                      Submission Title *
                                    </label>
                                    <Input
                                      placeholder="Give your submission a descriptive title"
                                      value={formData.title}
                                      onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">
                                      Description *
                                    </label>
                                    <Textarea
                                      placeholder="Describe your dish, technique, or approach to this assignment..."
                                      value={formData.description}
                                      onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                                      rows={3}
                                    />
                                  </div>
                                  
                                  {selectedAssignment?.assignment_type === 'recipe' && (
                                    <>
                                      <div>
                                        <label className="text-sm font-medium mb-2 block">
                                          Ingredients Used
                                        </label>
                                        <Textarea
                                          placeholder="List the ingredients you used..."
                                          value={formData.recipe_ingredients}
                                          onChange={(e) => setFormData(prev => ({...prev, recipe_ingredients: e.target.value}))}
                                          rows={3}
                                        />
                                      </div>
                                      
                                      <div>
                                        <label className="text-sm font-medium mb-2 block">
                                          Cooking Instructions/Process
                                        </label>
                                        <Textarea
                                          placeholder="Describe your cooking process step by step..."
                                          value={formData.recipe_instructions}
                                          onChange={(e) => setFormData(prev => ({...prev, recipe_instructions: e.target.value}))}
                                          rows={4}
                                        />
                                      </div>
                                    </>
                                  )}
                                  
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">
                                      Cooking Notes & Observations
                                    </label>
                                    <Textarea
                                      placeholder="Share your thoughts about the cooking process, what went well, what you learned..."
                                      value={formData.cooking_notes}
                                      onChange={(e) => setFormData(prev => ({...prev, cooking_notes: e.target.value}))}
                                      rows={3}
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">
                                      Challenges Encountered
                                    </label>
                                    <Textarea
                                      placeholder="Describe any difficulties you faced and how you addressed them..."
                                      value={formData.difficulty_encountered}
                                      onChange={(e) => setFormData(prev => ({...prev, difficulty_encountered: e.target.value}))}
                                      rows={2}
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">
                                      Actual Time Taken (minutes)
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="How long did this take you?"
                                      value={formData.time_taken || ''}
                                      onChange={(e) => setFormData(prev => ({...prev, time_taken: parseInt(e.target.value) || 0}))}
                                    />
                                  </div>
                                  
                                  {/* File Upload Section */}
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">
                                      Photos & Media * (Minimum {selectedAssignment?.required_media_count || 1})
                                    </label>
                                    
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                      <input
                                        type="file"
                                        multiple
                                        accept="image/*,video/*"
                                        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                                        className="hidden"
                                        id="file-upload"
                                      />
                                      <label htmlFor="file-upload" className="cursor-pointer">
                                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-muted-foreground">
                                          Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Images and videos accepted
                                        </p>
                                      </label>
                                    </div>
                                    
                                    {/* File Preview */}
                                    {mediaFiles.length > 0 && (
                                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {mediaFiles.map((file, index) => (
                                          <div key={index} className="relative">
                                            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                                              {file.type.startsWith('image/') ? (
                                                <img
                                                  src={mediaPreview[index]}
                                                  alt={`Upload ${index + 1}`}
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                  <Video className="w-8 h-8 text-muted-foreground" />
                                                </div>
                                              )}
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="destructive"
                                              onClick={() => removeFile(index)}
                                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                            >
                                              ×
                                            </Button>
                                            <p className="text-xs text-muted-foreground mt-1 truncate">
                                              {file.name}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex gap-4 pt-4">
                                  <Button
                                    onClick={handleSubmit}
                                    disabled={submitting || !formData.title || !formData.description || mediaFiles.length < (selectedAssignment?.required_media_count || 1)}
                                    className="flex-1"
                                  >
                                    {submitting ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                        Submitting...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Submit Assignment
                                      </>
                                    )}
                                  </Button>
                                </div>
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

        <TabsContent value="submitted" className="space-y-4">
          {submittedAssignments.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Submissions Yet</h3>
                <p className="text-muted-foreground">
                  Your submitted assignments will appear here. Start by submitting an available assignment!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {submittedAssignments.map((submission) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="glass-card">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-semibold">{submission.title}</h3>
                              <p className="text-muted-foreground mb-2">
                                Assignment: {submission.assignment_title}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {submission.description}
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              {getStatusBadge(submission.status, submission.is_late_submission)}
                              <div className="text-xs text-muted-foreground">
                                Submitted: {formatDate(submission.submitted_at)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Feedback Section */}
                          {submission.feedback && (
                            <div className="mt-4 p-4 bg-accent/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium">Feedback:</span>
                                {submission.feedback.overall_rating && (
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
                                  </div>
                                )}
                                {submission.feedback.overall_score && (
                                  <span className="text-sm font-medium">
                                    Score: {submission.feedback.overall_score}/100
                                  </span>
                                )}
                              </div>
                              <p className="text-sm">{submission.feedback.feedback_text}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Published: {formatDate(submission.feedback.published_at!)}
                              </p>
                            </div>
                          )}
                          
                          {submission.status === 'pending' && (
                            <div className="mt-4 text-sm text-muted-foreground">
                              Your submission is waiting for instructor review. You'll receive feedback soon!
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}