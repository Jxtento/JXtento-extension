import { useEffect, useState } from "react"

import { isLikelySolanaAddress, type SolanaAddressType } from "../lib/detectSolanaAddress"
import { getAddressIntelligence } from "../lib/liveIntelligence"
import type { AddressIntelligence } from "../lib/mockIntelligence"
import type { SelectedAddress } from "../lib/storage"
import {
  getLabel,
  getSelectedAddress,
  getSelectedLaunchContext,
  saveLabel,
  saveSelectedAddress
} from "../lib/storage"
import { getWalletStatus } from "../lib/popup-api"
import {
  buildChatGptLogoUrl,
  buildPumpFunCreateUrl,
  createLaunchDraft,
  type LaunchDraft,
  type XReplyContext
} from "../lib/xLaunchContext"
import { DeveloperReputationPanel } from "./DeveloperReputationPanel"
import { LaunchPanel } from "./LaunchPanel"
import { KolLiveFeed } from "./KolLiveFeed"
import { NewsLiveFeed } from "./NewsLiveFeed"
import { WalletButton } from "./WalletButton"
import { JXtentoProPanel } from "./JXtentoProPanel"
import { ActivityLog } from "./ActivityLog"
import { GuardedTab } from "./GuardedTab"
import { CopilotChat } from "./CopilotChat"
import { GuardToggleButton } from "./GuardToggleButton"
import { getSettings, saveSettings, type OverlaySettings } from "../lib/storage"
import { type Tier, hasAccess } from "../lib/holderTier"

