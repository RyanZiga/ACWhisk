import { toast } from "sonner@2.0.3"

// Shared validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type)
}

export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSize = maxSizeMB * 1024 * 1024
  return file.size <= maxSize
}

// File size formatter
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Time formatting utilities
export const timeAgo = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  const diffInWeeks = Math.floor(diffInDays / 7)
  return `${diffInWeeks}w ago`
}

// Common error handling
export const handleSupabaseError = (error: any): string => {
  if (error?.code === '42501') {
    return 'Permission denied: Please make sure your profile is properly set up and try again.'
  } else if (error?.message?.includes('row-level security')) {
    return 'Database permission error: Please check your user permissions or contact support.'
  } else if (error?.message?.includes('database schema')) {
    return 'Database not properly configured. Please set up the database first.'
  } else if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return 'Database table not found. Please complete database setup.'
  }
  return error?.message || 'An unexpected error occurred'
}

// Notification helpers
export const showSuccessNotification = (title: string, message: string) => {
  toast.success(title, {
    description: message,
    duration: 3000,
  })
}

export const showErrorNotification = (title: string, message: string) => {
  toast.error(title, {
    description: message,
    duration: 5000,
  })
}

export const showInfoNotification = (title: string, message: string) => {
  toast.info(title, {
    description: message,
    duration: 4000,
  })
}

// Debounce utility for search
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Array utilities
export const uniqueById = <T extends { id: string }>(array: T[]): T[] => {
  const seen = new Set()
  return array.filter(item => {
    if (seen.has(item.id)) {
      return false
    }
    seen.add(item.id)
    return true
  })
}

// Text utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

export const extractInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Role utilities
export const getRoleColor = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800'
    case 'instructor':
      return 'bg-blue-100 text-blue-800'
    case 'student':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return 'bg-green-100 text-green-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'hard':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Local storage utilities with error handling
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.warn(`Failed to get localStorage item ${key}:`, error)
      return null
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value)
      return true
    } catch (error) {
      console.warn(`Failed to set localStorage item ${key}:`, error)
      return false
    }
  },
  
  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn(`Failed to remove localStorage item ${key}:`, error)
      return false
    }
  }
}

// Performance utilities
export const memoizeWithExpiry = <T extends (...args: any[]) => any>(
  fn: T,
  expiryTime: number = 5 * 60 * 1000 // 5 minutes default
): T => {
  const cache = new Map<string, { result: ReturnType<T>; timestamp: number }>()
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    const cached = cache.get(key)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < expiryTime) {
      return cached.result
    }
    
    const result = fn(...args)
    cache.set(key, { result, timestamp: now })
    
    // Clean up expired entries
    for (const [cacheKey, value] of cache.entries()) {
      if ((now - value.timestamp) >= expiryTime) {
        cache.delete(cacheKey)
      }
    }
    
    return result
  }) as T
}