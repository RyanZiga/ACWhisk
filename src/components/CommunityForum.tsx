import React, { useState, useEffect } from 'react'
import { timeAgo, getRoleColor } from './utils/shared-utils'
import { useAuth } from './AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Alert, AlertDescription } from './ui/alert'
import { Skeleton } from './ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { 
  Plus, 
  MessageCircle, 
  Heart, 
  Reply, 
  Search,
  Filter,
  TrendingUp,
  Clock,
  Users,
  Pin,
  ChefHat,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Menu
} from 'lucide-react'
import { projectId } from '../utils/supabase/info'
import { UnifiedUpload } from './UnifiedUpload'

interface ForumPost {
  id: string
  title: string
  content: string
  category: string
  media_url?: string
  media_type?: 'image' | 'video'
  created_at: string
  author_id: string
  author_name: string
  author_role: string
  author_avatar?: string
  likes: number
  replies: any[]
  is_pinned: boolean
}

interface UserProfile {
  id: string
  name: string
  avatar_url?: string
  role: string
}

export function CommunityForum() {
  const { user, session } = useAuth()
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map())
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general',
    media_url: '',
    media_type: 'image' as 'image' | 'video'
  })

  const categories = [
    { id: 'all', label: 'All Posts', icon: MessageCircle, color: 'text-gray-600' },
    { id: 'recipes', label: 'Recipe Help', icon: ChefHat, color: 'text-orange-600' },
    { id: 'techniques', label: 'Techniques', icon: BookOpen, color: 'text-blue-600' },
    { id: 'equipment', label: 'Equipment', icon: Users, color: 'text-green-600' },
    { id: 'general', label: 'General Discussion', icon: MessageCircle, color: 'text-purple-600' },
    { id: 'tips', label: 'Tips & Tricks', icon: Lightbulb, color: 'text-yellow-600' },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, color: 'text-red-600' }
  ]

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (userProfiles.has(userId)) {
      return userProfiles.get(userId) || null
    }

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cfac176d/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { profile } = await response.json()
        const userProfile: UserProfile = {
          id: userId,
          name: profile.name || 'Community Member',
          avatar_url: profile.avatar_url,
          role: profile.role || 'student'
        }
        
        setUserProfiles(prev => new Map(prev).set(userId, userProfile))
        return userProfile
      }
    } catch (error) {
      console.warn(`Failed to fetch profile for user ${userId}:`, error)
    }

    // Fallback profile
    const fallbackProfile: UserProfile = {
      id: userId,
      name: 'Community Member',
      role: 'student'
    }
    setUserProfiles(prev => new Map(prev).set(userId, fallbackProfile))
    return fallbackProfile
  }

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cfac176d/forum`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { posts: rawPosts } = await response.json()
        
        // Fetch user profiles for all post authors
        const postsWithUserData: ForumPost[] = await Promise.all(
          (rawPosts || []).map(async (post: any) => {
            const userProfile = await fetchUserProfile(post.author_id)
            
            return {
              ...post,
              author_name: userProfile?.name || 'Community Member',
              author_role: userProfile?.role || 'student',
              author_avatar: userProfile?.avatar_url,
              likes: post.likes || 0,
              replies: post.replies || [],
              is_pinned: post.is_pinned || false
            }
          })
        )

        // Sort posts: pinned first, then by creation date
        const sortedPosts = postsWithUserData.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1
          if (!a.is_pinned && b.is_pinned) return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

        setPosts(sortedPosts)
      } else {
        console.error('Failed to fetch posts:', response.status)
      }
    } catch (error) {
      console.error('Error fetching forum posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !user) return

    setCreateLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cfac176d/forum/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPost)
      })

      if (response.ok) {
        const { post } = await response.json()
        const postWithUserData: ForumPost = {
          ...post,
          author_name: user.name || 'You',
          author_role: user.role || 'student',
          author_avatar: user.avatar_url,
          likes: 0,
          replies: [],
          is_pinned: false
        }
        
        setPosts(prev => [postWithUserData, ...prev])
        setNewPost({ title: '', content: '', category: 'general', media_url: '', media_type: 'image' })
        setShowCreateDialog(false)
        setSuccess('Post created successfully!')
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const { error } = await response.json()
        setError(error || 'Failed to create post')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Create post error:', error)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleLikePost = async (postId: string) => {
    if (!session) return

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cfac176d/forum/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { likes } = await response.json()
        setPosts(prev => prev.map(post => 
          post.id === postId ? { ...post, likes } : post
        ))
      }
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.author_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || categories[0]
  }

  const getActivePostsToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return posts.filter(post => new Date(post.created_at) >= today).length
  }

  const getUniqueContributors = () => {
    const uniqueAuthors = new Set(posts.map(post => post.author_id))
    return uniqueAuthors.size
  }

  const PostCard = ({ post }: { post: ForumPost }) => {
    const categoryInfo = getCategoryInfo(post.category)
    const CategoryIcon = categoryInfo.icon

    if (isMobile) {
      // Mobile layout
      return (
        <Card className="glass-card hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="space-y-3">
              {/* Mobile Header */}
              <div className="flex items-start gap-2">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={post.author_avatar} alt={post.author_name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {post.author_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'CM'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{post.author_name}</p>
                    <Badge className={`${getRoleColor(post.author_role)} text-xs`} variant="secondary">
                      {post.author_role}
                    </Badge>
                    {post.is_pinned && (
                      <Pin className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <CategoryIcon className={`h-3 w-3 ${categoryInfo.color}`} />
                    <span className="truncate">{categoryInfo.label}</span>
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    <span>{timeAgo(post.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Mobile Content */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold line-clamp-2 leading-tight">{post.title}</h3>
                <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">{post.content}</p>
              </div>

              {/* Mobile Media */}
              {post.media_url && (
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted">
                  {post.media_type === 'video' ? (
                    <video 
                      src={post.media_url} 
                      className="w-full h-full object-cover"
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <img 
                      src={post.media_url} 
                      alt="Post media"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Mobile Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 h-7 px-2 text-xs"
                    onClick={() => handleLikePost(post.id)}
                  >
                    <Heart className="h-3 w-3" />
                    <span>{post.likes}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 h-7 px-2 text-xs">
                    <Reply className="h-3 w-3" />
                    <span>{post.replies?.length || 0}</span>
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                  View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Desktop layout
    return (
      <Card className="glass-card hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Desktop Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={post.author_avatar} alt={post.author_name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {post.author_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'CM'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{post.author_name}</p>
                    <Badge className={`${getRoleColor(post.author_role)} text-xs`} variant="secondary">
                      {post.author_role}
                    </Badge>
                    {post.is_pinned && (
                      <Pin className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <CategoryIcon className={`h-4 w-4 ${categoryInfo.color}`} />
                    <span>{categoryInfo.label}</span>
                    <span>•</span>
                    <Clock className="h-4 w-4" />
                    <span>{timeAgo(post.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Content */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold line-clamp-2">{post.title}</h3>
              <p className="text-muted-foreground line-clamp-3">{post.content}</p>
            </div>

            {/* Desktop Media */}
            {post.media_url && (
              <div className="w-full max-w-md aspect-video rounded-lg overflow-hidden bg-muted">
                {post.media_type === 'video' ? (
                  <video 
                    src={post.media_url} 
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                  />
                ) : (
                  <img 
                    src={post.media_url} 
                    alt="Post media"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}

            {/* Desktop Actions */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={() => handleLikePost(post.id)}
              >
                <Heart className="h-4 w-4" />
                <span>{post.likes} likes</span>
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <Reply className="h-4 w-4" />
                <span>{post.replies?.length || 0} replies</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${isMobile ? 'px-2' : 'px-0'}`}>
        <Skeleton className={`h-6 w-32 ${isMobile ? '' : 'sm:h-8 sm:w-48'}`} />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="glass-card">
              <CardContent className={`${isMobile ? 'p-3' : 'p-6'} space-y-3`}>
                <div className="flex items-center gap-3">
                  <Skeleton className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} rounded-full`} />
                  <div className="space-y-2">
                    <Skeleton className={`h-3 ${isMobile ? 'w-24' : 'w-32'}`} />
                    <Skeleton className={`h-2 ${isMobile ? 'w-16' : 'w-24'}`} />
                  </div>
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className={`${isMobile ? 'h-12' : 'h-16'} w-full`} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${isMobile ? 'px-2' : 'px-0'}`}>
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row items-center justify-between'} gap-4`}>
        <div className={isMobile ? 'text-center' : 'text-left'}>
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>Community Forum</h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
            Connect, discuss, and learn with fellow culinary enthusiasts
          </p>
        </div>
        
        {session && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className={`gap-2 ${isMobile ? 'w-full' : 'w-auto'}`}>
                <Plus className="h-4 w-4" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-modal">
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
                <DialogDescription>
                  Share your thoughts, ask questions, or start a discussion
                </DialogDescription>
              </DialogHeader>
              
              {(error || success) && (
                <Alert className={success ? 'border-green-200 bg-green-50' : ''}>
                  <AlertDescription className={success ? 'text-green-800' : ''}>
                    {error || success}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={newPost.category}
                    onChange={(e) => setNewPost(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  >
                    {categories.slice(1).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newPost.title}
                    onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="What's your post about?"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={newPost.content}
                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Share your thoughts, questions, or tips..."
                    rows={6}
                    required
                  />
                </div>

                <UnifiedUpload
                  onMediaChange={(url, mediaType) => setNewPost(prev => ({ 
                    ...prev, 
                    media_url: url,
                    media_type: mediaType || 'image'
                  }))}
                  currentMedia={newPost.media_url}
                  currentMediaType={newPost.media_type}
                  label="Add Media (Optional)"
                  bucket="forums"
                  allowVideo={true}
                  allowImage={true}
                  enableOptimization={true}
                  targetImageWidth={800}
                  compressionQuality={0.8}
                  maxSizeMB={3}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLoading}>
                    {createLoading ? 'Posting...' : 'Create Post'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-10 w-full ${isMobile ? 'text-sm' : 'text-base'}`}
          />
        </div>
        {isMobile && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowMobileFilter(!showMobileFilter)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Mobile Filter Dropdown */}
      {isMobile && showMobileFilter && (
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(category.id)
                      setShowMobileFilter(false)
                    }}
                    className="justify-start gap-2 text-xs p-2"
                  >
                    <Icon className="h-3 w-3" />
                    <span className="truncate">{category.label}</span>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {isMobile ? (
        // Mobile Content Layout
        <div className="space-y-4">
          {/* Mobile Stats */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <MessageCircle className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold">{filteredPosts.length}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold">{getActivePostsToday()}</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <Users className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                <p className="text-lg font-bold">{getUniqueContributors()}</p>
                <p className="text-xs text-muted-foreground">Users</p>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Posts */}
          <div className="space-y-3">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-sm font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-4 text-xs">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'Be the first to start a discussion!'
                  }
                </p>
                {session && !searchTerm && (
                  <Button onClick={() => setShowCreateDialog(true)} className="w-full text-sm">
                    Create First Post
                  </Button>
                )}
              </div>
            ) : (
              filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </div>
        </div>
      ) : (
        // Desktop Content Layout
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
          <TabsList className="grid grid-cols-7 w-full">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id} 
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{category.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="space-y-6">
              {/* Desktop Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold">{filteredPosts.length}</p>
                        <p className="text-sm text-muted-foreground">Total Posts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold">{getActivePostsToday()}</p>
                        <p className="text-sm text-muted-foreground">Active Today</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold">{getUniqueContributors()}</p>
                        <p className="text-sm text-muted-foreground">Contributors</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Desktop Posts */}
              <div className="space-y-4">
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm 
                        ? 'Try adjusting your search terms' 
                        : 'Be the first to start a discussion in this category!'
                      }
                    </p>
                    {session && !searchTerm && (
                      <Button onClick={() => setShowCreateDialog(true)}>
                        Create First Post
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Community Guidelines */}
      <Card className="glass-card">
        <CardHeader className={isMobile ? 'text-center' : 'text-left'}>
          <CardTitle className={`flex items-center ${isMobile ? 'justify-center' : 'justify-start'} gap-2`}>
            <Pin className="h-5 w-5" />
            Community Guidelines
          </CardTitle>
          <CardDescription className={isMobile ? 'text-center' : 'text-left'}>
            Help us maintain a welcoming and helpful community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6 text-sm`}>
            <div className={isMobile ? 'text-center' : 'text-left'}>
              <h4 className="font-medium text-green-800 mb-3">✅ Do:</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Be respectful and constructive</li>
                <li>• Share helpful tips and experiences</li>
                <li>• Ask questions when learning</li>
                <li>• Credit original recipes and sources</li>
              </ul>
            </div>
            <div className={isMobile ? 'text-center' : 'text-left'}>
              <h4 className="font-medium text-red-800 mb-3">❌ Don't:</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Post spam or promotional content</li>
                <li>• Share inappropriate content</li>
                <li>• Be disrespectful to other members</li>
                <li>• Post duplicate questions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {success && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}

export default CommunityForum
