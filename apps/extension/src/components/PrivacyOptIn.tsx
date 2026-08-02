import { useState, useEffect } from "react";
import { getWalletStatus } from "../lib/popup-api";

export function PrivacyOptIn({ onAccept }: { onAccept: () => void }) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["exitGuardConsent"], (res) => {
      if (res.exitGuardConsent) {
        setAccepted(true);
        onAccept();
      }
    });
  }, [onAccept]);

  const handleAccept = () => {
    chrome.storage.local.set({ exitGuardConsent: true }, () => {
      setAccepted(true);
      onAccept();
    });
  };

  if (accepted) return null;

  return (
    <div className="bg-gray-800 p-4 rounded-xl border border-blue-500 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🛡️</span>
        <h3 className="font-bold text-white">Exit Guard Privacy Opt-In</h3>
      </div>
      <p className="text-sm text-gray-300 mb-4">
        To protect your positions, JXtento needs to read your public token balances via Helius RPC. 
        We <strong>never</strong> access your private keys or funds. Your portfolio data is not shared with other users.
      </p>
      <button 
        onClick={handleAccept}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
      >
        Enable Exit Guard
      </button>
    </div>
  );
}
