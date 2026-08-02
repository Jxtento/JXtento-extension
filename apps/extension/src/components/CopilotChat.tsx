import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CopilotChatProps {
  currentMint?: string | undefined;
  currentHandle?: string | undefined;
}

export const CopilotChat: React.FC<CopilotChatProps> = ({ currentMint, currentHandle }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your JXtento Copilot. What do you want to know about this token or deployer?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newMessages = [...messages, { role: 'user' as const, content: text }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const baseUrl = process.env.PLASMO_PUBLIC_JXTENTO_API_URL || "http://127.0.0.1:8080";
      
      const response = await fetch(`${baseUrl}/v1/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(1), // Exclude welcome message from API
          context: { mint: currentMint, handle: currentHandle }
        })
      });

      if (!response.ok) {
        throw new Error('API Error');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that right now. Ensure the backend is running." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const suggestedPrompts = [
    "Scan this coin",
    "Who is this deployer?",
    "Is the volume real?"
  ];

  return (
    <div className="flex flex-col h-[500px] w-[350px] bg-gray-900 border border-gray-700 rounded-lg shadow-lg font-sans text-sm">
      {/* Header */}
      <div className="bg-gray-800 p-3 rounded-t-lg border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-white font-bold text-base flex items-center gap-2">
          <span className="text-blue-500">🤖</span> Copilot
        </h3>
        {currentMint && (
          <span className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded">
            Context: {currentMint.substring(0,4)}...
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-lg p-3 ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none whitespace-pre-wrap' 
                  : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-none prose prose-sm prose-invert'
              }`}
            >
              {m.role === 'user' ? (
                m.content
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-400 border border-gray-700 rounded-lg rounded-bl-none p-3 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-3 pb-2 flex flex-wrap gap-2">
          {suggestedPrompts.map(prompt => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-600 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-gray-800 rounded-b-lg border-t border-gray-700 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          className="flex-1 bg-gray-900 text-white placeholder-gray-500 rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
          rows={1}
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded font-semibold transition-colors h-[40px]"
        >
          Send
        </button>
      </div>
    </div>
  );
};
