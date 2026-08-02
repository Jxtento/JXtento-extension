import React, { useEffect, useState } from "react"
import { SmartFollowerChip } from "./SmartFollowerChip"
import { fetchSmartFollowers } from "../lib/infeed-api"

export function ProfileIntel({ userId, logoUrl }: { userId: string, logoUrl: string }) {
  const [followers, setFollowers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSmartFollowers(userId).then(data => {
      setFollowers(data.items || [])
      setTotal(data.total || 0)
      setLoading(false)
    }).catch(console.error)
  }, [userId])
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="JXtento Logo" className="w-5 h-5 object-contain" />
          <span className="text-xs text-gray-400">Powered by JXtento</span>
        </div>
        <button className="bg-[#1f2022] hover:bg-[#2f3336] text-white text-xs px-3 py-1 rounded-full font-bold">
          + Add Label
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#16181c] p-3 rounded-lg">
          <h4 className="text-gray-500 text-xs mb-1">Wallets</h4>
          <div className="flex gap-4">
            <div>
              <div className="text-white font-bold text-lg">0</div>
              <div className="text-gray-500 text-[10px]">Linked</div>
            </div>
            <div>
              <div className="text-white font-bold text-lg">0</div>
              <div className="text-gray-500 text-[10px]">Mentioned</div>
            </div>
          </div>
        </div>

        <div className="bg-[#16181c] p-3 rounded-lg">
          <h4 className="text-gray-500 text-xs mb-1">History</h4>
          <div className="flex gap-4">
            <div>
              <div className="text-white font-bold text-lg">0 <span className="text-red-500 text-xs text-normal">(0)</span></div>
              <div className="text-gray-500 text-[10px]">CA Total (Deleted)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <h4 className="text-gray-500 text-xs mb-2 font-bold uppercase tracking-wider">Smart Followers ({total})</h4>
        
        {loading ? (
          <div className="text-gray-400 text-xs italic">Loading avatars...</div>
        ) : followers.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {followers.map(f => (
              <SmartFollowerChip key={f.userId} follower={f} />
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-xs italic">No smart followers found.</div>
        )}
      </div>
    </div>
  )
}
