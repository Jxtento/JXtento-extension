import React, { useState, useEffect, useRef } from "react"

interface SmartFollower {
  userId: string
  handle: string
  avatarUrl: string | null
  roleLabel: string | null
  roleColor: string | null
  onchainVerified: boolean
}

export function SmartFollowerChip({ follower }: { follower: SmartFollower }) {
  const [isVisible, setIsVisible] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    })
    
    if (imgRef.current) {
      observer.observe(imgRef.current)
    }
    
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex items-center gap-1.5 cursor-pointer group">
      <div className="relative flex-shrink-0 w-5 h-5 rounded-full bg-[#1f2022] overflow-hidden" ref={imgRef as any}>
        {isVisible && follower.avatarUrl ? (
          <img 
            src={follower.avatarUrl} 
            alt={follower.handle}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.nextElementSibling) {
                target.nextElementSibling.classList.remove('hidden');
              }
            }}
          />
        ) : null}
        
        {/* Monogram fallback */}
        <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400 ${follower.avatarUrl && isVisible ? 'hidden' : ''}`}>
          {follower.handle.substring(0, 2).toUpperCase()}
        </div>
      </div>
      
      <div 
        className="px-1.5 py-[1px] bg-black text-white text-[11px] font-medium leading-tight rounded-[2px]"
        style={{ border: `1px solid ${follower.roleColor || '#3b82f6'}` }}
      >
        {follower.roleLabel || `@${follower.handle}`}
      </div>
    </div>
  )
}
