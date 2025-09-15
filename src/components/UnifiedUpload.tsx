import React, { useState, useRef, useCallback, memo } from 'react'
import { validateFileType, validateFileSize, formatFileSize, handleSupabaseError, showErrorNotification } from './utils/shared-utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { Progress } from './ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { 
  Upload, 
  X, 
  Camera, 
  Video, 
  Link, 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  FileImage,
  FileVideo,
  Zap,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react'
import { useAuth } from './AuthContext'
import { projectId } from '../utils/supabase/info'

interface UnifiedUploadProps {
  onMediaChange: (mediaUrl: string, mediaType?: 'image' | 'video') => void
  currentMedia?: string
  currentMediaType?: 'image' | 'video'
  label?: string
  className?: string
  bucket: 'recipes' | 'profiles' | 'forums' | 'resources' | 'chat-media'
  allowVideo?: boolean
  allowImage?: boolean
  maxSizeMB?: number
  
  // Avatar-specific props
  isAvatar?: boolean
  userInitials?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  
  // Optimization props
  enableOptimization?: boolean
  targetImageWidth?: number
  compressionQuality?: number
}

// Optimized image compression utility
const compressImage = async (
  file: File, 
  maxWidth: number = 1200, 
  quality: number = 0.85
): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    
    img.onload = () => {
      let { width, height } = img
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
              type: 'image/webp',
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        },
        'image/webp',
        quality
      )
    }
    
    img.src = URL.createObjectURL(file)
  })
}

