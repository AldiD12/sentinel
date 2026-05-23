"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { buildEvent } from '@/lib/telemetry';
import { submitEvent } from '@/lib/mock-api';
import { USERS } from '@/lib/users';
import { Shield, KeyRound, Monitor, Smartphone, Laptop, AlertTriangle, Fingerprint, Lock, ShieldAlert, CheckCircle, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BankLoginPage() {
  const router = useRouter();
  const { setUser, sessionId, sessionStartMs, precedingEvents, addAssessment, pushEvent } = useSession();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  
  // Telemetry collection states
  const [keystrokeDelays, setKeystrokeDelays] = useState<number[]>([]);
  const [lastKeyPressTime, setLastKeyPressTime] = useState<number>(0);
  const [inputMethod, setInputMethod] = useState<'typed' | 'pasted' | 'autofill'>('typed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [securityBlock, setSecurityBlock] = useState(false);

  // Challenge variables for MFA
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeCode, setChallengeCode] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [challengeAttempts, setChallengeAttempts] = useState(0);

  // Focus ref for telemetry input
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectUser = (uid: string) => {
    setUser(uid);
    setSelectedUser(uid);
    setPassword('');
    setKeystrokeDelays([]);
    setLastKeyPressTime(0);
    setInputMethod('typed');
    setErrorMsg(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (e.target.value.length > 1 && keystrokeDelays.length === 0 && lastKeyPressTime === 0) {
      setInputMethod('autofill');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const avgTypingSpeed = keystrokeDelays.length > 0 
      ? Math.round(keystrokeDelays.reduce((a, b) => a + b, 0) / keystrokeDelays.length)
      : undefined;

    try {
      const event = buildEvent(
        'login',
        selectedUser,
        sessionId,
        sessionStartMs,
        precedingEvents,
        {
          inputMethod,
          typingSpeedMs: avgTypingSpeed,
        }
      );

      const assessment = await submitEvent(event);
      addAssessment(event as any, assessment);
      pushEvent('login');

      if (assessment.verdict === 'block') {
        setSecurityBlock(true);
        setIsSubmitting(false);
      } else if (assessment.verdict === 'soft_challenge' || assessment.verdict === 'hard_challenge') {
        setPendingUserId(selectedUser);
        setShowChallenge(true);
        setIsSubmitting(false);
      } else {
        router.push('/bank/home');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login authentication failed.');
      setIsSubmitting(false);
    }
  };

  const handleChallengeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (challengeCode === '1234') {
      router.push('/bank/home');
    } else {
      setChallengeAttempts(prev => prev + 1);
      if (challengeAttempts >= 1) {
        setSecurityBlock(true);
        setShowChallenge(false);
      } else {
        setErrorMsg('Invalid verification code. 1 attempt remaining.');
      }
    }
  };

  const getDeviceIcon = (deviceStr: string) => {
    if (deviceStr.includes('iphone') || deviceStr.includes('samsung')) return <Smartphone className="w-3.5 h-3.5" />;
    if (deviceStr.includes('macbook')) return <Laptop className="w-3.5 h-3.5" />;
    return <Monitor className="w-3.5 h-3.5" />;
  };

  const activeAvgSpeed = keystrokeDelays.length > 0 
    ? Math.round(keystrokeDelays.reduce((a, b) => a + b, 0) / keystrokeDelays.length)
    : 0;

  // Render blocked interface
  if (securityBlock) {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50 animate-fade-in text-slate-800">
        <div className="my-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-100 border border-red-300 flex items-center justify-center mx-auto shadow-md">
            <ShieldAlert className="w-8 h-8 text-[#d61827]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#d61827] tracking-tight">Access Suspended</h1>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed max-w-xs mx-auto">
              Our automated fraud detection engine, **FiBank SafeShield™**, has temporarily locked this session due to abnormal security coordinates or unrecognized typing signatures.
            </p>
          </div>
          
          <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl text-left font-sans text-xs space-y-2 text-slate-600">
            <div className="flex justify-between border-b border-slate-200/60 pb-1.5 font-semibold text-slate-700">
              <span>Security Event Log</span>
              <span className="text-[#d61827]">BLOCKED</span>
            </div>
            <div><strong>Protocol Status:</strong> Suspended (0xEB-91)</div>
            <div><strong>Decision:</strong> Identity verification required</div>
            <div><strong>Anomalies:</strong> Suspicious user metadata cadence signature</div>
          </div>
        </div>

        <button
          onClick={() => {
            setSecurityBlock(false);
            setSelectedUser(null);
            setErrorMsg(null);
          }}
          className="w-full bg-[#0a3474] text-white py-3.5 rounded-2xl text-xs font-bold hover:bg-[#072450] active:scale-[0.98] transition-all cursor-pointer shadow-md"
        >
          Reset Session & Retry
        </button>
      </div>
    );
  }

  // Render soft/hard challenge interface
  if (showChallenge) {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50 animate-fade-in text-slate-800">
        <div className="my-auto space-y-6">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Behavioral Verification</h2>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">
                SafeShield™ flagged an unfamiliar typing speed rhythm or device context. Please enter the secondary verification PIN.
              </p>
            </div>
          </div>

          <form onSubmit={handleChallengeSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">
                Secondary SMS / PIN Code (Hint: 1234)
              </label>
              <input
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
                value={challengeCode}
                onChange={(e) => setChallengeCode(e.target.value)}
                placeholder="••••"
                className="w-full bg-white border border-slate-200 text-slate-800 text-center text-2xl tracking-widest py-3.5 rounded-2xl focus:border-[#0a3474] focus:ring-2 focus:ring-[#0a3474]/10 outline-none transition-all placeholder-slate-300 font-bold"
                required
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="text-[#d61827] text-xs bg-red-50 border border-red-150 p-3.5 rounded-xl flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#0a3474] text-white py-3.5 rounded-2xl text-xs font-bold hover:bg-[#072450] active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              Verify Identity
            </button>
            
            <button
              type="button"
              onClick={() => {
                setShowChallenge(false);
                setSelectedUser(null);
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-1 font-semibold"
            >
              Cancel & Back to Accounts
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50 animate-fade-in text-slate-800">
      {/* Premium Bank Header */}
      <div className="text-center mt-6 space-y-4">
        {/* Fibank Styled Corporate Logo */}
        <div className="flex flex-col items-center justify-center space-y-2 select-none">
          <div className="flex items-center gap-2">
            {/* Elegant Diamond Grid Shape representing the Fibank Logo */}
            <div className="grid grid-cols-2 gap-[2px] rotate-45 w-6 h-6 border-2 border-[#0a3474] p-[2px] rounded-sm shrink-0">
              <div className="bg-[#0a3474] rounded-[1px]" />
              <div className="bg-[#d61827] rounded-[1px]" />
              <div className="bg-[#0a3474] rounded-[1px]" />
              <div className="bg-[#0a3474] rounded-[1px]" />
            </div>
            <span className="text-2xl font-black text-[#0a3474] tracking-tight font-sans">
              Fibank
            </span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
            First Investment Bank
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-500 text-[9px] font-bold tracking-wider uppercase font-mono mt-2">
          <Shield className="w-3 h-3 text-[#0a3474]" />
          <span>SafeShield™ Secure Link Active</span>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="my-auto py-6">
        {!selectedUser ? (
          <div className="space-y-4">
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block text-center mb-1">
              Select Customer Account
            </div>
            
            <div className="grid gap-3">
              {Object.values(USERS).map((user) => (
                <button
                  key={user.userId}
                  onClick={() => handleSelectUser(user.userId)}
                  className="group w-full bg-white border border-slate-200 hover:border-[#0a3474]/50 hover:bg-[#0a3474]/5 p-4 rounded-2xl flex items-center justify-between text-left transition-all duration-300 hover:shadow-md active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 group-hover:border-[#0a3474]/30 flex items-center justify-center text-xs font-bold text-[#0a3474] group-hover:bg-[#0a3474] group-hover:text-white transition-all">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-800 group-hover:text-[#0a3474] transition-colors">{user.name}</div>
                      <div className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono uppercase tracking-wider">
                        {getDeviceIcon(user.usualDevices[0])}
                        <span>{user.usualDevices[0].replace('fp_', '').replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[9px] text-slate-400 font-mono group-hover:text-slate-500 transition-colors">
                    <div>{user.usualCountry} BASELINE</div>
                    <div className="text-[#0a3474]/70 font-semibold">{user.usualIPs[0]}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-slide-up">
            {/* Selected User Account Banner */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0a3474]/10 flex items-center justify-center text-xs font-bold text-[#0a3474]">
                  {USERS[selectedUser].name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">SIGNING IN AS</div>
                  <div className="text-xs font-extrabold text-slate-800 leading-tight">{USERS[selectedUser].name}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-[9px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Change
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-wider px-1">
                  <span>Enter Password</span>
                  {activeAvgSpeed > 0 && (
                    <span className="text-[9px] text-[#0a3474] flex items-center gap-1 font-mono normal-case">
                      <Fingerprint className="w-3 h-3" />
                      Cadence: {activeAvgSpeed}ms
                    </span>
                  )}
                </div>
                
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="password"
                    value={password}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    className="w-full bg-white border border-slate-200 text-slate-800 py-3.5 pl-4 pr-10 rounded-2xl focus:border-[#0a3474] focus:ring-2 focus:ring-[#0a3474]/10 outline-none transition-all placeholder-slate-300"
                    required
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono mt-1 px-1">
                  <span>Keyboard Diagnostics</span>
                  <span>Method: <strong className={cn(
                    inputMethod === 'pasted' && "text-[#d61827]",
                    inputMethod === 'autofill' && "text-amber-500",
                    inputMethod === 'typed' && "text-emerald-500"
                  )}>{inputMethod.toUpperCase()}</strong></span>
                </div>
              </div>

              {errorMsg && (
                <div className="text-[#d61827] text-xs bg-red-50 border border-red-150 p-3.5 rounded-xl flex items-center gap-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0a3474] text-white py-3.5 rounded-2xl text-xs font-bold hover:bg-[#072450] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2 cursor-pointer mt-3 shadow-md"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <span>Secure Sign In</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Corporate Footer */}
      <div className="text-center text-[8px] text-slate-400 font-mono leading-normal border-t border-slate-200/60 pt-4 mt-4 select-none">
        <div>ENCRYPTED SSL SESSION // SECURE ROUTING GATEWAY</div>
        <div className="text-slate-450 mt-0.5">© FIBANK ALBANIA SH.A. ALL RIGHTS RESERVED.</div>
      </div>
    </div>
  );
}
