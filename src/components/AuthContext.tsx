import React, { createContext, useContext, useState, useEffect } from 'react'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { getSupabaseClient } from '../utils/supabase/client'

export interface User {
  id: string
  email: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  profile_complete: boolean
  created_at: string
  avatar_url?: string
  bio?: string
  year_level?: string
  specialization?: string
  phone?: string
  location?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  lastError: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

const buildBasicUser = (authUser: Partial<SupabaseUser> = {}): User => ({
  id: authUser.id || '',
  email: authUser.email || '',
  name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
  role: authUser.user_metadata?.role || 'student',
  profile_complete: false,
  created_at: authUser.created_at || new Date().toISOString(),
  avatar_url: authUser.user_metadata?.avatar_url
})

const sanitizeErrorMessage = (error: any, fallbackMessage: string): string => {
  const errorMessage = error?.message || error?.toString() || String(error)
  if (process.env.NODE_ENV === 'development') console.log('🔍 Raw error for sanitization:', error)

  if (errorMessage.includes('invalid_credentials') || errorMessage.includes('Invalid login credentials'))
    return '❌ Invalid email or password. Please check your credentials.'
  if (errorMessage.includes('email_not_confirmed')) return '📧 Please confirm your email before signing in.'
  if (errorMessage.includes('already_registered')) return '👤 Email already registered. Sign in instead.'
  if (errorMessage.includes('password_too_short')) return '🔒 Password must be at least 6 characters.'
  if (errorMessage.includes('weak_password')) return '🔒 Please choose a stronger password.'
  return fallbackMessage
}

const logError = (context: string, error: any) => {
  console.group(`🔐 [Auth Context] ${context}`)
  console.error(error)
  console.groupEnd()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [operationLoading, setOperationLoading] = useState(false)
  const supabase = getSupabaseClient()

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        if (error) logError('Initial session fetch', error)
        if (isMounted && initialSession?.user) {
          setSession(initialSession)
          setUser(buildBasicUser(initialSession.user))
        }
      } catch (error) {
        logError('Initialize auth error', error)
      } finally {
        if (isMounted) setInitialLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!isMounted) return
      if (session?.user) {
        setSession(session)
        setUser(buildBasicUser(session.user))
      } else {
        setUser(null)
        setSession(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Wrap operations to auto-clear lastError
  const withLoadingAndErrorHandling = async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    setLastError(null)
    setOperationLoading(true)
    try {
      return await operation()
    } finally {
      setOperationLoading(false)
    }
  }

  const signIn = (email: string, password: string) =>
    withLoadingAndErrorHandling(async () => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          const msg = sanitizeErrorMessage(error, '❌ Sign in failed.')
          setLastError(msg)
          logError('Sign in error', error)
          return { success: false, error: msg }
        }
        return { success: true }
      } catch (error) {
        const msg = sanitizeErrorMessage(error, '⚠️ Unexpected error during sign in.')
        setLastError(msg)
        logError('Sign in unexpected error', error)
        return { success: false, error: msg }
      }
    })

  const signUp = (email: string, password: string, name: string, role: string) =>
    withLoadingAndErrorHandling(async () => {
      try {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role } } })
        if (error) {
          const msg = sanitizeErrorMessage(error, '❌ Signup failed.')
          setLastError(msg)
          logError('Sign up error', error)
          return { success: false, error: msg }
        }
        return { success: true }
      } catch (error) {
        const msg = sanitizeErrorMessage(error, '⚠️ Unexpected error during signup.')
        setLastError(msg)
        logError('Sign up unexpected error', error)
        return { success: false, error: msg }
      }
    })

  const signOut = async () => {
    setLastError(null)
    try { await supabase.auth.signOut() }
    catch (error) { logError('Sign out error', error) }
  }

  const resetPassword = (email: string) =>
    withLoadingAndErrorHandling(async () => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
        if (error) {
          const msg = sanitizeErrorMessage(error, 'Failed to send reset email.')
          setLastError(msg)
          return { success: false, error: msg }
        }
        return { success: true }
      } catch {
        const msg = 'An unexpected error occurred. Please try again.'
        setLastError(msg)
        return { success: false, error: msg }
      }
    })

  const updateProfile = async (updates: Partial<User>) =>
    withLoadingAndErrorHandling(async () => {
      if (!user) return { success: false, error: 'Not authenticated' }
      setUser(prev => prev ? { ...prev, ...updates } : null)
      return { success: true }
    })

  const loading = initialLoading || operationLoading

  return (
    <AuthContext.Provider value={{ user, session, lastError, loading, signIn, signUp, signOut, resetPassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
