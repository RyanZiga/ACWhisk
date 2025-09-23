import React, { createContext, useContext, useState, useEffect } from 'react'
import { getSupabaseClient } from '../utils/supabase/client'

export interface User {
  id: string
  email: string
  name?: string
  role?: 'student' | 'instructor' | 'admin'
  profile_complete?: boolean
  created_at?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  lastError: string | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (
    email: string,
    password: string,
    name?: string,
    role?: string
  ) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const supabase = getSupabaseClient()

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    const session = supabase.auth.getSession()
    session.then(({ data }) => {
      setUser(data.session?.user ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // Helper for async operations
  async function withLoadingAndErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
    setLastError(null)
    try {
      return await operation()
    } catch (err) {
      setLastError((err as Error).message)
      throw err
    }
  }

  const signIn = async (email: string, password: string) => {
    return withLoadingAndErrorHandling(async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setUser(data.user ? { id: data.user.id, email: data.user.email! } : null)
        return { success: true }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      } finally {
        setLoading(false)
      }
    })
  }

  const signUp = async (email: string, password: string, name?: string, role?: string) => {
    return withLoadingAndErrorHandling(async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, role } },
        })
        if (error) throw error
        return { success: true }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      } finally {
        setLoading(false)
      }
    })
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      setLastError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, lastError, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
