import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShieldCheck, 
  Film, 
  LayoutDashboard, 
  MessageSquareCode, 
  Radio,
  Sparkles
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Overview', icon: ShieldCheck, exact: true },
    { to: '/videos', label: 'Video Library', icon: Film },
    { to: '/dashboard', label: 'Event Analytics', icon: LayoutDashboard },
    { to: '/assistant', label: 'AI Assistant', icon: MessageSquareCode, badge: 'Live RAG' },
  ];

  return (
    <aside className="w-72 bg-surface border-r border-border min-h-screen sticky top-0 flex flex-col justify-between z-30 select-none shadow-subtle">
      <div>
        {/* Brand header */}
        <div className="p-6 border-b border-border/80">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-subtle">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight text-primary flex items-center gap-2">
                AegisVision <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">AI</span>
              </h1>
              <p className="text-xs text-secondary font-medium">Home Video Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-4 space-y-2">
          <div className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-secondary">
            Navigation
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-2xl text-base font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 border-2 border-emerald-400 font-bold shadow-subtle scale-[1.02]'
                    : 'text-secondary hover:text-primary hover:bg-slate-100/80'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3.5">
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-700 stroke-[2.5]' : 'text-slate-500'}`} />
                    <span className="text-base">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer status widget */}
      <div className="p-4 border-t border-border/80 m-4 rounded-2xl bg-slate-50 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Detection Engine Online</span>
        </div>
        <p className="text-xs text-secondary leading-relaxed font-medium">
          Multi-frame Computer Vision & High-Precision Retrieval Grounding
        </p>
      </div>
    </aside>
  );
};
