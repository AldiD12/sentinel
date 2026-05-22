"use client";

import React from 'react';
import { SessionProvider, useSession } from './SessionContext';
import { ShieldAlert, ShieldCheck, Shield, ChevronDown, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

function LiveTelemetryDrawer() {
  const { precedingEvents, userId, sessionId } = useSession();
  const [isOpen, setIsOpen] = React.useState(false);
  const lastEvent = precedingEvents[precedingEvents.length - 1];

  if (!userId) return null;

  return (
    <div className={cn(
      "absolute bottom-6 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-800 transition-all duration-300 shadow-2xl flex flex-col",
      isOpen ? "h-[360px] rounded-t-3xl" : "h-14 rounded-t-xl"
    )}>
      {/* Drawer Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 px-6 flex items-center justify-between w-full hover:bg-slate-900/50 transition-colors border-b border-slate-800/40 select-none text-left"
      >
        <div className="flex items-center gap-2 text-slate-200">
          <Activity className={cn("w-4 h-4 text-emerald-400 animate-pulse", lastEvent?.verdict === 'block' && "text-red-400")} />
          <span className="text-xs font-semibold uppercase tracking-wider font-mono">Live Sentinel Shield</span>
        </div>
        <div className="flex items-center gap-3">
          {lastEvent ? (
            <span className={cn(
              "text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase font-mono border",
              lastEvent.verdict === 'allow' && "bg-emerald-950/40 text-emerald-400 border-emerald-800/40",
              lastEvent.verdict === 'soft_challenge' && "bg-amber-950/40 text-amber-400 border-amber-800/40",
              lastEvent.verdict === 'hard_challenge' && "bg-orange-950/40 text-orange-400 border-orange-800/40",
              lastEvent.verdict === 'block' && "bg-red-950/40 text-red-400 border-red-800/40",
            )}>
              Verdict: {lastEvent.verdict}
            </span>
          ) : (
            <span className="text-xs text-slate-500 font-mono">Monitoring Session...</span>
          )}
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
        </div>
      </button>

      {/* Drawer Content */}
      {isOpen && (
        <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-4">
          <div>
            <div className="text-slate-500 font-semibold mb-1 uppercase text-[10px] tracking-wider">Session Parameters</div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <div><span className="text-indigo-400">User ID:</span> {userId}</div>
              <div><span className="text-indigo-400">Session ID:</span> {sessionId?.slice(0, 18)}...</div>
              <div><span className="text-indigo-400">Captured Events:</span> {precedingEvents.length}</div>
            </div>
          </div>

          <div>
            <div className="text-slate-500 font-semibold mb-1 uppercase text-[10px] tracking-wider">Latest Telemetry Signal Evaluation</div>
            {lastEvent ? (
              <div className="space-y-2">
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span><span className="text-indigo-400">Event Type:</span> {lastEvent.type.toUpperCase()}</span>
                    <span><span className="text-indigo-400">Score:</span> <strong className={cn(
                      lastEvent.score > 60 ? "text-red-400" : lastEvent.score > 20 ? "text-amber-400" : "text-emerald-400"
                    )}>{lastEvent.score}/100</strong></span>
                  </div>
                  <div><span className="text-indigo-400">Latency:</span> {lastEvent.latencyMs}ms</div>
                  <div><span className="text-indigo-400">IP:</span> {lastEvent.ip} ({lastEvent.country})</div>
                  {lastEvent.typingSpeedMs !== undefined && (
                    <div><span className="text-indigo-400">Typing Speed:</span> {lastEvent.typingSpeedMs}ms/key</div>
                  )}
                  {lastEvent.inputMethod && (
                    <div><span className="text-indigo-400">Input Method:</span> {lastEvent.inputMethod}</div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="text-slate-500 uppercase text-[9px] font-bold">Risk Signals ({lastEvent.signals.length})</div>
                  {lastEvent.signals.length > 0 ? (
                    lastEvent.signals.map((sig, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 p-2 rounded flex flex-col gap-0.5">
                        <div className="flex justify-between text-slate-400 font-bold">
                          <span className={cn(
                            sig.layer === 'network' && "text-sky-400",
                            sig.layer === 'behavioral' && "text-purple-400",
                            sig.layer === 'transactional' && "text-amber-400",
                          )}>[{sig.layer.toUpperCase()}] {sig.name}</span>
                          <span className="text-rose-400">+{sig.weight}</span>
                        </div>
                        <div className="text-slate-500 text-[10px] leading-tight">{sig.reason}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic text-[10px] p-2 bg-slate-900/30 rounded border border-dashed border-slate-800">
                      No anomalous risk signals triggered. Clean verification.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic p-4 text-center border border-dashed border-slate-800 rounded-lg">
                No events recorded in current session scope.
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
    <SessionProvider>
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 font-sans overflow-x-hidden relative">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Main responsive/device frame */}
        <div className="w-full max-w-[390px] bg-slate-900 border border-slate-800 rounded-[44px] shadow-2xl shadow-indigo-950/20 overflow-hidden relative flex flex-col h-[800px] ring-8 ring-slate-950 ring-offset-2 ring-offset-slate-850">
          
          {/* Phone Speaker & Camera Notch */}
          <div className="absolute top-0 left-0 right-0 h-8 flex justify-center items-center z-50 pointer-events-none select-none">
            <div className="w-36 h-4.5 bg-black rounded-b-2xl border border-slate-800 border-t-0 flex items-center justify-around px-4">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
              <div className="w-12 h-1 rounded-full bg-slate-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-950" />
            </div>
          </div>

          {/* Status Bar Mock */}
          <div className="h-10 pt-2 bg-slate-950 flex justify-between items-center px-7 text-[10px] text-slate-400 select-none font-medium z-40">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-5 h-2.5 border border-slate-500 rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-slate-300 rounded-[1px]" />
              </div>
            </div>
          </div>
          
          {/* App Body */}
          <div className="flex-1 flex flex-col bg-slate-900/40 overflow-y-auto pb-16 z-30">
            {children}
          </div>
          
          {/* Telemetry live feed panel overlays inside the frame at the bottom */}
          <LiveTelemetryDrawer />
          
          {/* Home Indicator */}
          <div className="h-5 bg-slate-950 flex justify-center items-center pb-1.5 z-40 border-t border-slate-900">
            <div className="w-28 h-1 bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
