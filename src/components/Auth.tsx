import React, { useState } from 'react'
import { useAuth } from './AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { EnhancedAuthErrorAlert } from './EnhancedAuthErrorAlert'
import { 
  ChefHat, 
  Users, 
  GraduationCap, 
  MapPin, 
  Eye, 
  EyeOff,
  CheckCircle,
  ArrowLeft
} from 'lucide-react'
import { ACWhiskLogo } from './ACWhiskLogo'

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Password strength requirements
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /\d/,
  hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/
}

// Validation functions
const validateSignIn = (data: { email: string; password: string }) => {
  if (!data.email || !data.password) {
    return { isValid: false, error: 'Please fill in both email and password fields', ariaLabel: 'Missing required fields' }
  }

  if (!EMAIL_REGEX.test(data.email)) {
    return { isValid: false, error: 'Please enter a valid email address', ariaLabel: 'Invalid email format' }
  }

  if (data.password.length < 1) {
    return { isValid: false, error: 'Password cannot be empty', ariaLabel: 'Empty password field' }
  }

  return { isValid: true }
}

const validateSignUp = (data: { email: string; password: string; confirmPassword: string; name: string }) => {
  if (!data.email || !data.password || !data.name || !data.confirmPassword) {
    return { isValid: false, error: 'Please fill in all required fields', ariaLabel: 'Missing required fields' }
  }

  if (data.name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long', ariaLabel: 'Name too short' }
  }

  if (!EMAIL_REGEX.test(data.email)) {
    return { isValid: false, error: 'Please enter a valid email format (e.g., user@example.com)', ariaLabel: 'Invalid email format' }
  }

  if (data.password !== data.confirmPassword) {
    return { isValid: false, error: 'Passwords do not match. Please make sure both password fields are identical', ariaLabel: 'Password mismatch' }
  }

  // Enhanced password validation
  if (data.password.length < PASSWORD_REQUIREMENTS.minLength) {
    return { isValid: false, error: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`, ariaLabel: 'Password too short' }
  }

  const passwordChecks = [
    { regex: PASSWORD_REQUIREMENTS.hasUpperCase, message: 'at least one uppercase letter' },
    { regex: PASSWORD_REQUIREMENTS.hasLowerCase, message: 'at least one lowercase letter' },
    { regex: PASSWORD_REQUIREMENTS.hasNumber, message: 'at least one number' },
    { regex: PASSWORD_REQUIREMENTS.hasSpecialChar, message: 'at least one special character (!@#$%^&*)' }
  ]

  const failedChecks = passwordChecks.filter(check => !check.regex.test(data.password))
  if (failedChecks.length > 0) {
    return { 
      isValid: false, 
      error: `Password must contain ${failedChecks.map(check => check.message).join(', ')}`,
      ariaLabel: 'Password does not meet security requirements'
    }
  }

  // Check for common weak passwords
  const commonPasswords = ['12345678', 'password', 'password123', 'admin123', 'qwerty123']
  if (commonPasswords.includes(data.password.toLowerCase())) {
    return { isValid: false, error: 'Please choose a stronger password. Avoid common passwords', ariaLabel: 'Common weak password detected' }
  }

  return { isValid: true }
}

// Sanitize error messages for better accessibility
const sanitizeErrorMessage = (message: string): { display: string; ariaLabel: string } => {
  // Remove emojis for screen readers
  const plainMessage = message.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim()
  
  return {
    display: message, // Keep emojis for visual users
    ariaLabel: plainMessage // Clean version for screen readers
  }
}

export function Auth() {
  const { signIn, signUp, loading } = useAuth()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'signin' | 'signup'>('welcome')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  })

  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'student'
  })

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const validation = validateSignIn(signInData)
    if (!validation.isValid) {
      setError(validation.error!)
      console.log('🔐 Client-side validation failed:', validation.error)
      return
    }

    try {
      console.log('🔐 Attempting sign in with:', { email: signInData.email })
      const result = await signIn(signInData.email, signInData.password)
      console.log('🔐 Sign in result:', result)
      
      if (!result.success) {
        const errorMessage = result.error || 'Sign in failed. Please try again.'
        console.log('✅ Error properly sanitized for UI display:', errorMessage)
        setError(errorMessage)
      } else {
        // Clear any previous errors on successful sign in
        setError('')
        setSuccess('Successfully signed in! Redirecting...')
        console.log('✅ Sign in successful!')
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred. Please try again.'
      console.error('🔐 Sign in exception, setting error in UI:', errorMessage, error)
      setError(errorMessage)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const validation = validateSignUp(signUpData)
    if (!validation.isValid) {
      setError(validation.error!)
      return
    }

    try {
      const result = await signUp(signUpData.email, signUpData.password, signUpData.name, signUpData.role)
      if (result.success) {
        if (result.error) {
          // This means email confirmation is required
          setSuccess(result.error)
        } else {
          const successMessage = 'Welcome to ACWhisk! Your account has been created successfully.'
          setSuccess(successMessage)
          // Clear the form
          setSignUpData({
            email: '',
            password: '',
            confirmPassword: '',
            name: '',
            role: 'student'
          })
          
          // Auto-switch to sign in after success
          setTimeout(() => {
            setCurrentScreen('signin')
            setSuccess('')
          }, 2000)
        }
      } else {
        const errorMessage = result.error || 'Sign up failed. Please try again.'
        setError(errorMessage)
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred. Please try again.'
      setError(errorMessage)
      console.error('Sign up error:', error)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student':
        return <GraduationCap className="w-4 h-4" />
      case 'instructor':
        return <ChefHat className="w-4 h-4" />
      case 'admin':
        return <Users className="w-4 h-4" />
      default:
        return <GraduationCap className="w-4 h-4" />
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'student':
        return 'Access learning materials, submit assignments, build your culinary portfolio'
      case 'instructor':
        return 'Manage classes, provide feedback, share teaching resources'
      case 'admin':
        return 'Oversee platform operations, manage users, access analytics'
      default:
        return ''
    }
  }

  // Get sanitized error message for accessibility
  const errorMessages = error ? sanitizeErrorMessage(error) : null

  // Debug logging for error state
  React.useEffect(() => {
    if (error) {
      console.log('🚨 Auth component error state updated:', error)
    }
    if (success) {
      console.log('✅ Auth component success state updated:', success)
    }
  }, [error, success])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div className="w-full max-w-sm mx-auto">
        {/* Welcome Screen */}
        {currentScreen === 'welcome' && (
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="text-center pt-8 pb-6 px-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                <ACWhiskLogo size={32} className="text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
                Welcome =)
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm leading-relaxed">
                ACWhisk
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-6 pb-8">
              <div className="space-y-3">
                <Button 
                  onClick={() => setCurrentScreen('signup')}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 rounded-2xl py-4 text-base font-medium shadow-lg transition-all duration-200"
                >
                  Create Account
                </Button>
                
                <Button 
                  onClick={() => setCurrentScreen('signin')}
                  variant="outline"
                  className="w-full bg-white/80 border-2 border-purple-200 text-purple-600 hover:bg-purple-50 rounded-2xl py-4 text-base font-medium transition-all duration-200"
                >
                  Log In
                </Button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center mb-4">Sign in with</p>
                <div className="flex justify-center space-x-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-12 h-12 rounded-xl border-gray-200 hover:bg-gray-50 p-0"
                    disabled
                  >
                    <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-12 h-12 rounded-xl border-gray-200 hover:bg-gray-50 p-0"
                    disabled
                  >
                    <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-12 h-12 rounded-xl border-gray-200 hover:bg-gray-50 p-0"
                    disabled
                  >
                    <svg className="w-5 h-5 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sign In Screen */}
        {currentScreen === 'signin' && (
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="pt-6 px-6">
              <div className="flex items-center mb-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCurrentScreen('welcome')}
                  className="p-2 hover:bg-gray-100 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                </Button>
                <span className="text-sm text-gray-500 ml-2">Back</span>
              </div>
              <CardTitle className="text-xl font-bold text-gray-800 mb-2">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm">
                Ready to continue your learning journey?
                <br />
                Your path to right here.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-6 pb-6">
              {/* Enhanced error/success display */}
              {(error || success) && (
                <div role="alert" aria-live="polite" aria-label={errorMessages?.ariaLabel || success} className="mb-4">
                  <EnhancedAuthErrorAlert error={error} success={success} />
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium text-gray-700">
                    Enter email
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter email"
                    value={signInData.email}
                    onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-gray-50 border-gray-200 rounded-xl py-3 px-4 text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-purple-300 transition-all duration-200"
                    required
                    autoComplete="email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={signInData.password}
                      onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-gray-50 border-gray-200 rounded-xl py-3 px-4 pr-12 text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-purple-300 transition-all duration-200"
                      required
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-auto p-1 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center space-x-2 text-gray-600">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span>Remember me</span>
                  </label>
                  <button type="button" className="text-purple-600 hover:text-purple-700 font-medium">
                    Forgot password?
                  </button>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 rounded-2xl py-4 text-base font-medium shadow-lg transition-all duration-200" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Logging In...</span>
                    </div>
                  ) : (
                    'Log In'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button 
                    onClick={() => setCurrentScreen('signup')}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sign Up Screen */}
        {currentScreen === 'signup' && (
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="pt-6 px-6">
              <div className="flex items-center mb-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCurrentScreen('welcome')}
                  className="p-2 hover:bg-gray-100 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                </Button>
                <span className="text-sm text-gray-500 ml-2">Back</span>
              </div>
              <CardTitle className="text-xl font-bold text-gray-800 mb-2">
                Create Your Account
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm">
                We're here to help you reach the peaks
                <br />
                of learning. Are you ready?
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-6 pb-6">
              {/* Enhanced error/success display */}
              {(error || success) && (
                <div role="alert" aria-live="polite" aria-label={errorMessages?.ariaLabel || success} className="mb-4">
                  <EnhancedAuthErrorAlert error={error} success={success} />
                </div>
              )}

              <form onSubmit={handleSignUp} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium text-gray-700">
                    Enter full name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter full name"
                    value={signUpData.name}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-gray-50 border-gray-200 rounded-xl py-3 px-4 text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-purple-300 transition-all duration-200"
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-gray-700">
                    Enter email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-gray-50 border-gray-200 rounded-xl py-3 px-4 text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-purple-300 transition-all duration-200"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-role" className="text-sm font-medium text-gray-700">Account Type</Label>
                  <Select
                    value={signUpData.role}
                    onValueChange={(value) => setSignUpData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl py-3 px-4 text-gray-800 focus:bg-white focus:border-purple-300 transition-all duration-200">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(signUpData.role)}
                        <SelectValue placeholder="Select account type" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 rounded-xl shadow-lg">
                      <SelectItem value="student" className="hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          <span>Student</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="instructor" className="hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <ChefHat className="w-4 h-4" />
                          <span>Instructor</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin" className="hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>Administrator</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-gray-700">
                    Enter password
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-gray-50 border-gray-200 rounded-xl py-3 px-4 pr-12 text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-purple-300 transition-all duration-200"
                      required
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-auto p-1 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="text-sm font-medium text-gray-700">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="bg-gray-50 border-gray-200 rounded-xl py-3 px-4 pr-12 text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-purple-300 transition-all duration-200"
                      required
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-auto p-1 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 rounded-2xl py-4 text-base font-medium shadow-lg transition-all duration-200" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    'Get Started'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button 
                    onClick={() => setCurrentScreen('signin')}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Log in
                  </button>
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  <span>Asian College of Technology</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}