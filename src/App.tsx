import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { AuthProvider, useAuth } from './components/AuthContext'
import { ThemeProvider } from './components/ThemeContext'
import { NotificationProvider } from './components/ui/notification'
import { ErrorBoundary, AsyncErrorBoundary } from './components/ErrorBoundary'
import { ServiceWorkerManager } from './components/ServiceWorkerManager'
import { Auth } from './components/Auth'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { OfflineIndicator } from './components/OfflineIndicator'
import { Toaster } from './components/ui/sonner'
import { MotionSpinner } from './components/ui/motion'
import { getSupabaseClient } from './utils/supabase/client'

// Lazy load heavy components to improve initial load time
const RecipeManager = lazy(() => import('./components/RecipeManager').then(m => ({ default: m.RecipeManager })))
const LearningHub = lazy(() => import('./components/LearningHub').then(m => ({ default: m.LearningHub })))
const CommunityForum = lazy(() => import('./components/CommunityForum').then(m => ({ default: m.CommunityForum })))
const ChatAssistant = lazy(() => import('./components/ChatAssistant').then(m => ({ default: m.ChatAssistant })))
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })))
const ProfileSettings = lazy(() => import('./components/ProfileSettings').then(m => ({ default: m.ProfileSettings })))
const DigitalPortfolio = lazy(() => import('./components/DigitalPortfolio').then(m => ({ default: m.DigitalPortfolio })))
const ProfileInitializer = lazy(() => import('./components/ProfileInitializer').then(m => ({ default: m.ProfileInitializer })))
const RealTimeNotifications = lazy(() => import('./components/RealTimeNotifications').then(m => ({ default: m.RealTimeNotifications })))
const StudentFeedback = lazy(() => import('./components/StudentFeedback').then(m => ({ default: m.StudentFeedback })))
const StudentSubmissions = lazy(() => import('./components/StudentSubmissions').then(m => ({ default: m.StudentSubmissions })))
const InstructorAssignments = lazy(() => import('./components/InstructorAssignments').then(m => ({ default: m.InstructorAssignments })))

// Centralized loading component to eliminate duplication
const LoadingSpinner = ({ size = 40, message = "Loading..." }: { size?: number; message?: string }) => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center space-y-4">
      <MotionSpinner size={size} color="var(--primary)" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
)

// Full screen loading for initial app states
const FullScreenLoading = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-glass-gradient flex items-center justify-center">
    <div className="text-center space-y-6">
      <MotionSpinner size={60} color="var(--primary)" />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">ACWhisk</h1>
        <p className="text-muted-foreground">{message}</p>
        <div className="w-2 h-2 bg-primary rounded-full mx-auto"></div>
      </div>
    </div>
  </div>
)

// Database setup screen component
const DatabaseSetupScreen = () => (
  <div className="min-h-screen bg-glass-gradient">        
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to ACWhisk! 🍳</h1>
          <p className="text-muted-foreground">
            Let's set up your database to get started with your culinary platform.
          </p>
          
          {/* Emergency fix banner for critical auth issues */}
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <h2 className="text-lg font-semibold text-red-400 mb-2">🚨 Getting "Database error saving new user"?</h2>
            <p className="text-red-300 text-sm mb-3">
              This critical error prevents user registration. Use the <strong>Database Authentication Checker</strong> below for an immediate fix.
            </p>
            <div className="text-xs text-red-300/80">
              The most common cause is RLS being enabled on the auth.users table, which breaks authentication completely.
            </div>
          </div>
        </div>
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner message="Loading database setup..." />}>
            <DatabaseSetup />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  </div>
)

