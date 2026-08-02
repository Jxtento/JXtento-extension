import { useEffect, useState } from "react"

import {
  getApiSettings,
  getSettings,
  saveApiSettings,
  saveSettings,
  type ApiSettings,
  type OverlaySettings
} from "../lib/storage"
import { LaunchPanel } from "./LaunchPanel"

export function PopupStatus() {
  const [tab, setTab] = useState<"settings" | "launch">("launch")
  const [settings, setSettings] = useState<OverlaySettings>({
    overlayEnabled: true,
    showRiskBadges: true,
    showFlowRadar: true
  })
  const [apiSettings, setApiSettings] = useState<ApiSettings>({
    liveDataEnabled: true,
    backendUrl: "http://127.0.0.1:8787"
  })
  const [savedMessage, setSavedMessage] = useState("")

  useEffect(() => {
    void getSettings().then(setSettings)
    void getApiSettings().then(setApiSettings)
  }, [])

  async function updateSetting(nextSettings: OverlaySettings) {
    setSettings(nextSettings)
    await saveSettings(nextSettings)
  }

  async function updateApiSettings(nextSettings: ApiSettings) {
    setApiSettings(nextSettings)
    await saveApiSettings(nextSettings)
    setSavedMessage("Backend settings saved locally")
    window.setTimeout(() => setSavedMessage(""), 1800)
  }

  return (
    <main className="w-80 bg-jxtento-bg p-4 text-jxtento-text">
      <header className="border-b border-jxtento-border pb-4">
        <p className="text-xs font-bold uppercase text-jxtento-muted">Overlay / 0.1.0</p>
        <h1 className="mt-2 text-2xl font-bold leading-none">JXtento</h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-jxtento-muted">
          <span className="h-2 w-2 rounded-full bg-jxtento-good" />
          <span>Active on X and JXtento</span>
        </div>
      </header>

      <div className="flex border-b border-jxtento-border">
        <button
          className={`flex-1 py-2 text-sm font-bold uppercase transition-colors ${tab === "launch" ? "text-jxtento-accent border-b-2 border-jxtento-accent" : "text-jxtento-muted hover:text-jxtento-text"}`}
          onClick={() => setTab("launch")}
        >
          Launch
        </button>
        <button
          className={`flex-1 py-2 text-sm font-bold uppercase transition-colors ${tab === "settings" ? "text-jxtento-accent border-b-2 border-jxtento-accent" : "text-jxtento-muted hover:text-jxtento-text"}`}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
      </div>

      {tab === "launch" && (
        <div className="-mx-4">
          <LaunchPanel />
        </div>
      )}

      {tab === "settings" && (
        <>
          <section className="mt-4 space-y-3">
        <ToggleRow
          label="Enable overlay"
          enabled={settings.overlayEnabled}
          onChange={(overlayEnabled) =>
            void updateSetting({ ...settings, overlayEnabled })
          }
        />
        <ToggleRow
          label="Show risk badges"
          enabled={settings.showRiskBadges}
          onChange={(showRiskBadges) =>
            void updateSetting({ ...settings, showRiskBadges })
          }
        />
        <ToggleRow
          label="Show JXtento Flow Radar"
          enabled={settings.showFlowRadar}
          onChange={(showFlowRadar) =>
            void updateSetting({ ...settings, showFlowRadar })
          }
        />
        <ToggleRow
          label="Use backend intelligence"
          enabled={apiSettings.liveDataEnabled}
          onChange={(liveDataEnabled) =>
            void updateApiSettings({ ...apiSettings, liveDataEnabled })
          }
        />
      </section>

      <section className="mt-4 space-y-3 border-t border-jxtento-border pt-4">
        <p className="text-xs font-bold uppercase text-jxtento-muted">Backend</p>
        <BackendUrlInput
          value={apiSettings.backendUrl}
          onChange={(backendUrl) =>
            void updateApiSettings({ ...apiSettings, backendUrl })
          }
        />
        <p className="text-xs leading-5 text-jxtento-muted">
          Provider keys stay on the backend. The extension stores only this read-only API URL.
        </p>
        {savedMessage ? <p className="text-xs font-bold text-jxtento-good">{savedMessage}</p> : null}
      </section>
        </>
      )}

      <footer className="mt-4 border-t border-jxtento-border pt-3 text-xs font-semibold text-jxtento-muted flex flex-col gap-2">
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
        <div>Version 1.0.0</div>
      </footer>
    </main>
  )
}

function BackendUrlInput({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-jxtento-muted">API URL</span>
      <input
        type="url"
        className="mt-1 w-full rounded-sm border border-jxtento-border bg-jxtento-panel px-3 py-2 text-xs text-jxtento-text outline-none focus:border-jxtento-accent"
        value={value}
        placeholder="http://127.0.0.1:8787"
        onChange={(event) => onChange(event.target.value.trim())}
      />
    </label>
  )
}

function ToggleRow({
  label,
  enabled,
  onChange
}: {
  label: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-sm border border-jxtento-border bg-jxtento-panel p-3">
      <span className="text-sm font-bold">{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 accent-jxtento-accent"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}
