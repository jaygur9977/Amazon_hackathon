import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { api, getStoredBackendUrl, setStoredBackendUrl } from '../../services/api';
import { AlertTriangle, Server, Wifi, Check, X, ArrowRight } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [tunnelInput, setTunnelInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = () => {
    api.checkHealth()
      .then(() => setIsOffline(false))
      .catch(() => setIsOffline(true));
  };

  const handleConnect = () => {
    const clean = tunnelInput.trim();
    if (!clean) return;
    setIsConnecting(true);
    setStoredBackendUrl(clean);
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen bg-background relative overflow-x-hidden">
      {/* Floating pastel background blobs */}
      <div className="fixed -top-40 -right-40 w-96 h-96 rounded-full bg-soft-green/30 blur-3xl pointer-events-none animate-float-slow -z-10" />
      <div className="fixed top-1/2 -left-40 w-96 h-96 rounded-full bg-soft-blue/25 blur-3xl pointer-events-none animate-float-slow -z-10" style={{ animationDelay: '-5s' }} />
      <div className="fixed -bottom-40 right-1/4 w-96 h-96 rounded-full bg-soft-pink/25 blur-3xl pointer-events-none animate-float-slow -z-10" style={{ animationDelay: '-2.5s' }} />

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Prominent High-Visibility Backend Banner when Offline */}
        {isOffline && (
          <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg z-30 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <AlertTriangle size={17} className="text-amber-200 shrink-0" />
              <div className="text-xs">
                <span className="font-black uppercase tracking-wider text-amber-200">Backend Disconnected: </span>
                <span className="font-semibold text-white">Paste your Cloudflare Tunnel URL below to connect your local system</span>
              </div>
            </div>

            <form 
              onSubmit={(e) => { e.preventDefault(); handleConnect(); }} 
              className="flex items-center gap-2 flex-1 max-w-md w-full"
            >
              <input
                type="text"
                value={tunnelInput}
                onChange={(e) => setTunnelInput(e.target.value)}
                placeholder="Paste URL here: https://xxxx.trycloudflare.com"
                className="flex-1 px-3.5 py-1.5 rounded-xl bg-white text-slate-900 font-mono text-xs focus:outline-none placeholder:text-slate-400 shadow-inner"
              />
              <button
                type="submit"
                disabled={!tunnelInput.trim() || isConnecting}
                className="px-4 py-1.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 shadow disabled:opacity-50"
              >
                <span>Connect</span>
                <ArrowRight size={13} />
              </button>
            </form>
          </div>
        )}

        <TopBar />

        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
