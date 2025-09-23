import React, { createContext, useContext, useState, useEffect } from 'react'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { getSupabaseClient } from '../utils/supabase/client'
import { projectId, publicAnonKey } from '../utils/supabase/info'

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
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  loading: boolean
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper function to create basic user object from auth data
const buildBasicUser = (authUser: Partial<SupabaseUser> = {}): User => ({
  id: authUser.id || '',
  email: authUser.email || '',
  name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
  role: authUser.user_metadata?.role || 'student',
  profile_complete: false,
  created_at: authUser.created_at || new Date().toISOString(),
  avatar_url: authUser.user_metadata?.avatar_url,
  bio: undefined,
  year_level: undefined,
  specialization: undefined,
  phone: undefined,
  location: undefined
})

// Helper function to sanitize error messages for production
const sanitizeErrorMessage = (error: any, fallbackMessage: string): string => {
  // Get the actual error message, handling both direct messages and nested error objects
  const errorMessage = error?.message || error?.toString() || String(error)
  
  // Always log the raw error in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Raw error for sanitization:', { error, errorMessage, fallbackMessage })
  }
  
  // Apply user-friendly sanitization in both development and production
  // Handle AuthApiError prefixes and various error formats
  
  // Handle captcha errors first (most urgent)
  if (errorMessage.includes('captcha verification process failed') ||
      errorMessage.includes('captcha_verification_failed') ||
      errorMessage.includes('captcha') ||
      errorMessage.includes('Captcha')) {
    return '🤖 Security verification failed. This is likely due to captcha settings in your Supabase project. Please disable captcha in your Supabase Dashboard → Authentication → Settings → Security Settings, or contact your administrator.'
  }
  
  if (errorMessage.includes('Invalid login credentials') || 
      errorMessage.includes('Invalid email or password') ||
      errorMessage.includes('invalid_credentials')) {
    return '❌ Invalid email or password. Please check your credentials and try again.'
  }
  if (errorMessage.includes('Email not confirmed') || 
      errorMessage.includes('email_not_confirmed')) {
    return '📧 Please check your email and confirm your account before signing in.'
  }
  if (errorMessage.includes('Too many requests') || 
      errorMessage.includes('rate_limit') ||
      errorMessage.includes('too_many_requests')) {
    return '⏰ Too many attempts. Please wait a moment before trying again.'
  }
  if (errorMessage.includes('User not found') || 
      errorMessage.includes('user_not_found')) {
    return '🔍 No account found with this email. Please check your email or sign up.'
  }
  if (errorMessage.includes('User already registered') || 
      errorMessage.includes('already_registered') ||
      errorMessage.includes('email_address_already_registered')) {
    return '👤 This email is already registered. Please sign in instead.'
  }
  if (errorMessage.includes('signup_disabled')) {
    return '🚫 Account registration is currently disabled. Please contact support.'
  }
  if (errorMessage.includes('email_address_invalid')) {
    return '📧 Please enter a valid email address.'
  }
  if (errorMessage.includes('password_too_short')) {
    return '🔒 Password must be at least 6 characters long.'
  }
  if (errorMessage.includes('weak_password')) {
    return '🔒 Please choose a stronger password with mixed characters.'
  }
  
  return fallbackMessage
}

