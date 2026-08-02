import React, { useState, useEffect } from 'react';

export const WatchedDeployersPanel: React.FC = () => {
  const [watchedWallets, setWatchedWallets] = useState<{walletAddress: string}[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // In a real extension, this would fetch from the backend via an API and connect to WebSocket
    // For now, we simulate the WebSocket connection for deployer_alert
    const baseUrl = process.env.PLASMO_PUBLIC_JXTENTO_API_URL || "http://127.0.0.1:8080";
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/kol-alerts';
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'deployer_alert') {
          setAlerts(prev => [data.data, ...prev]);
          // We could also trigger a chrome.notifications.create here
        }
      } catch(e) {}
    };

    return () => ws.close();
  }, []);

  const watchDeployer = (wallet: string) => {
    // Simulate API call to backend to add to wallet_watches
    setWatchedWallets(prev => [...prev, { walletAddress: wallet }]);
  };

  const unwatchDeployer = (wallet: string) => {
    setWatchedWallets(prev => prev.filter(w => w.walletAddress !== wallet));
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-white bg-gray-900 rounded-lg max-w-md font-sans">
      <h2 className="text-xl font-bold mb-2 text-blue-400">Deployer Alerts (Pro)</h2>
      
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-gray-300">Live Alerts</h3>
        {alerts.length === 0 ? (
          <div className="text-sm text-gray-500 italic">No recent alerts...</div>
        ) : (
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
            {alerts.map((alert, i) => (
              <div key={i} className="p-2 bg-gray-800 rounded border border-gray-700 text-sm">
                <div className="text-emerald-400 font-bold mb-1">🚨 {alert.message}</div>
                <div className="text-gray-300">Deployer: {alert.deployerAddress.substring(0, 6)}...</div>
                <div className="text-gray-300">Mint: {alert.mint}</div>
                <a href={`https://solscan.io/tx/${alert.txSignature}`} target="_blank" className="text-blue-500 hover:underline mt-1 block">View Tx</a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <h3 className="font-semibold text-gray-300">Watched Deployers</h3>
        {watchedWallets.length === 0 ? (
          <div className="text-sm text-gray-500">You aren't watching any deployers.</div>
        ) : (
          <ul className="space-y-1">
            {watchedWallets.map(w => (
              <li key={w.walletAddress} className="flex justify-between items-center text-sm p-1.5 bg-gray-800 rounded">
                <span className="font-mono">{w.walletAddress.substring(0, 8)}...</span>
                <button onClick={() => unwatchDeployer(w.walletAddress)} className="text-red-400 hover:text-red-300 px-2">Unwatch</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Simulation form to add a wallet */}
      <div className="mt-4 flex gap-2">
        <input id="deployerInput" type="text" placeholder="Wallet address..." className="bg-gray-800 border border-gray-700 text-sm rounded px-2 py-1 flex-1" />
        <button 
          onClick={() => {
            const input = document.getElementById('deployerInput') as HTMLInputElement;
            if (input.value) {
              watchDeployer(input.value);
              input.value = '';
            }
          }}
          className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm font-semibold"
        >
          Watch
        </button>
      </div>
    </div>
  );
};