function AppContent() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [databaseReady, setDatabaseReady] = useState<boolean | null>(null)
  const [dbCheckError, setDbCheckError] = useState<string | null>(null)

  // Improved database check with better error handling
  const checkDatabaseSetup = useCallback(async () => {
    if (!user) {
      setDatabaseReady(null)
      setDbCheckError(null)
      return
    }

    try {
      setDbCheckError(null)
      
      // Quick and lightweight check with proper timeout
      const dbCheck = getSupabaseClient()
        .from('profiles')
        .select('id')
        .limit(1)
        .single()

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database check timeout')), 3000)
      )

      const { error } = await Promise.race([dbCheck, timeoutPromise])

      // If profiles table doesn't exist, database needs setup
      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
          setDatabaseReady(false)
          return
        }
        
        // For other errors, log but don't block the app
        console.warn('Database check returned error:', error)
        setDbCheckError(`Database check failed: ${error.message}`)
      }

      // If no error or non-critical error, assume database is ready
      setDatabaseReady(true)
      
    } catch (error) {
      console.warn('Database check failed:', error)
      
      // On timeout or connection error, assume database is ready to avoid blocking
      if (error instanceof Error && error.message.includes('timeout')) {
        setDbCheckError('Database check timed out - proceeding anyway')
        setDatabaseReady(true)
      } else {
        setDbCheckError('Database connectivity issue - proceeding anyway')
        setDatabaseReady(true)
      }
    }
  }, [user])

  useEffect(() => {
    checkDatabaseSetup()
  }, [checkDatabaseSetup])

  // Show loading during auth check
  if (loading) {
    return <FullScreenLoading message="Loading your culinary platform..." />
  }

  // Show auth screen if not authenticated
  if (!user) {
    return <Auth />
  }

  // Show database setup if database is not ready
  if (databaseReady === false) {
    return <DatabaseSetupScreen />
  }

  // Show loading while checking database
  if (databaseReady === null) {
    return <FullScreenLoading message="Checking database setup..." />
  }

  // Render content based on active tab with error boundaries
  const renderContent = () => {
    const contentMap = {
      dashboard: <Dashboard onTabChange={setActiveTab} />,
      recipes: <RecipeManager />,
      portfolio: <DigitalPortfolio />,
      learning: <LearningHub />,
      forum: <CommunityForum />,
      chat: <ChatAssistant />,
      feedback: <StudentFeedback />,
      assignments: user?.role === 'instructor' ? <InstructorAssignments /> : <StudentSubmissions />,
      submissions: <StudentSubmissions />,
      resources: (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Teaching Resources</h2>
          <p className="text-muted-foreground mb-6">
            Upload and manage your educational content and materials
          </p>
          <div className="bg-accent/50 rounded-lg p-8 max-w-md mx-auto">
            <p className="text-sm text-muted-foreground">
              Resource management is coming soon! Instructors will be able to:
            </p>
            <ul className="text-sm text-muted-foreground mt-4 space-y-1 text-left">
              <li>• Upload video tutorials</li>
              <li>• Share lesson plans</li>
              <li>• Create learning modules</li>
              <li>• Organize by skill level</li>
            </ul>
          </div>
        </div>
      ),
      admin: <AdminPanel />,
      database: <DatabaseSetup />,
      profile: <ProfileSettings />,
    }

    const content = contentMap[activeTab as keyof typeof contentMap] || contentMap.dashboard

    // Wrap lazy-loaded components in Suspense
    const needsSuspense = ['recipes', 'portfolio', 'learning', 'forum', 'chat', 'feedback', 'assignments', 'submissions', 'admin', 'database', 'profile'].includes(activeTab)

    return (
      <ErrorBoundary>
        {needsSuspense ? (
          <Suspense fallback={<LoadingSpinner message={`Loading ${activeTab}...`} />}>
            {content}
          </Suspense>
        ) : (
          content
        )}
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      {/* Profile Initializer - handles user profile setup */}
      <Suspense fallback={null}>
        <ProfileInitializer />
      </Suspense>
      
      {/* Main Layout */}
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {/* Real-time notifications */}
        <Suspense fallback={null}>
          <RealTimeNotifications onTabChange={setActiveTab} />
        </Suspense>
        
        {/* Database error indicator */}
        {dbCheckError && (
          <div className="fixed top-4 right-4 z-50 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg max-w-sm">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ {dbCheckError}
            </p>
          </div>
        )}
        
        {/* Main content */}
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <AsyncErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <ServiceWorkerManager>
            <AuthProvider>
              <ErrorBoundary>
                <AppContent />
                <OfflineIndicator />
                <Toaster />
              </ErrorBoundary>
            </AuthProvider>
          </ServiceWorkerManager>
        </NotificationProvider>
      </ThemeProvider>
    </AsyncErrorBoundary>
  )
}
