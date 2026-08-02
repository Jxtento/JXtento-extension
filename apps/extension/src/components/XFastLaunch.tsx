import { useState, useEffect } from "react";
import { getSelectedLaunchContext } from "../lib/storage";

export function FastLaunch({ initialDraft }: { initialDraft?: any } = {}) {
  const [draftName, setDraftName] = useState(initialDraft?.name || "");
  const [draftDesc, setDraftDesc] = useState(initialDraft?.description || "");

  useEffect(() => {
    if (!initialDraft) {
      getSelectedLaunchContext().then(ctx => {
        if (ctx) {
          setDraftName(ctx.authorName + " Token");
          setDraftDesc(ctx.text);
        }
      });
    }
  }, [initialDraft]);

  // Use a deep link instead of inline deployment
  const baseUrl = process.env.PLASMO_PUBLIC_JXTENTO_WEB_URL || "http://localhost:3000";
  const webTerminalUrl = `${baseUrl}/terminal?action=deploy&ref=ext&name=${encodeURIComponent(draftName)}&desc=${encodeURIComponent(draftDesc)}`;

  return (
    <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-4 shadow-xl">
      <div className="flex items-center space-x-2 text-white">
        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        <h2 className="font-semibold text-lg">Deploy Token</h2>
      </div>
      <p className="text-gray-400 text-sm">
        JXtento extension securely hands off deployments to the web terminal.
      </p>
      
      <a 
        href={webTerminalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-2 px-4 rounded-lg font-medium text-white shadow hover:opacity-90 transition-opacity text-center flex items-center justify-center space-x-2"
        style={{ background: "linear-gradient(90deg, #6366f1 0%, #a855f7 100%)" }}
      >
        <span>Open in JXtento Web</span>
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
      </a>
    </div>
  );
}
