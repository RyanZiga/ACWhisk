import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { AuthProvider, useAuth } from './components/AuthContext'
import { ThemeProvider } from './components/ThemeContext'
import { NotificationProvider } from './components/ui/notification'
import { ErrorBoundary, AsyncErrorBoundary } from './components/ErrorBoundary'
import { Auth } from './components/Auth'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { OfflineIndicator } from './components/OfflineIndicator'
import { Toaster } from './components/ui/sonner'
import { MotionSpinner } from './components/ui/motion'
import { getSupabaseClient } from './utils/supabase/client'

// Lazy-loaded components
const RecipeManager = lazy(() => import('./components/RecipeManager').then(m => ({ default: m.RecipeManager })))
const ProfileInitializer = lazy(() => import('./components/ProfileInitializer').then(m => ({ default: m.ProfileInitializer })))
const RealTimeNotifications = lazy(() => import('./components/RealTimeNotifications').then(m => ({ default: m.RealTimeNotifications })))
const DatabaseSetup = lazy(() => import('./components/DatabaseSetup').then(m => ({ default: m.DatabaseSetup })))

const FullScreenLoading = ({ message }: { message: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-glass-gradient">
    <div className="text-center space-y-4">
      <MotionSpinner size={60} color="var(--primary)" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  </div>
)

const LoadingSpinner = ({ message }: { message?: string }) => (
  <div className="flex justify-center items-center py-12">
    <MotionSpinner size={40} color="var(--primary)" />
    {message && <p className="ml-2 text-sm text-muted-foreground">{message}</p>}
  </div>
)

function AppContent() {
  const { user, loading } = useAuth()
  const [databaseReady, setDatabaseReady] = useState<boolean | null>(null)
  const [dbCheckError, setDbCheckError] = useState<string | null>(null)

  // Safe database check
  const checkDatabaseSetup = useCallback(async () => {
    if (!user) {
      setDatabaseReady(null)
      setDbCheckError(null)
      return
    }

    try {
      setDbCheckError(null)
      const dbCheck = getSupabaseClient()
        .from('profiles')
        .select('id')
        .limit(1)
        .single()

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database check timeout')), 3000)
      )

      const { error } = await Promise.race([dbCheck, timeout]).catch(err => ({ error: err }))

      if (error) {
        console.warn('Database check error:', error)
        setDbCheckError(error.message || 'Database check failed')
        setDatabaseReady(true) // Proceed anyway
        return
      }

      setDatabaseReady(true)
    } catch (err) {
      console.warn('Database check exception:', err)
      setDbCheckError('Database check failed, proceeding anyway')
      setDatabaseReady(true)
    }
  }, [user])

  useEffect(() => {
    checkDatabaseSetup()
  }, [checkDatabaseSetup])

  // Loading states
  if (loading) return <FullScreenLoading message="Checking authentication..." />
  if (!user) return <Auth />
  if (databaseReady === false) {
    return (
      <Suspense fallback={<FullScreenLoading message="Loading database setup..." />}>
        <DatabaseSetup />
      </Suspense>
    )
  }
  if (databaseReady === null) return <FullScreenLoading message="Checking database..." />

  // Main content
  return (
    <>
      <Suspense fallback={null}>
        <ProfileInitializer />
      </Suspense>

      {dbCheckError && (
        <div className="fixed top-4 right-4 z-50 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg max-w-sm">
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            ⚠️ {dbCheckError}
          </p>
        </div>
      )}

      <Layout activeTab="dashboard" onTabChange={() => {}}>
        <Suspense fallback={null}>
          <RealTimeNotifications />
        </Suspense>

        <Dashboard />
      </Layout>
    </>
  )
}

export default function App() {
  return (
    <AsyncErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <ErrorBoundary>
              <AppContent />
              <OfflineIndicator />
              <Toaster />
            </ErrorBoundary>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </AsyncErrorBoundary>
  )
}
