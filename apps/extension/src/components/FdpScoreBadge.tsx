import React, { useState, useEffect } from 'react';

interface FdpScoreBadgeProps {
  mint: string;
  walletAddress?: string;
  websiteUrl?: string;
  githubRepoUrl?: string;
  xPostUrl?: string;
}

export const FdpScoreBadge: React.FC<FdpScoreBadgeProps> = ({ mint, ...options }) => {
  const [scoreData, setScoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({ mint });
        if (options.walletAddress) queryParams.set('walletAddress', options.walletAddress);
        if (options.websiteUrl) queryParams.set('websiteUrl', options.websiteUrl);
        if (options.githubRepoUrl) queryParams.set('githubRepoUrl', options.githubRepoUrl);
        if (options.xPostUrl) queryParams.set('xPostUrl', options.xPostUrl);
        
        const baseUrl = process.env.PLASMO_PUBLIC_JXTENTO_API_URL || "http://127.0.0.1:8080";
        const res = await fetch(`${baseUrl}/v1/score?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setScoreData(data);
        }
      } catch (err) {
        console.error('Failed to fetch FDP score:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, [mint, JSON.stringify(options)]);

  if (loading) return <div className="text-xs text-gray-400">Loading FDP Score...</div>;
  if (!scoreData) return null;

  const getBandColor = (band: string) => {
    switch (band) {
      case 'good': return 'bg-emerald-500 text-white';
      case 'caution': return 'bg-amber-500 text-white';
      case 'danger': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-2 font-sans">
      <div 
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-transform hover:scale-105 shadow-sm w-fit ${getBandColor(scoreData.band)}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="font-bold">FDP Score</div>
        <div className="text-xl font-black">{scoreData.score}</div>
      </div>
      
      {expanded && (
        <div className="p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm shadow-xl w-full max-w-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300 font-semibold">Signals Breakdown</span>
            <span className="text-xs text-gray-500">Confidence: {scoreData.confidence.toUpperCase()}</span>
          </div>
          
          <ul className="space-y-1.5 mb-3">
            {scoreData.topReasons.map((reason: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span className="text-gray-200">{reason}</span>
              </li>
            ))}
          </ul>
          
          <div className="text-xs text-gray-500 italic">
            *Risk scores are heuristics based on on-chain signals. Always DYOR.
          </div>
        </div>
      )}
    </div>
  );
};
