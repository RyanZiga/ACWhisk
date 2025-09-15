import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { 
  Plus, 
  Clock, 
  Users, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Edit3, 
  Eye,
  BookOpen,
  Star,
  MessageSquare,
  Timer,
  ChefHat,
  FileText,
  BarChart3,
  Settings,
  Copy,
  Trash2
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
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Separator } from './ui/separator'
import { Alert, AlertDescription } from './ui/alert'
import { supabase } from '../utils/supabase/client'
import { useAuth } from './AuthContext'
import { toast } from 'sonner@2.0.3'

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
  created_at: string
  // Statistics
  total_submissions?: number
  pending_submissions?: number
  reviewed_submissions?: number
  avg_score?: number
}

interface AssignmentFormData {
  title: string
  description: string
  instructions: string
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
}

const ASSIGNMENT_CATEGORIES = [
  'Soups & Stews',
  'Main Courses',
  'Desserts',
  'Appetizers',
  'Baking & Pastry',
  'International Cuisine',
  'Techniques',
  'Knife Skills',
  'Plating & Presentation'
]

export function InstructorAssignments() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: '',
    description: '',
    instructions: '',
    category: 'Main Courses',
    assignment_type: 'recipe',
    difficulty_level: 'beginner',
    estimated_time: 60,
    max_score: 100,
    due_date: '',
    is_active: true,
    allow_late_submissions: true,
    required_media_count: 3,
    allow_video: true,
    allow_multiple_files: true
  })

  useEffect(() => {
    if (user && user.role === 'instructor') {
      fetchAssignments()
    }
  }, [user])

  const fetchAssignments = async () => {
    try {
      // Mock data for demonstration - replace with actual Supabase query
      const mockAssignments: Assignment[] = [
        {
          id: '1',
          title: 'Classic French Onion Soup',
          description: 'Create a traditional French onion soup with proper caramelization techniques and cheese gratinée.',
          instructions: 'Focus on achieving deep caramelization of onions (45-60 minutes). Use proper beef stock and finish with gruyère cheese under the broiler. Document the caramelization process and final presentation.',
          category: 'Soups & Stews',
          assignment_type: 'recipe',
          difficulty_level: 'intermediate',
          estimated_time: 120,
          max_score: 100,
          due_date: '2024-02-15T23:59:59Z',
          is_active: true,
          allow_late_submissions: true,
          required_media_count: 3,
          allow_video: true,
          allow_multiple_files: true,
          created_at: '2024-01-10T10:00:00Z',
          total_submissions: 12,
          pending_submissions: 3,
          reviewed_submissions: 9,
          avg_score: 87.5
        },
        {
          id: '2',
          title: 'Knife Skills Assessment',
          description: 'Demonstrate proper knife handling and cutting techniques including julienne, brunoise, and chiffonade.',
          instructions: 'Video demonstration required. Show proper grip, stance, and cutting motion. Include close-ups of final cuts.',
          category: 'Knife Skills',
          assignment_type: 'technique',
          difficulty_level: 'beginner',
          estimated_time: 45,
          max_score: 100,
          due_date: '2024-02-20T23:59:59Z',
          is_active: true,
          allow_late_submissions: false,
          required_media_count: 2,
          allow_video: true,
          allow_multiple_files: true,
          created_at: '2024-01-08T14:30:00Z',
          total_submissions: 18,
          pending_submissions: 1,
          reviewed_submissions: 17,
          avg_score: 92.3
        },
        {
          id: '3',
          title: 'Chocolate Soufflé Challenge',
          description: 'Master the art of soufflé making with proper folding technique and timing.',
          instructions: 'Document the entire process from tempering chocolate to final presentation. Include both successes and failures.',
          category: 'Desserts',
          assignment_type: 'recipe',
          difficulty_level: 'advanced',
          estimated_time: 90,
          max_score: 150,
          due_date: '2024-02-25T23:59:59Z',
          is_active: false,
          allow_late_submissions: true,
          required_media_count: 4,
          allow_video: true,
          allow_multiple_files: true,
          created_at: '2024-01-12T09:15:00Z',
          total_submissions: 8,
          pending_submissions: 0,
          reviewed_submissions: 8,
          avg_score: 78.9
        }
      ]

      setAssignments(mockAssignments)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching assignments:', error)
      toast.error('Failed to load assignments')
      setLoading(false)
    }
  }

  const handleCreateAssignment = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please provide at least a title and description')
      return
    }

    if (!formData.due_date) {
      toast.error('Please set a due date')
      return
    }

    setCreating(true)

    try {
      // Here you would create the assignment in Supabase
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      const newAssignment: Assignment = {
        id: Date.now().toString(),
        ...formData,
        created_at: new Date().toISOString(),
        total_submissions: 0,
        pending_submissions: 0,
        reviewed_submissions: 0,
        avg_score: 0
      }

      setAssignments(prev => [newAssignment, ...prev])
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        instructions: '',
        category: 'Main Courses',
        assignment_type: 'recipe',
        difficulty_level: 'beginner',
        estimated_time: 60,
        max_score: 100,
        due_date: '',
        is_active: true,
        allow_late_submissions: true,
        required_media_count: 3,
        allow_video: true,
        allow_multiple_files: true
      })
      
      setIsCreateDialogOpen(false)
      toast.success('Assignment created successfully!')
    } catch (error) {
      console.error('Error creating assignment:', error)
      toast.error('Failed to create assignment')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (assignmentId: string, isActive: boolean) => {
    try {
      setAssignments(prev => prev.map(a => 
        a.id === assignmentId ? { ...a, is_active: isActive } : a
      ))
      toast.success(`Assignment ${isActive ? 'activated' : 'deactivated'}`)
    } catch (error) {
      console.error('Error updating assignment:', error)
      toast.error('Failed to update assignment')
    }
  }

  const handleDuplicateAssignment = async (assignment: Assignment) => {
    try {
      const duplicatedAssignment: Assignment = {
        ...assignment,
        id: Date.now().toString(),
        title: `${assignment.title} (Copy)`,
        created_at: new Date().toISOString(),
        due_date: '', // Reset due date
        total_submissions: 0,
        pending_submissions: 0,
        reviewed_submissions: 0,
        avg_score: 0
      }

      setAssignments(prev => [duplicatedAssignment, ...prev])
      toast.success('Assignment duplicated successfully!')
    } catch (error) {
      console.error('Error duplicating assignment:', error)
      toast.error('Failed to duplicate assignment')
    }
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'text-green-600 bg-green-500/20 border-green-500/30'
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-500/20 border-yellow-500/30'
      case 'advanced':
        return 'text-red-600 bg-red-500/20 border-red-500/30'
      default:
        return 'text-gray-600 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'recipe':
        return <ChefHat className="w-4 h-4" />
      case 'technique':
        return <BookOpen className="w-4 h-4" />
      case 'project':
        return <FileText className="w-4 h-4" />
      case 'exam':
        return <BarChart3 className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isOverdue = (dueDate: string) => {
    return dueDate && new Date() > new Date(dueDate)
  }

  const activeAssignments = assignments.filter(a => a.is_active)
  const inactiveAssignments = assignments.filter(a => !a.is_active)
  const totalPending = assignments.reduce((sum, a) => sum + (a.pending_submissions || 0), 0)
  const totalSubmissions = assignments.reduce((sum, a) => sum + (a.total_submissions || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Assignment Management</h1>
          <p className="text-muted-foreground">
            Create and manage assignments for your students
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="glass-card p-3 text-center min-w-[80px]">
            <div className="text-2xl font-bold text-blue-600">{activeAssignments.length}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="glass-card p-3 text-center min-w-[80px]">
            <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="glass-card p-3 text-center min-w-[80px]">
            <div className="text-2xl font-bold text-green-600">{totalSubmissions}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>
      </div>

      {/* Create Assignment Button */}
      <div className="flex justify-end">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-modal">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
              <DialogDescription>
                Create a new assignment for your students with detailed requirements and grading criteria.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Assignment Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Classic French Onion Soup"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({...prev, category: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNMENT_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what students need to accomplish..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="instructions">Detailed Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Provide step-by-step instructions, tips, and requirements..."
                  value={formData.instructions}
                  onChange={(e) => setFormData(prev => ({...prev, instructions: e.target.value}))}
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="type">Assignment Type</Label>
                  <Select
                    value={formData.assignment_type}
                    onValueChange={(value: 'recipe' | 'technique' | 'project' | 'exam') => 
                      setFormData(prev => ({...prev, assignment_type: value}))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recipe">Recipe</SelectItem>
                      <SelectItem value="technique">Technique</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={formData.difficulty_level}
                    onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => 
                      setFormData(prev => ({...prev, difficulty_level: value}))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="time">Est. Time (min)</Label>
                  <Input
                    id="time"
                    type="number"
                    value={formData.estimated_time}
                    onChange={(e) => setFormData(prev => ({...prev, estimated_time: parseInt(e.target.value) || 0}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="score">Max Score</Label>
                  <Input
                    id="score"
                    type="number"
                    value={formData.max_score}
                    onChange={(e) => setFormData(prev => ({...prev, max_score: parseInt(e.target.value) || 100}))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="due-date">Due Date *</Label>
                  <Input
                    id="due-date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({...prev, due_date: e.target.value}))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="media-count">Required Photos</Label>
                  <Input
                    id="media-count"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.required_media_count}
                    onChange={(e) => setFormData(prev => ({...prev, required_media_count: parseInt(e.target.value) || 1}))}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <Label>Settings</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({...prev, is_active: checked}))}
                    />
                    <Label htmlFor="active">Make active immediately</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="late"
                      checked={formData.allow_late_submissions}
                      onCheckedChange={(checked) => setFormData(prev => ({...prev, allow_late_submissions: checked}))}
                    />
                    <Label htmlFor="late">Allow late submissions</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="video"
                      checked={formData.allow_video}
                      onCheckedChange={(checked) => setFormData(prev => ({...prev, allow_video: checked}))}
                    />
                    <Label htmlFor="video">Allow video uploads</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="multiple"
                      checked={formData.allow_multiple_files}
                      onCheckedChange={(checked) => setFormData(prev => ({...prev, allow_multiple_files: checked}))}
                    />
                    <Label htmlFor="multiple">Allow multiple files</Label>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleCreateAssignment}
                  disabled={creating || !formData.title || !formData.description || !formData.due_date}
                  className="flex-1"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Assignment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-card p-1">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Active ({activeAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Inactive ({inactiveAssignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAssignments.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Assignments</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first assignment to start engaging with students.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Assignment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeAssignments.map((assignment) => (
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
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                {getTypeIcon(assignment.assignment_type)}
                                <h3 className="text-xl font-semibold">{assignment.title}</h3>
                                <Badge variant="outline" className={getDifficultyColor(assignment.difficulty_level)}>
                                  {assignment.difficulty_level}
                                </Badge>
                              </div>
                              
                              <p className="text-muted-foreground mb-3 line-clamp-2">
                                {assignment.description}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <Timer className="w-4 h-4" />
                                  {assignment.estimated_time} min
                                </span>
                                <span className="text-muted-foreground">
                                  {assignment.category}
                                </span>
                                <span className="text-muted-foreground">
                                  Max: {assignment.max_score} pts
                                </span>
                                <span className={`font-medium ${
                                  isOverdue(assignment.due_date) ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  Due: {formatDate(assignment.due_date)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Statistics */}
                          <div className="grid grid-cols-4 gap-4 mt-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{assignment.total_submissions || 0}</div>
                              <div className="text-xs text-muted-foreground">Total</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-yellow-600">{assignment.pending_submissions || 0}</div>
                              <div className="text-xs text-muted-foreground">Pending</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{assignment.reviewed_submissions || 0}</div>
                              <div className="text-xs text-muted-foreground">Reviewed</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">{assignment.avg_score?.toFixed(1) || '0.0'}</div>
                              <div className="text-xs text-muted-foreground">Avg Score</div>
                            </div>
                          </div>
                          
                          {(assignment.pending_submissions || 0) > 0 && (
                            <Alert className="mt-4">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                You have {assignment.pending_submissions} pending submissions to review.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        
                        <div className="flex gap-2 lg:flex-col lg:min-w-[120px]">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDuplicateAssignment(assignment)}
                            className="flex-1"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </Button>
                          
                          <div className="flex items-center gap-2 p-2">
                            <Switch
                              checked={assignment.is_active}
                              onCheckedChange={(checked) => handleToggleActive(assignment.id, checked)}
                            />
                            <Label className="text-xs">Active</Label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {inactiveAssignments.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Inactive Assignments</h3>
                <p className="text-muted-foreground">
                  Deactivated assignments will appear here for reference.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {inactiveAssignments.map((assignment) => (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="glass-card opacity-75">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(assignment.assignment_type)}
                            <h3 className="text-xl font-semibold">{assignment.title}</h3>
                            <Badge variant="outline" className="bg-gray-500/20 text-gray-600 border-gray-500/30">
                              Inactive
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground mb-3">
                            {assignment.description}
                          </p>
                          
                          <div className="text-sm text-muted-foreground">
                            Final Stats: {assignment.total_submissions} submissions, 
                            {assignment.avg_score?.toFixed(1)} avg score
                          </div>
                        </div>
                        
                        <div className="flex gap-2 lg:flex-col">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleToggleActive(assignment.id, true)}
                          >
                            Reactivate
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDuplicateAssignment(assignment)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </Button>
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