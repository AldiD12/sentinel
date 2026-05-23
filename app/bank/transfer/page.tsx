"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { buildEvent } from '@/lib/telemetry';
import { submitEvent } from '@/lib/mock-api';
import { ChevronLeft, AlertTriangle, ShieldCheck, ShieldAlert, Sparkles, Lock, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { USERS } from '@/lib/users';

const STARTING_BALANCES: Record<string, number> = {
  user_001: 2840.00,
  user_002: 1205.00,
  user_003: 8950.00,
};

export default function BankTransferPage() {
  const router = useRouter();
  const { userId, sessionId, sessionStartMs, precedingEvents, precedingAssessments, knownPayeesList, addAssessment, pushEvent } = useSession();
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

  // Computed available balance (mirrors home page logic)
  const availableBalance = (() => {
    const initial = STARTING_BALANCES[userId] ?? 1000;
    const deducted = precedingAssessments
      .filter(e => e.type === 'transfer' && e.verdict !== 'block' && e.amount !== undefined)
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
    return initial - deducted;
  })();

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

    // Balance guard — prevent overdraft
    const initialBalance = STARTING_BALANCES[userId] ?? 1000;
    const totalDeducted = precedingAssessments
      .filter(e => e.type === 'transfer' && e.verdict !== 'block' && e.amount !== undefined)
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const availableBalance = initialBalance - totalDeducted;
    if (amountNum > availableBalance) {
      setErrorMsg(`Insufficient funds. Available balance: €${availableBalance.toFixed(2)}`);
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
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50 animate-fade-in text-slate-800">
        <div className="my-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-8 h-8 text-emerald-600 animate-spin-once" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">Transfer Successful</h2>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider font-mono mt-1">
              FiBank Automated SWIFT Transfer
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-4.5 rounded-2xl text-left space-y-3 font-sans text-xs shadow-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium">Beneficiary Recipient:</span>
              <span className="text-slate-800 font-extrabold">{txDetails.payeeName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium">Amount Transferred:</span>
              <span className="text-emerald-600 font-extrabold">€{txDetails.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium">Transaction Reference:</span>
              <span className="text-[#0a3474] font-mono font-bold">{txDetails.txHash}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400 font-medium">SafeShield™ Status:</span>
              <span className="text-emerald-600 font-bold uppercase tracking-wider">Secured & Approved</span>
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
            <h2 className="text-xl font-extrabold text-[#d61827] tracking-tight">Transaction Suspended</h2>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed max-w-xs mx-auto">
              SafeShield™ Security Engine locked this wire transfer. Background telemetry flagged a critical anomaly in your typing velocity rhythm or session coordinates.
            </p>
          </div>

          <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl text-left space-y-2.5 font-sans text-xs text-slate-650 shadow-sm">
            <div className="font-bold border-b border-slate-200/80 pb-1.5 text-slate-700 flex justify-between">
              <span>Security Event Log</span>
              <span className="text-[#d61827]">SUSPENDED</span>
            </div>
            <div><strong>Event ID:</strong> 0xEC108_FRAUD_BLOCK</div>
            <div><strong>Anomalies:</strong> Suspicious keystroke input method / invalid biometric pattern</div>
            {txDetails && (
              <div className="border-t border-slate-250 pt-2 text-[10px] text-slate-400 space-y-1">
                <div>Target Recipient: {txDetails.payeeName}</div>
                <div>Wire Value: €{txDetails.amount.toFixed(2)}</div>
              </div>
            )}
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
  if (verdictType === 'soft' && txDetails) {
    const expectedPhrase = `I AUTHORIZE €${txDetails.amount}`;
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50 animate-fade-in text-slate-800">
        <div className="my-auto space-y-6">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Transfer Verification</h2>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">
                Unusual keyboard paste activity detected. Please type the transaction authorization phrase below to verify.
              </p>
            </div>
          </div>

          <form onSubmit={handleSoftChallengeVerify} className="space-y-4">
            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl text-center font-mono text-xs text-[#0a3474] select-all font-bold shadow-sm">
              {expectedPhrase}
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">
                Type the authorization phrase exactly (case-sensitive)
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
              Verify Wire Intention
            </button>
          </form>
        </div>

        <button
          onClick={() => {
            setVerdictType('none');
            setSelectedPayeeId('');
            setAmountStr('');
          }}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-650 transition-colors py-2 font-semibold"
        >
          Cancel Wire Transfer
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: HARD CHALLENGE
  // ---------------------------------------------------------
  if (verdictType === 'hard' && txDetails) {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50 animate-fade-in text-slate-800">
        <div className="my-auto space-y-6">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Advanced Authentication</h2>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">
                High transactional anomaly bounds triggered. Re-verify your identity with your 6-digit MFA OTP token.
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
              Verify Code
            </button>
          </form>
        </div>

        <button
          onClick={() => {
            setVerdictType('none');
            setSelectedPayeeId('');
            setAmountStr('');
          }}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-650 transition-colors py-2 font-semibold"
        >
          Cancel Wire Transfer
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: STANDARD TRANSFER FORM
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
          <h1 className="text-base font-extrabold text-slate-800">Send Money</h1>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider font-mono">SWIFT Wire Transfer Portal</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          
          {/* Select Payee Dropdown */}
          <div className="space-y-1.5">
            <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block px-1">
              Select Whitelisted Recipient
            </label>
            <select
              value={selectedPayeeId}
              onChange={(e) => setSelectedPayeeId(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-700 py-3.5 px-4 rounded-2xl focus:border-[#0a3474] focus:ring-2 focus:ring-[#0a3474]/10 outline-none transition-all text-xs font-semibold cursor-pointer shadow-sm"
              required
            >
              <option value="" disabled>-- Select Recipient --</option>
              {knownPayeesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="custom_payee">
                External Beneficiary / Temporary Whitelist Override
              </option>
            </select>
            {selectedPayeeId === 'custom_payee' && (
              <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-2.5 font-medium leading-relaxed">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-amber-600" />
                <span>External accounts violate baseline beneficiary white-lists and trigger elevated SafeShield™ risk scores automatically.</span>
              </div>
            )}
          </div>

          {/* Available Balance Chip */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <Wallet className="w-4 h-4 text-[#0a3474] shrink-0" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Available Balance</span>
            <span className={cn(
              "ml-auto text-sm font-black font-mono",
              availableBalance <= 0 ? "text-[#d61827]" : "text-[#0a3474]"
            )}>
              €{availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Amount Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-wider px-1">
              <span>Transfer Amount</span>
              {activeAvgSpeed > 0 && (
                <span className="text-[9px] text-[#0a3474] flex items-center gap-1 font-mono normal-case">
                  Cadence Speed: {activeAvgSpeed}ms
                </span>
              )}
            </div>
            
            <div className="relative">
              <span className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-base select-none">
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
                className="w-full bg-white border border-slate-200 text-slate-800 py-3.5 pl-9 pr-4 rounded-2xl focus:border-[#0a3474] focus:ring-2 focus:ring-[#0a3474]/10 outline-none transition-all font-mono font-bold text-sm shadow-sm"
                required
              />
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono px-1">
              <span>Biometric Keystroke Diagnostic</span>
              <span>Method: <strong className={cn(
                inputMethod === 'pasted' && "text-[#d61827]",
                inputMethod === 'autofill' && "text-amber-500",
                inputMethod === 'typed' && "text-emerald-500"
              )}>{inputMethod.toUpperCase()}</strong></span>
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block px-1">
              Payment Description
            </label>
            <input
              type="text"
              placeholder="e.g. Professional Services / Rent Payment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 py-3.5 px-4 rounded-2xl focus:border-[#0a3474] focus:ring-2 focus:ring-[#0a3474]/10 outline-none transition-all text-xs shadow-sm"
            />
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
            <span>Authorize Wire Transfer</span>
          )}
        </button>
      </form>
    </div>
  );
}