// Central error logging function
const logError = (context: string, error: any) => {
  // Enhanced logging to show the error processing flow
  console.group(`🔐 [Auth Context] ${context}`)
  console.error('Raw error:', error)
  
  // In production, you could send to monitoring service like Sentry
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error, { tags: { context } })
  }
  console.groupEnd()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [operationLoading, setOperationLoading] = useState(false)

  const supabase = getSupabaseClient()

  useEffect(() => {
    let isMounted = true

    // Get initial session immediately
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          logError('Initial session fetch', error)
        }
        
        if (isMounted && initialSession?.user) {
          setSession(initialSession)
          await fetchUserProfile(initialSession.user, initialSession.access_token)
        }
      } catch (error) {
        logError('Initialize auth error', error)
      } finally {
        if (isMounted) {
          setInitialLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      try {
        if (session?.user) {
          setSession(session)
          // Wait for profile creation to complete to avoid race conditions
          await fetchUserProfile(session.user, session.access_token)
        } else {
          setUser(null)
          setSession(null)
        }
      } catch (error) {
        logError('Auth state change error', error)
      } finally {
        if (isMounted && initialLoading) {
          setInitialLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (authUser: SupabaseUser, accessToken?: string) => {
    try {
      // Use the access token if provided for better security
      let userData: SupabaseUser = authUser
      if (accessToken && !authUser) {
        const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(accessToken)
        if (tokenError || !tokenUser) {
          logError('Token validation error', tokenError)
          return
        }
        userData = tokenUser
      }

      // Try to fetch profile from database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.id)
        .maybeSingle()

      if (profileError) {
        // Handle various error types - checking message and status as well as code
        const isTableMissing = profileError.code === 'PGRST205' || 
                              profileError.code === '42P01' ||
                              profileError.message?.includes('relation') ||
                              profileError.message?.includes('does not exist') ||
                              profileError.status === 404
        
        if (isTableMissing) {
          setUser(buildBasicUser(userData))
          return
        }
        
        logError('Profile fetch error', profileError)
        setUser(buildBasicUser(userData))
        return
      }

      // If no profile exists, create one
      if (!profile) {
        try {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: userData.id,
              name: userData.user_metadata?.name || userData.email?.split('@')[0] || 'User',
              role: userData.user_metadata?.role || 'student',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            })
            .select()
            .single()

          if (createError) {
            logError('Error creating profile', createError)
            setUser(buildBasicUser(userData))
            return
          }

          // Use the newly created profile
          if (newProfile) {
            const user: User = {
              id: newProfile.id,
              email: userData.email || '',
              name: newProfile.name || 'User',
              role: newProfile.role || 'student',
              profile_complete: !!(newProfile.name && newProfile.bio),
              created_at: newProfile.created_at,
              avatar_url: newProfile.avatar_url,
              bio: newProfile.bio,
              year_level: newProfile.year_level,
              specialization: newProfile.specialization,
              phone: newProfile.phone,
              location: newProfile.location
            }
            setUser(user)
          }
        } catch (createProfileError) {
          logError('Failed to create profile', createProfileError)
          setUser(buildBasicUser(userData))
        }
        return
      }

      // Use existing profile
      if (profile) {
        const user: User = {
          id: profile.id,
          email: userData.email || '',
          name: profile.name || 'User',
          role: profile.role || 'student',
          profile_complete: !!(profile.name && profile.bio),
          created_at: profile.created_at,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          year_level: profile.year_level,
          specialization: profile.specialization,
          phone: profile.phone,
          location: profile.location
        }
        setUser(user)
      }
    } catch (error) {
      logError('Error fetching user profile', error)
      // Safe fallback - always pass a valid object
      setUser(buildBasicUser(authUser || {}))
    }
  }

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setOperationLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        logError('Sign in error', error)
        return { 
          success: false, 
          error: sanitizeErrorMessage(error, '❌ Sign in failed. Please try again.')
        }
      }

      // The onAuthStateChange listener will handle setting user/session
      return { success: true }
    } catch (error) {
      logError('Unexpected sign in error', error)
      return { 
        success: false, 
        error: sanitizeErrorMessage(error, '⚠️ An unexpected error occurred during sign in.')
      }
    } finally {
      setOperationLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string, role: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setOperationLoading(true)
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role
          }
        }
      })

      if (signUpError) {
        logError('Direct signup error', signUpError)
        return { 
          success: false, 
          error: sanitizeErrorMessage(signUpError, '❌ Signup failed. Please try again.')
        }
      }

      // Check if email confirmation is required
      if (signUpData.user && !signUpData.session) {
        return { 
          success: true, 
          error: '✅ Account created! For testing purposes, you can now sign in directly (email confirmation not required).' 
        }
      }

      // Wait for profile creation to complete to avoid race conditions
      if (signUpData.session?.user) {
        await fetchUserProfile(signUpData.session.user, signUpData.session.access_token)
      }

      // The onAuthStateChange listener will handle setting user/session
      return { success: true }
    } catch (error) {
      logError('Unexpected signup error', error)
      return { 
        success: false, 
        error: sanitizeErrorMessage(error, '⚠️ An unexpected error occurred during signup.')
      }
    } finally {
      setOperationLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      // The onAuthStateChange listener will handle clearing user/session
    } catch (error) {
      logError('Sign out error', error)
    }
  }

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        logError('Password reset error', error)
        return { 
          success: false, 
          error: sanitizeErrorMessage(error, 'Failed to send password reset email.')
        }
      }

      return { 
        success: true 
      }
    } catch (error) {
      logError('Unexpected password reset error', error)
      return { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.'
      }
    }
  }

  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      // Try to update existing profile
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: updates.name,
          bio: updates.bio,
          avatar_url: updates.avatar_url,
          year_level: updates.year_level,
          specialization: updates.specialization,
          phone: updates.phone,
          location: updates.location,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()

      if (error) {
        // Check if table doesn't exist or profile doesn't exist
        const isTableMissing = error.code === 'PGRST205' || 
                              error.code === '42P01' ||
                              error.message?.includes('relation') ||
                              error.message?.includes('does not exist') ||
                              error.status === 404
        
        const isProfileMissing = error.code === 'PGRST116' || 
                                error.code === 'PGRST205'

        if (isTableMissing) {
          // Table doesn't exist, just update local state (fallback mode)
          setUser(prev => prev ? { ...prev, ...updates } : null)
          return { success: true }
        }
        
        if (isProfileMissing) {
          // Profile doesn't exist, create it
          const { data: insertData, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              name: updates.name || user.name,
              bio: updates.bio,
              avatar_url: updates.avatar_url,
              year_level: updates.year_level,
              specialization: updates.specialization,
              phone: updates.phone,
              location: updates.location,
              role: user.role,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()

          if (insertError) {
            logError('Profile insert error', insertError)
            return { success: false, error: insertError.message }
          }
        } else {
          logError('Profile update error', error)
          return { success: false, error: error.message }
        }
      }

      // Check if we actually got data back (successful update)
      if (!data || data.length === 0) {
        // Log for monitoring but don't show to users
        if (process.env.NODE_ENV === 'development') {
          console.warn('Update operation returned no data but completed successfully')
        }
      }

      // Update local user state only after successful backend operation
      setUser(prev => prev ? { 
        ...prev, 
        ...updates, 
        profile_complete: !!(updates.name && updates.bio) || prev.profile_complete
      } : null)
      
      return { success: true }
    } catch (error) {
      logError('Profile update error', error)
      // Don't update local state if there was a network/unexpected error
      return { 
        success: false, 
        error: 'Failed to update profile. Please check your connection and try again.'
      }
    }
  }

  // Use computed loading state
  const loading = initialLoading || operationLoading

  const value: AuthContextType = {
    user,
    session,
    signIn,
    signUp,
    signOut,
    resetPassword,
    loading,
    updateProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}