import React, { useEffect, useState } from "react"
import { fetchWalletHistory } from "../lib/infeed-api"

export function WalletHistory({ userId, logoUrl }: { userId: string, logoUrl: string }) {
  const [data, setData] = useState<{ linked: any[], mentioned: any[] }>({ linked: [], mentioned: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWalletHistory(userId).then(res => {
      setData(res)
      setLoading(false)
    }).catch(console.error)
  }, [userId])
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="JXtento Logo" className="w-5 h-5 object-contain" />
          <span className="text-xs text-gray-400 font-bold">Wallet History</span>
        </div>
      </div>
      
      {loading ? (
        <div className="text-gray-400 text-sm italic">Loading wallets...</div>
      ) : data.linked.length === 0 && data.mentioned.length === 0 ? (
        <div className="text-gray-400 text-sm italic">No wallet history found.</div>
      ) : (
        <div className="text-sm">
          <div className="text-gray-400">Linked ({data.linked.length}), Mentioned ({data.mentioned.length})</div>
          {/* We'll render rows here in the future */}
        </div>
      )}
    </div>
  )
}
