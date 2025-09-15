import React, { createContext, useContext, useState, useEffect } from 'react'
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
  session: any | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = getSupabaseClient()

  useEffect(() => {
    // Check for existing session
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await fetchUserProfile(session.access_token)
      } else {
        setUser(null)
        setSession(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (session && !error) {
        setSession(session)
        await fetchUserProfile(session.access_token)
      }
    } catch (error) {
      console.error('Session check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async (accessToken?: string) => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        console.error('Auth error:', authError)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (profileError) {
        // Handle table not existing - create a basic user profile from auth data
        if (profileError.code === 'PGRST205' || profileError.code === '42P01') {
          console.warn('Profiles table does not exist. Using basic auth data.')
          const userData: User = {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
            role: 'student',
            profile_complete: false,
            created_at: authUser.created_at || new Date().toISOString(),
            avatar_url: authUser.user_metadata?.avatar_url,
            bio: undefined,
            year_level: undefined,
            specialization: undefined,
            phone: undefined,
            location: undefined
          }
          setUser(userData)
          return
        }
        
        console.error('Profile fetch error:', profileError)
        return
      }

      // If no profile exists, create one
      if (!profile) {
        console.log('No profile found for user, creating one...')
        try {
          // First try to upsert to avoid conflicts
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: authUser.id,
              name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
              role: authUser.user_metadata?.role || 'student',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating profile:', createError)
            // Fallback to basic user data
            const userData: User = {
              id: authUser.id,
              email: authUser.email || '',
              name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
              role: 'student',
              profile_complete: false,
              created_at: authUser.created_at || new Date().toISOString(),
              avatar_url: authUser.user_metadata?.avatar_url,
              bio: undefined,
              year_level: undefined,
              specialization: undefined,
              phone: undefined,
              location: undefined
            }
            setUser(userData)
            return
          }

          // Use the newly created profile
          if (newProfile) {
            const userData: User = {
              id: newProfile.id,
              email: authUser.email || '',
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
            setUser(userData)
          }
        } catch (createProfileError) {
          console.error('Failed to create profile:', createProfileError)
          // Fallback to basic user data
          const userData: User = {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
            role: 'student',
            profile_complete: false,
            created_at: authUser.created_at || new Date().toISOString(),
            avatar_url: authUser.user_metadata?.avatar_url,
            bio: undefined,
            year_level: undefined,
            specialization: undefined,
            phone: undefined,
            location: undefined
          }
          setUser(userData)
        }
        return
      }

      if (profile) {
        const userData: User = {
          id: profile.id,
          email: authUser.email || '',
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
        setUser(userData)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // Fallback to basic auth data if profile fetch fails completely
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const userData: User = {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
            role: 'student',
            profile_complete: false,
            created_at: authUser.created_at || new Date().toISOString(),
            avatar_url: authUser.user_metadata?.avatar_url,
            bio: undefined,
            year_level: undefined,
            specialization: undefined,
            phone: undefined,
            location: undefined
          }
          setUser(userData)
        }
      } catch (fallbackError) {
        console.error('Fallback profile creation failed:', fallbackError)
      }
    }
  }

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Sign in error:', error)
        
        // Parse specific Supabase auth error messages for better UX
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: '❌ Invalid email or password. Please check your credentials and try again.' }
        }
        
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: '📧 Please check your email and confirm your account before signing in.' }
        }
        
        if (error.message.includes('Too many requests')) {
          return { success: false, error: '⏰ Too many sign-in attempts. Please wait a moment before trying again.' }
        }
        
        if (error.message.includes('User not found')) {
          return { success: false, error: '🔍 No account found with this email. Please check your email or sign up for a new account.' }
        }
        
        if (error.message.includes('Invalid email')) {
          return { success: false, error: '📧 Please enter a valid email address.' }
        }
        
        if (error.message.includes('signups not allowed')) {
          return { success: false, error: '🚫 New signups are currently disabled. Please contact support.' }
        }
        
        if (error.message.includes('Database') || error.message.includes('JWT')) {
          return { 
            success: false, 
            error: '🔧 Authentication service unavailable. Please try the Database Setup if this persists.' 
          }
        }
        
        // Fallback for other auth errors
        return { success: false, error: `❌ ${error.message}` }
      }

      if (data.session) {
        setSession(data.session)
        await fetchUserProfile(data.session.access_token)
      }

      return { success: true }
    } catch (error) {
      console.error('Unexpected sign in error:', error)
      return { success: false, error: '⚠️ An unexpected error occurred during sign in. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string, role: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)
      
      // Debug logging
      console.log('Starting sign up process for:', { email, name, role })
      console.log('Supabase URL:', `https://${projectId}.supabase.co`)
      console.log('Public key format:', publicAnonKey.substring(0, 20) + '...')
      
      // Use direct Supabase client signup with better error handling
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
        console.error('Direct signup error:', signUpError)
        
        // Handle specific Supabase signup errors with improved messaging
        if (signUpError.message.includes('Invalid API key')) {
          return { success: false, error: '🔑 Authentication configuration error. Please check your Supabase setup.' }
        }
        
        if (signUpError.message.includes('User already registered') || signUpError.message.includes('already registered')) {
          return { success: false, error: '👤 This email is already registered. Please sign in instead or use a different email.' }
        }
        
        if (signUpError.message.includes('Invalid email') || signUpError.message.includes('email')) {
          return { success: false, error: '📧 Please enter a valid email address.' }
        }
        
        if (signUpError.message.includes('Password should be at least') || signUpError.message.includes('Password')) {
          return { success: false, error: '🔒 Password must be at least 6 characters long.' }
        }
        
        if (signUpError.message.includes('Password is too weak')) {
          return { success: false, error: '💪 Password is too weak. Please use a stronger password with letters, numbers, and symbols.' }
        }
        
        if (signUpError.message.includes('signups not allowed')) {
          return { success: false, error: '🚫 New signups are currently disabled. Please contact support.' }
        }
        
        if (signUpError.message.includes('rate limit')) {
          return { success: false, error: '⏰ Too many signup attempts. Please wait a moment before trying again.' }
        }
        
        if (signUpError.message.includes('Database') || signUpError.message.includes('JWT')) {
          return { 
            success: false, 
            error: '🔧 Database setup needed. Please use the Database Setup page to configure authentication properly.' 
          }
        }
        
        // Fallback for other signup errors
        return { success: false, error: `❌ Signup failed: ${signUpError.message}` }
      }

      console.log('Direct signup successful:', signUpData)

      // Check if email confirmation is required
      if (signUpData.user && !signUpData.session) {
        return { 
          success: true, 
          error: '✅ Account created! For testing purposes, you can now sign in directly (email confirmation not required).' 
        }
      }

      // If we have a session, set it up
      if (signUpData.session) {
        setSession(signUpData.session)
        await fetchUserProfile(signUpData.session.access_token)
      }

      return { success: true }
    } catch (error) {
      console.error('Unexpected signup error:', error)
      
      // Handle specific error types with improved messaging
      if (error instanceof Error) {
        if (error.message.includes('Database error') || error.message.includes('JWT')) {
          return { 
            success: false, 
            error: '🔧 Authentication setup needed. Please use the Database Setup page to configure authentication properly.' 
          }
        }
        
        if (error.message.includes('fetch') || error.message.includes('network')) {
          return {
            success: false,
            error: '🌐 Network error. Please check your internet connection and try again.'
          }
        }
        
        if (error.message.includes('Invalid JWT')) {
          return {
            success: false,
            error: '🔑 Invalid authentication token. Please contact support or check your Supabase configuration.'
          }
        }
        
        if (error.message.includes('timeout')) {
          return {
            success: false,
            error: '⏰ Request timed out. Please check your connection and try again.'
          }
        }
      }
      
      return { success: false, error: '⚠️ An unexpected error occurred during signup. Please try the Database Setup if this persists.' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Sign out error:', error)
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
        .single()

      if (error) {
        // If profile doesn't exist or no rows were updated, try to create it
        if (error.code === 'PGRST116' || error.code === 'PGRST205') {
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
            .single()

          if (insertError) {
            // If table doesn't exist, just update local state
            if (insertError.code === 'PGRST205' || insertError.code === '42P01') {
              setUser(prev => prev ? { ...prev, ...updates } : null)
              return { success: true }
            }
            return { success: false, error: insertError.message }
          }
        } else {
          return { success: false, error: error.message }
        }
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, ...updates } : null)
      return { success: true }
    } catch (error) {
      // Fallback to local state update only
      setUser(prev => prev ? { ...prev, ...updates } : null)
      return { success: true }
    }
  }

  const value: AuthContextType = {
    user,
    session,
    signIn,
    signUp,
    signOut,
    loading,
    updateProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}