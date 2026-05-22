'use client';
import { createContext, useContext, useState, useRef, ReactNode } from 'react';
import type { EventType, SentinelEvent, RiskAssessment, ProcessedEvent } from './types';
import { USERS } from './users';

const PAYEE_NAMES: Record<string, string> = {
  payee_mom: 'Valbona Hoxha (Mom)',
  payee_landlord: 'Ilir Shkodra (Landlord)',
  payee_dentist: 'Dr. Klodian (Dentist)',
  payee_family: 'Buci Family Account',
  payee_internet: 'Abcom Broadband AL',
  payee_gym: 'Fieri Fitness Center',
  payee_business: 'Hoxha Consulting Sh.p.k.',
  payee_rent: 'Tirana Business Park Rent',
  payee_supplier: 'Ego Office Supplies',
};

type SessionCtx = {
  userId: string;
  sessionId: string;
  sessionStartMs: number;
  precedingEvents: EventType[];
  setUser: (id: string) => void;
  pushEvent: (type: EventType) => void;
  
  // High fidelity extensions
  latestAssessment: RiskAssessment | null;
  precedingAssessments: ProcessedEvent[];
  addAssessment: (event: SentinelEvent, assessment: RiskAssessment) => void;
  
  // Payee Whitelisting state
  knownPayeesList: { id: string; name: string }[];
  addLocalPayee: (id: string, name: string) => void;
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
  
  // Payee state
  const [knownPayeesList, setKnownPayeesList] = useState<{ id: string; name: string }[]>([]);

  function setUser(id: string) {
    setUserId(id);
    sessionId.current = crypto.randomUUID();
    sessionStartMs.current = Date.now();
    setPreceding([]);
    setLatestAssessment(null);
    setPrecedingAssessments([]);
    
    // Load initial payee baseline
    const baseline = USERS[id];
    if (baseline) {
      const payees = baseline.knownPayees.map(pid => ({
        id: pid,
        name: PAYEE_NAMES[pid] || pid.replace('payee_', '').toUpperCase()
      }));
      setKnownPayeesList(payees);
    } else {
      setKnownPayeesList([]);
    }
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

  function addLocalPayee(id: string, name: string) {
    setKnownPayeesList(prev => [...prev, { id, name }]);
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
      addAssessment,
      knownPayeesList,
      addLocalPayee
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx)!;