export function SidePanel() {
  const [activeTab, setActiveTab] = useState<"radar" | "kol" | "news" | "jxtento" | "activity" | "guarded" | "copilot">("kol")
  const [selected, setSelected] = useState<SelectedAddress | null>(null)
  const [launchContext, setLaunchContext] = useState<XReplyContext | null>(null)
  const [copied, setCopied] = useState("")
  const [label, setLabel] = useState("")
  const [manualAddress, setManualAddress] = useState("")
  const [manualType, setManualType] = useState<SolanaAddressType>("wallet")
  const [manualError, setManualError] = useState("")
  const [intelligence, setIntelligence] = useState<AddressIntelligence | null>(null)
  const [loadingIntelligence, setLoadingIntelligence] = useState(false)
  const [savedMessage, setSavedMessage] = useState("")
  const [settings, setSettings] = useState<OverlaySettings>({
    overlayEnabled: true,
    showRiskBadges: true,
    showFlowRadar: true
  })

  const [gateStatus, setGateStatus] = useState<{ tier: Tier; balance: number; error?: string } | null>(null);
  const [loadingGate, setLoadingGate] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const verifyGate = async () => {
      setLoadingGate(true);
      const session = await getWalletStatus();
      if (session?.connected && session.publicKey) {
        const { checkTokenGate } = await import("../lib/tokenGate");
        const result = await checkTokenGate(session.publicKey);
        if (mounted) setGateStatus(result);
      } else {
        if (mounted) setGateStatus({ tier: "none", balance: 0, error: "Please connect your wallet to use the extension." });
      }
      if (mounted) setLoadingGate(false);
    };

    verifyGate();

    const listener = (changes: any) => {
      if (changes["jxtento.walletSession"]) {
        verifyGate();
      }
    };
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.onChanged.addListener(listener);
    }
    return () => {
      mounted = false;
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.onChanged.removeListener(listener);
      }
    };
  }, []);

  useEffect(() => {
    void getSettings().then(setSettings)
    void refreshSelected()

    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return

    const handleChange = (changes: any) => {
      if (changes["kolDeployTrigger"]) {
        setActiveTab("radar")
      }
      if (changes["jxtento.selected"] || changes["jxtento.launchContext"]) {
        void refreshSelected()
      }
      if (changes["jxtento.settings"]) {
        const newSettings = changes["jxtento.settings"].newValue
        if (newSettings) setSettings(newSettings)
      }
    }

    chrome.storage.onChanged.addListener(handleChange)
    return () => chrome.storage.onChanged.removeListener(handleChange)
  }, [])

  async function refreshSelected() {
    const nextSelected = await getSelectedAddress()
    const nextLaunchContext = await getSelectedLaunchContext()
    setSelected(nextSelected)
    setLaunchContext(nextLaunchContext)

    if (nextSelected) {
      setLabel((await getLabel(nextSelected.address)) ?? "")
    }
  }

  useEffect(() => {
    if (!selected) {
      setIntelligence(null)
      return
    }

    let active = true
    setLoadingIntelligence(true)

    void getAddressIntelligence(selected.address, selected.type)
      .then((nextIntelligence) => {
        if (active) setIntelligence(nextIntelligence)
      })
      .finally(() => {
        if (active) setLoadingIntelligence(false)
      })

    return () => {
      active = false
    }
  }, [selected])

  async function handleSaveLabel() {
    if (!selected) return

    await saveLabel(selected.address, label)
    setSavedMessage("Label saved locally")
    window.setTimeout(() => setSavedMessage(""), 1800)
  }

  async function handleInspectManualAddress() {
    const address = manualAddress.trim()

    if (!isLikelySolanaAddress(address)) {
      setManualError("Enter a valid Solana-style address")
      return
    }

    const nextSelected = {
      address,
      type: manualType
    }

    setManualError("")
    setLabel((await getLabel(address)) ?? "")
    setSelected(nextSelected)
    await saveSelectedAddress(nextSelected)
  }

  async function copyText(label: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(""), 1500)
  }

  async function openLogoGenerator(draft: LaunchDraft) {
    window.open(buildChatGptLogoUrl(draft), "_blank", "noopener,noreferrer")
    await copyText("logo prompt", draft.logoPrompt)
  }

  if (loadingGate) {
    return (
      <main className="min-h-screen bg-jxtento-bg p-4 text-jxtento-text">
        <PanelHeader />
        <div className="mt-8 text-center text-jxtento-muted text-sm">Checking $FDP balance...</div>
        <SidePanelFooter />
      </main>
    );
  }



  if (!selected || !intelligence) {
    return (
      <main className="min-h-screen bg-jxtento-bg p-4 text-jxtento-text">
        <PanelHeader />
        <div className="flex items-center gap-4 mb-4 border-b border-jxtento-border pb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button 
            onClick={() => setActiveTab("radar")}
            className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'radar' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
          >
            Launch Radar
          </button>
          <button 
            onClick={() => setActiveTab("kol")}
            className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'kol' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
          >
            KOL Live
          </button>
          <button 
            onClick={() => setActiveTab("news")}
            className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'news' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
          >
            News
          </button>
          <button 
            onClick={() => setActiveTab("jxtento")}
            className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'jxtento' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
          >
            JXtento Pro
          </button>
          <button 
            onClick={() => setActiveTab("activity")}
            className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'activity' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
          >
            Activity
          </button>
          <button 
            onClick={() => setActiveTab("guarded")}
            className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'guarded' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
          >
            Guarded
          </button>
          <button 
            onClick={() => setActiveTab("copilot")}
            className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'copilot' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
          >
            Copilot ✨
          </button>
        </div>

        {activeTab === "guarded" ? (
          <div className="flex-1 -mx-4 -mt-4 bg-jxtento-bg relative overflow-hidden p-4">
            {!hasAccess(gateStatus?.tier || "none", "exitGuard") ? (
              <div className="p-6 text-center mt-8">
                <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 mx-auto text-jxtento-muted mb-4">
                  <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="text-lg font-bold text-jxtento-text">Pro Feature Locked</h2>
                <div className="mt-2 text-sm text-jxtento-muted flex flex-col gap-2">
                  {gateStatus?.error && <p className="text-jxtento-bad text-xs mb-1">{gateStatus.error}</p>}
                  <p className="font-bold text-jxtento-text bg-jxtento-border/30 inline-block px-3 py-1 rounded">Required: 5M $FDP (Plus Tier)</p>
                </div>
              </div>
            ) : (
              <GuardedTab />
            )}
          </div>
        ) : activeTab === "copilot" ? (
          <div className="flex-1 -mx-4 -mt-4 bg-jxtento-bg relative overflow-hidden p-4">
            {!hasAccess(gateStatus?.tier || "none", "copilot") ? (
              <div className="p-6 text-center mt-8">
                <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 mx-auto text-jxtento-muted mb-4">
                  <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="text-lg font-bold text-jxtento-text">Pro Feature Locked</h2>
                <div className="mt-2 text-sm text-jxtento-muted flex flex-col gap-2">
                  {gateStatus?.error && <p className="text-jxtento-bad text-xs mb-1">{gateStatus.error}</p>}
                  <p className="font-bold text-jxtento-text bg-jxtento-border/30 inline-block px-3 py-1 rounded">Required: 5M $FDP (Plus Tier)</p>
                </div>
              </div>
            ) : (
              <CopilotChat currentMint={selected?.type === 'token' ? selected.address : undefined} />
            )}
          </div>
        ) : activeTab === "jxtento" ? (
          <div className="flex-1 -mx-4 -mt-4 bg-jxtento-bg relative overflow-hidden p-4">
            <div className="flex items-center justify-between gap-3 rounded-sm border border-jxtento-border bg-jxtento-panel p-3 mb-4">
              <span className="text-sm font-bold">JXtento Flow Radar</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-jxtento-accent cursor-pointer"
                checked={settings.showFlowRadar}
                onChange={async (event) => {
                  const newSettings = { ...settings, showFlowRadar: event.target.checked }
                  setSettings(newSettings)
                  await saveSettings(newSettings)
                }}
              />
            </div>
            {!hasAccess(gateStatus?.tier || "none", "jxtentoOverlay") ? (
              <div className="p-6 text-center mt-8">
                <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 mx-auto text-jxtento-muted mb-4">
                  <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="text-lg font-bold text-jxtento-text">Pro Feature Locked</h2>
                <div className="mt-2 text-sm text-jxtento-muted flex flex-col gap-2">
                  {gateStatus?.error && <p className="text-jxtento-bad text-xs mb-1">{gateStatus.error}</p>}
                  <p className="font-bold text-jxtento-text bg-jxtento-border/30 inline-block px-3 py-1 rounded">Required: 5M $FDP (Plus Tier)</p>
                </div>
              </div>
            ) : !selected || selected.type !== "token" ? (
              <div className="p-6 text-center mt-8">
                <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 mx-auto text-jxtento-muted mb-4">
                  <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="text-lg font-bold text-jxtento-text">Inspect a Token</h2>
                <p className="mt-2 text-sm text-jxtento-muted">
                  Use the manual inspector below or select a token to view JXtento Pro Intel.
                </p>
                <div className="mt-6 text-left">
                  <ManualInspector
                    address={manualAddress}
                    error={manualError}
                    type={manualType}
                    onAddressChange={setManualAddress}
                    onTypeChange={setManualType}
                    onInspect={() => void handleInspectManualAddress()}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">                
                <JXtentoProPanel mintAddress={selected.address} context={selected.context} />
              </div>
            )}
          </div>
        ) : activeTab === "kol" ? (
          <div className="flex-1 -mx-4 -mt-4 bg-jxtento-bg relative overflow-hidden">
            {!hasAccess(gateStatus?.tier || "none", "kolAlerts") ? (
              <div className="p-6 text-center mt-8">
                <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 mx-auto text-jxtento-muted mb-4">
                  <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="text-lg font-bold text-jxtento-text">Pro Feature Locked</h2>
                <div className="mt-2 text-sm text-jxtento-muted flex flex-col gap-2">
                  {gateStatus?.error && <p className="text-jxtento-bad text-xs mb-1">{gateStatus.error}</p>}
                  <p className="font-bold text-jxtento-text bg-jxtento-border/30 inline-block px-3 py-1 rounded">Required: 1M $FDP (Base Tier)</p>
                </div>
              </div>
            ) : (
              <KolLiveFeed />
            )}
          </div>
        ) : activeTab === "news" ? (
          <div className="flex-1 -mx-4 -mt-4 bg-jxtento-bg relative overflow-hidden">
            {!hasAccess(gateStatus?.tier || "none", "kolAlerts") ? (
              <div className="p-6 text-center mt-8">
                <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 mx-auto text-jxtento-muted mb-4">
                  <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="text-lg font-bold text-jxtento-text">Pro Feature Locked</h2>
                <div className="mt-2 text-sm text-jxtento-muted flex flex-col gap-2">
                  {gateStatus?.error && <p className="text-jxtento-bad text-xs mb-1">{gateStatus.error}</p>}
                  <p className="font-bold text-jxtento-text bg-jxtento-border/30 inline-block px-3 py-1 rounded">Required: 1M $FDP (Base Tier)</p>
                </div>
              </div>
            ) : (
              <NewsLiveFeed />
            )}
          </div>
        ) : activeTab === "activity" ? (
          <div className="flex-1 -mx-4 -mt-4 bg-jxtento-bg relative overflow-hidden">
            <ActivityLog />
          </div>
        ) : (
          <>
            <div className="-mx-4 border-b border-jxtento-border pb-4 mb-4">
              <LaunchPanel />
            </div>
            <LaunchWorkspace
              context={launchContext}
              copied={copied}
              onCopy={(label, value) => void copyText(label, value)}
              onOpenLogo={(draft) => void openLogoGenerator(draft)}
            />
            <ManualInspector
              address={manualAddress}
              error={manualError}
              type={manualType}
              onAddressChange={setManualAddress}
              onTypeChange={setManualType}
              onInspect={() => void handleInspectManualAddress()}
            />
            <section className="mt-6 rounded-sm border border-jxtento-border bg-jxtento-panel p-4">
              <p className="text-sm text-jxtento-muted">
                JXtento wallet and token intelligence is available below the launch workspace.
              </p>
            </section>
          </>
        )}
        <SidePanelFooter />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-jxtento-bg p-4 text-jxtento-text">
      <PanelHeader />


      <div className="flex items-center gap-4 mb-4 border-b border-jxtento-border pb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <button 
          onClick={() => setActiveTab("radar")}
          className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'radar' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
        >
          Launch Radar
        </button>
        <button 
          onClick={() => setActiveTab("kol")}
          className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'kol' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
        >
          KOL Live
        </button>
        <button 
          onClick={() => setActiveTab("news")}
          className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'news' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
        >
          News
        </button>
        <button 
          onClick={() => setActiveTab("jxtento")}
          className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'jxtento' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
        >
          JXtento Pro
        </button>
        <button 
          onClick={() => setActiveTab("activity")}
          className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors ${activeTab === 'activity' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
        >
          Activity
        </button>
        <button 
          onClick={() => setActiveTab("guarded")}
          className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'guarded' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
        >
          Guarded
        </button>
        <button 
          onClick={() => setActiveTab("copilot")}
          className={`whitespace-nowrap flex-shrink-0 text-sm font-bold pb-2 -mb-[9px] border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'copilot' ? 'text-jxtento-text border-jxtento-text' : 'text-jxtento-muted border-transparent hover:text-jxtento-text/80'}`}
        >
          Copilot ✨
        </button>
      </div>

      {activeTab === "guarded" ? (
        <div className="flex-1 -mx-4 -mt-4 bg-jxtento-bg relative overflow-hidden p-4">
          {!hasAccess(gateStatus?.tier || "none", "exitGuard") ? (
            <div className="p-6 text-center mt-8">
              <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 mx-auto text-jxtento-muted mb-4">
                <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2 className="text-lg font-bold text-jxtento-text">Pro Feature Locked</h2>
              <div className="mt-2 text-sm text-jxtento-muted flex flex-col gap-2">
                {gateStatus?.error && <p className="text-jxtento-bad text-xs mb-1">{gateStatus.error}</p>}
                <p className="font-bold text-jxtento-text bg-jxtento-border/30 inline-block px-3 py-1 rounded">Required: 5M $FDP (Plus Tier)</p>
              </div>
            </div>
          ) : (
            <GuardedTab />
          )}
        </div>
      ) : activeTab === "copilot" ? (
        <div className="flex-1 -mx-4 -mt-4 bg-jxtento-bg relative overflow-hidden p-4">
          {!hasAccess(gateStatus?.tier || "none", "copilot") ? (
            <div className="p-6 text-center mt-8">
              <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 mx-auto text-jxtento-muted mb-4">
                <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2 className="text-lg font-bold text-jxtento-text">Pro Feature Locked</h2>
              <div className="mt-2 text-sm text-jxtento-muted flex flex-col gap-2">
                {gateStatus?.error && <p className="text-jxtento-bad text-xs mb-1">{gateStatus.error}</p>}
                <p className="font-bold text-jxtento-text bg-jxtento-border/30 inline-block px-3 py-1 rounded">Required: 5M $FDP (Plus Tier)</p>
              </div>
            </div>
          ) : (
            <CopilotChat currentMint={selected?.type === 'token' ? selected.address : undefined} />
          )}
        </div>
      ) : activeTab === "jxtento" ? (
        <div className="flex-1 -mx-4 -mt-4 bg-jxtento-bg relative overflow-hidden p-4">
          <div className="flex items-center justify-between gap-3 rounded-sm border border-jxtento-border bg-jxtento-panel p-3 mb-4">
            <span className="text-sm font-bold">JXtento Flow Radar</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-jxtento-accent cursor-pointer"
              checked={settings.showFlowRadar}
              onChange={async (event) => {
                const newSettings = { ...settings, showFlowRadar: event.target.checked }
                setSettings(newSettings)
                await saveSettings(newSettings)
              }}
            />
          </div>
          {!hasAccess(gateStatus?.tier || "none", "jxtentoOverlay") ? (
            <div className="p-6 text-center mt-8">
              <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 mx-auto text-jxtento-muted mb-4">
                <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2 className="text-lg font-bold text-jxtento-text">Pro Feature Locked</h2>
              <div className="mt-2 text-sm text-jxtento-muted flex flex-col gap-2">
                {gateStatus?.error && <p className="text-jxtento-bad text-xs mb-1">{gateStatus.error}</p>}
                <p className="font-bold text-jxtento-text bg-jxtento-border/30 inline-block px-3 py-1 rounded">Required: 5M $FDP (Plus Tier)</p>
              </div>
            </div>
          ) : !selected || selected.type !== "token" ? (
            <div className="p-6 text-center mt-8">
              <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 mx-auto text-jxtento-muted mb-4">
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2 className="text-lg font-bold text-jxtento-text">Inspect a Token</h2>
              <p className="mt-2 text-sm text-jxtento-muted">
                Use the manual inspector below or select a token to view JXtento Pro Intel.
              </p>
              <div className="mt-6 text-left">
                <ManualInspector
                  address={manualAddress}
                  error={manualError}
                  type={manualType}
                  onAddressChange={setManualAddress}
                  onTypeChange={setManualType}
                  onInspect={() => void handleInspectManualAddress()}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">                
              <JXtentoProPanel mintAddress={selected.address} context={selected.context} />
            </div>
          )}
        </div>
      ) : activeTab === "kol" ? (
        <div className="flex-1 -mx-4 -mt-4 bg-jxtento-bg relative overflow-hidden">
          {!hasAccess(gateStatus?.tier || "none", "kolAlerts") ? (
            <div className="p-6 text-center mt-8">
              <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 mx-auto text-jxtento-muted mb-4">
                <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2 className="text-lg font-bold text-jxtento-text">Pro Feature Locked</h2>
              <div className="mt-2 text-sm text-jxtento-muted flex flex-col gap-2">
                {gateStatus?.error && <p className="text-jxtento-bad text-xs mb-1">{gateStatus.error}</p>}
                <p className="font-bold text-jxtento-text bg-jxtento-border/30 inline-block px-3 py-1 rounded">Required: 1M $FDP (Base Tier)</p>
              </div>
            </div>
          ) : (
            <KolLiveFeed />
          )}
        </div>
      ) : activeTab === "activity" ? (
        <div className="flex-1 -mx-4 -mt-4 bg-jxtento-bg relative overflow-hidden">
          <ActivityLog />
        </div>
      ) : (
        <>
          <div className="-mx-4 border-b border-jxtento-border pb-4 mb-4">
            <LaunchPanel />
          </div>
          <LaunchWorkspace
            context={launchContext}
            copied={copied}
            onCopy={(copyLabel, value) => void copyText(copyLabel, value)}
            onOpenLogo={(draft) => void openLogoGenerator(draft)}
          />
          <ManualInspector
            address={manualAddress}
            error={manualError}
            type={manualType}
            onAddressChange={setManualAddress}
            onTypeChange={setManualType}
            onInspect={() => void handleInspectManualAddress()}
          />

          <section className="mt-4 space-y-4">
        <div className="rounded-sm border border-jxtento-border bg-jxtento-panel p-4">
          <div className="flex justify-between items-center">
            <p className="text-xs uppercase text-jxtento-muted">{selected.type}</p>
            {selected.type === "token" && <GuardToggleButton mint={selected.address} />}
          </div>
          <p className="mt-2 break-all font-mono text-sm text-jxtento-text">
            {selected.address}
          </p>
          {selected.context ? <DetectedContext context={selected.context} /> : null}
          <div className="mt-3 flex items-center justify-between border-t border-jxtento-border pt-3 text-xs">
            <span className="font-bold uppercase text-jxtento-muted">Source</span>
            <span className="font-bold text-jxtento-text">
              {loadingIntelligence ? "Loading" : intelligence.source}
            </span>
          </div>
        </div>

        <div className="rounded-sm border border-jxtento-border bg-jxtento-panel p-4">
          <label className="text-xs font-semibold text-jxtento-muted" htmlFor="label">
            User label
          </label>
          <input
            id="label"
            className="mt-2 w-full rounded-sm border border-jxtento-border bg-jxtento-panel px-3 py-2 text-sm text-jxtento-text outline-none focus:border-jxtento-accent"
            value={label}
            placeholder="e.g. Alpha caller, market maker, risky wallet"
            onChange={(event) => setLabel(event.target.value)}
          />
          <button
            type="button"
            className="mt-3 rounded-sm bg-jxtento-accent px-3 py-2 text-sm font-bold text-white transition hover:bg-jxtento-muted"
            onClick={() => void handleSaveLabel()}>
            Save label
          </button>
          {savedMessage ? (
            <p className="mt-2 text-xs text-jxtento-good">{savedMessage}</p>
          ) : null}
        </div>

        <div className="rounded-sm border border-jxtento-border bg-jxtento-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-jxtento-muted">Risk score</span>
            <span className="text-lg font-bold text-jxtento-text">
              {intelligence.risk.score}/100
            </span>
          </div>
          <p className="mt-2 text-xs font-bold uppercase text-jxtento-muted">
            {intelligence.providerStatus}
          </p>
          <p className="mt-3 text-sm leading-6 text-jxtento-muted">{intelligence.summary}</p>
          {intelligence.type === "token" ? (
            <TokenMarketMetrics intelligence={intelligence} />
          ) : null}
        </div>

        <div className="rounded-sm border border-jxtento-border bg-jxtento-panel p-4">
          <h2 className="text-sm font-semibold">Recent intelligence</h2>
          <ul className="mt-3 space-y-2">
            {intelligence.recentActivity.map((activity) => (
              <li
                key={activity}
                className="rounded-sm border border-jxtento-border bg-jxtento-bg p-2 text-xs leading-5 text-jxtento-muted">
                {activity}
              </li>
            ))}
          </ul>
        </div>
        {selected.type === "token" ? (
          <DeveloperReputationPanel tokenAddress={selected.address} context={selected.context} />
        ) : null}
      </section>
    </>
  )}
      <SidePanelFooter />
    </main>
  )
}

function LaunchWorkspace({
  context,
  copied,
  onCopy,
  onOpenLogo
}: {
  context: XReplyContext | null
  copied: string
  onCopy: (label: string, value: string) => void
  onOpenLogo: (draft: LaunchDraft) => void
}) {
  if (!context) {
    return (
      <section className="mt-4 rounded-sm border border-jxtento-border bg-jxtento-panel p-4">
        <p className="text-xs font-bold uppercase text-jxtento-muted">X launch radar</p>
        <h2 className="mt-1 text-xl font-bold leading-tight">Waiting for X signal</h2>
        <p className="mt-3 text-sm leading-6 text-jxtento-muted">
          Open X, hover or click a post, and the latest launch draft will appear here.
        </p>
      </section>
    )
  }

  const draft = createLaunchDraft(context)

  return (
    <section className="mt-4 space-y-3 rounded-sm border border-jxtento-border bg-jxtento-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-jxtento-muted">X launch radar</p>
          <h2 className="mt-1 text-2xl font-bold leading-tight">
            {draft.tokenName} <span className="text-jxtento-muted">${draft.ticker}</span>
          </h2>
          <p className="mt-1 text-xs font-semibold text-jxtento-muted">
            @{context.handle} - {context.influence === "major" ? "major account" : "reply signal"}
          </p>
        </div>
        <span className="rounded-sm border border-jxtento-border px-2 py-1 text-xs font-bold uppercase text-jxtento-text">
          {draft.confidence}
        </span>
      </div>

      <p className="max-h-24 overflow-hidden rounded-sm border border-jxtento-border bg-jxtento-bg p-2 text-xs leading-5 text-jxtento-muted">
        {context.text}
      </p>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <MarketMetric label="Name" value={draft.tokenName} />
        <MarketMetric label="Ticker" value={`$${draft.ticker}`} />
        <MarketMetric label="Source" value="X reply" />
        <MarketMetric label="Launch" value="Manual" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PanelButton onClick={() => onCopy("name", draft.tokenName)}>Copy name</PanelButton>
        <PanelButton onClick={() => onCopy("ticker", draft.ticker)}>Copy ticker</PanelButton>
        <PanelButton onClick={() => onCopy("X link", draft.sourceUrl)}>Copy X link</PanelButton>
        <PanelButton onClick={() => onCopy("metadata", formatLaunchMetadata(draft))}>
          Copy all
        </PanelButton>
        <PanelButton onClick={() => onOpenLogo(draft)}>Logo via GPT</PanelButton>
        <PanelButton onClick={() => window.open(buildPumpFunCreateUrl(draft), "_blank", "noopener,noreferrer")}>
          Deploy page
        </PanelButton>
      </div>

      {copied ? <p className="text-xs font-semibold text-jxtento-good">Copied {copied}</p> : null}

      <p className="border-t border-jxtento-border pt-2 text-[11px] leading-4 text-jxtento-muted">
        Manual launch only. This extension never connects wallets, asks for SOL, or sends transactions.
      </p>
    </section>
  )
}

function PanelButton({
  children,
  onClick
}: {
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="rounded-sm bg-jxtento-accent px-3 py-2 text-xs font-bold text-white transition hover:bg-jxtento-muted"
      onClick={onClick}>
      {children}
    </button>
  )
}

function DetectedContext({
  context
}: {
  context: NonNullable<SelectedAddress["context"]>
}) {
  return (
    <div className="mt-3 rounded-sm border border-jxtento-border bg-jxtento-bg p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold uppercase text-jxtento-muted">JXtento card context</span>
        <span className="font-semibold text-jxtento-text">
          {context.ticker ?? context.shortAddress ?? "token"}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <ContextMetric label="Market cap" value={formatCompactUsd(context.marketCapUsd)} />
        <ContextMetric
          label="X handle"
          value={context.deployerHandle ? `@${context.deployerHandle}` : "n/a"}
        />
        <ContextMetric label="Website" value={context.websiteUrl ? "detected" : "n/a"} />
        <ContextMetric label="GitHub" value={context.githubRepoUrl ? "detected" : "n/a"} />
      </div>
    </div>
  )
}

function ContextMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold uppercase text-jxtento-muted">{label}</p>
      <p className="mt-1 truncate font-semibold text-jxtento-text">{value}</p>
    </div>
  )
}

