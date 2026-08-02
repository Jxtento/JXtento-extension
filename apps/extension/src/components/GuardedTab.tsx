import { useState, useEffect } from "react";
import { getWalletStatus } from "../lib/popup-api";
import { PrivacyOptIn } from "./PrivacyOptIn";

const API_URL = process.env.PLASMO_PUBLIC_JXTENTO_API_URL || "http://localhost:8080";

type GuardedPosition = {
  id: string;
  mint: string;
  amount: number;
  enabled: boolean;
};

export function GuardedTab() {
  const [hasConsent, setHasConsent] = useState(false);
  const [positions, setPositions] = useState<GuardedPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [newMint, setNewMint] = useState("");
  
  useEffect(() => {
    chrome.storage.local.get(["exitGuardConsent"], (res) => {
      if (res.exitGuardConsent) {
        setHasConsent(true);
      }
    });

    getWalletStatus().then(status => {
      if (status?.connected && status.publicKey) {
        setWallet(status.publicKey);
      }
    });
  }, []);

  useEffect(() => {
    if (hasConsent && wallet) {
      fetchPositions();
    }
  }, [hasConsent, wallet]);

  const fetchPositions = async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/v1/guard/positions?wallet=${wallet}`);
      const data = await res.json();
      if (data.success) {
        setPositions(data.positions);
      }
    } catch (e) {
      console.error("Failed to fetch guarded positions", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleGuard = async (mint: string, enabled: boolean) => {
    if (!wallet) return;
    try {
      const res = await fetch(`${API_URL}/v1/guard/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, mint, enabled })
      });
      const data = await res.json();
      if (data.success) {
        fetchPositions(); // refresh list
      } else {
        alert(data.error || 'Failed to toggle guard');
      }
    } catch (e) {
      console.error(e);
      alert('Error toggling guard');
    }
  };

  if (!hasConsent) {
    return <PrivacyOptIn onAccept={() => setHasConsent(true)} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Exit Guard</h2>
        <button onClick={fetchPositions} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white">
          Refresh
        </button>
      </div>
      
      <p className="text-xs text-gray-400">
        Active positions are monitored 24/7 for danger signals (Dev Sell, Smart Money Exit, LP drops, etc).
      </p>

      <div className="flex gap-2">
        <input 
          type="text"
          placeholder="Paste Token Address..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          value={newMint}
          onChange={e => setNewMint(e.target.value)}
        />
        <button 
          onClick={() => { if(newMint) { toggleGuard(newMint, true); setNewMint(""); } }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-bold transition-colors"
        >
          Add
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Syncing positions...</div>
      ) : positions.length === 0 ? (
        <div className="text-gray-500 text-sm italic p-4 bg-gray-900 rounded border border-gray-800 text-center">
          No guarded positions found. Add a token address above to start monitoring.
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map(pos => (
            <div key={pos.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-white font-mono">{pos.mint.substring(0, 8)}...</div>
                <div className="text-xs text-gray-400">Bal: {pos.amount}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${pos.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                  {pos.enabled ? 'Guarded' : 'Disabled'}
                </span>
                <button 
                  onClick={() => toggleGuard(pos.mint, !pos.enabled)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  {pos.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
