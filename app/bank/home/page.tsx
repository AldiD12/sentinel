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
    user_001: 300000.00,
    user_002: 1205.00,
    user_003: 8950.00,
  };

  const initialBalance = STARTING_BALANCES[userId] || 1000.00;

  // Calculate current balance by subtracting all successful transfers
  const successfulTransfers = precedingAssessments.filter(
    e => e.type === 'transfer' && (e.verdict === 'allow' || e.verdict === 'soft_challenge') && e.amount !== undefined
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
    <div className="flex-1 flex flex-col p-5 space-y-5 animate-slide-up bg-slate-50 text-slate-800">
      {/* Top Header Card */}
      <div className="flex justify-between items-center bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#0a3474] flex items-center justify-center text-xs font-bold text-white">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Welcome Back</div>
            <div className="text-xs font-extrabold text-slate-800 leading-tight">{currentUser.name}</div>
          </div>
        </div>
        
        <button
          onClick={handleLogoutClick}
          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-[#d61827] transition-all cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* FiBank Mastercard Gold Premium Card */}
      <div className="relative bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-600 rounded-[24px] p-5 shadow-lg overflow-hidden text-white flex flex-col justify-between h-[200px] border border-yellow-500/30">
        {/* Subtle Card Background Pattern Curves */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right_bottom,#ffffff15,transparent_60%)] pointer-events-none" />
        <div className="absolute top-[-50%] left-[-20%] w-[200px] h-[200px] border border-white/5 rounded-full pointer-events-none" />

        {/* Card Top: Fibank Logo & Card Type */}
        <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-1.5 select-none">
            {/* White variant logo for card */}
            <div className="grid grid-cols-2 gap-[1.5px] rotate-45 w-4 h-4 border-2 border-white p-[1px] rounded-sm shrink-0">
              <div className="bg-white rounded-[0.5px]" />
              <div className="bg-[#d61827] rounded-[0.5px]" />
              <div className="bg-white rounded-[0.5px]" />
              <div className="bg-white rounded-[0.5px]" />
            </div>
            <span className="text-sm font-black tracking-tight font-sans text-white">Fibank</span>
          </div>
          <span className="text-[8px] font-bold bg-white/20 border border-white/30 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
            Mastercard Gold
          </span>
        </div>

        {/* Card Middle: Gold Chip Asset Mock & Card Number */}
        <div className="z-10 mt-2">
          {/* Mock Gold Chip */}
          <div className="w-8 h-6 bg-gradient-to-br from-yellow-300 to-yellow-100 rounded-md border border-yellow-400/40 p-1 flex flex-col justify-between mb-3 shadow-inner">
            <div className="grid grid-cols-3 gap-[1px] h-full opacity-40">
              <div className="border-r border-slate-700" />
              <div className="border-r border-slate-700" />
              <div />
            </div>
          </div>
          <div className="text-base font-bold font-mono tracking-widest text-slate-100 drop-shadow-sm select-all">
            5240 1382 7654 8769
          </div>
        </div>

        {/* Card Bottom: Expiry Date, Cardholder, and Mastercard Circles */}
        <div className="flex justify-between items-end z-10">
          <div>
            <div className="text-[7px] text-slate-200 font-bold uppercase tracking-wider font-mono">Cardholder</div>
            <div className="text-xs font-extrabold tracking-wide uppercase mt-0.5">{currentUser.name}</div>
          </div>
          
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[7px] text-slate-200 font-bold uppercase tracking-wider font-mono">Expiry</div>
              <div className="text-[10px] font-bold font-mono mt-0.5">10/28</div>
            </div>
            
            {/* Mastercard Brand Circles */}
            <div className="flex -space-x-2.5">
              <div className="w-6 h-6 rounded-full bg-[#e51e26] opacity-90" />
              <div className="w-6 h-6 rounded-full bg-[#f79e1b] opacity-90" />
            </div>
          </div>
        </div>
      </div>

      {/* Available Balance Quick Widget */}
      {(() => {
        const DAILY_LIMIT = 50000;
        const spentToday = successfulTransfers.reduce((s, e) => s + (e.amount ?? 0), 0);
        const remaining = Math.max(0, DAILY_LIMIT - spentToday);
        const usedPct = Math.min(100, (spentToday / DAILY_LIMIT) * 100);
        return (
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 text-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Available Balance</div>
                <div className="text-2xl font-black text-[#0a3474] tracking-tight mt-0.5">
                  €{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Today Spent</div>
                <div className="text-sm font-bold text-slate-700 mt-0.5">
                  €{spentToday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[8px] font-mono text-slate-400">
                <span>DAILY LIMIT USAGE</span>
                <span className={cn(usedPct > 80 ? 'text-[#d61827]' : 'text-[#0a3474]', 'font-bold')}>
                  €{remaining.toLocaleString('en-US', { minimumFractionDigits: 0 })} remaining of €{(DAILY_LIMIT/1000).toFixed(0)}K
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    usedPct > 80 ? 'bg-[#d61827]' : usedPct > 50 ? 'bg-amber-500' : 'bg-[#0a3474]'
                  )}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-[8px] text-slate-400 font-mono border-t border-slate-100 pt-2">
              <span>IBAN: AL47 2121 1009 0000 0002 3569 87</span>
              <span className="text-[#0a3474] font-semibold">ALL / EUR ACC</span>
            </div>
          </div>
        );
      })()}

      {/* SafeShield™ Security Verdict Status Widget */}
      <div className={cn(
        "border p-4 rounded-2xl flex items-start gap-3 transition-all duration-300 shadow-sm",
        lastVerdict === 'allow' && "bg-emerald-50/50 border-emerald-200 text-emerald-800",
        lastVerdict === 'soft_challenge' && "bg-amber-50/50 border-amber-200 text-amber-800",
        lastVerdict === 'hard_challenge' && "bg-orange-50/50 border-orange-200 text-orange-850",
        lastVerdict === 'block' && "bg-red-50/50 border-red-200 text-[#d61827]",
      )}>
        {lastVerdict === 'allow' ? (
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
        ) : (
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
        )}
        <div className="flex-1 space-y-0.5 font-sans">
          <div className="text-[10px] font-extrabold uppercase tracking-wider font-mono">
            SafeShield™ Status
          </div>
          <div className="text-xs text-slate-600 leading-tight">
            {lastVerdict === 'allow' && `Protected Session. Risk assessment: Safe (Factor: ${lastScore}/100)`}
            {lastVerdict === 'soft_challenge' && `MFA soft verification requested & completed (Factor: ${lastScore}/100)`}
            {lastVerdict === 'hard_challenge' && `Advanced identity re-auth validated successfully (Factor: ${lastScore}/100)`}
            {lastVerdict === 'block' && `Critical Suspicious Activity Blocked (Factor: ${lastScore}/100)`}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        <button
          onClick={() => router.push('/bank/transfer')}
          className="group bg-white hover:bg-[#0a3474]/5 border border-slate-200 hover:border-[#0a3474]/40 p-4 rounded-2xl flex flex-col justify-between items-start text-left transition-all duration-300 active:scale-[0.97] hover:shadow-md cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0a3474] group-hover:bg-[#0a3474] group-hover:text-white transition-all">
            <Send className="w-4 h-4" />
          </div>
          <div className="mt-4">
            <div className="text-xs font-extrabold text-slate-800 transition-colors">Send Money</div>
            <div className="text-[8px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider font-semibold">SWIFT Wire Transfer</div>
          </div>
        </button>

        <button
          onClick={() => router.push('/bank/add-payee')}
          className="group bg-white hover:bg-[#0a3474]/5 border border-slate-200 hover:border-[#0a3474]/40 p-4 rounded-2xl flex flex-col justify-between items-start text-left transition-all duration-300 active:scale-[0.97] hover:shadow-md cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0a3474] group-hover:bg-[#0a3474] group-hover:text-white transition-all">
            <Plus className="w-4 h-4" />
          </div>
          <div className="mt-4">
            <div className="text-xs font-extrabold text-slate-800 transition-colors">Add Payee</div>
            <div className="text-[8px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider font-semibold">Whitelist Beneficiary</div>
          </div>
        </button>
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-wider font-mono px-1">
          <span>Recent Activity</span>
          <Clock className="w-3.5 h-3.5 text-slate-400" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-1.5 divide-y divide-slate-100 max-h-[220px] overflow-y-auto shadow-sm">
          {allTransfers.length > 0 ? (
            allTransfers.map((tx, idx) => (
              <div key={tx.id || idx} className="py-2.5 px-3 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border",
                    tx.verdict === 'block' ? "bg-red-50 text-[#d61827] border-red-100" : "bg-slate-50 text-slate-500 border-slate-200"
                  )}>
                    <ArrowUpRight className={cn("w-4 h-4 shrink-0", tx.verdict === 'block' && "rotate-45")} />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 font-sans leading-none">
                      {tx.payeeName}
                      {tx.verdict === 'block' && (
                        <span className="text-[7px] bg-red-150 border border-red-200 text-[#d61827] px-1 py-0.2 rounded font-mono font-bold uppercase">
                          Suspended
                        </span>
                      )}
                      {(tx.verdict === 'soft_challenge' || tx.verdict === 'hard_challenge') && (
                        <span className="text-[7px] bg-amber-100 border border-amber-200 text-amber-700 px-1 py-0.2 rounded font-mono font-bold uppercase">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-1">
                      {new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "text-xs font-bold font-mono",
                  tx.verdict === 'block' ? "text-slate-400 line-through" : "text-slate-800"
                )}>
                  -€{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-8 text-xs text-slate-400 italic font-mono select-none">
              No transactions recorded in this session.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
