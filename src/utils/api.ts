import { projectId, publicAnonKey } from './supabase/info'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function makeApiCall<T = any>(
  endpoint: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
    accessToken?: string
  } = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, accessToken } = options

  const url = `https://${projectId}.supabase.co/functions/v1/make-server-cfac176d${endpoint}`

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  }

  if (accessToken) {
    requestHeaders['Authorization'] = `Bearer ${accessToken}`
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error(`API Error [${response.status}]:`, responseData)
      
      throw new ApiError(
        responseData.error || `HTTP ${response.status}`,
        response.status,
        responseData.code
      )
    }

    return {
      success: true,
      data: responseData
    }
  } catch (error) {
    console.error('API call failed:', error)
    
    if (error instanceof ApiError) {
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Assignment API functions
export async function fetchAssignments(accessToken: string): Promise<ApiResponse<any[]>> {
  return makeApiCall('/assignments', { accessToken })
}

export async function fetchStudentSubmissions(studentId: string, accessToken: string): Promise<ApiResponse<any[]>> {
  return makeApiCall(`/submissions/student/${studentId}`, { accessToken })
}

export async function createSubmission(submission: any, accessToken: string): Promise<ApiResponse<any>> {
  return makeApiCall('/submissions', { 
    method: 'POST', 
    body: submission, 
    accessToken 
  })
}

export async function createAssignment(assignment: any, accessToken: string): Promise<ApiResponse<any>> {
  return makeApiCall('/assignments', { 
    method: 'POST', 
    body: assignment, 
    accessToken 
  })
}

export async function fetchInstructorAssignments(instructorId: string, accessToken: string): Promise<ApiResponse<any[]>> {
  return makeApiCall(`/assignments/instructor/${instructorId}`, { accessToken })
}

export async function fetchInstructorSubmissions(instructorId: string, accessToken: string): Promise<ApiResponse<any[]>> {
  return makeApiCall(`/submissions/instructor/${instructorId}`, { accessToken })
}

export async function createFeedback(feedback: any, accessToken: string): Promise<ApiResponse<any>> {
  return makeApiCall('/feedback', { 
    method: 'POST', 
    body: feedback, 
    accessToken 
  })
}

export async function updateFeedback(submissionId: string, feedback: any, accessToken: string): Promise<ApiResponse<any>> {
  return makeApiCall(`/feedback/${submissionId}`, { 
    method: 'PUT', 
    body: feedback, 
    accessToken 
  })
}

// File upload function
export async function uploadFile(
  file: File, 
  bucket: string, 
  accessToken: string
): Promise<ApiResponse<{
  fileName: string
  url: string
  bucket: string
  fileType: 'image' | 'video'
  fileSize: number
  mimeType: string
  isOptimized?: boolean
}>> {
  const url = `https://${projectId}.supabase.co/functions/v1/make-server-cfac176d/upload/${bucket}`

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    })

    const responseData = await response.json()

    if (!response.ok) {
      throw new ApiError(
        responseData.error || `HTTP ${response.status}`,
        response.status
      )
    }

    return {
      success: true,
      data: responseData
    }
  } catch (error) {
    console.error('File upload failed:', error)
    
    if (error instanceof ApiError) {
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error occurred'
    }
  }
}