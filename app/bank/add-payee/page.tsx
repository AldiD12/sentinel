"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../SessionContext';
import { ChevronLeft, Plus, AlertTriangle, ShieldCheck, ShieldAlert, Sparkles, HelpCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BankAddPayeePage() {
  const router = useRouter();
  const { userId, submitBankEvent, addLocalPayee } = useSession();
  const [mounted, setMounted] = useState(false);

  // Form states
  const [payeeName, setPayeeName] = useState('');
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('FiBank Albania');

  // Telemetry states
  const [keystrokeDelays, setKeystrokeDelays] = useState<number[]>([]);
  const [lastKeyPressTime, setLastKeyPressTime] = useState<number>(0);
  const [inputMethod, setInputMethod] = useState<'typed' | 'pasted' | 'autofill'>('typed');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verdict response screens
  const [verdictType, setVerdictType] = useState<'none' | 'success' | 'soft' | 'hard' | 'block'>('none');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Challenge responses
  const [challengeInput, setChallengeInput] = useState('');
  const [challengeOtp, setChallengeOtp] = useState('');
  const [challengeAttempts, setChallengeAttempts] = useState(0);

  // Focus ref for typing telemetry on IBAN
  const ibanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!userId) {
      router.push('/app/bank');
    }
  }, [userId]);

  if (!mounted || !userId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <span className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Enter' || e.key === 'Tab' || e.key === 'Shift') {
      return;
    }
    const now = Date.now();
    if (lastKeyPressTime > 0) {
      const delay = now - lastKeyPressTime;
      if (delay < 2000) {
        setKeystrokeDelays(prev => [...prev, delay]);
      }
    }
    setLastKeyPressTime(now);
  };

  const handlePaste = () => {
    setInputMethod('pasted');
  };

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIban(e.target.value);
    if (e.target.value.length > 1 && keystrokeDelays.length === 0 && lastKeyPressTime === 0) {
      setInputMethod('autofill');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payeeName || !iban || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    // Calculate typing delays on IBAN
    const avgTypingSpeed = keystrokeDelays.length > 0
      ? Math.round(keystrokeDelays.reduce((a, b) => a + b, 0) / keystrokeDelays.length)
      : undefined;

    const dummyPayeeId = 'payee_user_' + Math.random().toString(36).substring(2, 7);

    try {
      // Execute security assessment
      const assessment = await submitBankEvent('add_payee', {
        payeeId: dummyPayeeId,
        payeeName,
        typingSpeedMs: avgTypingSpeed,
        inputMethod,
      });

      // Handle risk verdicts
      if (assessment.verdict === 'block') {
        setVerdictType('block');
      } else if (assessment.verdict === 'soft_challenge') {
        setVerdictType('soft');
      } else if (assessment.verdict === 'hard_challenge') {
        setVerdictType('hard');
      } else {
        // Success
        addLocalPayee(dummyPayeeId, payeeName);
        setVerdictType('success');
      }
      setIsSubmitting(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payee whitelisting failed.');
      setIsSubmitting(false);
    }
  };

  // Challenge processing
  const handleSoftChallengeVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = `WHITELIST ${payeeName.toUpperCase()}`;
    if (challengeInput.trim().toUpperCase() === expected) {
      const dummyPayeeId = 'payee_user_' + Math.random().toString(36).substring(2, 7);
      addLocalPayee(dummyPayeeId, payeeName);
      setVerdictType('success');
    } else {
      setChallengeAttempts(prev => prev + 1);
      if (challengeAttempts >= 1) {
        setVerdictType('block');
      } else {
        setErrorMsg('Authorization phrase does not match. Case-sensitive. 1 attempt remaining.');
      }
    }
  };

  const handleHardChallengeVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (challengeOtp === '888888') {
      const dummyPayeeId = 'payee_user_' + Math.random().toString(36).substring(2, 7);
      addLocalPayee(dummyPayeeId, payeeName);
      setVerdictType('success');
    } else {
      setChallengeAttempts(prev => prev + 1);
      if (challengeAttempts >= 1) {
        setVerdictType('block');
      } else {
        setErrorMsg('Invalid token. 1 attempt remaining.');
      }
    }
  };

  const activeAvgSpeed = keystrokeDelays.length > 0 
    ? Math.round(keystrokeDelays.reduce((a, b) => a + b, 0) / keystrokeDelays.length)
    : 0;

  // ---------------------------------------------------------
  // RENDER: SUCCESS SCREEN
  // ---------------------------------------------------------
  if (verdictType === 'success') {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-900 animate-fade-in">
        <div className="my-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/60 animate-spin-once">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 font-sans">Payee Whitelisted</h2>
            <p className="text-slate-400 text-xs mt-1.5 font-mono uppercase tracking-wider">
              SWIFT SECURE BANKING WHITELIST
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl text-left space-y-3 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">PAYEE NAME:</span>
              <span className="text-slate-200 font-bold">{payeeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ACCOUNT / IBAN:</span>
              <span className="text-indigo-400 font-bold">{iban.toUpperCase()}</span>
            </div>
            <div className="flex justify-between border-t border-slate-900 pt-2 text-[10px]">
              <span className="text-slate-500">SENTINEL RISK VERDICT:</span>
              <span className="text-emerald-400 font-semibold uppercase">SECURE_WHITELISTED</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push('/app/bank/home')}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: BLOCKED SCREEN
  // ---------------------------------------------------------
  if (verdictType === 'block') {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-900 animate-fade-in">
        <div className="my-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-950/60 animate-bounce">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-400 font-mono tracking-tight uppercase">REGISTRATION SUSPENDED</h2>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Sentinel has locked payee whitelisting permissions. Behavioral anomalies during account number input match brute force automated pasting patterns.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl text-left space-y-2.5 font-mono text-[11px] text-red-300">
            <div><strong className="text-red-400">ENGINE_CODE:</strong> 0xEC109_WHITELIST_LOCK</div>
            <div><strong className="text-red-400">REASON:</strong> Spoofed network coordinates or copy-pasted values violating standard keyboard cadence.</div>
          </div>
        </div>

        <button
          onClick={() => router.push('/app/bank/home')}
          className="w-full bg-red-900/30 text-red-300 border border-red-800/80 py-3.5 rounded-xl font-semibold hover:bg-red-900/50 hover:text-white transition-all cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: SOFT CHALLENGE
  // ---------------------------------------------------------
  if (verdictType === 'soft') {
    const expectedPhrase = `WHITELIST ${payeeName.toUpperCase()}`;
    return (
      <div className="flex-1 flex flex-col justify-between p-6 animate-fade-in">
        <div className="my-auto space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-amber-950/40 border border-amber-500/50 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 font-mono">Soft Whitelist Challenge</h2>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Unusual keyboard input method detected on IBAN fields. Please type the whitelist phrase below to authorize.
            </p>
          </div>

          <form onSubmit={handleSoftChallengeVerify} className="space-y-4">
            <div className="bg-slate-950/80 border border-slate-850 p-3 rounded-xl text-center font-mono text-xs text-indigo-400 select-all font-semibold">
              {expectedPhrase}
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block font-mono">
                Type the phrase exactly (case-sensitive)
              </label>
              <input
                type="text"
                value={challengeInput}
                onChange={(e) => setChallengeInput(e.target.value)}
                placeholder="Type here..."
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs py-3 px-4 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all"
                required
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/30 p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold hover:bg-amber-400 active:scale-[0.98] transition-all cursor-pointer text-xs"
            >
              Verify Whitelisting
            </button>
          </form>
        </div>

        <button
          onClick={() => {
            setVerdictType('none');
            setPayeeName('');
            setIban('');
          }}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 py-2.5 transition-colors"
        >
          Cancel Registration
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: HARD CHALLENGE
  // ---------------------------------------------------------
  if (verdictType === 'hard') {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 animate-fade-in">
        <div className="my-auto space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-orange-950/40 border border-orange-500/50 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6 text-orange-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 font-mono">Elevated Hard Challenge</h2>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Unrecognized device and network environment. Re-verify with MFA to complete whitelist registration.
            </p>
          </div>

          <form onSubmit={handleHardChallengeVerify} className="space-y-4">
            <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block font-mono">
                MFA One-Time Passcode (Hint: 888888)
              </label>
              <input
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                value={challengeOtp}
                onChange={(e) => setChallengeOtp(e.target.value)}
                placeholder="••••••"
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 font-mono text-center text-2xl tracking-widest py-3 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 outline-none transition-all placeholder-slate-700"
                required
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/30 p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-orange-500 text-slate-950 py-3 rounded-xl font-bold hover:bg-orange-400 active:scale-[0.98] transition-all cursor-pointer text-xs"
            >
              Verify OTP
            </button>
          </form>
        </div>

        <button
          onClick={() => {
            setVerdictType('none');
            setPayeeName('');
            setIban('');
          }}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 py-2.5 transition-colors"
        >
          Cancel Registration
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: STANDARD FORM
  // ---------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col p-5 space-y-6 animate-slide-up">
      {/* Top Navbar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/app/bank/home')}
          className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-100">Add Payee</h1>
          <p className="text-[10px] text-slate-500 font-mono">SECURE ACCOUNT WHITELISTING</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          
          {/* Payee Name Field */}
          <div className="space-y-1.5">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block font-mono px-1">
              Full Legal Name
            </label>
            <input
              type="text"
              placeholder="e.g. Arben Hoxha"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 py-3 px-4 rounded-xl focus:border-indigo-500 outline-none transition-all text-xs"
              required
            />
          </div>

          {/* IBAN/Account Number */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono px-1">
              <span>Account Number (IBAN)</span>
              {activeAvgSpeed > 0 && (
                <span className="text-[9px] text-indigo-400 flex items-center gap-1">
                  Typing Speed: {activeAvgSpeed}ms/key
                </span>
              )}
            </div>
            
            <input
              ref={ibanInputRef}
              type="text"
              placeholder="ALxxxxxxxxxxxxxxxxxxxxxx"
              value={iban}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onChange={handleIbanChange}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 py-3.5 px-4 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all font-mono font-bold text-xs uppercase"
              required
            />
            <div className="flex justify-between items-center text-[9px] text-slate-600 font-mono">
              <span>Biometric Keystroke Analyzer</span>
              <span>Method: <strong className={cn(
                inputMethod === 'pasted' && "text-red-400",
                inputMethod === 'autofill' && "text-amber-400",
                inputMethod === 'typed' && "text-emerald-400"
              )}>{inputMethod.toUpperCase()}</strong></span>
            </div>
          </div>

          {/* Bank Select */}
          <div className="space-y-1.5">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block font-mono px-1">
              Beneficiary Bank Name
            </label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 py-3 px-4 rounded-xl focus:border-indigo-500 outline-none transition-all text-xs font-medium cursor-pointer font-sans"
              required
            >
              <option value="FiBank Albania">FiBank Albania</option>
              <option value="Raiffeisen Bank Albania">Raiffeisen Bank Albania</option>
              <option value="BKT (Banka Kombetare Tregtare)">BKT (Banka Kombetare Tregtare)</option>
              <option value="Credins Bank">Credins Bank</option>
              <option value="Intesa Sanpaolo Bank Albania">Intesa Sanpaolo Bank Albania</option>
            </select>
          </div>

          {errorMsg && (
            <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/30 p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white py-3.5 rounded-xl font-bold hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2 cursor-pointer mt-8"
        >
          {isSubmitting ? (
            <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              <span>Whitelist Account Profile</span>
              <Plus className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
