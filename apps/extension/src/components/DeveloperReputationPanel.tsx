import { useEffect, useMemo, useState } from "react"

import type { JXtentoTokenContext } from "../lib/jxtentoTokenContext"
import {
  auditDeveloperReputation,
  type ReputationResponse
} from "../lib/developerReputation"
import { getApiSettings } from "../lib/storage"

const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // go up
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch(e) {
    console.error("Audio play failed", e);
  }
};

export function DeveloperReputationPanel({
  tokenAddress,
  context
}: {
  tokenAddress: string
  context?: JXtentoTokenContext | undefined
}) {
  const contextKey = useMemo(() => JSON.stringify(context ?? {}), [context])
  const [localContext, setLocalContext] = useState(context)
  const [websiteUrl, setWebsiteUrl] = useState(context?.websiteUrl ?? "")
  const [githubRepoUrl, setGithubRepoUrl] = useState(context?.githubRepoUrl ?? "")
  const [xPostUrl, setXPostUrl] = useState(context?.xPostUrl ?? "")
  const [marketCap, setMarketCap] = useState(
    context?.marketCapUsd !== undefined ? String(Math.round(context.marketCapUsd)) : ""
  )
  const [narrative, setNarrative] = useState(context?.narrative ?? "")
  const [result, setResult] = useState<ReputationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [caVerifyStatus, setCaVerifyStatus] = useState<{ state: string, checkedAt: string, mismatchedCa?: string } | null>(null);
  const [toastMessage, setToastMessage] = useState("")

  useEffect(() => {
    setLocalContext(context)
    setWebsiteUrl(context?.websiteUrl ?? "")
    setGithubRepoUrl(context?.githubRepoUrl ?? "")
    setXPostUrl(context?.xPostUrl ?? "")
    setMarketCap(context?.marketCapUsd !== undefined ? String(Math.round(context.marketCapUsd)) : "")
    setNarrative(context?.narrative ?? "")
    setResult(null)
    setError("")
  }, [contextKey, context])

  useEffect(() => {
    const payload = {
      websiteUrl: context?.websiteUrl ?? "",
      githubRepoUrl: context?.githubRepoUrl ?? "",
      xPostUrl: context?.xPostUrl ?? "",
      marketCap: context?.marketCapUsd !== undefined ? String(Math.round(context.marketCapUsd)) : "",
      narrative: context?.narrative ?? ""
    }
    
    // Always run audit automatically on mount or when context changes
    void runAudit(payload)
  }, [contextKey, tokenAddress])

  useEffect(() => {
    if (!tokenAddress) return;
    if (!websiteUrl) {
      setCaVerifyStatus({ state: "NO WEBSITE", checkedAt: new Date().toISOString() });
      return;
    }

    let isActive = true;
    let wsRef: WebSocket | null = null;

    // If the context contains a pump.fun URL, extract the true token mint from it.
    // We pass BOTH the JXtento address (which might be a pair address) AND the pump.fun mint
    // so the backend can accept either of them as a valid "CA POSTED" match.
    let validMints = new Set<string>();
    if (tokenAddress) validMints.add(tokenAddress);
    if (context?.address) validMints.add(context.address);
    if (context?.pumpFunUrl) {
      const match = context.pumpFunUrl.match(/pump\.fun\/(?:coin\/)?([1-9A-HJ-NP-Za-km-z]{32,44})/);
      if (match && match[1]) {
        validMints.add(match[1]);
      }
    }
    let mintToVerify = Array.from(validMints).join(',');

    getApiSettings().then(settings => {
      if (!isActive) return;

      // Set scanning state immediately when starting the check
      setCaVerifyStatus({ state: "SCANNING...", checkedAt: new Date().toISOString() });

      const wsUrl = settings.backendUrl.replace(/^http/, 'ws') + '/ws/kol-alerts';
      const ws = new WebSocket(wsUrl);
      wsRef = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ action: "subscribe_ca_verify", mint: mintToVerify, websiteUrl }));
      };

      ws.onmessage = (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          if (payload.type === "ca_verification_update" && payload.data.mint === mintToVerify) {
            setCaVerifyStatus((prev) => {
              if ((prev?.state === "NOT POSTED" || prev?.state === "SCANNING...") && payload.data.state === "CA POSTED") {
                setToastMessage("Dev just posted the CA!");
                playNotificationSound();
                setTimeout(() => setToastMessage(""), 5000);
              }
              return { 
                state: payload.data.state, 
                checkedAt: payload.data.checkedAt,
                mismatchedCa: payload.data.mismatchedCa
              };
            });
          }
        } catch (e) {}
      };
    });

    return () => {
      isActive = false;
      if (wsRef && wsRef.readyState === WebSocket.OPEN) {
        wsRef.send(JSON.stringify({ action: "unsubscribe_ca_verify", mint: mintToVerify }));
        wsRef.close();
      }
    };
  }, [tokenAddress, websiteUrl])

  async function runAudit(overrides?: {
    websiteUrl: string
    githubRepoUrl: string
    xPostUrl: string
    marketCap: string
    narrative: string
  }) {
    setLoading(true)
    setError("")
    const values = overrides ?? { websiteUrl, githubRepoUrl, xPostUrl, marketCap, narrative }
    const nextWebsiteUrl = optionalValue(values.websiteUrl)
    const nextGithubRepoUrl = optionalValue(values.githubRepoUrl)
    const nextXPostUrl = optionalValue(values.xPostUrl)
    const nextNarrative = optionalValue(values.narrative)
    const nextMarketCap = parseMarketCap(values.marketCap)
    const payload = {
      tokenAddress,
      ...(nextWebsiteUrl ? { websiteUrl: nextWebsiteUrl } : {}),
      ...(nextGithubRepoUrl ? { githubRepoUrl: nextGithubRepoUrl } : {}),
      ...(nextXPostUrl ? { xPostUrl: nextXPostUrl } : {}),
      ...(nextNarrative ? { narrative: nextNarrative } : {}),
      ...(nextMarketCap !== undefined ? { marketCapUsd: nextMarketCap } : {})
    }

    const nextResult = await auditDeveloperReputation(payload)

    setLoading(false)

    if (!nextResult) {
      setError("Backend reputation audit unavailable")
      return
    }

    setResult(nextResult)
  }

  return (
    <section className="rounded-sm border border-jxtento-border bg-jxtento-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-jxtento-muted">Developer reputation</p>
          <h2 className="mt-1 text-sm font-semibold">
            {localContext ? "Auto proof from JXtento card" : "Project proof audit"}
          </h2>
        </div>
        {result ? (
          <span className={scoreClass(result.level)}>{result.score}/100</span>
        ) : null}
      </div>

      {localContext ? (
        <div className="mt-3 rounded-sm border border-jxtento-border bg-jxtento-bg p-2 text-xs leading-5 text-jxtento-muted">
          <p>
            Detected {localContext.ticker ?? "token"} from JXtento card
            {localContext.deployerHandle ? `, social @${localContext.deployerHandle}` : ""}.
          </p>
          <p className="mt-1 break-all font-mono text-[11px] text-jxtento-text">
            {localContext.shortAddress ?? localContext.address}
          </p>
        </div>
      ) : null}

      {(() => {
        const getBadgeColor = (state: string) => {
          switch (state) {
            case "SCANNING...": return "bg-blue-500 text-white animate-pulse";
            case "CA POSTED": return "bg-jxtento-good text-white";
            case "CA MISMATCH": return "bg-orange-500 text-white";
            case "NOT POSTED": return "bg-jxtento-bad text-white";
            case "NO WEBSITE": return "bg-jxtento-muted text-black";
            case "UNVERIFIED": return "bg-yellow-500 text-black";
            default: return "bg-jxtento-muted text-black";
          }
        };

        return caVerifyStatus ? (
          <div className="mt-3 rounded-sm border border-jxtento-border bg-jxtento-bg p-2 text-xs" title={`Last checked: ${caVerifyStatus.checkedAt ? new Date(caVerifyStatus.checkedAt).toLocaleTimeString() : ""}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-jxtento-text">Website CA Check</span>
              <span className={`px-2 py-1 rounded font-bold uppercase ${getBadgeColor(caVerifyStatus.state)}`}>
                {caVerifyStatus.state}
              </span>
            </div>
            {caVerifyStatus.state === "CA MISMATCH" && caVerifyStatus.mismatchedCa && (
              <p className="mt-2 text-[10px] leading-4 text-jxtento-warn">
                Found mismatched CA: <span className="font-mono break-all font-bold select-all">{caVerifyStatus.mismatchedCa}</span>
              </p>
            )}
          </div>
        ) : null;
      })()}

      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-[#00E599] text-[#111] font-bold px-4 py-2 rounded shadow-lg animate-bounce">
          {toastMessage}
        </div>
      )}

      <div className="mt-3 space-y-2">
        <AuditInput
          label="Website"
          value={websiteUrl}
          placeholder="https://project.site"
          onChange={setWebsiteUrl}
        />
        <AuditInput
          label="GitHub repo"
          value={githubRepoUrl}
          placeholder="https://github.com/owner/repo"
          onChange={setGithubRepoUrl}
        />
        <AuditInput
          label="X post"
          value={xPostUrl}
          placeholder="https://x.com/account/status/..."
          onChange={setXPostUrl}
        />
        <AuditInput
          label="Market cap"
          value={marketCap}
          placeholder="10000"
          onChange={setMarketCap}
        />
        <label className="block">
          <span className="text-xs font-bold uppercase text-jxtento-muted">Narrative</span>
          <textarea
            className="mt-1 min-h-16 w-full resize-none rounded-sm border border-jxtento-border bg-jxtento-panel px-3 py-2 text-xs text-jxtento-text outline-none focus:border-jxtento-accent"
            value={narrative}
            placeholder="e.g. Coinbase replied, Sam Altman narrative, dev account posted CA"
            onChange={(event) => setNarrative(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          className="rounded-sm bg-jxtento-accent px-3 py-2 text-sm font-bold text-black transition hover:bg-jxtento-muted disabled:cursor-not-allowed disabled:bg-jxtento-muted"
          disabled={loading}
          onClick={() => void runAudit()}>
          {loading ? "Auditing" : "Audit proof"}
        </button>
        <button
          type="button"
          className="rounded-sm border border-jxtento-border bg-jxtento-panel px-3 py-2 text-sm font-bold text-jxtento-text transition hover:bg-jxtento-bg disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
          onClick={() => {
            setLocalContext(undefined)
            setWebsiteUrl("")
            setGithubRepoUrl("")
            setXPostUrl("")
            setMarketCap("")
            setNarrative("")
            setResult(null)
            setError("")
          }}>
          Reset
        </button>
      </div>

      {error ? <p className="mt-2 text-xs text-jxtento-bad">{error}</p> : null}

      {result ? (
        <div className="mt-4 border-t border-jxtento-border pt-3">
          <p className="text-xs leading-5 text-jxtento-muted">{result.summary}</p>
          {result.evidence.github ? (
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <MiniMetric label="Repo age" value={`${result.evidence.github.ageDays}d`} />
              <MiniMetric label="Stars" value={String(result.evidence.github.stars)} />
              <MiniMetric label="Forks" value={String(result.evidence.github.forks)} />
            </div>
          ) : null}
          <ul className="mt-3 space-y-2">
            {result.checks.map((check) => (
              <li
                key={`${check.name}-${check.detail}`}
                className="rounded-sm border border-jxtento-border bg-jxtento-bg p-2 text-xs leading-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-jxtento-text">{check.name}</span>
                  <span className={statusClass(check.status)}>{check.status}</span>
                </div>
                <p className="mt-1 text-jxtento-muted">{check.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function AuditInput({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-jxtento-muted">{label}</span>
      <input
        className="mt-1 w-full rounded-sm border border-jxtento-border bg-jxtento-panel px-3 py-2 text-xs text-jxtento-text outline-none focus:border-jxtento-accent"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-jxtento-border bg-jxtento-bg p-2">
      <p className="font-bold uppercase text-jxtento-muted">{label}</p>
      <p className="mt-1 font-semibold text-jxtento-text">{value}</p>
    </div>
  )
}

function optionalValue(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseMarketCap(value: string): number | undefined {
  const parsed = Number(value.replace(/[$,\s]/g, ""))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function scoreClass(level: ReputationResponse["level"]) {
  const color =
    level === "strong" ? "text-jxtento-good" : level === "watch" ? "text-jxtento-warn" : "text-jxtento-bad"

  return `text-lg font-bold ${color}`
}

function statusClass(status: ReputationResponse["checks"][number]["status"]) {
  const color =
    status === "pass"
      ? "text-jxtento-good"
      : status === "warn" || status === "manual"
        ? "text-jxtento-warn"
        : "text-jxtento-bad"

  return `font-bold uppercase ${color}`
}
