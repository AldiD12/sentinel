'use client';
import { createContext, useContext, useState, useRef, ReactNode } from 'react';
import type { EventType, SentinelEvent, RiskAssessment, ProcessedEvent } from './types';

type SessionCtx = {
  userId: string;
  sessionId: string;
  sessionStartMs: number;
  precedingEvents: EventType[];
  setUser: (id: string) => void;
  pushEvent: (type: EventType) => void;
  
  // Extension for live threat analytics drawer
  latestAssessment: RiskAssessment | null;
  precedingAssessments: ProcessedEvent[];
  addAssessment: (event: SentinelEvent, assessment: RiskAssessment) => void;
};

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState('');
  const sessionId = useRef(crypto.randomUUID());
  const sessionStartMs = useRef(Date.now());
  const [precedingEvents, setPreceding] = useState<EventType[]>([]);
  
  // Live analytics state
  const [latestAssessment, setLatestAssessment] = useState<RiskAssessment | null>(null);
  const [precedingAssessments, setPrecedingAssessments] = useState<ProcessedEvent[]>([]);

  function setUser(id: string) {
    setUserId(id);
    sessionId.current = crypto.randomUUID();
    sessionStartMs.current = Date.now();
    setPreceding([]);
    setLatestAssessment(null);
    setPrecedingAssessments([]);
  }

  function pushEvent(type: EventType) {
    setPreceding(prev => [...prev.slice(-10), type]);
  }

  function addAssessment(event: SentinelEvent, assessment: RiskAssessment) {
    setLatestAssessment(assessment);
    const processed: ProcessedEvent = {
      ...event,
      ...assessment
    };
    setPrecedingAssessments(prev => [...prev, processed]);
  }

  return (
    <Ctx.Provider value={{
      userId, 
      sessionId: sessionId.current,
      sessionStartMs: sessionStartMs.current,
      precedingEvents, 
      setUser, 
      pushEvent,
      latestAssessment,
      precedingAssessments,
      addAssessment
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx)!;
