import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RotateCw, 
  Copy, 
  ExternalLink,
  Terminal,
  Save
} from 'lucide-react';
import { api, getApiBase, getStoredBackendUrl, setStoredBackendUrl } from '../../services/api';

interface BackendConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (isOnline: boolean) => void;
}

export const BackendConnectionModal: React.FC<BackendConnectionModalProps> = ({
  isOpen,
  onClose,
  onStatusChange
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    has_groq_key?: boolean;
  } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredBackendUrl();
      const current = stored || getApiBase();
      setCustomUrl(current.replace(/\/api\/?$/, ''));
      handleTest(current);
    }
  }, [isOpen]);

  const handleTest = async (urlToTest?: string) => {
    const target = (urlToTest || customUrl || '').trim().replace(/\/+$/, '');
    setIsTesting(true);
    setTestResult(null);

    try {
      const cleanTarget = target.endsWith('/api') ? target : (target ? `${target}/api` : '/api');
      const res = await fetch(`${cleanTarget}/health`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setTestResult({
        success: true,
        message: 'Successfully connected to AegisVision Backend API!',
        has_groq_key: data.has_groq_key
      });
      onStatusChange?.(true);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection failed. Verify server or tunnel is running.'
      });
      onStatusChange?.(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const clean = customUrl.trim();
    setStoredBackendUrl(clean);
    // Reload page to re-initialize all api connections
    window.location.reload();
  };

  const handleResetToDefault = () => {
    setStoredBackendUrl('');
    setCustomUrl('');
    window.location.reload();
  };

  const tunnelCommand = 'cloudflared tunnel --url http://localhost:5000';

  const copyCommand = () => {
    navigator.clipboard.writeText(tunnelCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Server size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Backend Connection Setup</h3>
              <p className="text-xs text-slate-400">Connect deployed Vercel frontend to your local PC</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Banner */}
          {testResult && (
            <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
              testResult.success 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              {testResult.success ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">{testResult.message}</p>
                {testResult.has_groq_key !== undefined && (
                  <p className="text-[11px] opacity-90">
                    Groq AI Reasoning: {testResult.has_groq_key ? '✅ Configured' : '⚠️ Missing GROQ_API_KEY'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Backend URL Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Backend API URL:</span>
              <span className="text-[10px] text-slate-400 font-normal">Stored in local browser</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="e.g. https://xxxx.trycloudflare.com or https://your-app.onrender.com"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleTest()}
                disabled={isTesting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {isTesting ? <RotateCw size={13} className="animate-spin" /> : <Wifi size={13} />}
                <span>Test</span>
              </button>
            </div>
          </div>

          {/* Step-by-Step Instructions Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Terminal size={14} className="text-emerald-600" />
              <span>How to connect your Local Backend:</span>
            </div>

            <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 text-[11px]">
              <li>
                Start your backend on your PC:
                <code className="block mt-0.5 bg-white border border-slate-200 px-2 py-1 rounded font-mono text-slate-800">
                  cd backend; node server.js
                </code>
              </li>
              <li>
                In a second terminal, create a free HTTPS tunnel:
                <div className="flex items-center gap-1.5 mt-0.5">
                  <code className="flex-1 bg-white border border-slate-200 px-2 py-1 rounded font-mono text-slate-800 truncate">
                    {tunnelCommand}
                  </code>
                  <button
                    onClick={copyCommand}
                    className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                    title="Copy command"
                  >
                    <Copy size={12} />
                  </button>
                </div>
                {copiedCmd && <span className="text-[10px] text-emerald-600 font-bold">Copied command!</span>}
              </li>
              <li>
                Copy the <code className="font-mono text-emerald-700">https://xxxx.trycloudflare.com</code> URL and paste it into the box above.
              </li>
              <li>Click <strong>Save & Connect</strong> below!</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-xs text-slate-400 hover:text-slate-600 transition underline"
            >
              Reset to Default (/api)
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Save size={13} />
                <span>Save & Connect</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
