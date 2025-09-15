import React from 'react'
import { Alert, AlertDescription } from './ui/alert'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

interface EnhancedAuthErrorAlertProps {
  error?: string
  success?: string
}

export function EnhancedAuthErrorAlert({ error, success }: EnhancedAuthErrorAlertProps) {
  if (!error && !success) return null

  // Determine alert type and styling based on content
  const getAlertType = () => {
    if (success) return 'success'
    if (error?.includes('❌') || error?.includes('Invalid login credentials') || error?.includes('Invalid email or password')) return 'error'
    if (error?.includes('⏰') || error?.includes('📧') || error?.includes('Too many')) return 'warning'
    if (error?.includes('🔧') || error?.includes('Database')) return 'info'
    return 'error'
  }

  const alertType = getAlertType()
  
  const getIcon = () => {
    switch (alertType) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <XCircle className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'info':
        return <Info className="h-4 w-4" />
      default:
        return <XCircle className="h-4 w-4" />
    }
  }

  const getAlertStyles = () => {
    switch (alertType) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20 text-green-400'
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-400'
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
      case 'info':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400'
      default:
        return 'bg-red-500/10 border-red-500/20 text-red-400'
    }
  }

  return (
    <Alert className={`glass-card border ${getAlertStyles()}`}>
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {getIcon()}
            </div>
            <div className="flex-1">
              <p className="leading-relaxed">{error || success}</p>
            </div>
          </div>
          
          {/* Enhanced help sections for specific error types */}
          {error && (error.includes('Database error during user creation') || error.includes('Database error saving new user')) && (
            <div className="text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-3">
              <p className="text-red-400 font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Critical Database Issue Detected
              </p>
              <p className="text-red-300 mt-2">This is the exact error preventing user registration. Go to the <strong>Database Setup</strong> section and use the <strong>Database Authentication Checker</strong> for an automatic fix script.</p>
            </div>
          )}
          
          {error && error.includes('Database') && !error.includes('Database error during user creation') && !error.includes('Database error saving new user') && (
            <div className="text-sm bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-3">
              <p className="text-blue-400 font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Need help fixing this?
              </p>
              <p className="text-blue-300 mt-2">Run the <strong>Database Authentication Checker</strong> in the Database Setup section for detailed troubleshooting and automatic fixes.</p>
            </div>
          )}
          
          {error && error.includes('trigger function') && (
            <div className="text-sm bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mt-3">
              <p className="text-purple-400 font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Quick Fix Available
              </p>
              <p className="text-purple-300 mt-2">This error typically means RLS is enabled on the auth.users table. Use the Database Authentication Checker for an automatic fix.</p>
            </div>
          )}
          
          {/* New help sections for common authentication errors */}
          {error && error.includes('Invalid email or password') && (
            <div className="text-sm bg-gray-500/10 border border-gray-500/20 rounded-lg p-3 mt-3">
              <p className="text-gray-400 font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Login Help
              </p>
              <div className="text-gray-300 mt-2 space-y-1">
                <p>• Double-check your email and password</p>
                <p>• Make sure Caps Lock is not enabled</p>
                <p>• Try resetting your password if needed</p>
              </div>
            </div>
          )}
          
          {error && error.includes('already registered') && (
            <div className="text-sm bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-3">
              <p className="text-blue-400 font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Account Already Exists
              </p>
              <p className="text-blue-300 mt-2">This email is already associated with an account. Please use the <strong>Sign In</strong> tab to access your existing account.</p>
            </div>
          )}
          
          {error && error.includes('Too many') && (
            <div className="text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
              <p className="text-yellow-400 font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Rate Limit
              </p>
              <p className="text-yellow-300 mt-2">Please wait a few minutes before trying again. This helps protect our services from abuse.</p>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}