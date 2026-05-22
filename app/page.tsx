"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Send, Terminal, Sparkles, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function SimulationHubPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Decorative Matrix Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />

      {/* Header Area */}
      <div className="text-center max-w-xl z-20 mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-indigo-900/30 text-indigo-400 text-[10px] font-semibold tracking-wider uppercase font-mono mb-4">
          <Shield className="w-3.5 h-3.5" />
          <span>Sentinel Threat Platform</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Sentinel <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-sky-400 bg-clip-text text-transparent">Biometric</span> Hub
        </h1>
        <p className="text-slate-400 text-sm mt-3 leading-relaxed max-w-md mx-auto">
          An advanced behavioral security simulator showcasing client telemetry analysis, real-time risk assessment, and attack vector mitigations.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl z-20 px-2 animate-slide-up">
        
        {/* CARD 1: SECURE BANK */}
        <button
          onClick={() => router.push('/bank')}
          className="group relative bg-slate-900/40 border border-slate-850 hover:border-emerald-500/50 p-6 rounded-3xl text-left transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/10 active:scale-[0.98] cursor-pointer flex flex-col justify-between min-h-[220px]"
        >
          {/* Accent glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />

          <div className="flex justify-between items-start w-full">
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-semibold bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 px-2.5 py-0.5 rounded-full font-mono">
              ACTIVE
            </span>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-100 group-hover:text-white flex items-center gap-2">
              FiBank Secured Portal
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Log in as a bank customer, submit transfers, and whitelist beneficiaries. Tracks key stroke biometrics and paste events.
            </p>
          </div>
        </button>

        {/* CARD 2: ATTACKER DASHBOARD */}
        <button
          onClick={() => router.push('/attacker')}
          className="group relative bg-slate-900/40 border border-slate-850 hover:border-red-500/50 p-6 rounded-3xl text-left transition-all duration-300 hover:shadow-2xl hover:shadow-red-950/10 active:scale-[0.98] cursor-pointer flex flex-col justify-between min-h-[220px]"
        >
          {/* Accent glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 via-red-500/0 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />

          <div className="flex justify-between items-start w-full">
            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-900/30 text-red-400 group-hover:scale-110 transition-transform">
              <Terminal className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-semibold bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 px-2.5 py-0.5 rounded-full font-mono uppercase">
              NEXT STEP
            </span>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-100 group-hover:text-white flex items-center gap-2">
              Attacker Dashboard
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Spoof network coordinates (IP, UA, ASN), trigger brute force request floods, and execute programmatical behavioral bypasses.
            </p>
          </div>
        </button>

      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-600 font-mono mt-16 z-20">
        <div>SENTINEL SIMULATION ENVIRONMENT</div>
        <div className="text-slate-700 mt-0.5">UNDER THE HOOD FORTRESS STACK ACTIVE</div>
      </div>
    </div>
  );
}
