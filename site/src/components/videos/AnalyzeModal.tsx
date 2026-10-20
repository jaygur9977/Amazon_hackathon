import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  ChevronRight
} from 'lucide-react';
import { AnalysisJob } from '../../types';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

interface AnalyzeModalProps {
  jobId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export const AnalyzeModal: React.FC<AnalyzeModalProps> = ({
  jobId,
  isOpen,
  onClose,
  onCompleted
}) => {
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !jobId) return;

    // Fetch initial job
    api.getJob(jobId).then((j) => {
      setJob(j);
      setLogs(j.logs || []);
    });

    // Connect to SSE stream
    const es = api.getJobEventSource(jobId);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'init' && data.job) {
          setJob(data.job);
          setLogs(data.job.logs || []);
        } else if (data.type === 'log') {
          setLogs((prev) => [...prev, data.message]);
          setJob((prev) => prev ? { ...prev, stage: data.stage, status: data.status } : null);
        } else if (data.type === 'done') {
          setJob(data.job);
          if (data.job?.logs) setLogs(data.job.logs);
          onCompleted();
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      es.close();
      // Poll once to get final state
      api.getJob(jobId).then((j) => {
        setJob(j);
        if (j.status === 'completed' || j.status === 'failed') {
          onCompleted();
        }
      });
    };

    return () => {
      es.close();
    };
  }, [isOpen, jobId]);

  // Auto scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const isFinished = job?.status === 'completed' || job?.status === 'failed';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-2xl bg-white rounded-3xl border-2 border-slate-200 shadow-elevated overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 border-b-2 border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center shadow-subtle">
                {isFinished ? (
                  job?.status === 'completed' ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 stroke-[2.5]" />
                  ) : (
                    <AlertCircle className="w-7 h-7 text-red-600 stroke-[2.5]" />
                  )
                ) : (
                  <RotateCw className="w-7 h-7 text-emerald-700 animate-spin stroke-[2.5]" />
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-950 tracking-tight">
                  {isFinished ? 'Analysis Completed' : 'AI Video Analysis in Progress'}
                </h3>
                <p className="text-xs font-bold text-slate-500 font-mono mt-0.5">
                  Job ID: {job?.id}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-extrabold">
                <span className="text-slate-900 flex items-center gap-2 capitalize">
                  <span>Current Stage:</span>
                  <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {job?.stage?.replace(/_/g, ' ') || 'Processing'}
                  </span>
                </span>
                <span className="font-mono text-slate-900 font-black">
                  {job?.completed_videos || 0} / {job?.total_videos || 1} Clips ({job?.progress_percent || 0}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-300">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${job?.progress_percent || 0}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Live Terminal Logs */}
            <div className="rounded-2xl bg-slate-950 border-2 border-slate-800 p-5 font-mono text-xs text-slate-300 shadow-inner">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800 text-slate-400 text-xs font-sans font-bold">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Execution Logs (Computer Vision Subprocess Engine)</span>
              </div>
              <div
                ref={logContainerRef}
                className="h-48 overflow-y-auto space-y-1.5 pr-2 font-mono text-xs leading-relaxed selection:bg-emerald-900"
              >
                {logs.length > 0 ? (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.includes('Error') 
                          ? 'text-rose-400 font-semibold' 
                          : log.includes('Completed') 
                          ? 'text-emerald-300 font-semibold' 
                          : 'text-slate-300'
                      }
                    >
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">Waiting for engine execution output...</div>
                )}
              </div>
            </div>

            {/* Generated Results Summary */}
            {job?.results && job.results.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Generated Evidence & Classifications
                </h4>
                <div className="space-y-2.5 max-h-52 overflow-y-auto">
                  {job.results.map((res, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between text-sm font-bold"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-950">{res.file_name}</span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-white text-slate-700 border border-slate-300 text-xs font-semibold">
                          {res.event?.replace(/_/g, ' ')}
                        </span>
                        {res.risk === 'high' && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 text-xs font-black border border-rose-300">
                            High Risk
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/analysis/${encodeURIComponent(res.clip_id)}`}
                        onClick={onClose}
                        className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 hover:underline font-extrabold text-xs"
                      >
                        <span>View Analysis</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t-2 border-slate-200 bg-slate-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-white border-2 border-slate-200 text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors shadow-subtle"
            >
              {isFinished ? 'Close Window' : 'Minimize Window'}
            </button>
            {isFinished && (
              <Link
                to="/dashboard"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-premium hover:scale-105"
              >
                View in Analytics Dashboard
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
