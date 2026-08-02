import { useEffect, useState } from "react";
import { getWalletStatus } from "../lib/popup-api";

const API_URL = process.env.PLASMO_PUBLIC_JXTENTO_API_URL || "http://localhost:8080";

export function GuardedBadge({ tokenAddress }: { tokenAddress: string }) {
  const [isGuarded, setIsGuarded] = useState(false);

  useEffect(() => {
    let active = true;
    const checkGuard = async () => {
      const status = await getWalletStatus();
      if (!status?.connected || !status.publicKey) return;

      try {
        const res = await fetch(`${API_URL}/v1/guard/positions?wallet=${status.publicKey}`);
        const data = await res.json();
        if (data.success) {
          const guarded = data.positions.some((p: any) => p.mint === tokenAddress && p.enabled);
          if (active) setIsGuarded(guarded);
        }
      } catch (e) {
        console.error("Failed to check guard status", e);
      }
    };
    checkGuard();

    // Check periodically since the user can toggle it from sidepanel
    const interval = setInterval(checkGuard, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [tokenAddress]);

  if (!isGuarded) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
      <div className="bg-green-500/90 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-green-500/20 flex items-center gap-1.5 border border-green-400">
        🛡️ GUARDED
      </div>
    </div>
  );
}
