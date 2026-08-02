import { useEffect, useState } from "react"
import { DeveloperReputationPanel } from "./DeveloperReputationPanel"
import { TokenRiskPanel } from "./TokenRiskPanel"
import type { TokenIntelligence } from "../lib/mockIntelligence"
import type { JXtentoTokenContext } from "../lib/jxtentoTokenContext"
import { GuardToggleButton } from "./GuardToggleButton"

type SmartMoneyEvent = {
  action: string
  amount: string
  walletLabel: string
}

export function JXtentoProPanel({ mintAddress, context }: { mintAddress: string, context?: JXtentoTokenContext | undefined }) {
  const [intel, setIntel] = useState<TokenIntelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const [smartMoneyEvents, setSmartMoneyEvents] = useState<SmartMoneyEvent[]>([])
  const [wsConnected, setWsConnected] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    
    let ws: WebSocket | null = null

    async function initialize() {
      try {
        const backendUrl = (process.env.PLASMO_PUBLIC_JXTENTO_API_URL || "https://jxtento-production.up.railway.app").replace(/\/+$/, "")
        
        // 1. Fetch static risk scan
        const res = await fetch(`${backendUrl}/v1/risk/token/${mintAddress}`)
        if (res.ok) {
          const data = await res.json()
          
          if (active) {
            setIntel({
              address: mintAddress,
              type: "token",
              source: "live",
              providerStatus: "Live backend",
              badge: data.level === "high" ? "Risky" : "Unknown",
              risk: {
                score: data.score,
                level: data.level,
                label: data.level === "high" ? "Risky" : data.level === "medium" ? "Watch" : "Clean"
              },
              holderRisk: `Top 10: ${data.details?.top10Concentration}%`,
              freshWalletActivity: data.details?.freshWalletActivity || "Unknown",
              whaleActivity: data.details?.whaleActivity || "Unknown",
              summary: data.warnings?.join(" ") || "Token appears clean. Authority revoked and routes clear.",
              recentActivity: []
            })
          }
        }
        
        // 2. Connect to WebSocket for Smart Money
        const wsUrl = backendUrl.replace(/^http/, "ws") + "/ws/kol-alerts"
        ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          if (active) {
            setWsConnected(true)
            ws?.send(JSON.stringify({ action: "subscribe", mint: mintAddress }))
          }
        }
        
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === "smart_money" && msg.data.mint === mintAddress) {
              setSmartMoneyEvents((prev) => [msg.data, ...prev].slice(0, 5)) // keep last 5 events
            }
          } catch (e) {
            console.error("Failed to parse WS message", e)
          }
        }
        
        ws.onclose = () => {
          if (active) setWsConnected(false)
        }
      } catch (err) {
        // Fallback
      } finally {
        if (active) setLoading(false)
      }
    }
    
    void initialize()

    return () => {
      active = false
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "unsubscribe", mint: mintAddress }))
        ws.close()
      }
    }
  }, [mintAddress])

  if (loading) {
    return <div className="text-center text-jxtento-muted text-sm py-4">Scanning token data...</div>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Deployer Intel */}
      <DeveloperReputationPanel tokenAddress={mintAddress} context={context} />
      
      {/* Rug Scan Component */}
      <div className="rounded-sm border border-jxtento-border bg-jxtento-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase text-jxtento-muted">Rug Scan</p>
          <GuardToggleButton mint={mintAddress} />
        </div>
        {intel ? (
          <TokenRiskPanel intelligence={intel} />
        ) : (
          <p className="text-sm text-jxtento-muted">Scan failed</p>
        )}
      </div>
      
      {/* Realtime Smart-Money */}
      <div className="rounded-sm border border-jxtento-border bg-jxtento-panel p-4">
        <p className="text-xs font-bold uppercase text-jxtento-muted flex items-center justify-between mb-3">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-jxtento-good animate-pulse' : 'bg-jxtento-bad'}`}></span>
            Smart Money (Live)
          </span>
          <span className="text-[10px] font-normal">{wsConnected ? 'Connected' : 'Disconnected'}</span>
        </p>
        
        {smartMoneyEvents.length === 0 ? (
          <p className="text-sm text-jxtento-muted">Waiting for events...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {smartMoneyEvents.map((ev, i) => (
              <div key={i} className="flex justify-between text-xs p-2 bg-jxtento-bg border border-jxtento-border rounded">
                <span className="font-bold text-jxtento-text">
                  <span className={ev.action.toUpperCase() === 'BUY' ? 'text-jxtento-good' : 'text-jxtento-bad'}>
                    {ev.action.toUpperCase()}
                  </span>
                  {" "}{ev.amount}
                </span>
                <span className="text-jxtento-muted">{ev.walletLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
