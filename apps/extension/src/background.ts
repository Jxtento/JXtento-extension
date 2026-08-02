import type { FrontendToBackgroundMessage } from "./lib/messaging";
import iconUrl from "url:~assets/icon.png";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "AXIOM_INTEL_OPEN_SIDE_PANEL") {
    const tabId = sender.tab?.id
    if (typeof tabId === "number") {
      void chrome.sidePanel.open({ tabId })
    }
    return
  }
});

// --- Guard Alerts WebSocket ---
let guardWs: WebSocket | null = null;
let guardPingInterval: any = null;

function connectGuardWs(wallet: string) {
  if (guardWs) return;

  const wsUrl = (process.env.PLASMO_PUBLIC_JXTENTO_API_URL || "http://localhost:8080").replace('http', 'ws');
  guardWs = new WebSocket(`${wsUrl}/ws/guard?wallet=${wallet}`);

  guardWs.onopen = () => {
    console.log('[Guard] Connected to alerts stream');
    guardPingInterval = setInterval(() => {
      if (guardWs?.readyState === WebSocket.OPEN) {
        guardWs.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000); // 25s ping to keep service worker alive
  };

  guardWs.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'guard_alert') {
        const { mint, type: alertType, severity, message } = msg.data;
        
        const title = severity === 'CRITICAL' ? `🚨 CRITICAL: ${alertType}` : `⚠️ WARNING: ${alertType}`;
        chrome.notifications.create(`guard-${Date.now()}`, {
          type: 'basic',
          iconUrl: iconUrl,
          title: title,
          message: `${mint.substring(0,8)}... : ${message}`,
          priority: severity === 'CRITICAL' ? 2 : 1
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  guardWs.onclose = () => {
    console.log('[Guard] Disconnected');
    clearInterval(guardPingInterval);
    guardWs = null;
  };
}

// In Sprint 5 we'll implement the Guard monitor view properly.
