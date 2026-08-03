import { useEffect, useState } from "react";
import { getWalletStatus } from "../lib/popup-api";
import { checkTokenGate, type GateStatus } from "../lib/tokenGate";

export function LaunchPanel() {
  const [gateStatus, setGateStatus] = useState<GateStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const verifyGate = async () => {
      setLoading(true);
      const session = await getWalletStatus();
      const pubKey = (session?.connected && session.publicKey) ? session.publicKey : undefined;
      const result = await checkTokenGate(pubKey);
      if (mounted) setGateStatus(result);
      if (mounted) setLoading(false);
    };

    verifyGate();

    // Re-verify when storage changes (like wallet connect/disconnect)
    const listener = () => verifyGate();
    chrome.storage.local.onChanged.addListener(listener);
    return () => {
      mounted = false;
      chrome.storage.local.onChanged.removeListener(listener);
    };
  }, []);

  return (
    <div className="p-4 flex flex-col gap-2 text-center">
      <h2 className="text-lg font-medium text-jxtento-text mb-2">Terminal Access</h2>
      
      {loading ? (
        <div className="text-jxtento-muted text-sm mt-4 text-center">Checking token balance...</div>
      ) : gateStatus?.unlocked ? (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-jxtento-text">Deploy tokens and manage positions from the Web Terminal.</p>
          <a href={`${process.env.PLASMO_PUBLIC_JXTENTO_WEB_URL}/terminal`} target="_blank" rel="noopener noreferrer" className="bg-jxtento-accent text-black font-bold py-2 px-4 rounded hover:bg-jxtento-accent/90 transition-colors">
            Launch JXtento Terminal
          </a>
        </div>
      ) : (
        <div className="mt-4 p-4 border border-red-900 bg-red-950/30 rounded-md text-center flex flex-col gap-2">
          <svg className="w-8 h-8 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-red-500 font-bold">Extension Locked</h3>
          <p className="text-xs text-jxtento-muted">{gateStatus?.error || "You need to hold tokens to unlock."}</p>
          <p className="font-bold text-jxtento-text bg-jxtento-border/30 inline-block px-3 py-1 rounded text-xs mt-1">
            Required: {gateStatus?.threshold?.toLocaleString() || "1,000,000"} {gateStatus?.ticker || "$JXTENTO"}
          </p>
          <p className="text-xs text-jxtento-muted">
            Current balance: {gateStatus?.balance.toLocaleString()} {gateStatus?.ticker || "$JXTENTO"}
          </p>
        </div>
      )}
    </div>
  );
}