export const UnifiedUpload = memo(function UnifiedUpload({ 
  onMediaChange, 
  currentMedia, 
  currentMediaType = 'image',
  label = "Media Upload", 
  className = "",
  bucket,
  allowVideo = true,
  allowImage = true,
  maxSizeMB,
  isAvatar = false,
  userInitials = 'U',
  size = 'lg',
  enableOptimization = false,
  targetImageWidth = 1200,
  compressionQuality = 0.85
}: UnifiedUploadProps) {
  const { session, user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [optimizing, setOptimizing] = useState(false)
  const [mediaUrl, setMediaUrl] = useState('')
  const [previewMedia, setPreviewMedia] = useState(currentMedia || '')
  const [previewMediaType, setPreviewMediaType] = useState(currentMediaType)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file')
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(true)
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number
    compressedSize: number
    savings: number
  } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16', 
    lg: 'h-24 w-24',
    xl: 'h-32 w-32'
  }

  const getMaxSize = useCallback(() => {
    if (maxSizeMB) return maxSizeMB * 1024 * 1024
    if (isAvatar) return 5 * 1024 * 1024 // 5MB for avatars
    return allowVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
  }, [maxSizeMB, isAvatar, allowVideo])

  const getAcceptedTypes = useCallback(() => {
    const imageTypes = allowImage ? ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'] : []
    const videoTypes = allowVideo && !isAvatar ? ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'] : []
    return [...imageTypes, ...videoTypes]
  }, [allowImage, allowVideo, isAvatar])

  const getFileTypeDescription = useCallback(() => {
    const parts = []
    if (allowImage) parts.push('Images (JPEG, PNG, GIF, WebP)')
    if (allowVideo && !isAvatar) parts.push('Videos (MP4, WebM, OGG, MOV)')
    return parts.join(' or ')
  }, [allowImage, allowVideo, isAvatar])



  const optimizeImageFile = useCallback(async (file: File): Promise<File> => {
    if (!enableOptimization || !file.type.startsWith('image/')) {
      return file
    }

    setOptimizing(true)

    try {
      const optimizedFile = await compressImage(file, targetImageWidth, compressionQuality)
      
      // Calculate compression savings
      const originalSize = file.size
      const compressedSize = optimizedFile.size
      const savings = Math.round(((originalSize - compressedSize) / originalSize) * 100)

      setCompressionStats({
        originalSize,
        compressedSize,
        savings
      })

      return optimizedFile
    } catch (error) {
      console.error('Optimization error:', error)
      return file
    } finally {
      setOptimizing(false)
    }
  }, [enableOptimization, targetImageWidth, compressionQuality])

  const handleFileUpload = async (file: File) => {
    if (!session || !user) {
      setUploadError('You must be logged in to upload files')
      return
    }

    // Debug authentication
    console.log('Upload debug - User ID:', user.id)
    console.log('Upload debug - Session exists:', !!session)
    console.log('Upload debug - Access token exists:', !!session.access_token)

    const acceptedTypes = getAcceptedTypes()
    const maxSize = getMaxSize()

    // Validate file type
    if (!validateFileType(file, acceptedTypes)) {
      setUploadError(`Please upload a valid file: ${getFileTypeDescription()}`)
      return
    }

    // Validate file size
    const sizeLimitMB = maxSizeMB || (isAvatar ? 5 : file.type.startsWith('video/') ? 50 : 10)
    if (!validateFileSize(file, sizeLimitMB)) {
      setUploadError(`File size must be less than ${sizeLimitMB}MB`)
      return
    }

    try {
      setUploadError('')
      setCompressionStats(null)

      // Optimize image files if enabled
      const processedFile = await optimizeImageFile(file)

      setUploading(true)
      setUploadProgress(20)

      const formData = new FormData()
      formData.append('file', processedFile)

      setUploadProgress(40)

      const uploadUrl = `https://${projectId}.supabase.co/functions/v1/make-server-cfac176d/upload/${bucket}`
      console.log('Upload URL:', uploadUrl)
      console.log('Using token:', session.access_token?.substring(0, 20) + '...')

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData
      })

      setUploadProgress(100)

      console.log('Upload response status:', response.status)
      console.log('Upload response headers:', Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const result = await response.json()
        console.log('Upload successful:', result)
        const { url, fileType } = result
        setPreviewMedia(url)
        setPreviewMediaType(fileType)
        onMediaChange(url, fileType)
        
        if (isAvatar) {
          setShowUploadOptions(false)
        }
        
        // Reset form
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        
        // Auto-hide compression stats after 3 seconds
        if (compressionStats && compressionStats.savings > 0) {
          setTimeout(() => {
            setCompressionStats(null)
          }, 3000)
        }
      } else {
        const errorResponse = await response.text()
        console.error('Upload failed:', response.status, errorResponse)
        
        let errorMessage = 'Failed to upload file'
        try {
          const parsed = JSON.parse(errorResponse)
          errorMessage = parsed.error || errorMessage
        } catch {
          // If not JSON, use the text response
          errorMessage = errorResponse || errorMessage
        }
        
        // Add specific error messages for common issues
        if (response.status === 401) {
          errorMessage = '🔐 Authentication failed. Please try signing out and back in, or refresh the page.'
        } else if (response.status === 403) {
          errorMessage = '🚫 Access denied. Please check your permissions.'
        } else if (response.status === 404) {
          errorMessage = '📁 Upload service not found. Please check your configuration.'
        }
        
        setUploadError(errorMessage)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError('An unexpected error occurred during upload')
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 200)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleUrlSubmit = () => {
    if (!mediaUrl.trim()) {
      setUploadError('Please enter a valid media URL')
      return
    }

    try {
      new URL(mediaUrl)
      // Determine media type from URL extension or content type
      const isVideo = /\.(mp4|webm|ogg|mov|avi)$/i.test(mediaUrl) || mediaUrl.includes('video')
      const mediaType = isVideo ? 'video' : 'image'
      
      setPreviewMedia(mediaUrl)
      setPreviewMediaType(mediaType)
      onMediaChange(mediaUrl, mediaType)
      setUploadError('')
      
      if (isAvatar) {
        setShowUploadOptions(false)
      }
    } catch {
      setUploadError('Please enter a valid URL')
    }
  }

  const handleRemoveMedia = () => {
    setPreviewMedia('')
    setMediaUrl('')
    setCompressionStats(null)
    onMediaChange('', 'image')
    if (isAvatar) {
      setShowUploadOptions(false)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsVideoPlaying(!isVideoPlaying)
    }
  }

  const toggleVideoMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isVideoMuted
      setIsVideoMuted(!isVideoMuted)
    }
  }

  const getFileTypeIcon = () => {
    if (allowImage && allowVideo) return <Upload className="h-6 w-6" />
    if (allowVideo) return <FileVideo className="h-6 w-6" />
    return <FileImage className="h-6 w-6" />
  }

  const getFileInputAccept = () => {
    const types = []
    if (allowImage) types.push('image/*')
    if (allowVideo && !isAvatar) types.push('video/*')
    return types.join(',')
  }

  // Avatar-specific rendering
  if (isAvatar) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar Display */}
          <div className="relative group">
            <Avatar className={`${sizeClasses[size]} cursor-pointer transition-all duration-200 hover:scale-105`}>
              <AvatarImage src={previewMedia} alt="Avatar" />
              <AvatarFallback className="bg-primary/10 text-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            
            {/* Hover Overlay */}
            <div 
              className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
              onClick={() => setShowUploadOptions(!showUploadOptions)}
            >
              <Camera className="h-6 w-6 text-white" />
            </div>
            
            {/* Remove Button */}
            {previewMedia && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemoveMedia}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Upload Options */}
          {showUploadOptions && (
            <div className="glass-card p-4 space-y-4 w-full max-w-sm">
              {/* Upload Method Toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={uploadMethod === 'file' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUploadMethod('file')}
                  className="gap-2 flex-1"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
                <Button
                  type="button"
                  variant={uploadMethod === 'url' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUploadMethod('url')}
                  className="gap-2 flex-1"
                >
                  <Link className="h-4 w-4" />
                  URL
                </Button>
              </div>

              {/* File Upload */}
              {uploadMethod === 'file' && (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div className="space-y-2">
                    <div className="mx-auto w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Choose photo</p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* URL Input */}
              {uploadMethod === 'url' && (
                <div className="space-y-2">
                  <Input
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <Button
                    type="button"
                    onClick={handleUrlSubmit}
                    disabled={!mediaUrl.trim()}
                    className="w-full"
                  >
                    Set Avatar
                  </Button>
                </div>
              )}

              {/* Cancel Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUploadOptions(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Upload Button (when no options shown) */}
          {!showUploadOptions && !uploading && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUploadOptions(true)}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Change Avatar
            </Button>
          )}
        </div>

        {/* Shared components below */}
        {renderSharedComponents()}
      </div>
    )
  }

  // Regular media upload rendering
  return (
    <div className={`space-y-4 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      
      {/* Upload Method Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={uploadMethod === 'file' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUploadMethod('file')}
          className="gap-2"
        >
          {enableOptimization && allowImage ? (
            <Zap className="h-4 w-4" />
          ) : (
            getFileTypeIcon()
          )}
          {enableOptimization && allowImage ? 'Smart Upload' : 'Upload File'}
        </Button>
        <Button
          type="button"
          variant={uploadMethod === 'url' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUploadMethod('url')}
          className="gap-2"
        >
          <Link className="h-4 w-4" />
          Media URL
        </Button>
      </div>

      {/* Compression Stats */}
      {compressionStats && (
        <div className="glass-card p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
            <CheckCircle className="h-4 w-4" />
            Image Optimized Successfully!
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Original:</span> {formatFileSize(compressionStats.originalSize)}
            </div>
            <div>
              <span className="font-medium">Compressed:</span> {formatFileSize(compressionStats.compressedSize)}
            </div>
            <div className="col-span-2">
              <span className="font-medium">Space Saved:</span> {compressionStats.savings}% 
              ({formatFileSize(compressionStats.originalSize - compressionStats.compressedSize)})
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {previewMedia && (
        <div className="relative">
          <div className="aspect-video w-full max-w-md rounded-lg overflow-hidden border">
            {previewMediaType === 'video' ? (
              <div className="relative w-full h-full bg-black">
                <video
                  ref={videoRef}
                  src={previewMedia}
                  className="w-full h-full object-contain"
                  muted={isVideoMuted}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => setIsVideoPlaying(false)}
                  preload="metadata"
                />
                
                {/* Video Controls */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-black/50 hover:bg-black/70"
                    onClick={toggleVideoPlay}
                  >
                    {isVideoPlaying ? 
                      <Pause className="h-4 w-4 text-white" /> : 
                      <Play className="h-4 w-4 text-white" />
                    }
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-black/50 hover:bg-black/70"
                    onClick={toggleVideoMute}
                  >
                    {isVideoMuted ? 
                      <VolumeX className="h-4 w-4 text-white" /> : 
                      <Volume2 className="h-4 w-4 text-white" />
                    }
                  </Button>
                </div>
              </div>
            ) : (
              <ImageWithFallback
                src={previewMedia}
                alt="Media preview"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-8 w-8"
            onClick={handleRemoveMedia}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* File Upload */}
      {uploadMethod === 'file' && !previewMedia && (
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getFileInputAccept()}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
              {enableOptimization && allowImage ? (
                <Zap className="h-6 w-6 text-primary" />
              ) : allowVideo && allowImage ? (
                <Upload className="h-6 w-6 text-muted-foreground" />
              ) : allowVideo ? (
                <Video className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {enableOptimization && allowImage 
                  ? 'Click to upload with auto-optimization'
                  : 'Click to upload or drag and drop'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {getFileTypeDescription()} up to {maxSizeMB || (allowVideo ? 50 : 10)}MB
              </p>
              {enableOptimization && allowImage && (
                <p className="text-xs text-primary mt-1">
                  ⚡ Images will be automatically compressed to WebP format
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* URL Input */}
      {uploadMethod === 'url' && !previewMedia && (
        <div className="flex gap-2">
          <Input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://example.com/media.jpg"
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleUrlSubmit}
            disabled={!mediaUrl.trim()}
          >
            Add
          </Button>
        </div>
      )}

      {renderSharedComponents()}
    </div>
  )

  // Shared components function
  function renderSharedComponents() {
    return (
      <>
        {/* Optimization Progress */}
        {optimizing && (
          <div className="space-y-2">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-sm text-primary">
                <Zap className="w-4 h-4" />
                Optimizing image...
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Uploading {isAvatar ? 'avatar' : 'media'}...
              </div>
            </div>
            {uploadProgress > 0 && (
              <Progress value={uploadProgress} className="h-2" />
            )}
          </div>
        )}

        {/* Error State */}
        {uploadError && (
          <Alert variant="destructive" className={isAvatar ? 'max-w-sm' : ''}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}
      </>
    )
  }
})

export default UnifiedUpload