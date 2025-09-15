import React from 'react'
import { UnifiedUpload } from './UnifiedUpload'

interface AvatarUploadProps {
  onAvatarChange: (avatarUrl: string) => void
  currentAvatar?: string
  userInitials?: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function AvatarUpload({ 
  onAvatarChange, 
  currentAvatar, 
  userInitials = 'U',
  className = "",
  size = 'lg'
}: AvatarUploadProps) {
  return (
    <UnifiedUpload
      onMediaChange={(url) => onAvatarChange(url)}
      currentMedia={currentAvatar}
      className={className}
      bucket="profiles"
      allowVideo={false}
      allowImage={true}
      maxSizeMB={5}
      isAvatar={true}
      userInitials={userInitials}
      size={size}
    />
  )
}