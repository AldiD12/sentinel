"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { buildEvent } from '@/lib/telemetry';
import { submitEvent } from '@/lib/mock-api';
import { ChevronLeft, AlertTriangle, ShieldCheck, ShieldAlert, Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BankTransferPage() {
  const router = useRouter();
  const { userId, sessionId, sessionStartMs, precedingEvents, knownPayeesList, addAssessment, pushEvent } = useSession();
  const [mounted, setMounted] = useState(false);

  // Form states
  const [selectedPayeeId, setSelectedPayeeId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');

  // Telemetry states
  const [keystrokeDelays, setKeystrokeDelays] = useState<number[]>([]);
  const [lastKeyPressTime, setLastKeyPressTime] = useState<number>(0);
  const [inputMethod, setInputMethod] = useState<'typed' | 'pasted' | 'autofill'>('typed');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verdict response screens
  const [verdictType, setVerdictType] = useState<'none' | 'success' | 'soft' | 'hard' | 'block'>('none');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txDetails, setTxDetails] = useState<{ amount: number; payeeName: string; txHash: string } | null>(null);

  // Challenge responses
  const [challengeInput, setChallengeInput] = useState('');
  const [challengeOtp, setChallengeOtp] = useState('');
  const [challengeAttempts, setChallengeAttempts] = useState(0);

  // Focus ref for typing telemetry
  const amountInputRef = useRef<HTMLInputElement>(null);

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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountStr(e.target.value);
    if (e.target.value.length > 1 && keystrokeDelays.length === 0 && lastKeyPressTime === 0) {
      setInputMethod('autofill');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayeeId || !amountStr || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const amountNum = parseFloat(amountStr);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please specify a positive transfer amount.');
      setIsSubmitting(false);
      return;
    }

    // Find payee name
    let payeeName = 'Custom Recipient';
    const payeeIsNew = selectedPayeeId === 'custom_payee';
    if (payeeIsNew) {
      payeeName = 'External IBAN Transfer';
    } else {
      const p = knownPayeesList.find(item => item.id === selectedPayeeId);
      if (p) payeeName = p.name;
    }

    // Calculate typing delays
    const avgTypingSpeed = keystrokeDelays.length > 0
      ? Math.round(keystrokeDelays.reduce((a, b) => a + b, 0) / keystrokeDelays.length)
      : undefined;

    const payeeId = payeeIsNew ? 'external_acc_' + Math.random().toString(36).substring(2, 8) : selectedPayeeId;

    try {
      // Build high-fidelity event payload
      const event = buildEvent(
        'transfer',
        userId,
        sessionId,
        sessionStartMs,
        precedingEvents,
        {
          amount: amountNum,
          payeeId,
          payeeName,
          isKnownPayee: !payeeIsNew,
          typingSpeedMs: avgTypingSpeed,
          inputMethod,
          payeeIsNew
        } as any
      );

      // Execute security assessment
      const assessment = await submitEvent(event);
      addAssessment(event as any, assessment);
      pushEvent('transfer');

      setTxDetails({
        amount: amountNum,
        payeeName,
        txHash: 'TXN-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4),
      });

      // Handle risk verdicts
      if (assessment.verdict === 'block') {
        setVerdictType('block');
      } else if (assessment.verdict === 'soft_challenge') {
        setVerdictType('soft');
      } else if (assessment.verdict === 'hard_challenge') {
        setVerdictType('hard');
      } else {
        // Direct success
        setVerdictType('success');
      }
      setIsSubmitting(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Wire transfer initiation failed.');
      setIsSubmitting(false);
    }
  };

  // Challenge processing
  const handleSoftChallengeVerify = (e: React.FormEvent) => {
    e.preventDefault();
    // Verify soft check: User typing matching authorization phrase
    const expected = `I AUTHORIZE €${txDetails?.amount}`;
    if (challengeInput.trim().toUpperCase() === expected) {
      // Success, route to success screen
      setVerdictType('success');
    } else {
      setChallengeAttempts(prev => prev + 1);
      if (challengeAttempts >= 1) {
        setVerdictType('block');
      } else {
        setErrorMsg('Authorization text does not match. Case-sensitive. 1 attempt remaining.');
      }
    }
  };

  const handleHardChallengeVerify = (e: React.FormEvent) => {
    e.preventDefault();
    // Verify hard MFA PIN (Hint: 888888)
    if (challengeOtp === '888888') {
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
  if (verdictType === 'success' && txDetails) {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-900 animate-fade-in">
        <div className="my-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/60 animate-spin-once">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 font-sans">Transfer Successful</h2>
            <p className="text-slate-400 text-xs mt-1.5 font-mono uppercase tracking-wider">
              SWIFT SECURE BANKING WIRE
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl text-left space-y-3 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">RECIPIENT:</span>
              <span className="text-slate-200 font-bold">{txDetails.payeeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">AMOUNT TRANSFERRED:</span>
              <span className="text-emerald-400 font-bold">€{txDetails.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-900 pt-2 text-[10px]">
              <span className="text-slate-500">TXN REFERENCE:</span>
              <span className="text-indigo-400">{txDetails.txHash}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">SENTINEL RISK VERDICT:</span>
              <span className="text-emerald-400 font-semibold uppercase">SECURE_ALLOW</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push('/bank/home')}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer text-sm"
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
            <h2 className="text-xl font-bold text-red-400 font-mono tracking-tight uppercase">TRANSFER SUSPENDED</h2>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              FiBank Sentinel locked this transaction. Behavioral signals triggered safety interlocks to prevent unauthorized asset draining.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl text-left space-y-2.5 font-mono text-[11px] text-red-300">
            <div><strong className="text-red-400">ENGINE_CODE:</strong> 0xEC108_FRAUD_BLOCK</div>
            <div><strong className="text-red-400">REASON:</strong> Spoofed network coordinates or copy-pasted values violating standard keyboard cadence.</div>
            {txDetails && (
              <div className="border-t border-red-950 pt-2 text-[10px] text-slate-500 space-y-1">
                <div>TARGET: {txDetails.payeeName}</div>
                <div>VALUE: €{txDetails.amount.toFixed(2)}</div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => router.push('/bank/home')}
          className="w-full bg-red-900/30 text-red-300 border border-red-800/80 py-3.5 rounded-xl font-semibold hover:bg-red-900/50 hover:text-white transition-all cursor-pointer text-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: SOFT CHALLENGE
  // ---------------------------------------------------------
  if (verdictType === 'soft' && txDetails) {
    const expectedPhrase = `I AUTHORIZE €${txDetails.amount}`;
    return (
      <div className="flex-1 flex flex-col justify-between p-6 animate-fade-in">
        <div className="my-auto space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-amber-950/40 border border-amber-500/50 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 font-mono">Soft Behavioral Challenge</h2>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Unusual keyboard input method detected. Please type the authorization phrase below to prove human intent.
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
              Verify Transfer Intention
            </button>
          </form>
        </div>

        <button
          onClick={() => {
            setVerdictType('none');
            setSelectedPayeeId('');
            setAmountStr('');
          }}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 py-2.5 transition-colors"
        >
          Cancel Transfer
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: HARD CHALLENGE
  // ---------------------------------------------------------
  if (verdictType === 'hard' && txDetails) {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 animate-fade-in">
        <div className="my-auto space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-orange-950/40 border border-orange-500/50 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6 text-orange-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 font-mono">Elevated Hard Challenge</h2>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              High transactional anomalies flagged (unknown payee and massive transfer amount bounds). Re-verify with MFA.
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
            setSelectedPayeeId('');
            setAmountStr('');
          }}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 py-2.5 transition-colors"
        >
          Cancel Transfer
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: STANDARD TRANSFER FORM
  // ---------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col p-5 space-y-6 animate-slide-up">
      {/* Top Navbar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/bank/home')}
          className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-100">Send Money</h1>
          <p className="text-[10px] text-slate-500 font-mono">SECURE INTERNET TRANSFER</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          
          {/* Select Payee Dropdown */}
          <div className="space-y-1.5">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block font-mono px-1">
              Select Whitelisted Recipient
            </label>
            <select
              value={selectedPayeeId}
              onChange={(e) => setSelectedPayeeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 py-3 px-4 rounded-xl focus:border-indigo-500 outline-none transition-all text-xs font-medium cursor-pointer"
              required
            >
              <option value="" disabled>-- Select Recipient --</option>
              {knownPayeesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="custom_payee">
                External Acc / Whitelisting Override
              </option>
            </select>
            {selectedPayeeId === 'custom_payee' && (
              <div className="text-[10px] text-amber-500 bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg flex gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>External transfers violate whitelists and trigger high transaction-layer anomalies automatically.</span>
              </div>
            )}
          </div>

          {/* Amount Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono px-1">
              <span>Transfer Amount (€)</span>
              {activeAvgSpeed > 0 && (
                <span className="text-[9px] text-indigo-400 flex items-center gap-1">
                  Typing Speed: {activeAvgSpeed}ms/key
                </span>
              )}
            </div>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-base select-none">
                €
              </span>
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountStr}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onChange={handleAmountChange}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 py-3.5 pl-9 pr-4 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all font-mono font-bold"
                required
              />
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-600 font-mono">
              <span>Cadence Telemetry Engine</span>
              <span>Method: <strong className={cn(
                inputMethod === 'pasted' && "text-red-400",
                inputMethod === 'autofill' && "text-amber-400",
                inputMethod === 'typed' && "text-emerald-400"
              )}>{inputMethod.toUpperCase()}</strong></span>
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block font-mono px-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Rent Payment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 py-3 px-4 rounded-xl focus:border-indigo-500 outline-none transition-all text-xs"
            />
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
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white py-3.5 rounded-xl font-bold hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2 cursor-pointer mt-8 text-sm"
        >
          {isSubmitting ? (
            <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              <span>Authorize Secured Transfer</span>
              <Sparkles className="w-4 h-4 text-indigo-200" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