function ManualInspector({
  address,
  error,
  type,
  onAddressChange,
  onTypeChange,
  onInspect
}: {
  address: string
  error: string
  type: SolanaAddressType
  onAddressChange: (address: string) => void
  onTypeChange: (type: SolanaAddressType) => void
  onInspect: () => void
}) {
  return (
    <section className="mt-4 rounded-sm border border-jxtento-border bg-jxtento-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-jxtento-muted" htmlFor="manual-address">
          Inspect address
        </label>
        <select
          className="rounded-sm border border-jxtento-border bg-jxtento-panel px-2 py-1 text-xs text-jxtento-text outline-none focus:border-jxtento-accent"
          value={type}
          onChange={(event) => onTypeChange(event.target.value as SolanaAddressType)}>
          <option value="wallet">Wallet</option>
          <option value="token">Token</option>
        </select>
      </div>
      <input
        id="manual-address"
        className="mt-2 w-full rounded-sm border border-jxtento-border bg-jxtento-panel px-3 py-2 font-mono text-xs text-jxtento-text outline-none focus:border-jxtento-accent"
        value={address}
        placeholder="Paste Solana wallet or token address"
        onChange={(event) => onAddressChange(event.target.value)}
      />
      <button
        type="button"
        className="mt-3 rounded-sm bg-jxtento-accent px-3 py-2 text-sm font-bold text-white transition hover:bg-jxtento-muted"
        onClick={onInspect}>
        Inspect
      </button>
      {error ? <p className="mt-2 text-xs text-jxtento-bad">{error}</p> : null}
    </section>
  )
}

