"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ShieldAlert, ShieldCheck, ArrowRight, Activity, Terminal, Cpu } from 'lucide-react';

export default function SimulationHubPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Soft Executive Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-slate-900/40 rounded-full blur-[120px] pointer-events-none" />

      {/* Decorative Professional Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header Area */}
      <div className="text-center max-w-xl z-20 mb-16 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-indigo-400 text-[10px] font-bold tracking-wider uppercase font-mono mb-4">
          <Shield className="w-3.5 h-3.5 text-indigo-500" />
          <span>Sentinel Enterprise Security Suite</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Sentinel <span className="bg-gradient-to-r from-indigo-400 to-indigo-500 bg-clip-text text-transparent">Biometric</span> Hub
        </h1>
        <p className="text-slate-400 text-sm mt-4 leading-relaxed max-w-md mx-auto">
          An advanced behavioral security simulator showcasing real-time client telemetry analysis, automated threat detection, and mitigation auditing.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl z-20 px-2 animate-slide-up">
        
        {/* CARD 1: SECURE BANK */}
        <button
          onClick={() => router.push('/bank')}
          className="group relative bg-slate-900/30 border border-slate-850 hover:border-indigo-500/50 p-7 rounded-3xl text-left transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-950/10 active:scale-[0.98] cursor-pointer flex flex-col justify-between min-h-[240px]"
        >
          {/* Accent glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />

          <div className="flex justify-between items-start w-full">
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 px-3 py-1 rounded-full font-mono">
              BANK CLIENT
            </span>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-100 group-hover:text-white flex items-center gap-2">
              FiBank Secured Portal
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Interact with a realistic Light-Mode corporate mobile banking experience. Simulates beneficiary registrations and wires with background biometric diagnostics.
            </p>
          </div>
        </button>

        {/* CARD 2: ATTACKER / SECURITY AUDIT HARNESS */}
        <button
          onClick={() => router.push('/attacker')}
          className="group relative bg-slate-900/30 border border-slate-850 hover:border-amber-500/50 p-7 rounded-3xl text-left transition-all duration-300 hover:shadow-2xl hover:shadow-amber-950/10 active:scale-[0.98] cursor-pointer flex flex-col justify-between min-h-[240px]"
        >
          {/* Accent glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />

          <div className="flex justify-between items-start w-full">
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-900/30 text-amber-400 group-hover:scale-110 transition-transform">
              <Terminal className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold bg-amber-950/40 border border-amber-900/30 text-amber-400 px-3 py-1 rounded-full font-mono">
              AUDIT HARNESS
            </span>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-100 group-hover:text-white flex items-center gap-2">
              Threat Simulator
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              A professional automated pen-testing utility. Run API request-floods, spoof user metadata coordinate sets, and validate behavioral threat bypasses.
            </p>
          </div>
        </button>

        {/* CARD 3: SENTINEL SOC MONITOR */}
        <button
          onClick={() => router.push('/soc')}
          className="group relative bg-slate-900/30 border border-slate-850 hover:border-indigo-500/50 p-7 rounded-3xl text-left transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-950/10 active:scale-[0.98] cursor-pointer flex flex-col justify-between min-h-[240px]"
        >
          {/* Accent glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />

          <div className="flex justify-between items-start w-full">
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 px-3 py-1 rounded-full font-mono">
              SOC CONSOLE
            </span>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-100 group-hover:text-white flex items-center gap-2">
              Sentinel SOC Panel
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Real-time threat analytics panel structured like enterprise SIEM systems. Review threat logs, inspect telemetry packets, and manage whitelisting overrides.
            </p>
          </div>
        </button>

      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-500 font-mono mt-20 z-20">
        <div>SENTINEL SIMULATION ENVIRONMENT // ENTERPRISE EDITION</div>
        <div className="text-slate-650 mt-1">© FIBANK ALBANIA SH.A. ALL RIGHTS SECURED.</div>
      </div>
    </div>
  );
}
