"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, Skull, Globe, Activity, Wifi, AlertTriangle, Cpu, Layers, 
  Settings, Zap, RefreshCw, Play, CheckCircle, XCircle, Terminal, 
  ArrowLeft, Copy, Trash2, HelpCircle, Eye, EyeOff
} from 'lucide-react';
import { cn, safeUUID } from '@/lib/utils';
import { USERS } from '@/lib/users';
import { submitEvent } from '@/lib/mock-api';

interface TelemetryOverrides {
  ip: string;
  asn: string;
  geoCountry: string;
  geoCity: string;
  userAgent: string;
  deviceFingerprint: string;
  mouseMovementScore: number;
  typingSpeedMs: number;
  requestRateLastMinute: number;
  hasValidCSRF: boolean;
  inputMethod: 'typed' | 'pasted' | 'autofill';
}

const DEFAULT_OVERRIDES: TelemetryOverrides = {
  ip: '185.220.101.5',
  asn: 'AS9009 Tor Exit',
  geoCountry: 'RU',
  geoCity: 'Moscow',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)',
  deviceFingerprint: 'fp_unknown',
  mouseMovementScore: 90,
  typingSpeedMs: 165,
  requestRateLastMinute: 4,
  hasValidCSRF: true,
  inputMethod: 'typed'
};

interface LogEntry {
  id: string;
  timestamp: number;
  scenario: string;
  method: string;
  targetUser: string;
  payload: any;
  response?: {
    score: number;
    verdict: string;
    signals: Array<{ name: string; layer: string; weight: number; reason: string }>;
    latencyMs: number;
    eventId: string;
  };
  error?: string;
  status: 'pending' | 'success' | 'failed';
}