function TokenMarketMetrics({ intelligence }: { intelligence: Extract<AddressIntelligence, { type: "token" }> }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      <MarketMetric label="Symbol" value={intelligence.tokenSymbol ?? "n/a"} />
      <MarketMetric label="Price" value={formatUsd(intelligence.priceUsd)} />
      <MarketMetric label="Liquidity" value={formatUsd(intelligence.liquidityUsd)} />
      <MarketMetric
        label="24h"
        value={
          intelligence.priceChange24h !== undefined
            ? `${intelligence.priceChange24h.toFixed(2)}%`
            : "n/a"
        }
      />
    </div>
  )
}

function MarketMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-jxtento-border bg-jxtento-bg p-2">
      <p className="font-bold uppercase text-jxtento-muted">{label}</p>
      <p className="mt-1 truncate font-semibold text-jxtento-text">{value}</p>
    </div>
  )
}

function formatUsd(value?: number) {
  if (value === undefined) return "n/a"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 6 : 2
  }).format(value)
}

function formatCompactUsd(value?: number) {
  if (value === undefined) return "n/a"
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  return `$${value.toFixed(0)}`
}

function formatLaunchMetadata(draft: LaunchDraft) {
  return [
    `Name: ${draft.tokenName}`,
    `Ticker: ${draft.ticker}`,
    `Description: ${draft.description}`,
    `Source X reply: ${draft.sourceUrl}`,
    `Logo prompt: ${draft.logoPrompt}`
  ].join("\n")
}

