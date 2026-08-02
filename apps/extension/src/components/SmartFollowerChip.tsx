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
    <div className="flex items-center gap-2 p-1.5 rounded-full bg-[#16181c] border border-[#1f2022] hover:bg-[#202327] transition-colors cursor-pointer pr-3 max-w-full">
      <div className="relative flex-shrink-0 w-5 h-5 rounded-full bg-[#1f2022] overflow-hidden" ref={imgRef as any}>
        {isVisible && follower.avatarUrl ? (
          <img 
            src={follower.avatarUrl} 
            alt={follower.handle}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to monogram if image fails to load
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
      
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-xs text-white font-medium truncate leading-none">
            {follower.roleLabel || `@${follower.handle}`}
          </span>
          {follower.onchainVerified && (
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#1d9bf0] flex-shrink-0" fill="currentColor">
              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.452.78 2.728 1.938 3.45-.044.182-.068.372-.068.567 0 2.21 1.71 3.998 3.918 3.998.47 0 .92-.084 1.336-.25C9.184 21.585 10.49 22.5 12 22.5s2.816-.917 3.337-2.25c.416.165.866.25 1.336.25 2.21 0 3.918-1.79 3.918-4 0-.195-.024-.385-.068-.567 1.158-.722 1.938-1.998 1.938-3.45zM10.25 16.5l-3.5-3.5 1.41-1.41 2.09 2.09 5.09-5.09 1.41 1.41-6.5 6.5z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
