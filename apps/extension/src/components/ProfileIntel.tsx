import React, { useEffect, useState } from "react"
import { SmartFollowerChip } from "./SmartFollowerChip"
import { fetchSmartFollowers } from "../lib/infeed-api"

export function ProfileIntel({ userId, logoUrl }: { userId: string, logoUrl: string }) {
  const [followers, setFollowers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchSmartFollowers(userId).then(data => {
      setFollowers(data.items || [])
      setTotal(data.total || 0)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [userId])

  return (
    <div className="flex flex-col gap-5 p-1">
      {/* Header */}
      <div className="flex justify-end items-center border-b border-[#2f3336]/50 pb-3">
        <button className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1 shadow-sm">
          <span>+</span> Add Label
        </button>
      </div>

      {/* Smart Followers */}
      <div className="mt-1 bg-black rounded-xl pt-4 pb-2">
        <div className="flex flex-wrap gap-x-3 gap-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {followers.map(f => (
            <SmartFollowerChip key={f.userId} follower={f} />
          ))}
        </div>
      </div>
    </div>
  )
}