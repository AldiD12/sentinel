"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, Activity, ShieldCheck, ShieldAlert, AlertTriangle, 
  Clock, Terminal, Search, ArrowLeft, Layers, Globe, 
  CheckCircle, KeyRound, UserCheck, XCircle, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { USERS } from '@/lib/users';
import { ProcessedEvent } from '@/lib/types';

// Import shadcn UI components
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Stats {
  allowed: number;
  challenged: number;
  blocked: number;
  avgLatency: number;
}

export default function SecurityOperationsDashboard() {
  const router = useRouter();
  
  // Real-time states
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [stats, setStats] = useState<Stats>({ allowed: 0, challenged: 0, blocked: 0, avgLatency: 0 });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [selectedEvent, setSelectedEvent] = useState<ProcessedEvent | null>(null);
  
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [verdictFilter, setVerdictFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');

  // Override states
  const [isOverriding, setIsOverriding] = useState<boolean>(false);
  const [overrideNote, setOverrideNote] = useState<string>('Verified customer identity; coordinates flagged as false positive.');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);
  
  // Toast notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Connect to SSE event stream
  useEffect(() => {
    let eventSource: EventSource;
    
    function connect() {
      setConnectionStatus('connecting');
      eventSource = new EventSource('/api/stream');

      eventSource.onopen = () => {
        setConnectionStatus('connected');
        showToast('Real-time connection to Sentinel core established.', 'success');
      };

      eventSource.onerror = (err) => {
        console.error('SSE Error', err);
        setConnectionStatus('disconnected');
        showToast('Stream link dropped. Reconnecting...', 'error');
        eventSource.close();
        
        // Reconnect after 3s
        setTimeout(connect, 3000);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'snapshot') {
            const snapshotData = [...payload.data].reverse();
            setEvents(snapshotData);
            
            // Auto-select the first event if none is selected
            if (snapshotData.length > 0) {
              setSelectedEvent(snapshotData[0]);
            }
          } else if (payload.type === 'event') {
            const newEvent = payload.data as ProcessedEvent;
            
            setEvents(prev => {
              const existsIdx = prev.findIndex(e => e.eventId === newEvent.eventId);
              if (existsIdx !== -1) {
                // Update existing event (e.g. if it was overridden)
                const updated = [...prev];
                updated[existsIdx] = newEvent;
                return updated;
              } else {
                // Append new event to top, limit to 50
                return [newEvent, ...prev].slice(0, 50);
              }
            });

            // Update selected event if it's currently the one being viewed
            setSelectedEvent(curr => {
              if (curr && curr.eventId === newEvent.eventId) {
                return newEvent;
              }
              return curr;
            });
          } else if (payload.type === 'stats') {
            setStats(payload.data as Stats);
          }
        } catch (e) {
          console.error('Failed to parse SSE payload', e);
        }
      };
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Handle analyst overrides
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || isSubmittingOverride) return;

    setIsSubmittingOverride(true);

    try {
      const res = await fetch('/api/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent.eventId,
          note: overrideNote
        })
      });

      if (res.ok) {
        showToast(`Event marked as False Positive. Core whitelist refreshed.`, 'success');
        setIsOverriding(false);
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to submit override.', 'error');
      }
    } catch (err) {
      showToast('Network error during override submission.', 'error');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Helper mappings
  const getUserName = (uid: string) => {
    return USERS[uid]?.name || uid;
  };

  // Score color scale matching specs: <30 green, 31-60 amber, 61-85 orange, 86+ red.
  const getScoreDetails = (score: number) => {
    if (score < 30) {
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-950/30',
        border: 'border-emerald-800/40',
        fill: 'bg-emerald-500',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      };
    }
    if (score <= 60) {
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-950/30',
        border: 'border-amber-800/40',
        fill: 'bg-amber-500',
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      };
    }
    if (score <= 85) {
      return {
        text: 'text-orange-500',
        bg: 'bg-orange-950/30',
        border: 'border-orange-800/30',
        fill: 'bg-orange-500',
        badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      };
    }
    return {
      text: 'text-red-500',
      bg: 'bg-red-950/30',
      border: 'border-red-800/30',
      fill: 'bg-red-500',
      badge: 'bg-red-500/10 text-red-500 border-red-500/20'
    };
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case 'allow': 
        return (
          <Badge className="bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-950/50 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> ALLOW
          </Badge>
        );
      case 'soft_challenge': 
        return (
          <Badge className="bg-amber-950/50 text-amber-400 border border-amber-500/30 hover:bg-amber-950/50 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
            <KeyRound className="w-3 h-3" /> SOFT CHALLENGE
          </Badge>
        );
      case 'hard_challenge': 
        return (
          <Badge className="bg-orange-950/50 text-orange-400 border border-orange-500/30 hover:bg-orange-950/50 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> HARD CHALLENGE
          </Badge>
        );
      case 'block': 
        return (
          <Badge className="bg-red-950/50 text-red-400 border border-red-500/30 hover:bg-red-950/50 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 animate-pulse">
            <ShieldAlert className="w-3 h-3" /> BLOCK
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-slate-400 border-slate-700">{verdict.toUpperCase()}</Badge>;
    }
  };

  const getRowClass = (verdict: string, isSelected: boolean) => {
    const base = "cursor-pointer border-l-4 transition-all duration-150";
    const selected = isSelected ? "bg-gray-800/80 hover:bg-gray-800" : "";
    
    switch (verdict.toLowerCase()) {
      case 'allow': 
        return cn(base, "border-l-emerald-500 hover:bg-emerald-950/15", selected || "bg-gray-900/40");
      case 'soft_challenge': 
        return cn(base, "border-l-amber-500 hover:bg-amber-950/15", selected || "bg-gray-900/40");
      case 'hard_challenge': 
        return cn(base, "border-l-orange-500 hover:bg-orange-950/15", selected || "bg-gray-900/40");
      case 'block': 
        return cn(base, "border-l-red-500 hover:bg-red-950/15", selected || "bg-gray-900/40");
      default: 
        return cn(base, "border-l-slate-700 hover:bg-slate-900/40", selected || "bg-gray-900/40");
    }
  };

  // Filter and search logic
  const filteredEvents = events.filter(e => {
    const matchesSearch = 
      e.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getUserName(e.userId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.eventId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.ip && e.ip.includes(searchQuery)) ||
      (e.signals && e.signals.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesVerdict = 
      verdictFilter === 'all' || 
      (verdictFilter === 'challenge' && (e.verdict === 'soft_challenge' || e.verdict === 'hard_challenge')) ||
      e.verdict === verdictFilter;

    const matchesUser = 
      userFilter === 'all' || 
      e.userId === userFilter;
    return matchesSearch && matchesVerdict && matchesUser;
  });

  return (
    <div className="dark min-h-screen bg-[#030914] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col p-4 md:p-6 relative overflow-hidden">
      
      {/* Background Soft Professional Gradients */}
      <div className="absolute top-0 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 translate-y-1/2 w-[500px] h-[500px] bg-slate-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Real-time Notification Banner */}
      {notification && (
        <div className={cn(
          "fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slide-up text-sm font-mono",
          notification.type === 'success' && "bg-[#0b1c2e] border-emerald-500/30 text-emerald-400",
          notification.type === 'error' && "bg-[#180a0a] border-red-500/30 text-red-400",
          notification.type === 'info' && "bg-[#0c1424] border-indigo-500/30 text-indigo-400"
        )}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <XCircle className="w-5 h-5 animate-bounce" />}
          {notification.type === 'info' && <Activity className="w-5 h-5 animate-pulse" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Layout Wrapper */}
      <div className="max-w-7xl mx-auto w-full z-10 space-y-6 flex flex-col flex-grow">
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#081225] border border-slate-800/80 p-5 rounded-2xl">
          
          <div className="flex items-center gap-3.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/')}
              className="bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-white"
              title="Return to Simulation Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  connectionStatus === 'connected' && "bg-emerald-500 animate-pulse",
                  connectionStatus === 'connecting' && "bg-amber-500 animate-pulse",
                  connectionStatus === 'disconnected' && "bg-red-500"
                )} />
                <span className="text-[9px] font-bold font-mono tracking-widest text-slate-400 uppercase">
                  {connectionStatus === 'connected' ? 'LIVE SECURITY SYNC' : connectionStatus === 'connecting' ? 'SYNCING...' : 'DISCONNECTED'}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-none mt-1.5">
                Sentinel Core SOC Console
              </h1>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:flex items-center gap-3 w-full md:w-auto">
            {/* Allowed Card */}
            <Card className="bg-[#050d1a] border-slate-800/80 px-4 py-2.5 rounded-xl flex items-center gap-3 min-w-[110px] text-slate-100 shadow-sm">
              <div className="w-1 h-7 rounded-full bg-emerald-500" />
              <div>
                <div className="text-[8px] font-bold text-slate-500 font-mono tracking-wider">APPROVED</div>
                <div className="text-base font-black font-mono text-emerald-400 leading-tight">{stats.allowed}</div>
              </div>
            </Card>

            {/* Challenged Card */}
            <Card className="bg-[#050d1a] border-slate-800/80 px-4 py-2.5 rounded-xl flex items-center gap-3 min-w-[110px] text-slate-100 shadow-sm">
              <div className="w-1 h-7 rounded-full bg-amber-500" />
              <div>
                <div className="text-[8px] font-bold text-slate-500 font-mono tracking-wider">CHALLENGED</div>
                <div className="text-base font-black font-mono text-amber-400 leading-tight">{stats.challenged}</div>
              </div>
            </Card>

            {/* Blocked Card */}
            <Card className="bg-[#050d1a] border-slate-800/80 px-4 py-2.5 rounded-xl flex items-center gap-3 min-w-[110px] text-slate-100 shadow-sm">
              <div className="w-1 h-7 rounded-full bg-red-500" />
              <div>
                <div className="text-[8px] font-bold text-slate-500 font-mono tracking-wider">BLOCKED</div>
                <div className="text-base font-black font-mono text-red-400 leading-tight">{stats.blocked}</div>
              </div>
            </Card>

            {/* Latency Card */}
            <Card className="bg-[#050d1a] border-slate-800/80 px-4 py-2.5 rounded-xl flex items-center gap-3 min-w-[110px] text-slate-100 shadow-sm">
              <div className="w-1 h-7 rounded-full bg-indigo-500" />
              <div>
                <div className="text-[8px] font-bold text-slate-500 font-mono tracking-wider">AVG RESPONSE</div>
                <div className="text-base font-black font-mono text-indigo-400 leading-tight">
                  {stats.avgLatency || 0}<span className="text-[10px] font-normal text-slate-500 ml-0.5">ms</span>
                </div>
              </div>
            </Card>
          </div>

        </div>

        {/* MIDDLE ACTIONS: Search & Filters */}
        <div className="grid md:grid-cols-12 gap-3.5 items-center bg-[#081225]/40 border border-slate-800/60 p-4 rounded-xl">
          <div className="md:col-span-6 relative">
            <input 
              type="text" 
              placeholder="Filter by threat indicators, risk factors, users, geolocation subnets, event IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050d1a] border border-slate-800/80 rounded-lg py-2 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold text-slate-400 shrink-0 uppercase tracking-wider">Verdict:</span>
            <select 
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value)}
              className="w-full bg-[#050d1a] border border-slate-800/80 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-350 cursor-pointer outline-none focus:border-indigo-500"
            >
              <option value="all">ALL VERDICTS</option>
              <option value="allow">APPROVED ONLY</option>
              <option value="challenge">CHALLENGED ONLY</option>
              <option value="block">BLOCKED ONLY</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold text-slate-400 shrink-0 uppercase tracking-wider">Account:</span>
            <select 
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full bg-[#050d1a] border border-slate-800/80 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-350 cursor-pointer outline-none focus:border-indigo-500"
            >
              <option value="all">ALL CUSTOMERS</option>
              {Object.values(USERS).map(u => (
                <option key={u.userId} value={u.userId}>{u.name.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* WORKSPACE AREA (Left: 60% Stream, Right: 40% Inspector) */}
        <div className="grid lg:grid-cols-10 gap-6 items-stretch flex-grow min-h-[500px]">
          
          {/* LEFT: 60% EVENT STREAM TABLE */}
          <Card className="lg:col-span-6 bg-[#081225]/80 border-slate-800/80 flex flex-col h-[560px] overflow-hidden text-slate-100 shadow-sm">
            <CardHeader className="flex flex-row justify-between items-center border-b border-slate-800/60 py-3.5 px-5">
              <div>
                <CardTitle className="text-xs font-extrabold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" /> Security Telemetry Ingestion Stream
                </CardTitle>
                <CardDescription className="text-[9px] font-mono text-slate-500 mt-0.5">
                  REAL-TIME NETWORK, BIOMETRIC & TRANSACTIONAL EVENT RECORDS
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[8px] font-mono border-slate-800 text-slate-400 bg-slate-950/80">
                {filteredEvents.length} OF {events.length} AUDITED EVENTS
              </Badge>
            </CardHeader>

            {/* Scrollable Table Area */}
            <CardContent className="p-0 flex-grow overflow-y-auto max-h-[480px]">
              {filteredEvents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 italic select-none space-y-2 py-24">
                  <Activity className="w-8 h-8 text-slate-700 animate-pulse" />
                  <p className="text-xs font-mono uppercase tracking-wider">No threat anomalies registered</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-950/60 sticky top-0 z-20 border-b border-slate-850">
                    <TableRow className="border-slate-850 hover:bg-transparent">
                      <TableHead className="text-[8px] font-bold font-mono text-slate-400 px-4 uppercase h-9">Time</TableHead>
                      <TableHead className="text-[8px] font-bold font-mono text-slate-400 px-3 uppercase h-9">User Account</TableHead>
                      <TableHead className="text-[8px] font-bold font-mono text-slate-400 px-3 uppercase h-9">Event Type</TableHead>
                      <TableHead className="text-[8px] font-bold font-mono text-slate-400 px-3 uppercase h-9 text-center">Score</TableHead>
                      <TableHead className="text-[8px] font-bold font-mono text-slate-400 px-3 uppercase h-9">Verdict</TableHead>
                      <TableHead className="text-[8px] font-bold font-mono text-slate-400 px-4 uppercase h-9 text-right">Signals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((evt) => {
                      const isSelected = selectedEvent?.eventId === evt.eventId;
                      const scoreStyle = getScoreDetails(evt.score);
                      return (
                        <TableRow
                           key={evt.eventId}
                           onClick={() => {
                             setSelectedEvent(evt);
                             setIsOverriding(false);
                           }}
                           className={cn(
                             getRowClass(evt.verdict, isSelected),
                             "border-slate-850/60 transition-colors"
                           )}
                        >
                          {/* Time Column */}
                          <TableCell className="font-mono text-[9px] text-slate-400 px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'N/A'}</span>
                            </div>
                            {evt.overridden && (
                              <Badge className="bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 px-1.5 py-0.2 rounded text-[7px] font-mono font-bold mt-1 tracking-wide uppercase">
                                Overridden
                              </Badge>
                            )}
                          </TableCell>

                          {/* User Column */}
                          <TableCell className="px-3 py-3 font-sans font-bold text-slate-200">
                            <div className="max-w-[100px] truncate" title={getUserName(evt.userId)}>
                              {getUserName(evt.userId)}
                            </div>
                            <div className="text-[8px] font-mono text-slate-500 font-normal mt-0.5">
                              {evt.userId}
                            </div>
                          </TableCell>

                          {/* Type Column */}
                          <TableCell className="px-3 py-3 font-mono">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-850 text-indigo-400 uppercase tracking-wider">
                              {evt.type.replace('_', ' ')}
                            </span>
                          </TableCell>

                          {/* Score Column */}
                          <TableCell className="px-3 py-3 text-center">
                            <Badge className={cn(scoreStyle.badge, "font-mono font-bold text-xs h-6 w-9 justify-center rounded-md border")}>
                              {evt.score}
                            </Badge>
                          </TableCell>

                          {/* Verdict Column */}
                          <TableCell className="px-3 py-3">
                            {getVerdictBadge(evt.verdict)}
                          </TableCell>

                          {/* Signals Count Column */}
                          <TableCell className="px-4 py-3 text-right font-mono text-[10px] text-slate-400">
                            {evt.signals?.length || 0}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* RIGHT: 40% EVENT DETAIL INSPECTOR */}
          <Card className="lg:col-span-4 bg-[#081225]/80 border-slate-800/80 flex flex-col h-[560px] overflow-hidden text-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-800/60 py-3 px-4 flex flex-row items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <CardTitle className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
                  Biometric Telemetry Inspector
                </CardTitle>
                <CardDescription className="text-[9px] font-mono text-slate-500 mt-0.5">
                  DEEP LAYER ATTRIBUTE & COORDINATES DIAGNOSTICS
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-grow overflow-y-auto max-h-[460px] flex flex-col justify-between">
              {!selectedEvent ? (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-500 italic text-center p-8 select-none space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center text-slate-600 animate-pulse">
                    <Shield className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-[9px] font-mono max-w-[220px] uppercase leading-relaxed text-slate-400">
                    Select a transaction record from the stream feed to inspect its telemetry coordinate vectors
                  </p>
                </div>
              ) : (
                <div className="space-y-4 flex-grow flex flex-col justify-between h-full">
                  <div className="space-y-4">
                    {/* Top Overview Panel */}
                    <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4">
                      <div className="space-y-1 max-w-[60%]">
                        <span className="text-[8px] font-bold font-mono bg-slate-900 border border-slate-850 text-indigo-400 px-2 py-0.5 rounded uppercase tracking-wider">
                          {selectedEvent.type.replace('_', ' ')}
                        </span>
                        <h3 className="text-sm font-extrabold text-white mt-1.5 font-sans leading-none truncate" title={getUserName(selectedEvent.userId)}>
                          {getUserName(selectedEvent.userId)}
                        </h3>
                        <p className="text-[9px] text-slate-500 font-mono truncate">
                          UID: {selectedEvent.userId}
                        </p>
                      </div>

                      <div className="text-center">
                        <div className={cn(
                          "text-2xl font-extrabold font-mono border px-3 py-0.5 rounded-xl leading-none",
                          getScoreDetails(selectedEvent.score).text,
                          getScoreDetails(selectedEvent.score).bg,
                          getScoreDetails(selectedEvent.score).border
                        )}>
                          {selectedEvent.score}
                        </div>
                        <div className="text-[8px] font-bold text-slate-500 font-mono mt-1.5 uppercase tracking-wider">Risk Score</div>
                      </div>
                    </div>

                    {/* Verdict & Latency Details */}
                    <div className="flex justify-between items-center bg-slate-950/30 border border-slate-850/60 px-3.5 py-2.5 rounded-xl">
                      <div className="space-y-0.5">
                        <div className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider">SafeShield™ Verdict</div>
                        {getVerdictBadge(selectedEvent.verdict)}
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider">Ingestion Time</div>
                        <span className="text-xs font-mono font-bold text-indigo-400 flex items-center justify-end gap-1 mt-1 leading-none">
                          <Zap className="w-3.5 h-3.5 fill-indigo-500/20 text-indigo-400" /> Audited in {selectedEvent.latencyMs}ms
                        </span>
                      </div>
                    </div>

                    {/* ── ANALYST RECOMMENDATION ─────────────────────────────
                         This is the key "remove manual analyst work" feature.
                         The scoring engine generates an exact action instruction
                         so analysts never have to interpret signals themselves. */}
                    {selectedEvent.recommendation && (
                      <div className={cn(
                        "border rounded-xl p-3.5 space-y-1.5 font-mono text-[10px] shadow-sm",
                        selectedEvent.verdict === 'allow'          && "bg-emerald-950/20 border-emerald-700/30",
                        selectedEvent.verdict === 'soft_challenge' && "bg-amber-950/20 border-amber-700/30",
                        selectedEvent.verdict === 'hard_challenge' && "bg-orange-950/20 border-orange-700/30",
                        selectedEvent.verdict === 'block'          && "bg-red-950/25 border-red-700/40 animate-pulse",
                      )}>
                        <div className={cn(
                          "flex items-center gap-1.5 font-extrabold uppercase tracking-widest text-[8px]",
                          selectedEvent.verdict === 'allow'          && "text-emerald-400",
                          selectedEvent.verdict === 'soft_challenge' && "text-amber-400",
                          selectedEvent.verdict === 'hard_challenge' && "text-orange-400",
                          selectedEvent.verdict === 'block'          && "text-red-400",
                        )}>
                          <Zap className="w-3 h-3 shrink-0" />
                          Analyst Recommendation
                        </div>
                        <p className={cn(
                          "leading-relaxed font-sans text-[10px]",
                          selectedEvent.verdict === 'allow'          && "text-emerald-300",
                          selectedEvent.verdict === 'soft_challenge' && "text-amber-200",
                          selectedEvent.verdict === 'hard_challenge' && "text-orange-200",
                          selectedEvent.verdict === 'block'          && "text-red-200",
                        )}>
                          {selectedEvent.recommendation}
                        </p>
                      </div>
                    )}

                    {/* Overridden state banner */}
                    {selectedEvent.overridden ? (
                      <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-xl space-y-1 font-mono text-[10px] text-emerald-400">
                        <div className="flex items-center gap-1.5 font-bold tracking-wide">
                          <UserCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                          <span>ANALYST WHITELIST OVERRIDE ACTIVE</span>
                        </div>
                        <p className="text-slate-400 leading-normal text-[9px] italic font-sans mt-0.5">
                          Justification: "{selectedEvent.overrideNote || 'No reason specified.'}"
                        </p>
                      </div>
                    ) : (
                      /* Inlined Override justification form */
                      isOverriding && (
                        <form onSubmit={handleOverrideSubmit} className="bg-slate-950 border border-slate-850 p-3 rounded-xl space-y-3 animate-fade-in font-mono text-[10px] shadow-inner">
                          <div className="space-y-1.5">
                            <label className="text-slate-400 font-bold uppercase block text-[9px] tracking-wider">
                              Override Justification & Notes
                            </label>
                            <textarea 
                              rows={2}
                              value={overrideNote}
                              onChange={(e) => setOverrideNote(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none focus:border-indigo-500 resize-none text-[10px] leading-relaxed font-sans"
                              required
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              disabled={isSubmittingOverride}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 text-[10px]"
                            >
                              {isSubmittingOverride ? 'Submitting Override...' : 'Confirm Whitelist Override'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsOverriding(false)}
                              className="bg-slate-900 border-slate-800 text-slate-450 hover:bg-slate-850 hover:text-white h-7 text-[10px]"
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      )
                    )}

                    {/* Environment details metrics */}
                    <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-xl font-mono text-[10px] space-y-2 text-slate-300 shadow-sm">
                      <div className="text-slate-500 uppercase font-bold text-[8px] border-b border-slate-800 pb-1.5 flex justify-between tracking-wider">
                        <span>Diagnostic Coordinates Payload</span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[9px] text-slate-400">
                        <div>IP Coordinates: <span className="text-slate-200 block font-bold mt-0.5">{selectedEvent.ip}</span></div>
                        <div>Geolocation: <span className="text-slate-200 block font-bold mt-0.5">{selectedEvent.country} / {selectedEvent.country === 'RU' ? 'MoscowSubnet' : selectedEvent.country === 'IT' ? 'RomeSubnet' : 'TiranaSubnet'}</span></div>
                        <div className="col-span-2 truncate">Browser User Agent: <span className="text-slate-200 block font-bold mt-0.5 truncate text-[8px]" title={selectedEvent.userAgent}>{selectedEvent.userAgent}</span></div>
                        <div>Device Token: <span className="text-slate-200 block font-bold mt-0.5 truncate text-[8px]">{selectedEvent.deviceFingerprint?.replace('fp_', '').toUpperCase()}</span></div>
                        <div>Input Cadence: <span className="text-slate-200 block font-bold mt-0.5 uppercase">{selectedEvent.inputMethod || 'TYPED'}</span></div>
                        {selectedEvent.typingSpeedMs !== undefined && (
                          <div>Cadence Speed: <span className="text-slate-200 block font-bold mt-0.5">{selectedEvent.typingSpeedMs} ms/key</span></div>
                        )}
                        {selectedEvent.amount !== undefined && (
                          <div>Transaction Value: <span className="text-slate-200 block font-bold mt-0.5">€{selectedEvent.amount.toFixed(2)}</span></div>
                        )}
                        {selectedEvent.payeeName !== undefined && (
                          <div className="col-span-2">Recipient Payee: <span className="text-slate-200 block font-bold mt-0.5 truncate">{selectedEvent.payeeName}</span></div>
                        )}
                      </div>
                    </div>

                    {/* Signals List */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold font-mono text-slate-500 uppercase tracking-wider block">
                        Evaluated Risk Factors ({selectedEvent.signals?.length || 0})
                      </span>
                      
                      <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                        {selectedEvent.signals && selectedEvent.signals.length > 0 ? (
                          selectedEvent.signals.map((sig, sIdx) => {
                            const signalScoreColor = getScoreDetails(sig.weight);
                            return (
                              <div key={sIdx} className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl space-y-1.5 font-mono text-[10px] shadow-sm">
                                <div className="flex justify-between items-start font-bold">
                                  <span className={cn(
                                    sig.layer === 'network' && "text-sky-400",
                                    sig.layer === 'behavioral' && "text-indigo-400",
                                    sig.layer === 'transactional' && "text-amber-400",
                                    "flex items-center gap-1.5"
                                  )}>
                                    <Layers className="w-3 h-3 text-slate-400" /> [{sig.layer.toUpperCase()}] {sig.name}
                                  </span>
                                  <span className={signalScoreColor.text}>+{sig.weight}</span>
                                </div>

                                {/* Progress Weight Bar */}
                                <div className="w-full bg-slate-900 border border-slate-850 rounded-full h-1 overflow-hidden">
                                  <div 
                                    className={cn("h-full rounded-full", signalScoreColor.fill)}
                                    style={{ width: `${Math.min((sig.weight / 40) * 100, 100)}%` }}
                                  />
                                </div>

                                <p className="text-slate-450 leading-relaxed text-[9px] font-sans mt-0.5">
                                  "{sig.reason}"
                                </p>
                              </div>
                            );
                          })
                        ) : (
                          <div className="bg-emerald-950/20 border border-emerald-900/20 text-emerald-400 p-3 rounded-xl flex items-center gap-2.5 font-sans text-xs select-none">
                            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                            <span>Telemetry matches clean behavioral baseline profile.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ACTION BAR */}
                  <div className="pt-3 border-t border-slate-800 mt-2 select-none">
                    {!selectedEvent.overridden && !isOverriding && (
                      <Button
                        onClick={() => setIsOverriding(true)}
                        className="w-full bg-slate-950 border border-slate-850 hover:border-emerald-600 hover:bg-slate-900 hover:text-emerald-400 text-slate-300 font-bold py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs font-mono uppercase tracking-wider"
                      >
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                        <span>Submit Whitelist Override</span>
                      </Button>
                    )}
                    {selectedEvent.overridden && (
                      <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 py-2 rounded-xl flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
                        <CheckCircle className="w-4 h-4" />
                        <span>Whitelist Override Active</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