function PanelHeader() {
  return (
    <header className="flex justify-between items-start">
      <div>
        <p className="text-xs font-bold uppercase text-jxtento-muted">JXtento</p>
        <h1 className="mt-1 pb-3 text-2xl font-bold leading-none">
          Agent
        </h1>
      </div>
      <div className="pt-1">
        <WalletButton />
      </div>
    </header>
  )
}

function SidePanelFooter() {
  return (
    <footer className="mt-6 border-t border-jxtento-border pt-3 text-xs font-semibold text-jxtento-muted flex flex-col gap-2">
      <div className="flex flex-col gap-1 bg-jxtento-border/30 p-2 rounded-sm mb-2">
        <span className="text-[10px] font-bold uppercase text-jxtento-text">Pro Tiers</span>
        <div className="text-[10px] flex flex-col gap-1 text-jxtento-muted">
          <span>• 1M $FDP (Base): KOL Alerts, Smart Followers</span>
          <span>• 5M $FDP (Plus): Deployer Intel, Rug Scan, Flow Radar</span>
          <span>• 10M $FDP (Founding): First Access</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 bg-jxtento-border/30 p-2 rounded-sm">
        <span className="text-[10px] uppercase text-jxtento-text">JXtento Token ($FDP)</span>
        <a 
          href={`https://pump.fun/coin/${process.env.PLASMO_PUBLIC_JXTENTO_CA}`}
          target="_blank" 
          rel="noreferrer"
          className="text-jxtento-accent hover:underline break-all font-mono text-[10px]"
        >
          {process.env.PLASMO_PUBLIC_JXTENTO_CA}
        </a>
      </div>
      <div className="flex items-center justify-between">
        <span>Version 1.0.0</span>
        <a 
          href="https://x.com/jxtento" 
          target="_blank" 
          rel="noreferrer"
          className="text-jxtento-text hover:text-jxtento-muted transition-colors flex items-center gap-1"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span className="sr-only">Twitter / X</span>
        </a>
      </div>
    </footer>
  )
}
