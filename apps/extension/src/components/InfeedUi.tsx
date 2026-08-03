import React, { useState, useEffect } from "react"
import { ProfileIntel } from "./ProfileIntel"
import { checkTokenGate } from "../lib/tokenGate"

export function InfeedUi({ userId, logoUrl }: { userId: string, logoUrl: string }) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    checkTokenGate(undefined).then(gate => {
      setIsUnlocked(gate.unlocked)
      setBalance(gate.balance)
    }).catch(console.error)
  }, [])

  return (
    <div className="jxtento-infeed-card bg-black border border-[#1f2022] rounded-xl overflow-hidden text-white font-sans w-full mt-4 mb-4 shadow-lg box-border">
      <div className="p-4 relative">
        {!isUnlocked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="bg-[#16181c] border border-red-900/50 p-4 rounded-xl text-center shadow-xl">
              <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-white font-bold mb-1">Premium Intel Locked</h3>
              <p className="text-xs text-gray-400 mb-3">Hold 0.5% of $JXTENTO supply to unlock full wallet and CA history.</p>
              <div className="text-xs text-red-400">Current balance: {balance.toLocaleString()} $JXTENTO</div>
            </div>
          </div>
        )}
        
        <div className={!isUnlocked ? "opacity-30 pointer-events-none" : ""}>
          <ProfileIntel userId={userId} logoUrl={logoUrl} />
        </div>
      </div>
    </div>
  )
}
