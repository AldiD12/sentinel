"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './SessionContext';
import { USERS } from '@/lib/users';
import { Shield, KeyRound, Monitor, Smartphone, Laptop, AlertTriangle, Fingerprint, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BankLoginPage() {
  const router = useRouter();
  const { login, logout, userId: activeUserId } = useSession();
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

  // Clear previous session when loading the login screen
  useEffect(() => {
    logout();
  }, []);

  const handleSelectUser = (uid: string) => {
    setSelectedUser(uid);
    setPassword('');
    setKeystrokeDelays([]);
    setLastKeyPressTime(0);
    setInputMethod('typed');
    setErrorMsg(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ignore control keys
    if (e.key === 'Backspace' || e.key === 'Enter' || e.key === 'Tab' || e.key === 'Shift') {
      return;
    }
    
    const now = Date.now();
    if (lastKeyPressTime > 0) {
      const delay = now - lastKeyPressTime;
      // Filter out abnormally long pauses (e.g., > 2000ms) to keep typing statistics accurate
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
    // If the input value changes by more than one character without recent keypresses, it's likely autofill
    if (e.target.value.length > 1 && keystrokeDelays.length === 0 && lastKeyPressTime === 0) {
      setInputMethod('autofill');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    // Calculate typing speed biometric
    const avgTypingSpeed = keystrokeDelays.length > 0 
      ? Math.round(keystrokeDelays.reduce((a, b) => a + b, 0) / keystrokeDelays.length)
      : undefined;

    try {
      // Execute the login call
      const assessment = await login(selectedUser, {
        // Feed custom biometric stats to the engine
      });

      // Assess detection engine verdict
      if (assessment.verdict === 'block') {
        setSecurityBlock(true);
        setIsSubmitting(false);
      } else if (assessment.verdict === 'soft_challenge' || assessment.verdict === 'hard_challenge') {
        // Trigger verification challenge
        setPendingUserId(selectedUser);
        setShowChallenge(true);
        setIsSubmitting(false);
      } else {
        // Access granted
        router.push('/app/bank/home');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login authentication failed.');
      setIsSubmitting(false);
    }
  };

  const handleChallengeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (challengeCode === '1234') {
      // Correct verification code, route to home
      router.push('/app/bank/home');
    } else {
      setChallengeAttempts(prev => prev + 1);
      if (challengeAttempts >= 1) {
        // Block after 2 failed attempts as a "fortress" architecture defense
        setSecurityBlock(true);
        setShowChallenge(false);
      } else {
        setErrorMsg('Invalid authentication code. 1 attempt remaining.');
      }
    }
  };

  // Helper for UI icons of devices
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-red-950/20 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-red-950/80 border border-red-500 flex items-center justify-center mb-6 shadow-lg shadow-red-950/60 animate-bounce">
          <ShieldAlert className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-red-400 mb-2 font-mono tracking-tight">ACCESS BLOCKED</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          The Sentinel Detection Engine has flagged this login attempt as high risk (threat indicator: abnormal behavioral typing rhythms or unrecognized network credentials).
        </p>
        <div className="w-full bg-slate-950/60 border border-red-900/30 p-4 rounded-xl text-left font-mono text-xs text-red-300 space-y-2 mb-8">
          <div><strong className="text-red-400">ENGINE_STATUS:</strong> TERMINATED</div>
          <div><strong className="text-red-400">DECISION:</strong> HIGH_CONFIDENCE_MALICIOUS</div>
          <div><strong className="text-red-400">DETAILS:</strong> Suspicious keystroke biometrics or spoofed fingerprint headers.</div>
        </div>
        <button
          onClick={() => {
            setSecurityBlock(false);
            setSelectedUser(null);
            setErrorMsg(null);
          }}
          className="w-full bg-red-900/40 text-red-200 border border-red-800/80 py-3 rounded-xl text-sm font-semibold hover:bg-red-900/60 hover:text-white transition-all cursor-pointer"
        >
          Reset Session
        </button>
      </div>
    );
  }

  // Render soft/hard challenge interface
  if (showChallenge) {
    return (
      <div className="flex-1 flex flex-col justify-center p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-amber-950/40 border border-amber-500/50 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 font-mono">Behavioral Challenge</h2>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            Sentinel detected anomalous behavioral signatures (unusual network provider or device). Re-verify identity.
          </p>
        </div>

        <form onSubmit={handleChallengeSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block font-mono">
              Secondary MFA PIN (Hint: 1234)
            </label>
            <input
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={4}
              value={challengeCode}
              onChange={(e) => setChallengeCode(e.target.value)}
              placeholder="••••"
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 font-mono text-center text-2xl tracking-widest py-3 rounded-xl focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all placeholder-slate-700"
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
            className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            Verify Credentials
          </button>
          
          <button
            type="button"
            onClick={() => {
              setShowChallenge(false);
              setSelectedUser(null);
            }}
            className="w-full bg-slate-900/40 text-slate-400 py-2.5 rounded-xl text-xs hover:bg-slate-900 hover:text-slate-200 transition-colors"
          >
            Back to User Profiles
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-indigo-900/30 text-indigo-400 text-[10px] font-semibold tracking-wider uppercase font-mono mb-4">
          <Shield className="w-3.5 h-3.5 animate-spin-slow" />
          <span>Sentinel Core Active</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-1.5 font-sans">
          FiBank <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-sky-400 bg-clip-text text-transparent font-medium">Sentinel</span>
        </h1>
        <p className="text-slate-400 text-xs mt-1.5 font-mono select-none">
          SECURE PORTAL — CLIENT INTERACTION ENGINE
        </p>
      </div>

      {/* Main Area */}
      <div className="my-auto py-8">
        {!selectedUser ? (
          <div className="space-y-4">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider block font-mono text-center mb-1">
              Select User Baseline Profile
            </div>
            
            <div className="grid gap-3">
              {Object.values(USERS).map((user) => (
                <button
                  key={user.userId}
                  onClick={() => handleSelectUser(user.userId)}
                  className="group w-full bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/15 p-4 rounded-2xl flex items-center justify-between text-left transition-all duration-300 hover:shadow-lg hover:shadow-indigo-950/10 active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-indigo-500/40 flex items-center justify-center text-sm font-bold text-slate-300 group-hover:text-indigo-400 group-hover:bg-slate-950 transition-all font-mono">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{user.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-mono">
                        {getDeviceIcon(user.usualDevices[0])}
                        <span>{user.usualDevices[0].replace('fp_', '').replace('_', ' ').toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 font-mono group-hover:text-slate-400 transition-colors">
                    <div>{user.usualCountry} / IP BASES</div>
                    <div className="text-[9px] text-indigo-400/70">{user.usualIPs[0]}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-slide-up">
            <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-950/50 border border-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-400 font-mono">
                  {USERS[selectedUser].name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-mono">LOGGING IN AS</div>
                  <div className="text-sm font-bold text-white leading-tight">{USERS[selectedUser].name}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-[10px] bg-slate-900 hover:bg-slate-850 text-slate-400 px-2 py-1 rounded-md transition-colors"
              >
                Change
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase tracking-wider block font-mono">
                  <span>Enter Account Password</span>
                  {activeAvgSpeed > 0 && (
                    <span className="text-[9px] text-indigo-400 flex items-center gap-1">
                      <Fingerprint className="w-3 h-3" />
                      Rhythm: {activeAvgSpeed}ms/key
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
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 py-3.5 pl-4 pr-10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all font-mono"
                    required
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600">
                    <KeyRound className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1">
                  <span>Standard Input Detection</span>
                  <span>Method: <strong className={cn(
                    inputMethod === 'pasted' && "text-red-400",
                    inputMethod === 'autofill' && "text-amber-400",
                    inputMethod === 'typed' && "text-emerald-400"
                  )}>{inputMethod.toUpperCase()}</strong></span>
                </div>
              </div>

              {errorMsg && (
                <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/30 p-3 rounded-lg flex items-center gap-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <span>Decrypt Secure Session</span>
                    <Sparkles className="w-4 h-4 text-indigo-200 group-hover:scale-110 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-600 font-mono leading-normal border-t border-slate-900 pt-4 mt-4">
        <div>ENCRYPTED SSL DATA NODE // SYSTEM BANK GATEWAY</div>
        <div className="text-[9px] text-slate-700 mt-0.5">© FIBANK ALBANIA SH.A. ALL SECURED RIGHTS RESERVED.</div>
      </div>
    </div>
  );
}
