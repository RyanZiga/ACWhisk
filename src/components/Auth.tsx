import React, { useState } from 'react'
import { useAuth } from './AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { EnhancedAuthErrorAlert } from './EnhancedAuthErrorAlert'
import { ChefHat, Users, GraduationCap, Star, BookOpen, Utensils, Trophy, Shield, Clock, MapPin } from 'lucide-react'
import { ImageWithFallback } from './figma/ImageWithFallback'

export function Auth() {
  const { signIn, signUp, loading } = useAuth()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

    // Enhanced validation with better error messages
    if (!signInData.email || !signInData.password) {
      setError('📝 Please fill in both email and password fields')
      return
    }

    if (!signInData.email.includes('@')) {
      setError('📧 Please enter a valid email address')
      return
    }

    if (signInData.password.length < 1) {
      setError('🔒 Password cannot be empty')
      return
    }

    const result = await signIn(signInData.email, signInData.password)
    if (!result.success) {
      setError(result.error || '❌ Sign in failed')
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Enhanced validation with better error messages
    if (!signUpData.email || !signUpData.password || !signUpData.name || !signUpData.confirmPassword) {
      setError('📝 Please fill in all required fields')
      return
    }

    if (signUpData.name.trim().length < 2) {
      setError('👤 Name must be at least 2 characters long')
      return
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      setError('🔒 Passwords do not match. Please make sure both password fields are identical')
      return
    }

    if (signUpData.password.length < 6) {
      setError('🔒 Password must be at least 6 characters long for security')
      return
    }

    // Enhanced email validation
    if (!signUpData.email.includes('@') || !signUpData.email.includes('.')) {
      setError('📧 Please enter a valid email format (e.g., user@example.com)')
      return
    }

    // Check for common password issues
    if (signUpData.password === '123456' || signUpData.password === 'password') {
      setError('💪 Please choose a stronger password. Avoid common passwords like "123456" or "password"')
      return
    }

    try {
      const result = await signUp(signUpData.email, signUpData.password, signUpData.name, signUpData.role)
      if (result.success) {
        if (result.error) {
          // This means email confirmation is required
          setSuccess(result.error)
        } else {
          setSuccess('🎉 Welcome to ACWhisk! Your account has been created successfully. You can now switch to the Sign In tab to access your account!')
          // Clear the form
          setSignUpData({
            email: '',
            password: '',
            confirmPassword: '',
            name: '',
            role: 'student'
          })
          
          // Auto-switch to sign in tab after 4 seconds to give user time to read success message
          setTimeout(() => {
            const signInTab = document.querySelector('[value="signin"]') as HTMLElement
            if (signInTab) {
              signInTab.click()
            }
          }, 4000)
        }
      } else {
        setError(result.error || '❌ Sign up failed')
      }
    } catch (error) {
      setError('⚠️ An unexpected error occurred. Please try again.')
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

  return (
    <div className="min-h-screen bg-glass-gradient relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-aurora-gradient rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-60 h-60 bg-calm-gradient rounded-full opacity-15 blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm border border-white/20">
              <ChefHat className="w-12 h-12 text-purple-400" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-foreground">ACWhisk</h1>
              <p className="text-muted-foreground">Asian College Hospitality Management</p>
              <p className="text-sm text-purple-400">Online Learning Platform</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-7xl grid xl:grid-cols-5 lg:grid-cols-3 gap-8 items-start">
          {/* Left Hero Section */}
          <div className="xl:col-span-2 lg:col-span-1 space-y-6">
            <div className="text-center lg:text-left space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                Excellence in
                <br />
                <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                  Hospitality Education
                </span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg">
                Master culinary arts, hospitality management, and professional service skills through our comprehensive online learning platform.
              </p>
            </div>

            {/* Institution Features */}
            <div className="grid gap-3">
              <Card className="glass-card border-0 shadow-none p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
                    <Trophy className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Accredited Programs</div>
                    <div className="text-sm text-muted-foreground">Industry-recognized certifications</div>
                  </div>
                </div>
              </Card>

              <Card className="glass-card border-0 shadow-none p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                    <ChefHat className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Expert Faculty</div>
                    <div className="text-sm text-muted-foreground">Learn from industry professionals</div>
                  </div>
                </div>
              </Card>

              <Card className="glass-card border-0 shadow-none p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                    <Shield className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Career Support</div>
                    <div className="text-sm text-muted-foreground">Job placement assistance</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Center - Visual Content */}
          <div className="xl:col-span-1 lg:hidden xl:block">
            <div className="space-y-4">
              <Card className="glass-card border-0 shadow-none overflow-hidden">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1578366941741-9e517759c620?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdWxpbmFyeSUyMHNjaG9vbCUyMGNvb2tpbmclMjBjbGFzc3xlbnwxfHx8fDE3NTc5NDc0OTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Culinary Education"
                  className="w-full h-48 object-cover"
                />
                <CardContent className="p-4">
                  <h3 className="font-medium text-foreground mb-2">Professional Training</h3>
                  <p className="text-sm text-muted-foreground">State-of-the-art kitchen facilities and hands-on learning</p>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="glass-card border-0 shadow-none p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">15+</div>
                  <div className="text-xs text-muted-foreground">Years Experience</div>
                </Card>
                <Card className="glass-card border-0 shadow-none p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">2,500+</div>
                  <div className="text-xs text-muted-foreground">Graduates</div>
                </Card>
              </div>
            </div>
          </div>

          {/* Right - Auth Card */}
          <div className="xl:col-span-2 lg:col-span-2 flex justify-center lg:justify-end">
            <Card className="w-full max-w-lg glass-card border-0 shadow-none">
              <CardHeader className="space-y-2 text-center pb-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Utensils className="h-6 w-6 text-purple-400" />
                  <CardTitle className="text-2xl font-bold text-foreground">Student Portal</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">
                  Access your hospitality management courses and resources
                  <br />
                  <span className="text-xs text-purple-400 mt-2 block flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Asian College of Technology
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <Tabs defaultValue="signin" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2 glass-input border-0 p-1 rounded-2xl">
                    <TabsTrigger 
                      value="signin" 
                      className="rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-foreground"
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup" 
                      className="rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-foreground"
                    >
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  <EnhancedAuthErrorAlert error={error} success={success} />

                  <TabsContent value="signin" className="space-y-4">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-sm font-medium text-foreground">Student/Staff Email</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="Enter your college email address"
                          value={signInData.email}
                          onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                          className="glass-input border-white/20 rounded-2xl text-foreground placeholder:text-muted-foreground focus:border-purple-400 focus:ring-purple-400/20"
                          required
                          autoComplete="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="text-sm font-medium text-foreground">Password</Label>
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="Enter your password"
                          value={signInData.password}
                          onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                          className="glass-input border-white/20 rounded-2xl text-foreground placeholder:text-muted-foreground focus:border-purple-400 focus:ring-purple-400/20"
                          required
                          autoComplete="current-password"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full glass-button text-white border-0 rounded-2xl py-3 hover:glow-purple transition-all duration-300" 
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Signing In...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Access Portal
                          </div>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-4">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-sm font-medium text-foreground">Full Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Enter your full name"
                          value={signUpData.name}
                          onChange={(e) => setSignUpData(prev => ({ ...prev, name: e.target.value }))}
                          className="glass-input border-white/20 rounded-2xl text-foreground placeholder:text-muted-foreground focus:border-purple-400 focus:ring-purple-400/20"
                          required
                          autoComplete="name"
                          minLength={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">Email Address</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="Enter your email address"
                          value={signUpData.email}
                          onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                          className="glass-input border-white/20 rounded-2xl text-foreground placeholder:text-muted-foreground focus:border-purple-400 focus:ring-purple-400/20"
                          required
                          autoComplete="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-role" className="text-sm font-medium text-foreground">Account Type</Label>
                        <Select
                          value={signUpData.role}
                          onValueChange={(value) => setSignUpData(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger className="glass-input border-white/20 rounded-2xl text-foreground focus:border-purple-400 focus:ring-purple-400/20">
                            <div className="flex items-center gap-2">
                              {getRoleIcon(signUpData.role)}
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="glass-card border-glass-border">
                            <SelectItem value="student" className="hover:bg-white/10">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                  <GraduationCap className="w-4 h-4" />
                                  <span className="font-medium">Student</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Access learning materials and submit assignments
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="instructor" className="hover:bg-white/10">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                  <ChefHat className="w-4 h-4" />
                                  <span className="font-medium">Instructor</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Manage classes and provide feedback
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="admin" className="hover:bg-white/10">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                  <Users className="w-4 h-4" />
                                  <span className="font-medium">Administrator</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Platform management and oversight
                                </div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getRoleDescription(signUpData.role)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Create a secure password (min. 6 characters)"
                          value={signUpData.password}
                          onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                          className="glass-input border-white/20 rounded-2xl text-foreground placeholder:text-muted-foreground focus:border-purple-400 focus:ring-purple-400/20"
                          required
                          autoComplete="new-password"
                          minLength={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm-password" className="text-sm font-medium text-foreground">Confirm Password</Label>
                        <Input
                          id="signup-confirm-password"
                          type="password"
                          placeholder="Re-enter your password"
                          value={signUpData.confirmPassword}
                          onChange={(e) => setSignUpData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="glass-input border-white/20 rounded-2xl text-foreground placeholder:text-muted-foreground focus:border-purple-400 focus:ring-purple-400/20"
                          required
                          autoComplete="new-password"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full glass-button text-white border-0 rounded-2xl py-3 hover:glow-purple transition-all duration-300" 
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Creating Account...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Join ACWhisk
                          </div>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                {/* Additional Info */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="text-center text-xs text-muted-foreground">
                    <p className="mb-2">Need help? Contact Academic Support</p>
                    <div className="flex items-center justify-center gap-4 text-purple-400">
                      <span>📧 support@acwhisk.edu</span>
                      <span>📞 (02) 8888-COOK</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Professional Footer */}
        <div className="mt-12 text-center max-w-4xl">
          <Card className="glass-card border-0 shadow-none p-6 mb-4">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1594394490830-4cf54dd62910?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBraXRjaGVuJTIwaG9zcGl0YWxpdHl8ZW58MXx8fHwxNzU3OTQ3NDk4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Professional Kitchen"
                  className="w-20 h-20 object-cover rounded-2xl"
                />
                <div className="text-left">
                  <h4 className="font-medium text-foreground">Professional Facilities</h4>
                  <p className="text-sm text-muted-foreground">Industry-standard equipment and learning spaces</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span>TESDA Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-blue-400" />
                  <span>Award Winning</span>
                </div>
              </div>
            </div>
          </Card>
          
          <p className="text-muted-foreground text-sm">
            © 2024 Asian College of Technology - Hospitality Management Division. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}