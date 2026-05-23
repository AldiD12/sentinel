"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { buildEvent } from '@/lib/telemetry';
import { submitEvent } from '@/lib/mock-api';
import { ChevronLeft, Plus, AlertTriangle, ShieldCheck, ShieldAlert, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BankAddPayeePage() {
  const router = useRouter();
  const { userId, sessionId, sessionStartMs, precedingEvents, addAssessment, pushEvent, addLocalPayee } = useSession();
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
      router.push('/bank');
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

    const dummyPayeeId = 'payee_user_' + Math.random().toString(36).substring(2, 8);

    try {
      // Build high fidelity event payload
      const event = buildEvent(
        'add_payee',
        userId,
        sessionId,
        sessionStartMs,
        precedingEvents,
        {
          payeeId: dummyPayeeId,
          payeeName,
          typingSpeedMs: avgTypingSpeed,
          inputMethod,
        } as any
      );

      // Execute security assessment
      const assessment = await submitEvent(event);
      addAssessment(event as any, assessment);
      pushEvent('add_payee');

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
      const dummyPayeeId = 'payee_user_' + Math.random().toString(36).substring(2, 8);
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
      const dummyPayeeId = 'payee_user_' + Math.random().toString(36).substring(2, 8);
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
  // ---------------------------------------------------------
  // RENDER: SUCCESS SCREEN
  // ---------------------------------------------------------
  if (verdictType === 'success') {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50 animate-fade-in text-slate-800">
        <div className="my-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-8 h-8 text-emerald-600 animate-spin-once" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">Beneficiary Whitelisted</h2>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider font-mono mt-1">
              FiBank Smart Shield Registration
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-4.5 rounded-2xl text-left space-y-3 font-sans text-xs shadow-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium">Beneficiary Name:</span>
              <span className="text-slate-800 font-extrabold">{payeeName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium">IBAN / Account Number:</span>
              <span className="text-[#0a3474] font-mono font-bold">{iban.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400 font-medium">SafeShield™ Risk Verdict:</span>
              <span className="text-emerald-600 font-bold uppercase tracking-wider">Secure Whitelisted</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push('/bank/home')}
          className="w-full bg-[#0a3474] text-white py-3.5 rounded-2xl text-xs font-bold hover:bg-[#072450] active:scale-[0.98] transition-all cursor-pointer shadow-md"
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
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50 animate-fade-in text-slate-800">
        <div className="my-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-100 border border-red-300 flex items-center justify-center mx-auto shadow-md">
            <ShieldAlert className="w-8 h-8 text-[#d61827]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#d61827] tracking-tight">Registration Blocked</h2>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed max-w-xs mx-auto">
              FiBank SafeShield™ locked beneficiary whitelisting permissions. Behavioral dynamics during IBAN account number entry matched programmatical automated pasting rhythms.
            </p>
          </div>

          <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl text-left space-y-2.5 font-sans text-xs text-slate-650 shadow-sm">
            <div className="font-bold border-b border-slate-200/80 pb-1.5 text-slate-700 flex justify-between">
              <span>Security Event Log</span>
              <span className="text-[#d61827]">BLOCKED</span>
            </div>
            <div><strong>Event ID:</strong> 0xEC109_WHITELIST_LOCK</div>
            <div><strong>Anomalies:</strong> Paste event cadence violation / suspicious input device</div>
          </div>
        </div>

        <button
          onClick={() => router.push('/bank/home')}
          className="w-full bg-[#0a3474] text-white py-3.5 rounded-2xl text-xs font-bold hover:bg-[#072450] active:scale-[0.98] transition-all cursor-pointer shadow-md"
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
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50 animate-fade-in text-slate-800">
        <div className="my-auto space-y-6">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Whitelist Verification</h2>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">
                Paste event detected on the secure IBAN field. Please type the whitelist verification phrase below to confirm.
              </p>
            </div>
          </div>

          <form onSubmit={handleSoftChallengeVerify} className="space-y-4">
            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl text-center font-mono text-xs text-[#0a3474] select-all font-bold shadow-sm">
              {expectedPhrase}
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">
                Type the phrase exactly (case-sensitive)
              </label>
              <input
                type="text"
                value={challengeInput}
                onChange={(e) => setChallengeInput(e.target.value)}
                placeholder="Type here..."
                className="w-full bg-white border border-slate-200 text-slate-800 py-3.5 px-4 rounded-2xl focus:border-[#0a3474] focus:ring-2 focus:ring-[#0a3474]/10 outline-none transition-all text-xs"
                required
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="text-[#d61827] text-xs bg-red-50 border border-red-150 p-3.5 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#0a3474] text-white py-3.5 rounded-2xl text-xs font-bold hover:bg-[#072450] active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              Verify Beneficiary Registration
            </button>
          </form>
        </div>

        <button
          onClick={() => {
            setVerdictType('none');
            setPayeeName('');
            setIban('');
          }}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-650 transition-colors py-2 font-semibold"
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
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50 animate-fade-in text-slate-800">
        <div className="my-auto space-y-6">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Whitelist Authorization</h2>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">
                Unrecognized network coordinates and device tokens flagged. Please verify with your 6-digit MFA OTP token.
              </p>
            </div>
          </div>

          <form onSubmit={handleHardChallengeVerify} className="space-y-4">
            <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">
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
                className="w-full bg-white border border-slate-200 text-slate-800 text-center text-2xl tracking-widest py-3.5 rounded-2xl focus:border-[#0a3474] focus:ring-2 focus:ring-[#0a3474]/10 outline-none transition-all placeholder-slate-300 font-bold"
                required
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="text-[#d61827] text-xs bg-red-50 border border-red-150 p-3.5 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#0a3474] text-white py-3.5 rounded-2xl text-xs font-bold hover:bg-[#072450] active:scale-[0.98] transition-all cursor-pointer shadow-md"
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
          className="w-full text-center text-xs text-slate-400 hover:text-slate-650 transition-colors py-2 font-semibold"
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
    <div className="flex-1 flex flex-col p-5 space-y-6 animate-slide-up bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/bank/home')}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-[#0a3474] transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-extrabold text-slate-800">Add Payee</h1>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider font-mono">Secure Beneficiary Whitelisting</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          
          {/* Payee Name Field */}
          <div className="space-y-1.5">
            <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block px-1">
              Full Legal Name
            </label>
            <input
              type="text"
              placeholder="e.g. Arben Hoxha"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-850 py-3.5 px-4 rounded-2xl focus:border-[#0a3474] focus:ring-2 focus:ring-[#0a3474]/10 outline-none transition-all text-xs shadow-sm"
              required
            />
          </div>

          {/* IBAN/Account Number */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-wider px-1">
              <span>Account Number (IBAN)</span>
              {activeAvgSpeed > 0 && (
                <span className="text-[9px] text-[#0a3474] flex items-center gap-1 font-mono normal-case">
                  Cadence Speed: {activeAvgSpeed}ms
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
              className="w-full bg-white border border-slate-200 text-slate-850 py-3.5 px-4 rounded-2xl focus:border-[#0a3474] focus:ring-2 focus:ring-[#0a3474]/10 outline-none transition-all font-mono font-bold text-xs uppercase shadow-sm"
              required
            />
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono px-1">
              <span>Biometric Keystroke Cadence</span>
              <span>Method: <strong className={cn(
                inputMethod === 'pasted' && "text-[#d61827]",
                inputMethod === 'autofill' && "text-amber-500",
                inputMethod === 'typed' && "text-emerald-500"
              )}>{inputMethod.toUpperCase()}</strong></span>
            </div>
          </div>

          {/* Bank Select */}
          <div className="space-y-1.5">
            <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block px-1">
              Beneficiary Bank Name
            </label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-700 py-3.5 px-4 rounded-2xl focus:border-[#0a3474] focus:ring-2 focus:ring-[#0a3474]/10 outline-none transition-all text-xs font-semibold cursor-pointer shadow-sm"
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
            <div className="text-[#d61827] text-xs bg-red-50 border border-red-150 p-3.5 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#0a3474] text-white py-4 rounded-2xl text-xs font-bold hover:bg-[#072450] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2 cursor-pointer mt-8 shadow-md"
        >
          {isSubmitting ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <span>Whitelist Beneficiary Profile</span>
          )}
        </button>
      </form>
    </div>
  );
}
