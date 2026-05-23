"use client";

import React from 'react';
import { useSession } from '@/lib/session';
import { ShieldCheck, ShieldAlert, Shield, ChevronDown, Activity, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

function LiveTelemetryDrawer() {
  const { precedingAssessments, userId, sessionId } = useSession();
  const [isOpen, setIsOpen] = React.useState(false);
  const lastEvent = precedingAssessments[precedingAssessments.length - 1];

  if (!userId) return null;

  return (
    <div className={cn(
      "absolute bottom-6 left-0 right-0 z-50 bg-[#071424] border-t border-slate-800/80 transition-all duration-300 shadow-2xl flex flex-col font-sans",
      isOpen ? "h-[380px] rounded-t-[28px]" : "h-14 rounded-t-xl"
    )}>
      {/* Drawer Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 px-6 flex items-center justify-between w-full hover:bg-slate-900/40 transition-colors border-b border-slate-800/30 select-none text-left"
      >
        <div className="flex items-center gap-2 text-slate-100">
          <Activity className={cn("w-4 h-4 text-blue-400 animate-pulse", lastEvent?.verdict === 'block' && "text-red-400")} />
          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-300">SafeShield™ Telemetry</span>
        </div>
        <div className="flex items-center gap-2.5">
          {lastEvent ? (
            <span className={cn(
              "text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase font-mono border",
              lastEvent.verdict === 'allow' && "bg-emerald-950/40 text-emerald-400 border-emerald-800/50",
              lastEvent.verdict === 'soft_challenge' && "bg-amber-950/40 text-amber-400 border-amber-800/50",
              lastEvent.verdict === 'hard_challenge' && "bg-orange-950/40 text-orange-400 border-orange-850/50",
              lastEvent.verdict === 'block' && "bg-red-950/40 text-red-400 border-red-800/50",
            )}>
              RISK: {lastEvent.score}/100 ({lastEvent.verdict.replace('_', ' ')})
            </span>
          ) : (
            <span className="text-[9px] text-slate-500 font-mono tracking-wider">SECURE LINK ACTIVE</span>
          )}
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
        </div>
      </button>

      {/* Drawer Content */}
      {isOpen && (
        <div className="flex-1 p-5 overflow-y-auto font-mono text-[11px] text-slate-350 space-y-4">
          <div>
            <div className="text-slate-500 font-bold mb-1.5 uppercase text-[9px] tracking-wider">Secure Session Scope</div>
            <div className="bg-[#050d18] p-3 rounded-xl border border-slate-800/50 space-y-1 text-slate-300">
              <div><span className="text-slate-500">Client ID:</span> {userId}</div>
              <div><span className="text-slate-500">Session Signature:</span> {sessionId?.slice(0, 16)}...</div>
              <div><span className="text-slate-500">Diagnostic Packets:</span> {precedingAssessments.length} telemetry units</div>
            </div>
          </div>

          <div>
            <div className="text-slate-500 font-bold mb-1.5 uppercase text-[9px] tracking-wider">Live Security Assessment</div>
            {lastEvent ? (
              <div className="space-y-3">
                <div className="bg-[#050d18] p-3 rounded-xl border border-slate-800/50 space-y-1.5 text-slate-300">
                  <div className="flex justify-between items-center">
                    <span><span className="text-slate-500">EVENT:</span> {lastEvent.type.toUpperCase()}</span>
                    <span><span className="text-slate-500">SCORE:</span> <strong className={cn(
                      lastEvent.score > 60 ? "text-red-450" : lastEvent.score > 20 ? "text-amber-450" : "text-emerald-450"
                    )}>{lastEvent.score}/100</strong></span>
                  </div>
                  <div><span className="text-slate-500">IP ADDRESS:</span> {lastEvent.ip} ({lastEvent.country})</div>
                  {lastEvent.typingSpeedMs !== undefined && (
                    <div><span className="text-slate-500">KEYSTROKE VELOCITY:</span> {lastEvent.typingSpeedMs} ms/key</div>
                  )}
                  {lastEvent.inputMethod && (
                    <div><span className="text-slate-500">INPUT METHOD:</span> <strong className="text-blue-400">{lastEvent.inputMethod.toUpperCase()}</strong></div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">Triggered Risk Factors ({lastEvent.signals?.length || 0})</div>
                  {lastEvent.signals && lastEvent.signals.length > 0 ? (
                    lastEvent.signals.map((sig, idx) => (
                      <div key={idx} className="bg-[#0b1b2d] border border-slate-850 p-3 rounded-xl flex flex-col gap-1">
                        <div className="flex justify-between text-slate-300 font-bold">
                          <span className={cn(
                            sig.layer === 'network' && "text-sky-400",
                            sig.layer === 'behavioral' && "text-indigo-400",
                            sig.layer === 'transactional' && "text-amber-400",
                          )}>[{sig.layer.toUpperCase()}] {sig.name}</span>
                          <span className="text-red-450 font-mono">+{sig.weight}</span>
                        </div>
                        <div className="text-slate-450 text-[10px] leading-tight font-sans mt-0.5">{sig.reason}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic text-[10px] p-3 bg-[#050d18] rounded-xl border border-dashed border-slate-800/80 text-center">
                      No anomalies flagged. Behavioral metrics normal.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic p-6 text-center border border-dashed border-slate-800/80 rounded-xl">
                Awaiting client interaction telemetry...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BankLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 font-sans overflow-x-hidden relative">
      {/* Background Subtle Corporate Navy Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-slate-900/30 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Sleek Mobile Frame Simulator Container */}
      <div className="w-full max-w-[390px] bg-[#071424] border border-slate-800/80 rounded-[48px] shadow-2xl overflow-hidden relative flex flex-col h-[800px] ring-[12px] ring-slate-900 ring-offset-2 ring-offset-slate-950">
        
        {/* Sleek Chrome Speaker Notch */}
        <div className="absolute top-0 left-0 right-0 h-8 flex justify-center items-center z-50 pointer-events-none select-none">
          <div className="w-36 h-4.5 bg-slate-900 rounded-b-2xl border border-slate-800/60 border-t-0 flex items-center justify-around px-4 shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-950 border border-slate-800/40" />
            <div className="w-12 h-1 rounded-full bg-slate-950" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#0a2540]" />
          </div>
        </div>

        {/* Status Bar */}
        <div className="h-10 pt-2 bg-[#071424] flex justify-between items-center px-7 text-[10px] text-slate-400 select-none font-medium z-40 font-mono">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span>5G</span>
            <div className="w-5 h-2.5 border border-slate-650 rounded-sm p-0.5 flex items-center">
              <div className="w-full h-full bg-slate-400 rounded-[1px]" />
            </div>
          </div>
        </div>
        
        {/* Mobile Viewport Screen */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto pb-16 z-35">
          {children}
        </div>
        
        {/* SafeShield telemetry drawer */}
        <LiveTelemetryDrawer />
        
        {/* Device Home Indicator Bar */}
        <div className="h-5 bg-[#071424] flex justify-center items-center pb-1.5 z-40 border-t border-slate-900/60">
          <div className="w-28 h-1 bg-slate-600 rounded-full" />
        </div>
      </div>
    </div>
  );
}