export default function AttackerDashboard() {
  const router = useRouter();
  
  // Custom states
  const [targetUserId, setTargetUserId] = useState<string>('user_001');
  const [overrides, setOverrides] = useState<TelemetryOverrides>(DEFAULT_OVERRIDES);
  const [activeSpoofs, setActiveSpoofs] = useState<Partial<TelemetryOverrides>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSimulating, setIsSimulating] = useState<string | null>(null);
  const [simulationStep, setSimulationStep] = useState<string>('');
  const [dosProgress, setDosProgress] = useState<{ current: number; total: number } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Sync active overrides on mount from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sentinel_telemetry_overrides');
        if (stored) {
          const parsed = JSON.parse(stored);
          setActiveSpoofs(parsed);
          setOverrides(prev => ({ ...prev, ...parsed }));
          showToast('Loaded active telemetry overrides from session storage.', 'success');
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Scroll terminal logs to bottom when updated
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, simulationStep]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOverrideChange = (field: keyof TelemetryOverrides, value: any) => {
    setOverrides(prev => ({ ...prev, [field]: value }));
  };

  const applyOverrides = () => {
    try {
      localStorage.setItem('sentinel_telemetry_overrides', JSON.stringify(overrides));
      setActiveSpoofs(overrides);
      showToast('Telemetry spoofs successfully injected! Bank portal transactions will inherit these coordinates.', 'success');
    } catch (e) {
      showToast('Failed to write telemetry overrides.', 'error');
    }
  };

  const clearOverrides = () => {
    try {
      localStorage.removeItem('sentinel_telemetry_overrides');
      setActiveSpoofs({});
      setOverrides(DEFAULT_OVERRIDES);
      showToast('Deception parameters cleared. Reverting banking portal to native baseline coordinates.', 'info');
    } catch (e) {
      showToast('Failed to clear overrides.', 'error');
    }
  };

  const appendLog = (log: LogEntry) => {
    setLogs(prev => [...prev, log]);
  };

  const updateLogResponse = (id: string, response: any, status: 'success' | 'failed', error?: string) => {
    setLogs(prev => prev.map(log => log.id === id ? { ...log, response, status, error } : log));
  };

  // -------------------------------------------------------------
  // SIMULATION VECTORS
  // -------------------------------------------------------------

  // Attack 1: Phishing Login (Stolen creds, RU IP, curl User Agent, pasted password)
  const runPhishingLoginSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating('phishing');
    setSimulationStep('Initializing Phishing Attack...');
    
    const target = USERS[targetUserId];
    const logId = Math.random().toString(36).substring(7);
    
    const payload = {
      type: 'login',
      userId: target.userId,
      sessionId: 'phish-' + safeUUID().slice(0, 8),
      ip: '185.220.101.5',
      asn: 'AS9009 Tor Exit',
      geoCountry: 'RU',
      geoCity: 'Moscow',
      userAgent: 'curl/7.68.0',
      deviceFingerprint: 'fp_unknown',
      sessionAgeMs: 1200,
      timeSinceLastEventMs: 800,
      mouseMovementScore: 0,
      typingSpeedMs: 4, // extremely fast
      precedingEvents: [],
      requestRateLastMinute: 2,
      hasValidCSRF: true,
      inputMethod: 'pasted'
    };

    appendLog({
      id: logId,
      timestamp: Date.now(),
      scenario: 'Phishing Login (RU Tor Exit)',
      method: 'POST /api/events (login)',
      targetUser: target.name,
      payload,
      status: 'pending'
    });

    setSimulationStep('Deploying Russian Tor IP spoofing payload...');

    // Also auto-inject spoof coords in browser session so the analyst can test it interactively
    localStorage.setItem('sentinel_telemetry_overrides', JSON.stringify({
      ip: payload.ip,
      asn: payload.asn,
      geoCountry: payload.geoCountry,
      geoCity: payload.geoCity,
      userAgent: payload.userAgent,
      deviceFingerprint: payload.deviceFingerprint,
      mouseMovementScore: 0,
      typingSpeedMs: 4,
      inputMethod: 'pasted'
    }));
    setActiveSpoofs({
      ip: payload.ip,
      asn: payload.asn,
      geoCountry: payload.geoCountry,
      geoCity: payload.geoCity,
      userAgent: payload.userAgent,
      deviceFingerprint: payload.deviceFingerprint
    });

    setTimeout(async () => {
      try {
        setSimulationStep('Executing POST injection to Sentinel Core...');
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        if (res.ok) {
          const data = await res.json();
          updateLogResponse(logId, data, 'success');
          showToast(`Phishing attempt ingested. Verdict: ${data.verdict.toUpperCase()}`, data.verdict === 'block' ? 'error' : 'info');
        } else {
          const errText = await res.text();
          updateLogResponse(logId, undefined, 'failed', errText || 'API Server Error');
          showToast('Simulation connection error.', 'error');
        }
      } catch (err: any) {
        updateLogResponse(logId, undefined, 'failed', err.message);
        showToast('Connection refused.', 'error');
      } finally {
        setIsSimulating(null);
        setSimulationStep('');
      }
    }, 1200);
  };

  // Attack 2: Account Takeover Sequence (ATO)
  const runAtoSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating('ato');
    
    const target = USERS[targetUserId];
    const sharedSessionId = 'ato-' + safeUUID().slice(0, 8);
    
    // Setup logs
    const logId = Math.random().toString(36).substring(7);
    appendLog({
      id: logId,
      timestamp: Date.now(),
      scenario: 'Account Takeover (ATO) Multi-Stage Sequence',
      method: 'Rapid Sequential REST Chain (3 events)',
      targetUser: target.name,
      payload: { note: 'Rapid Login -> Register Payee -> Drain €5,000 in 2s (simulated 8s)' },
      status: 'pending'
    });

    try {
      // Step 1: Login from unfamiliar IP
      setSimulationStep('ATO [Stage 1/3]: Ingesting Phished Login...');
      const loginPayload = {
        type: 'login',
        userId: target.userId,
        sessionId: sharedSessionId,
        ip: '185.220.101.99',
        asn: 'AS9009 Tor Exit',
        geoCountry: 'RU',
        geoCity: 'St Petersburg',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        deviceFingerprint: 'fp_unknown',
        sessionAgeMs: 500,
        timeSinceLastEventMs: 500,
        mouseMovementScore: 12,
        typingSpeedMs: 5, // Automated paste speed
        precedingEvents: [],
        requestRateLastMinute: 1,
        hasValidCSRF: true,
        inputMethod: 'pasted'
      };

      const data1 = await submitEvent(loginPayload);
      setSimulationStep(`ATO Stage 1 Result: Score ${data1.score} | Verdict: ${data1.verdict}`);

      // Step 2: Register Payee
      await new Promise(resolve => setTimeout(resolve, 800));
      setSimulationStep('ATO [Stage 2/3]: Registering Hacker Beneficiary...');
      
      const payeePayload = {
        type: 'add_payee',
        userId: target.userId,
        sessionId: sharedSessionId,
        ip: '185.220.101.99',
        asn: 'AS9009 Tor Exit',
        geoCountry: 'RU',
        geoCity: 'St Petersburg',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        deviceFingerprint: 'fp_unknown',
        sessionAgeMs: 1300,
        timeSinceLastEventMs: 800,
        mouseMovementScore: 15,
        typingSpeedMs: 8,
        precedingEvents: ['login'],
        requestRateLastMinute: 2,
        hasValidCSRF: true,
        inputMethod: 'pasted',
        payeeId: 'payee_hacker_drain',
        payeeName: 'Hacker Drain Beneficiary'
      };

      const data2 = await submitEvent(payeePayload);
      setSimulationStep(`ATO Stage 2 Result: Score ${data2.score} | Verdict: ${data2.verdict}`);

      // Step 3: Wire transfer large amount
      await new Promise(resolve => setTimeout(resolve, 800));
      setSimulationStep('ATO [Stage 3/3]: Initiating €5,000 asset drain transfer...');

      const transferPayload = {
        type: 'transfer',
        userId: target.userId,
        sessionId: sharedSessionId,
        ip: '185.220.101.99',
        asn: 'AS9009 Tor Exit',
        geoCountry: 'RU',
        geoCity: 'St Petersburg',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        deviceFingerprint: 'fp_unknown',
        sessionAgeMs: 2100,
        timeSinceLastEventMs: 800,
        mouseMovementScore: 10,
        typingSpeedMs: 4,
        precedingEvents: ['login', 'add_payee'],
        requestRateLastMinute: 3,
        hasValidCSRF: true,
        inputMethod: 'pasted',
        amount: 5000,
        payeeId: 'payee_hacker_drain',
        payeeName: 'Hacker Drain Beneficiary',
        payeeIsNew: true
      };

      const data3 = await submitEvent(transferPayload);
      
      updateLogResponse(logId, data3, 'success');
      setSimulationStep(`ATO Complete: Transfer Verdict: ${data3.verdict.toUpperCase()} (Score: ${data3.score})`);
      showToast(`ATO simulation complete. Assets protected. Verdict: ${data3.verdict.toUpperCase()}`, 'error');
    } catch (err: any) {
      updateLogResponse(logId, undefined, 'failed', err.message);
      showToast('ATO chain broke due to network error.', 'error');
    } finally {
      setIsSimulating(null);
    }
  };

  // Attack 3: API Replay Attack (Direct POST to transfer without preceding login)
  const runApiReplaySimulation = async () => {
    if (isSimulating) return;
    setIsSimulating('replay');
    setSimulationStep('Initializing Direct API Replay...');

    const target = USERS[targetUserId];
    const logId = Math.random().toString(36).substring(7);

    const payload = {
      type: 'transfer',
      userId: target.userId,
      sessionId: 'replay-' + safeUUID().slice(0, 8),
      ip: target.usualIPs[0], // Spoofed as user's real IP!
      asn: target.usualASNs[0], // Spoofed as real ASN!
      geoCountry: target.usualCountry,
      geoCity: 'Tirana',
      userAgent: target.usualUserAgent,
      deviceFingerprint: target.usualDevices[0], // Spoofed as real device!
      sessionAgeMs: 12000,
      timeSinceLastEventMs: 5000,
      mouseMovementScore: 92,
      typingSpeedMs: 175,
      precedingEvents: [], // Empty! Violates session flow
      requestRateLastMinute: 1,
      hasValidCSRF: true,
      amount: 1500,
      payeeId: target.knownPayees[0], // Whitelisted target payee — known to the user
      isKnownPayee: true,
      payeeIsNew: false
    };

    appendLog({
      id: logId,
      timestamp: Date.now(),
      scenario: 'API Replay Bypass (Direct Transfer)',
      method: 'Direct POST /api/events (transfer)',
      targetUser: target.name,
      payload,
      status: 'pending'
    });

    setSimulationStep('Injecting raw transfer packet with hijacked baseline metadata...');

    setTimeout(async () => {
      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        if (res.ok) {
          const data = await res.json();
          updateLogResponse(logId, data, 'success');
          showToast(`Replay Assessment Completed. Verdict: ${data.verdict.toUpperCase()}`, 'error');
        } else {
          const errText = await res.text();
          updateLogResponse(logId, undefined, 'failed', errText);
        }
      } catch (err: any) {
        updateLogResponse(logId, undefined, 'failed', err.message);
      } finally {
        setIsSimulating(null);
        setSimulationStep('');
      }
    }, 1200);
  };

  // Attack 4: Mini-DoS Cover Attack (50 rapid requests on /balance, transfer in middle)
  const runDosCoverSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating('dos');
    
    const target = USERS[targetUserId];
    const logId = Math.random().toString(36).substring(7);
    const sharedSession = 'dos-' + safeUUID().slice(0, 8);

    appendLog({
      id: logId,
      timestamp: Date.now(),
      scenario: 'Mini-DoS Cover Attack (Rate-Flood)',
      method: '50 rapid async requests + Transfer in parallel',
      targetUser: target.name,
      payload: { note: 'Flooding 50 /view_balance packets in 1.5s' },
      status: 'pending'
    });

    setDosProgress({ current: 0, total: 50 });

    try {
      // Fire 25 requests
      for (let i = 1; i <= 25; i++) {
        setSimulationStep(`Flooding packet stream [${i}/50]...`);
        setDosProgress({ current: i, total: 50 });
        
        // Non-blocking fire
        fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'view_balance',
            userId: target.userId,
            sessionId: sharedSession,
            ip: '109.241.10.82', // Suspicious IP
            asn: 'AS8585 ALBtelecom',
            geoCountry: 'AL',
            geoCity: 'Durres',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            deviceFingerprint: 'fp_unknown',
            sessionAgeMs: 100 * i,
            timeSinceLastEventMs: 10,
            mouseMovementScore: 0,
            typingSpeedMs: 2,
            precedingEvents: new Array(Math.min(i, 10)).fill('view_balance'),
            requestRateLastMinute: 15 + i
          })
        }).catch(() => {});
        
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Mid-flood transfer event
      setSimulationStep('Covert Operation: Ingesting high-value Transfer inside flood...');
      const transferPayload = {
        type: 'transfer',
        userId: target.userId,
        sessionId: sharedSession,
        ip: '109.241.10.82',
        asn: 'AS8585 ALBtelecom',
        geoCountry: 'AL',
        geoCity: 'Durres',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        deviceFingerprint: 'fp_unknown',
        sessionAgeMs: 2600,
        timeSinceLastEventMs: 15,
        mouseMovementScore: 0,
        typingSpeedMs: 5,
        precedingEvents: ['view_balance'],
        requestRateLastMinute: 42, // high velocity flood signal!
        hasValidCSRF: true,
        amount: 5000,
        payeeId: target.knownPayees[1] || 'payee_rent',
        payeeIsNew: false
      };

      const resTransfer = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferPayload),
      });
      const transferAssessment = await resTransfer.json();
      setSimulationStep(`Transfer Ingestion Complete: Score: ${transferAssessment.score} | Verdict: ${transferAssessment.verdict}`);

      // Fire remaining 25 requests
      for (let i = 26; i <= 50; i++) {
        setDosProgress({ current: i, total: 50 });
        fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'view_balance',
            userId: target.userId,
            sessionId: sharedSession,
            ip: '109.241.10.82',
            asn: 'AS8585 ALBtelecom',
            geoCountry: 'AL',
            geoCity: 'Durres',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            deviceFingerprint: 'fp_unknown',
            sessionAgeMs: 100 * i,
            timeSinceLastEventMs: 10,
            mouseMovementScore: 0,
            typingSpeedMs: 2,
            precedingEvents: new Array(10).fill('view_balance'),
            requestRateLastMinute: 30 + i
          })
        }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      updateLogResponse(logId, transferAssessment, 'success');
      showToast(`DoS Simulation complete. Transfer verdict: ${transferAssessment.verdict.toUpperCase()}`, 'error');
    } catch (e: any) {
      updateLogResponse(logId, undefined, 'failed', e.message);
    } finally {
      setIsSimulating(null);
      setDosProgress(null);
      setSimulationStep('');
    }
  };

  // Attack 5: Legitimate Travel (Italy IP, SAME device, normal typing, €80 known payee)
  const runLegitTravelSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating('travel');
    setSimulationStep('Simulating Legitimate Travel scenario...');

    const target = USERS[targetUserId];
    const logId = Math.random().toString(36).substring(7);
    const sharedSession = 'legit-' + safeUUID().slice(0, 8);

    const payload = {
      type: 'transfer',
      userId: target.userId,
      sessionId: sharedSession,
      ip: '185.31.50.99', // Italy IP (unrecognized subnet)
      asn: 'AS3269 TELECOM ITALIA', // Italy ISP
      geoCountry: 'IT',
      geoCity: 'Milan',
      userAgent: target.usualUserAgent, // MATCHES baseline exactly
      deviceFingerprint: target.usualDevices[0], // MATCHES baseline exactly
      sessionAgeMs: 72000,
      timeSinceLastEventMs: 4500,
      mouseMovementScore: 89,
      typingSpeedMs: target.typicalTypingSpeedMs + 10, // Natural typing speed
      precedingEvents: ['login', 'view_balance'],
      requestRateLastMinute: 2,
      hasValidCSRF: true,
      amount: 80.00, // Small amount typical for this user
      payeeId: target.knownPayees[0] || 'payee_mom',
      payeeIsNew: false
    };

    appendLog({
      id: logId,
      timestamp: Date.now(),
      scenario: 'Legitimate Travel (IT Geo-change, Known Device)',
      method: 'POST /api/events (transfer)',
      targetUser: target.name,
      payload,
      status: 'pending'
    });

    setSimulationStep('Simulating client travelling to Italy. Matching browser agent and fingerprint token...');

    setTimeout(async () => {
      try {
        const data = await submitEvent(payload);
        updateLogResponse(logId, data, 'success');
        showToast(`Travel Assessment complete. Verdict: ${data.verdict.toUpperCase()} (FP protection validated)`, 'success');
      } catch (err: any) {
        updateLogResponse(logId, undefined, 'failed', err.message);
      } finally {
        setIsSimulating(null);
        setSimulationStep('');
      }
    }, 1200);
  };

  // Helper for logs color coding
  const getVerdictColor = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case 'allow': return 'text-emerald-400 border-emerald-900/30 bg-emerald-950/20';
      case 'soft_challenge': return 'text-amber-400 border-amber-900/30 bg-amber-950/20';
      case 'hard_challenge': return 'text-orange-400 border-orange-900/30 bg-orange-950/20';
      case 'block': return 'text-red-400 border-red-900/30 bg-red-950/20';
      default: return 'text-slate-400 border-slate-800 bg-slate-900/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 font-sans selection:bg-rose-500 selection:text-white p-4 md:p-8 relative overflow-hidden">
      
      {/* Background matrix mesh & red glows */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[550px] h-[550px] bg-red-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 translate-x-1/2 w-[450px] h-[450px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-10" />

      {/* Persistent Notification Toast */}
      {notification && (
        <div className={cn(
          "fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 animate-slide-up text-sm font-mono",
          notification.type === 'success' && "bg-emerald-950 border-emerald-500/40 text-emerald-400",
          notification.type === 'error' && "bg-red-950 border-red-500/40 text-red-400",
          notification.type === 'info' && "bg-indigo-950 border-indigo-500/40 text-indigo-400"
        )}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <XCircle className="w-5 h-5 animate-bounce" />}
          {notification.type === 'info' && <Activity className="w-5 h-5 animate-pulse" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto z-10 space-y-6 flex flex-col flex-grow">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 border border-slate-850 p-6 rounded-[32px] backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')}
              className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-rose-500 text-xs font-bold font-mono tracking-widest uppercase">
                <Skull className="w-4 h-4 animate-pulse" />
                <span>Sentinel Red-Team Console</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
                Threat Simulator Panel
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase font-bold">
            <div className="px-3 py-1.5 rounded-full bg-red-950/60 border border-red-900/30 text-rose-400 flex items-center gap-1.5 shadow-sm shadow-red-950/40">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              <span>Attacker Scope Active</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-indigo-400 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" />
              <span>Target: FiBank-AL</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
              Port: 3000
            </div>
          </div>
        </div>

        {/* Workspace Layout Grid */}
        <div className="grid lg:grid-cols-12 gap-6 items-stretch">

          {/* LEFT COLUMN: Manual Telemetry Spoofing (7 columns) */}
          <div className="lg:col-span-7 bg-slate-900/40 border border-slate-850 p-6 rounded-[32px] flex flex-col justify-between backdrop-blur-md">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-850 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 rounded-xl">
                    <Settings className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">Manual Coordinate Spoofing</h2>
                    <p className="text-[10px] text-slate-500 mt-0.5">Inject customized headers and biometrics directly into the customer session context.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Target:</span>
                  <select 
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 py-1.5 px-3 rounded-lg text-xs font-mono font-medium outline-none cursor-pointer focus:border-rose-500"
                  >
                    {Object.values(USERS).map(u => (
                      <option key={u.userId} value={u.userId}>{u.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Spoofing Fields Forms Grid */}
              <div className="grid md:grid-cols-2 gap-4 font-mono text-[11px]">
                
                {/* IP address */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold flex items-center justify-between">
                    <span>IP ADDRESS</span>
                    {activeSpoofs.ip && <span className="text-[9px] text-rose-500 uppercase font-semibold">SPOOFED</span>}
                  </label>
                  <input 
                    type="text" 
                    value={overrides.ip}
                    onChange={(e) => handleOverrideChange('ip', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-rose-500 outline-none transition-colors"
                  />
                </div>

                {/* ASN Network Provider */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold flex items-center justify-between">
                    <span>ASN PROVIDER</span>
                    {activeSpoofs.asn && <span className="text-[9px] text-rose-500 uppercase font-semibold">SPOOFED</span>}
                  </label>
                  <input 
                    type="text" 
                    value={overrides.asn}
                    onChange={(e) => handleOverrideChange('asn', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-rose-500 outline-none transition-colors"
                  />
                </div>

                {/* Country Code */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold flex items-center justify-between">
                    <span>COUNTRY CODE (ISO)</span>
                    {activeSpoofs.geoCountry && <span className="text-[9px] text-rose-500 uppercase font-semibold">SPOOFED</span>}
                  </label>
                  <input 
                    type="text" 
                    maxLength={2}
                    value={overrides.geoCountry}
                    onChange={(e) => handleOverrideChange('geoCountry', e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-rose-500 outline-none transition-colors uppercase font-bold text-center"
                    placeholder="RU"
                  />
                </div>

                {/* City */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold flex items-center justify-between">
                    <span>CITY LOCATION</span>
                    {activeSpoofs.geoCity && <span className="text-[9px] text-rose-500 uppercase font-semibold">SPOOFED</span>}
                  </label>
                  <input 
                    type="text" 
                    value={overrides.geoCity}
                    onChange={(e) => handleOverrideChange('geoCity', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-rose-500 outline-none transition-colors"
                  />
                </div>

                {/* Device Fingerprint */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold flex items-center justify-between">
                    <span>DEVICE FINGERPRINT</span>
                    {activeSpoofs.deviceFingerprint && <span className="text-[9px] text-rose-500 uppercase font-semibold">SPOOFED</span>}
                  </label>
                  <input 
                    type="text" 
                    value={overrides.deviceFingerprint}
                    onChange={(e) => handleOverrideChange('deviceFingerprint', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-rose-500 outline-none transition-colors font-semibold"
                  />
                </div>

                {/* Input Method */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">INPUT METHOD</label>
                  <select 
                    value={overrides.inputMethod}
                    onChange={(e) => handleOverrideChange('inputMethod', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-rose-500 outline-none transition-colors cursor-pointer"
                  >
                    <option value="typed">TYPED (NATIVE)</option>
                    <option value="pasted">PASTED (BOT-MACRO)</option>
                    <option value="autofill">AUTOFILL (PASSWORD MGR)</option>
                  </select>
                </div>

                {/* User Agent */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-400 font-bold flex items-center justify-between">
                    <span>USER-AGENT HEADER</span>
                    {activeSpoofs.userAgent && <span className="text-[9px] text-rose-500 uppercase font-semibold">SPOOFED</span>}
                  </label>
                  <textarea 
                    rows={2}
                    value={overrides.userAgent}
                    onChange={(e) => handleOverrideChange('userAgent', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-rose-500 outline-none transition-colors resize-none font-mono text-[10px] leading-normal"
                  />
                </div>

                {/* typing Speed slider */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold flex justify-between">
                    <span>TYPING CADENCE SPEED</span>
                    <span className={cn(
                      overrides.typingSpeedMs < 60 ? "text-red-400" : "text-emerald-400",
                      "font-bold"
                    )}>{overrides.typingSpeedMs} MS/KEY</span>
                  </label>
                  <input 
                    type="range" 
                    min={2}
                    max={300}
                    value={overrides.typingSpeedMs}
                    onChange={(e) => handleOverrideChange('typingSpeedMs', parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                    <span>BOT (&lt;50ms)</span>
                    <span>HUMAN (&gt;120ms)</span>
                  </div>
                </div>

                {/* Mouse Score slider */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold flex justify-between">
                    <span>MOUSE SMOOTHNESS BIOMETRIC</span>
                    <span className={cn(
                      overrides.mouseMovementScore < 30 ? "text-red-400" : "text-emerald-400",
                      "font-bold"
                    )}>{overrides.mouseMovementScore}/100</span>
                  </label>
                  <input 
                    type="range" 
                    min={0}
                    max={100}
                    value={overrides.mouseMovementScore}
                    onChange={(e) => handleOverrideChange('mouseMovementScore', parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                    <span>LINEAR BOT (0)</span>
                    <span>HUMAN CURVES (100)</span>
                  </div>
                </div>

                {/* CSRF & Request Rate */}
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={overrides.hasValidCSRF}
                      onChange={(e) => handleOverrideChange('hasValidCSRF', e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-rose-600 focus:ring-rose-500 focus:ring-offset-slate-950 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-300 font-bold">VALID CSRF TOKEN</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold flex justify-between">
                    <span>API REQUEST RATE</span>
                    <span className="text-indigo-400 font-bold">{overrides.requestRateLastMinute} REQ/MIN</span>
                  </label>
                  <input 
                    type="number" 
                    min={1}
                    max={200}
                    value={overrides.requestRateLastMinute}
                    onChange={(e) => handleOverrideChange('requestRateLastMinute', parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:border-rose-500 outline-none"
                  />
                </div>

              </div>
            </div>

            {/* Apply & Reset Buttons */}
            <div className="flex gap-4 mt-8 pt-4 border-t border-slate-850">
              <button
                onClick={applyOverrides}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer hover:shadow-lg hover:shadow-rose-950/20 text-xs font-mono uppercase tracking-wider"
              >
                <Zap className="w-4 h-4" />
                <span>Inject Spoof Parameters</span>
              </button>
              
              <button
                onClick={clearOverrides}
                className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold py-3.5 px-5 rounded-2xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 text-xs font-mono uppercase tracking-wider"
                title="Restore Normal Baselines"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset Baseline</span>
              </button>

              <button
                onClick={() => router.push('/bank')}
                className="bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-900/30 text-indigo-400 hover:text-indigo-300 font-semibold py-3.5 px-5 rounded-2xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 text-xs font-mono uppercase tracking-wider"
                title="Launch Target App"
              >
                <Eye className="w-4 h-4" />
                <span>Launch Bank</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Red Team Vectors (5 columns) */}
          <div className="lg:col-span-5 flex flex-col gap-6">

            {/* Attack Vectors Panel */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-[32px] flex-grow backdrop-blur-md space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-850 pb-4">
                <div className="p-2 bg-red-950/40 border border-red-900/30 text-rose-400 rounded-xl animate-pulse">
                  <Skull className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">Automated Attack Scenarios</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">Fire pre-engineered REST payload vectors to trigger Sentinel risk detections.</p>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="space-y-3 font-mono text-[11px]">
                
                {/* 1. Phishing Login */}
                <button
                  onClick={runPhishingLoginSimulation}
                  disabled={isSimulating !== null}
                  className="w-full group bg-slate-950/60 hover:bg-red-950/10 border border-slate-850 hover:border-red-900/50 p-4 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <div className="space-y-1 max-w-[80%]">
                    <div className="text-xs font-bold text-slate-200 group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                      <span>01 // Phishing Login Attempt</span>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-normal">
                      Simulates phished credential stuffing from a RU Tor Exit IP, curl User Agent, and pasted credentials.
                    </p>
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl group-hover:border-red-800/40 text-slate-500 group-hover:text-red-400 transition-all shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </button>

                {/* 2. Account Takeover (ATO) */}
                <button
                  onClick={runAtoSimulation}
                  disabled={isSimulating !== null}
                  className="w-full group bg-slate-950/60 hover:bg-red-950/10 border border-slate-850 hover:border-red-900/50 p-4 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <div className="space-y-1 max-w-[80%]">
                    <div className="text-xs font-bold text-slate-200 group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                      <span>02 // Account Takeover (ATO) Chain</span>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-normal">
                      Fires a rapid succession of REST events (Login → Add Payee → €5,000 Transfer) within 2 seconds.
                    </p>
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl group-hover:border-red-800/40 text-slate-500 group-hover:text-red-400 transition-all shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </button>

                {/* 3. API Replay */}
                <button
                  onClick={runApiReplaySimulation}
                  disabled={isSimulating !== null}
                  className="w-full group bg-slate-950/60 hover:bg-red-950/10 border border-slate-850 hover:border-red-900/50 p-4 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <div className="space-y-1 max-w-[80%]">
                    <div className="text-xs font-bold text-slate-200 group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                      <span>03 // Direct API Replay Attack</span>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-normal">
                      Directly POSTs a /transfer event using stolen customer fingerprints, bypassing login/balance checks entirely.
                    </p>
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl group-hover:border-red-800/40 text-slate-500 group-hover:text-red-400 transition-all shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </button>

                {/* 4. Mini-DoS Cover */}
                <button
                  onClick={runDosCoverSimulation}
                  disabled={isSimulating !== null}
                  className="w-full group bg-slate-950/60 hover:bg-red-950/10 border border-slate-850 hover:border-red-900/50 p-4 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <div className="space-y-1 max-w-[80%]">
                    <div className="text-xs font-bold text-slate-200 group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                      <span>04 // Mini-DoS Request Flood Cover</span>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-normal">
                      Floods 50 rapid /view_balance packets to mask a high-value transfer, triggering rate protection algorithms.
                    </p>
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl group-hover:border-red-800/40 text-slate-500 group-hover:text-red-400 transition-all shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </button>

                {/* 5. Legitimate Travel */}
                <button
                  onClick={runLegitTravelSimulation}
                  disabled={isSimulating !== null}
                  className="w-full group bg-slate-950/60 hover:bg-emerald-950/10 border border-slate-850 hover:border-emerald-900/50 p-4 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <div className="space-y-1 max-w-[80%]">
                    <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                      <span>05 // False-Positive travel check</span>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-normal">
                      Customer travels to Italy (new IP/Geo) but uses their known device fingerprint and normal typing.
                    </p>
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl group-hover:border-emerald-800/40 text-slate-500 group-hover:text-emerald-400 transition-all shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </button>

              </div>
            </div>

            {/* Active Coordinates Display (HUD status board) */}
            <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-[24px] font-mono text-[10px] space-y-2">
              <div className="text-slate-500 font-bold uppercase text-[9px] border-b border-slate-800/40 pb-2 mb-2 tracking-wider flex justify-between items-center">
                <span>Active Target Baseline HUD</span>
                <span className="text-indigo-400">ACTIVE: {USERS[targetUserId].name}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-400">
                <div>IP: <span className="text-slate-200">{USERS[targetUserId].usualIPs[0]}</span></div>
                <div>DEVICE: <span className="text-slate-200">{USERS[targetUserId].usualDevices[0]}</span></div>
                <div>ASN: <span className="text-slate-200 truncate block max-w-full">{USERS[targetUserId].usualASNs[0]}</span></div>
                <div>SPEED: <span className="text-slate-200">{USERS[targetUserId].typicalTypingSpeedMs} MS/KEY</span></div>
                <div>GEO: <span className="text-slate-200">{USERS[targetUserId].usualCountry} / EUROPE</span></div>
                <div>AVG TRANS: <span className="text-slate-200">€{USERS[targetUserId].avgTransferAmount}</span></div>
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM SECTION: Real-Time Exploit Console / Analyst Output Logs */}
        <div className="bg-slate-900/60 border border-slate-850 rounded-[32px] overflow-hidden backdrop-blur-md flex flex-col h-[320px]">
          
          {/* Console Header */}
          <div className="bg-slate-950/80 px-6 py-4 flex items-center justify-between border-b border-slate-850">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-rose-500 animate-pulse" />
              <span className="text-xs font-bold uppercase font-mono tracking-wider text-slate-200">
                Threat Simulator Log Terminal // Analyst Monitor
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {isSimulating && (
                <div className="flex items-center gap-2 text-rose-400 text-[10px] font-mono font-bold animate-pulse">
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  <span>{simulationStep || 'Ingesting simulation payload...'}</span>
                </div>
              )}
              {dosProgress && (
                <div className="w-28 bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-850 shrink-0">
                  <div 
                    className="bg-rose-500 h-full transition-all duration-100" 
                    style={{ width: `${(dosProgress.current / dosProgress.total) * 100}%` }}
                  />
                </div>
              )}
              <button 
                onClick={() => setLogs([])}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Console Output Screen */}
          <div className="flex-1 p-5 overflow-y-auto font-mono text-[11px] leading-relaxed bg-slate-950/40 space-y-4">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic select-none space-y-2">
                <Activity className="w-8 h-8 text-slate-700 animate-pulse" />
                <p>System idle. Awaiting red-team simulation vectors or manual spoofs injection...</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border-b border-slate-900 pb-3 space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400">
                      [{new Date(log.timestamp).toLocaleTimeString()}] 
                      <span className="text-rose-400 font-bold ml-1">{log.scenario}</span>
                    </span>
                    <span className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded border font-mono uppercase",
                      log.status === 'pending' && "text-indigo-400 border-indigo-900 bg-indigo-950/20",
                      log.status === 'failed' && "text-red-400 border-red-950 bg-red-950/20",
                      log.status === 'success' && getVerdictColor(log.response?.verdict || '')
                    )}>
                      {log.status === 'pending' ? 'TRANSMITTING...' : log.response?.verdict.toUpperCase() || 'FAILED'}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-3 gap-2 text-[10px] text-slate-500">
                    <div>VECTOR: <span className="text-slate-400">{log.method}</span></div>
                    <div>TARGET PROFILE: <span className="text-slate-400">{log.targetUser}</span></div>
                    {log.response && (
                      <div>LATENCY: <span className="text-slate-400">{log.response.latencyMs}ms</span></div>
                    )}
                  </div>

                  {log.status === 'success' && log.response && (
                    <div className="space-y-1.5 mt-1 bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                      <div className="flex justify-between text-slate-400 font-bold text-[10px]">
                        <span>EVENT EVALUATION MATRIX (ID: {log.response.eventId})</span>
                        <span>OVERALL SCORE: <strong className={cn(
                          log.response.score > 85 ? "text-red-400 font-extrabold" : log.response.score > 30 ? "text-amber-400 font-bold" : "text-emerald-400"
                        )}>{log.response.score}/100</strong></span>
                      </div>
                      
                      {/* Active Threat Signals list */}
                      <div className="space-y-1 mt-1.5">
                        {log.response.signals && log.response.signals.length > 0 ? (
                          log.response.signals.map((sig, sIdx) => (
                            <div key={sIdx} className="text-[10px] leading-tight flex justify-between bg-slate-900/40 p-1.5 rounded border border-slate-900/60">
                              <span className={cn(
                                sig.layer === 'network' && "text-sky-400",
                                sig.layer === 'behavioral' && "text-purple-400",
                                sig.layer === 'transactional' && "text-amber-400",
                                "font-bold shrink-0"
                              )}>
                                [{sig.layer.toUpperCase()}] {sig.name} (+{sig.weight})
                              </span>
                              <span className="text-slate-500 text-right truncate ml-4">{sig.reason}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-emerald-400 italic text-[10px]">
                            Clean Verification. Zero anomalous signals identified.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {log.status === 'failed' && (
                    <div className="text-red-400 text-[10px] bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Transmission Failure: {log.error || 'Server connection timed out.'}</span>
                    </div>
                  )}

                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>

          {/* Console Status Footer */}
          <div className="bg-slate-950/80 px-6 py-2 border-t border-slate-900 text-[9px] text-slate-600 font-mono flex justify-between">
            <span>PACKET EVALUATION SYSTEM // CRYPTO VERDICT NODES ACTIVE</span>
            <span>© SENTINEL SOC HACKATHON 2026</span>
          </div>

        </div>

      </div>

    </div>
  );
}
