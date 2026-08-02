import { useState, useEffect } from "react";
import { getWalletStatus } from "../lib/popup-api";

const API_URL = process.env.PLASMO_PUBLIC_JXTENTO_API_URL || "http://localhost:8080";

export function GuardToggleButton({ mint }: { mint: string }) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [isGuarded, setIsGuarded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      setLoading(true);
      const status = await getWalletStatus();
      if (status?.connected && status.publicKey) {
        if (active) setWallet(status.publicKey);
        try {
          const res = await fetch(`${API_URL}/v1/guard/positions?wallet=${status.publicKey}`);
          const data = await res.json();
          if (data.success && active) {
            const guarded = data.positions.some((p: any) => p.mint === mint && p.enabled);
            setIsGuarded(guarded);
          }
        } catch (e) {
          console.error("Failed to check guard status", e);
        }
      }
      if (active) setLoading(false);
    };
    fetchStatus();
    return () => { active = false; };
  }, [mint]);

  const toggleGuard = async () => {
    if (!wallet) return alert("Please connect your wallet first.");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/v1/guard/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, mint, enabled: !isGuarded })
      });
      const data = await res.json();
      if (data.success) {
        setIsGuarded(!isGuarded);
      } else {
        alert(data.error || 'Failed to toggle guard');
      }
    } catch (e) {
      console.error(e);
      alert('Error toggling guard');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !wallet) return null;

  return (
    <button
      onClick={toggleGuard}
      disabled={loading}
      className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors border ${
        isGuarded 
          ? "bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30" 
          : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
      } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span>🛡️</span>
      {loading ? "..." : isGuarded ? "Guarded" : "Enable Guard"}
    </button>
  );
}
