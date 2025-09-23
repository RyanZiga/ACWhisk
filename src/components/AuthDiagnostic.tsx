import React, { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { getSupabaseClient } from '../utils/supabase/client'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Settings,
  Database,
  Shield
} from 'lucide-react'

interface DiagnosticResult {
  test: string
  status: 'pass' | 'fail' | 'warning' | 'info'
  message: string
  solution?: string
}

export function AuthDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runDiagnostics = async () => {
    setIsRunning(true)
    const diagnosticResults: DiagnosticResult[] = []
    const supabase = getSupabaseClient()

    try {
      // Test 1: Check Supabase connection
      try {
        const startTime = Date.now()
        const { data, error } = await supabase.from('profiles').select('count').limit(1)
        const responseTime = Date.now() - startTime
        
        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') {
            diagnosticResults.push({
              test: 'Database Connection',
              status: 'warning',
              message: `Connected to Supabase but profiles table doesn't exist (${responseTime}ms)`,
              solution: 'Run Database Setup to create the profiles table'
            })
          } else {
            diagnosticResults.push({
              test: 'Database Connection',
              status: 'fail',
              message: `Database error: ${error.message}`,
              solution: 'Check your Supabase project settings and RLS policies'
            })
          }
        } else {
          diagnosticResults.push({
            test: 'Database Connection',
            status: 'pass',
            message: `Successfully connected to Supabase (${responseTime}ms)`
          })
        }
      } catch (error) {
        diagnosticResults.push({
          test: 'Database Connection',
          status: 'fail',
          message: `Connection failed: ${error}`,
          solution: 'Check your Supabase URL and anon key'
        })
      }

      // Test 2: Check Auth Settings
      try {
        const testEmail = 'test@example.com'
        const testPassword = 'TestPassword123!'
        
        // Attempt a signup to test auth configuration
        const { data, error } = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword,
          options: {
            data: { name: 'Test User', role: 'student' }
          }
        })

        if (error) {
          if (error.message.includes('captcha')) {
            diagnosticResults.push({
              test: 'Auth Configuration',
              status: 'fail',
              message: 'Captcha verification failed - this is the source of your error!',
              solution: 'Disable captcha in Supabase Dashboard → Authentication → Settings → Security Settings'
            })
          } else if (error.message.includes('signup_disabled')) {
            diagnosticResults.push({
              test: 'Auth Configuration',
              status: 'warning',
              message: 'User signup is disabled',
              solution: 'Enable user signup in Supabase Dashboard → Authentication → Settings'
            })
          } else if (error.message.includes('already_registered')) {
            diagnosticResults.push({
              test: 'Auth Configuration',
              status: 'pass',
              message: 'Auth is working (test user already exists)'
            })
          } else {
            diagnosticResults.push({
              test: 'Auth Configuration',
              status: 'fail',
              message: `Auth error: ${error.message}`,
              solution: 'Check your Supabase authentication settings'
            })
          }
        } else {
          if (data.user && !data.session) {
            diagnosticResults.push({
              test: 'Auth Configuration',
              status: 'info',
              message: 'Auth working, email confirmation required',
              solution: 'You can disable email confirmation for development'
            })
          } else {
            diagnosticResults.push({
              test: 'Auth Configuration',
              status: 'pass',
              message: 'Authentication is working correctly'
            })
          }
        }
      } catch (error) {
        diagnosticResults.push({
          test: 'Auth Configuration',
          status: 'fail',
          message: `Auth test failed: ${error}`,
          solution: 'Check your Supabase project configuration'
        })
      }

      // Test 3: Check Project Configuration
      const configTests = []
      
      if (!projectId || projectId === 'your-project-id') {
        configTests.push({
          test: 'Project Configuration',
          status: 'fail' as const,
          message: 'Supabase project ID not configured',
          solution: 'Update your project ID in /utils/supabase/info.tsx'
        })
      } else {
        configTests.push({
          test: 'Project Configuration',
          status: 'pass' as const,
          message: `Project ID configured: ${projectId}`
        })
      }

      if (!publicAnonKey || publicAnonKey === 'your-anon-key') {
        configTests.push({
          test: 'API Key Configuration',
          status: 'fail' as const,
          message: 'Supabase anon key not configured',
          solution: 'Update your anon key in /utils/supabase/info.tsx'
        })
      } else {
        configTests.push({
          test: 'API Key Configuration',
          status: 'pass' as const,
          message: `Anon key configured (${publicAnonKey.substring(0, 20)}...)`
        })
      }

      diagnosticResults.push(...configTests)

    } catch (error) {
      diagnosticResults.push({
        test: 'Diagnostic Error',
        status: 'fail',
        message: `Failed to run diagnostics: ${error}`,
        solution: 'Check console for detailed errors'
      })
    }

    setResults(diagnosticResults)
    setIsRunning(false)
  }

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return 'bg-green-500/10 border-green-500/20'
      case 'fail':
        return 'bg-red-500/10 border-red-500/20'
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20'
      case 'info':
        return 'bg-blue-500/10 border-blue-500/20'
      default:
        return 'bg-gray-500/10 border-gray-500/20'
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Authentication Diagnostics
        </CardTitle>
        <CardDescription>
          Run diagnostics to identify and fix authentication issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Running Diagnostics...
            </div>
          ) : (
            'Run Authentication Diagnostics'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Diagnostic Results:</h3>
            {results.map((result, index) => (
              <Alert key={index} className={`${getStatusColor(result.status)} border`}>
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <p className="font-medium">{result.test}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.message}
                        </p>
                        {result.solution && (
                          <p className="text-xs mt-2 font-medium">
                            💡 Solution: {result.solution}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Quick fixes section */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h4 className="font-medium text-blue-400 mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Common Solutions for Captcha Errors
          </h4>
          <div className="space-y-2 text-sm text-blue-300">
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-400">1.</span>
              <div>
                <p className="font-medium">Disable Captcha (Recommended for Development)</p>
                <p className="text-xs text-blue-200 mt-1">
                  Supabase Dashboard → Authentication → Settings → Security Settings → Turn OFF "Enable Captcha"
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-400">2.</span>
              <div>
                <p className="font-medium">Check Rate Limiting</p>
                <p className="text-xs text-blue-200 mt-1">
                  If you've made many auth attempts, wait 10-15 minutes before trying again
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-400">3.</span>
              <div>
                <p className="font-medium">Verify Supabase Configuration</p>
                <p className="text-xs text-blue-200 mt-1">
                  Ensure your project URL and anon key are correctly configured
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AuthDiagnostic