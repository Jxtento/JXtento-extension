import React, { useEffect, useState } from "react"
import { fetchCaHistory } from "../lib/infeed-api"

export function CaHistory({ userId, logoUrl }: { userId: string, logoUrl: string }) {
  const [data, setData] = useState<{ active: any[], deleted: any[] }>({ active: [], deleted: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCaHistory(userId).then(res => {
      setData(res)
      setLoading(false)
    }).catch(console.error)
  }, [userId])
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="JXtento Logo" className="w-5 h-5 object-contain" />
          <span className="text-xs text-gray-400 font-bold">CA History</span>
        </div>
      </div>
      
      {loading ? (
        <div className="text-gray-400 text-sm italic">Loading CA history...</div>
      ) : data.active.length === 0 && data.deleted.length === 0 ? (
        <div className="text-gray-400 text-sm italic">No CA history found.</div>
      ) : (
        <div className="text-sm">
          <div className="text-gray-400">Active ({data.active.length}), Deleted ({data.deleted.length})</div>
          {/* We'll render rows here in the future */}
        </div>
      )}
    </div>
  )
}
