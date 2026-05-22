"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { buildEvent } from '@/lib/telemetry';
import { submitEvent } from '@/lib/mock-api';
import { USERS } from '@/lib/users';
import { ShieldCheck, ShieldAlert, ArrowUpRight, Plus, LogOut, Wallet, Clock, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BankHomePage() {
  const router = useRouter();
  const { userId, sessionId, sessionStartMs, precedingEvents, precedingAssessments, latestAssessment, addAssessment, pushEvent, setUser } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!userId) {
      router.push('/bank');
    }
  }, [userId]);

  // Submit view_balance event upon viewing the dashboard (Telemetry!)
  useEffect(() => {
    if (userId) {
      const event = buildEvent(
        'view_balance',
        userId,
        sessionId,
        sessionStartMs,
        precedingEvents
      );
      submitEvent(event)
        .then(assessment => {
          addAssessment(event as any, assessment);
          pushEvent('view_balance');
        })
        .catch(() => {});
    }
  }, [userId]);

  if (!mounted || !userId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <span className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  const currentUser = USERS[userId];

  // Starting balance configuration
  const STARTING_BALANCES: Record<string, number> = {
    user_001: 2840.00, // Aldi: €2,840 as requested in Phase 1
    user_002: 1205.00, // Anest: €1,205 as requested in Phase 1
    user_003: 8950.00, // Kristi: €8,950 as requested in Phase 1
  };

  const initialBalance = STARTING_BALANCES[userId] || 1000.00;

  // Calculate current balance by subtracting all successful transfers
  const successfulTransfers = precedingAssessments.filter(
    e => e.type === 'transfer' && e.verdict !== 'block' && e.amount !== undefined
  );
  
  const totalDeducted = successfulTransfers.reduce((sum, e) => sum + (e.amount || 0), 0);
  const currentBalance = initialBalance - totalDeducted;

  // Generate historical baseline transactions (3 items per user as requested in Phase 1)
  const getHistoricalTransactions = (uid: string) => {
    if (uid === 'user_001') {
      return [
        { id: 'h1', payeeName: 'Dr. Klodian (Dentist)', amount: 50.00, timestamp: Date.now() - 172800000, verdict: 'allow' },
        { id: 'h2', payeeName: 'Ilir Shkodra (Landlord)', amount: 350.00, timestamp: Date.now() - 432000000, verdict: 'allow' },
        { id: 'h3', payeeName: 'Abcom Broadband AL', amount: 25.00, timestamp: Date.now() - 604800000, verdict: 'allow' },
      ];
    }
    if (uid === 'user_002') {
      return [
        { id: 'h1', payeeName: 'Fieri Fitness Center', amount: 12.00, timestamp: Date.now() - 86400000, verdict: 'allow' },
        { id: 'h2', payeeName: 'Buci Family Account', amount: 45.00, timestamp: Date.now() - 345600000, verdict: 'allow' },
        { id: 'h3', payeeName: 'Valbona Hoxha (Mom)', amount: 100.00, timestamp: Date.now() - 864000000, verdict: 'allow' },
      ];
    }
    return [
      { id: 'h1', payeeName: 'Ego Office Supplies', amount: 200.00, timestamp: Date.now() - 259200000, verdict: 'allow' },
      { id: 'h2', payeeName: 'Tirana Business Park Rent', amount: 1200.00, timestamp: Date.now() - 518400000, verdict: 'allow' },
      { id: 'h3', payeeName: 'Hoxha Consulting Sh.p.k.', amount: 500.00, timestamp: Date.now() - 950400000, verdict: 'allow' },
    ];
  };

  const historicalTransfers = getHistoricalTransactions(userId);

  // Combine real-time session transfers with historical ones
  const sessionTransfers = precedingAssessments
    .filter(e => e.type === 'transfer')
    .map(e => ({
      id: e.id || Math.random().toString(),
      payeeName: e.payeeName || 'Unknown Recipient',
      amount: e.amount || 0,
      timestamp: e.timestamp || Date.now(),
      verdict: e.verdict,
    }));

  const allTransfers = [...sessionTransfers.reverse(), ...historicalTransfers];

  // Security risk indicator based on latest assessment verdict
  const lastVerdict = latestAssessment?.verdict || 'allow';
  const lastScore = latestAssessment?.score || 0;

  const handleLogoutClick = () => {
    setUser('');
    router.push('/bank');
  };

  return (
    <div className="flex-1 flex flex-col p-5 space-y-5 animate-slide-up">
      {/* Top Header Card */}
      <div className="flex justify-between items-center bg-slate-950/40 border border-slate-850 p-3.5 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-400 font-mono">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-mono">WELCOME BACK</div>
            <div className="text-xs font-bold text-slate-200 leading-tight">{currentUser.name}</div>
          </div>
        </div>
        
        <button
          onClick={handleLogoutClick}
          className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Balance Glassmorphism Card */}
      <div className="relative bg-gradient-to-br from-indigo-950/60 to-slate-900/80 border border-indigo-900/40 rounded-3xl p-6 shadow-xl shadow-indigo-950/20 overflow-hidden">
        {/* Decorative Grid Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex justify-between items-start text-indigo-300">
          <div className="flex items-center gap-1.5 text-xs font-mono tracking-wider">
            <Wallet className="w-3.5 h-3.5" />
            <span>PRIMARY CURRENT ACCOUNT</span>
          </div>
          <span className="text-[10px] font-bold bg-indigo-950/80 border border-indigo-900/30 px-2.5 py-0.5 rounded-full font-mono">
            EUR/ALL
          </span>
        </div>

        <div className="mt-4">
          <div className="text-[10px] text-slate-500 font-mono">AVAILABLE BALANCE</div>
          <div className="text-3xl font-extrabold text-white mt-1 font-sans flex items-baseline gap-1">
            €{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="flex justify-between border-t border-slate-800/40 mt-5 pt-4 text-[10px] text-slate-500 font-mono">
          <div>LIMIT FOR TODAY: €5,000</div>
          <div>SWIFT SECURE ACTIVE</div>
        </div>
      </div>

      {/* Security Status Widget */}
      <div className={cn(
        "border p-4 rounded-2xl flex items-start gap-3 transition-all duration-300",
        lastVerdict === 'allow' && "bg-emerald-950/15 border-emerald-900/20 text-emerald-400 shadow-sm shadow-emerald-950/5",
        lastVerdict === 'soft_challenge' && "bg-amber-950/15 border-amber-900/20 text-amber-400 shadow-sm shadow-amber-950/5",
        lastVerdict === 'hard_challenge' && "bg-orange-950/15 border-orange-900/20 text-orange-400 shadow-sm shadow-orange-950/5",
        lastVerdict === 'block' && "bg-red-950/15 border-red-900/20 text-red-400 shadow-sm shadow-red-950/5",
      )}>
        {lastVerdict === 'allow' ? (
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        ) : (
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 space-y-0.5">
          <div className="text-[11px] font-bold uppercase tracking-wider font-mono">
            Sentinel Shield State
          </div>
          <div className="text-xs text-slate-300 font-sans leading-tight">
            {lastVerdict === 'allow' && `Protected Session. Risk assessment clear (Score: ${lastScore}/100)`}
            {lastVerdict === 'soft_challenge' && `MFA soft challenge verification passed (Score: ${lastScore}/100)`}
            {lastVerdict === 'hard_challenge' && `Identity re-verified via biometric typing delays (Score: ${lastScore}/100)`}
            {lastVerdict === 'block' && `CRITICAL ALERT: Threat detected and execution blocked (Score: ${lastScore}/100)`}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        <button
          onClick={() => router.push('/bank/transfer')}
          className="group bg-slate-950/60 hover:bg-indigo-950/15 border border-slate-850 hover:border-indigo-500/50 p-4 rounded-2xl flex flex-col justify-between items-start text-left transition-all duration-300 active:scale-[0.97] hover:shadow-lg hover:shadow-indigo-950/5 cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-900/40 text-indigo-400 group-hover:scale-110 transition-transform">
            <Send className="w-4 h-4" />
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">Send Money</div>
            <div className="text-[9px] text-slate-500 font-mono mt-0.5">SECURE WIRE TRANSFER</div>
          </div>
        </button>

        <button
          onClick={() => router.push('/bank/add-payee')}
          className="group bg-slate-950/60 hover:bg-indigo-950/15 border border-slate-850 hover:border-indigo-500/50 p-4 rounded-2xl flex flex-col justify-between items-start text-left transition-all duration-300 active:scale-[0.97] hover:shadow-lg hover:shadow-indigo-950/5 cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-900/40 text-indigo-400 group-hover:scale-110 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">Add Payee</div>
            <div className="text-[9px] text-slate-500 font-mono mt-0.5">WHITELIST ACCOUNT ID</div>
          </div>
        </button>
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono px-1">
          <span>Recent Activity</span>
          <Clock className="w-3.5 h-3.5 text-slate-600" />
        </div>

        <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-2 divide-y divide-slate-900 max-h-[220px] overflow-y-auto">
          {allTransfers.length > 0 ? (
            allTransfers.map((tx, idx) => (
              <div key={tx.id || idx} className="py-2.5 px-3 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    tx.verdict === 'block' ? "bg-red-950/30 text-red-400 border border-red-900/20" : "bg-slate-900 text-slate-400 border border-slate-800"
                  )}>
                    <ArrowUpRight className={cn("w-4 h-4", tx.verdict === 'block' && "rotate-45")} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-sans">
                      {tx.payeeName}
                      {tx.verdict === 'block' && (
                        <span className="text-[8px] bg-red-950/80 border border-red-900/30 text-red-400 px-1 py-0.2 rounded font-mono font-medium">
                          BLOCKED
                        </span>
                      )}
                      {(tx.verdict === 'soft_challenge' || tx.verdict === 'hard_challenge') && (
                        <span className="text-[8px] bg-amber-950/80 border border-amber-900/30 text-amber-400 px-1 py-0.2 rounded font-mono font-medium">
                          CHALLENGED
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                      {new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "text-xs font-bold font-mono",
                  tx.verdict === 'block' ? "text-slate-500 line-through" : "text-slate-100"
                )}>
                  -€{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-8 text-xs text-slate-500 italic font-mono select-none">
              No transactions recorded in this session.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
