import React from "react"
import type { WalletIntelligence } from "../lib/mockIntelligence"

export function OnChainWalletTracker({ intelligence }: { intelligence: WalletIntelligence }) {
  if (!intelligence) return null;

  return (
    <div className="rounded-sm border border-jxtento-border bg-jxtento-panel p-4">
      <h2 className="text-sm font-semibold mb-3">On-Chain Wallet Tracker</h2>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-jxtento-bg p-2 rounded border border-jxtento-border">
          <p className="text-xs text-jxtento-muted mb-1">7D PNL</p>
          <p className="text-sm font-bold text-jxtento-good">{intelligence.pnl7d}</p>
        </div>
        <div className="bg-jxtento-bg p-2 rounded border border-jxtento-border">
          <p className="text-xs text-jxtento-muted mb-1">Win Rate</p>
          <p className="text-sm font-bold text-jxtento-text">{intelligence.winrate}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase text-jxtento-muted mb-2">Recent Activity</p>
        <div className="space-y-2">
          {intelligence.recentActivity && intelligence.recentActivity.length > 0 ? (
            intelligence.recentActivity.map((activity: string, i: number) => (
              <div key={i} className="flex justify-between items-center text-xs p-2 bg-jxtento-bg rounded border border-jxtento-border">
                <span className="text-jxtento-text">{activity}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-jxtento-muted p-2">No recent activity detected.</div>
          )}
        </div>
      </div>
    </div>
  )
}
