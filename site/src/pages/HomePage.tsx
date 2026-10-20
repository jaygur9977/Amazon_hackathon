import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Sparkles, 
  Film, 
  MessageSquareCode, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  Lock, 
  Activity,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats } from '../types';

export const HomePage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch(() => {});
  }, []);

  const features = [
    {
      icon: Film,
      title: 'Multimodal Video Intelligence',
      description: 'Automated frame extraction with vision classification and OpenCV motion differencing to reconstruct home activities.',
      color: 'bg-emerald-100 text-emerald-950 border-emerald-300'
    },
    {
      icon: Activity,
      title: 'Event Timeline & Risk Scoring',
      description: 'Normalized activity log identifying deliveries, visitors, resident pickups, and elevated suspicious occurrences.',
      color: 'bg-blue-100 text-blue-950 border-blue-300'
    },
    {
      icon: AlertTriangle,
      title: 'Suspicious Behavior Detection',
      description: 'Heuristic and deep learning indicators flagging tampering, lingering at night, and unauthorized access attempts.',
      color: 'bg-rose-100 text-rose-950 border-rose-300'
    },
    {
      icon: MessageSquareCode,
      title: 'RAG Conversational Assistant',
      description: 'High-precision retrieval engine providing explainable, grounded evidence with frame citations and answers.',
      color: 'bg-amber-100 text-amber-950 border-amber-300'
    }
  ];

  const steps = [
    {
      step: '01',
      title: 'Select Video Footage',
      description: 'Choose one or multiple camera clips from the authenticated video repository.'
    },
    {
      step: '02',
      title: 'Analyze with AI Pipeline',
      description: 'Run frame-differencing and vision models with live streaming logs and progress telemetry.'
    },
    {
      step: '03',
      title: 'Explore Insights & RAG',
      description: 'Review evidence frames, risk levels, and ask natural language questions grounded in verified data.'
    }
  ];

  return (
    <div className="space-y-20 py-8">
      {/* ================= HERO SECTION ================= */}
      <section className="text-center max-w-4xl mx-auto space-y-8 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-100 border border-emerald-300 text-sm font-bold text-emerald-950 shadow-subtle"
        >
          <Sparkles className="w-4 h-4 text-emerald-700" />
          <span>Next-Generation Video Intelligence</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl sm:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.15]"
        >
          Your Home. <br />
          <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 bg-clip-text text-transparent">
            Understood by AI.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg sm:text-xl text-slate-700 leading-relaxed font-normal max-w-2xl mx-auto"
        >
          Transform security footage into searchable events, actionable insights, and explainable risk assessments. Analyze video clips, review evidence, and ask questions about what happened.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 pt-4"
        >
          <Link
            to="/videos"
            className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-slate-900 text-white text-base font-bold hover:bg-slate-800 transition-all shadow-premium hover:shadow-elevated hover:scale-105 active:scale-95"
          >
            <span>Explore Videos</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </Link>

          <Link
            to="/assistant"
            className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-white border-2 border-slate-300 text-slate-900 text-base font-bold hover:bg-slate-50 transition-all shadow-subtle hover:scale-105 active:scale-95"
          >
            <MessageSquareCode className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
            <span>Ask AI Assistant</span>
          </Link>
        </motion.div>
      </section>

      {/* ================= REAL DATA TELEMETRY STRIP ================= */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-5 max-w-5xl mx-auto">
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200/80 shadow-subtle text-center space-y-1 hover:border-emerald-400 transition-all">
          <div className="text-4xl font-extrabold text-slate-950 font-mono">{stats?.total_videos ?? 19}</div>
          <div className="text-sm font-bold text-slate-600">Clips in Repository</div>
        </div>
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200/80 shadow-subtle text-center space-y-1 hover:border-emerald-400 transition-all">
          <div className="text-4xl font-extrabold text-emerald-700 font-mono">{stats?.analyzed_videos ?? 0}</div>
          <div className="text-sm font-bold text-slate-600">Clips Analyzed</div>
        </div>
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200/80 shadow-subtle text-center space-y-1 hover:border-emerald-400 transition-all">
          <div className="text-4xl font-extrabold text-amber-700 font-mono">{stats?.high_risk_count ?? 0}</div>
          <div className="text-sm font-bold text-slate-600">High-Risk Alerts</div>
        </div>
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200/80 shadow-subtle text-center space-y-1 hover:border-emerald-400 transition-all">
          <div className="text-4xl font-extrabold text-purple-700 font-mono">{stats?.unusual_activity_count ?? 0}</div>
          <div className="text-sm font-bold text-slate-600">Unusual Incidents</div>
        </div>
      </section>

      {/* ================= ANIMATED DASHBOARD PREVIEW ================= */}
      <section className="relative rounded-3xl bg-white border-2 border-slate-200 shadow-premium p-8 sm:p-10 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 border-b border-slate-200 gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
              Live Architecture Preview
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-2.5">
              Event Intelligence Workflow
            </h2>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 transition-colors"
          >
            <span>Open Interactive Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Visual Pipeline Simulation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <div className="p-6 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3 hover:border-emerald-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 font-extrabold text-base flex items-center justify-center">
              01
            </div>
            <h3 className="font-bold text-lg text-slate-950">Frame Extraction Layer</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Samples 1 frame every 2 seconds via OpenCV, generating calibrated evidence frames for inspection.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3 hover:border-blue-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 font-extrabold text-base flex items-center justify-center">
              02
            </div>
            <h3 className="font-bold text-lg text-slate-950">Vision & Motion Classification</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Synthesizes temporal activity into structured JSON: events, risk rating, objects, and search descriptions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3 hover:border-amber-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-extrabold text-base flex items-center justify-center">
              03
            </div>
            <h3 className="font-bold text-lg text-slate-950">Grounded RAG Intelligence</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Indexes extracted events and answers natural language questions grounded in verified evidence frames.
            </p>
          </div>
        </div>
      </section>

      {/* ================= 3-STEP WORKFLOW ================= */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">How It Works</h2>
          <p className="text-base text-slate-600 font-medium">From raw camera footage to explainable AI verification</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-white border-2 border-slate-200 shadow-subtle hover:shadow-premium hover:border-emerald-400 transition-all space-y-4 group"
            >
              <div className="text-4xl font-black text-slate-200 group-hover:text-emerald-500/40 transition-colors">
                {s.step}
              </div>
              <h3 className="font-bold text-xl text-slate-950">{s.title}</h3>
              <p className="text-base text-slate-600 leading-relaxed font-medium">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FEATURE CARDS ================= */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">Platform Capabilities</h2>
          <p className="text-base text-slate-600 font-medium">Engineered for doorbell and security camera intelligence</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="p-7 rounded-3xl bg-white border-2 border-slate-200 shadow-subtle hover:shadow-premium hover:border-slate-300 transition-all flex items-start gap-5"
            >
              <div className={`p-4 rounded-2xl border-2 ${feat.color}`}>
                <feat.icon className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-lg text-slate-950 tracking-tight">{feat.title}</h3>
                <p className="text-base text-slate-600 leading-relaxed font-medium">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= PROTOTYPE DISCLAIMER SECTION ================= */}
      <section className="p-7 rounded-3xl bg-slate-50 border-2 border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-5 text-sm">
        <div className="p-3.5 rounded-2xl bg-white border-2 border-slate-200 shadow-subtle text-slate-700 shrink-0">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
            Prototype Architecture Note
          </h3>
          <p className="text-slate-600 leading-relaxed font-medium">
            This platform is an AI video intelligence prototype designed for research and demonstration. It analyzes supplied video clips stored in the local video library and does not claim or maintain an authorized live integration with Ring cameras. Risk indicators represent automated AI assessments and not verified criminal evidence.
          </p>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="pt-8 pb-4 border-t-2 border-slate-200 text-center text-sm font-semibold text-slate-500">
        <p>AegisVision AI Platform • Doorbell & Security Video Intelligence • Multimodal Reasoning</p>
      </footer>
    </div>
  );
};
