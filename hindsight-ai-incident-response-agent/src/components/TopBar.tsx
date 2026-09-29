import React, { useState } from 'react';
import { UserRole, UserSession, SystemHealthStatus } from '../types';
import { Shield, Sparkles, RefreshCw, Menu, X, ChevronRight, Database, History, Radio, CheckSquare, Layers } from 'lucide-react';

interface TopBarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: UserSession;
  setCurrentUser: (user: UserSession) => void;
  systemHealth: SystemHealthStatus | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenSettings: () => void;
  onOpenSimulate: () => void;
  pendingApprovalsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  setCurrentUser,
  systemHealth,
  onRefresh,
  isRefreshing,
  onOpenSettings,
  onOpenSimulate,
  pendingApprovalsCount,
}) => {
  const isDemo = systemHealth?.isDemoMode ?? true;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRoleChange = (role: UserRole) => {
    setCurrentUser({
      ...currentUser,
      role,
      name: role === 'Admin' ? 'Lead SRE Admin' : role === 'Engineer' ? 'SRE On-Call Engineer' : 'Incident Observer',
    });
  };

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'incidents', label: 'Incidents' },
    { id: 'memory', label: 'Hindsight Memory' },
    { id: 'approval-queue', label: 'Approval Queue', badge: pendingApprovalsCount },
    { id: 'audit', label: 'Audit Log' },
    { id: 'connectors', label: 'Connectors' },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-[#0B1120]/95 backdrop-blur-md sticky top-0 z-40">
      {/* Slim, Unobtrusive Demo Mode Banner */}
      {isDemo && (
        <div className="bg-amber-950/25 border-b border-amber-800/40 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 sm:gap-4 text-[14px] leading-[1.6] text-amber-200/90 font-sans">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            <span className="font-semibold text-amber-300">DEMO MODE</span>
            <span className="text-slate-300 font-normal">
              Deterministic mock engines & seeded SRE failure data active
            </span>
          </div>
          <button
            onClick={onOpenSettings}
            className="text-amber-300 hover:text-amber-100 underline underline-offset-4 transition-colors cursor-pointer shrink-0 font-medium text-[14px] focus-visible:ring-1 focus-visible:ring-amber-400 focus-visible:outline-hidden"
          >
            Configure Keys →
          </button>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity (Title: 22px, font-weight 650, line-height 1.3, letter-spacing: normal) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setCurrentTab('overview');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 text-left group cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden rounded p-1"
            aria-label="Go to Overview"
          >
            <div className="w-9 h-9 rounded-lg bg-[#111928] border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-mono font-bold text-base shadow-xs group-hover:border-cyan-500 transition-colors shrink-0">
              H
            </div>
            <div className="flex flex-col">
              <span className="text-[22px] font-[650] leading-[1.3] text-white group-hover:text-cyan-300 transition-colors whitespace-nowrap">
                Hindsight AI SRE Agent
              </span>
              <span className="text-[12px] font-mono text-slate-400 tracking-wider">
                HACKWITHHYDERABAD 3.0
              </span>
            </div>
          </button>
        </div>

        {/* Center: Desktop Navigation Links (Consistent 24px gaps, 16px font size, 500 weight, 1.5 line-height) */}
        <nav className="hidden xl:flex items-center gap-6 text-[16px] font-medium leading-[1.5] text-slate-300" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`relative px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden text-[16px] font-medium leading-[1.5] ${
                  isActive
                    ? 'text-cyan-300 bg-[#111928] font-semibold border border-slate-800'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -bottom-2 left-3.5 right-3.5 h-[2px] bg-cyan-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions & Role Control */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Refresh Data */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh telemetry"
            className="p-2 rounded-lg bg-[#111928] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Quick Simulate Trigger (15px font-medium) */}
          <button
            onClick={onOpenSimulate}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-lg text-[15px] font-medium leading-[1.5] text-cyan-300 bg-[#111928] border border-cyan-800/60 hover:bg-cyan-950/60 hover:border-cyan-500 transition-colors whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Simulate</span>
          </button>

          {/* Compact Role Switcher */}
          <div className="hidden sm:flex items-center rounded-lg bg-[#111928] border border-slate-800 p-1 text-xs font-medium" role="radiogroup" aria-label="User Role">
            <span className="px-2 text-slate-400 font-mono text-xs uppercase">Role:</span>
            {(['Admin', 'Engineer', 'Viewer'] as UserRole[]).map((r) => (
              <button
                key={r}
                role="radio"
                aria-checked={currentUser.role === r}
                onClick={() => handleRoleChange(r)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:outline-hidden ${
                  currentUser.role === r
                    ? 'bg-slate-800 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-[#111928] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
            title="System Health & API Configuration"
            aria-label="Open Settings"
          >
            <Shield className="w-4 h-4" />
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-lg bg-[#111928] border border-slate-800 text-slate-400 hover:text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-800 bg-[#0B1120] px-4 py-4 space-y-3">
          <div className="space-y-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-lg flex items-center justify-between text-left text-[16px] font-medium leading-[1.5] ${
                  currentTab === item.id
                    ? 'bg-slate-900 text-cyan-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-900/50'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Mobile Role Switcher & Action */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400 font-mono text-xs">Role:</span>
            <div className="flex items-center gap-1.5">
              {(['Admin', 'Engineer', 'Viewer'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono ${
                    currentUser.role === r
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
