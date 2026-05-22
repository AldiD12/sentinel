"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { SentinelEvent, RiskAssessment, ProcessedEvent, EventType, UserBaseline } from '@/lib/types';
import { USERS } from '@/lib/users';
import { submitEvent } from '@/lib/mock-api';

interface TelemetryConfig {
  ip: string;
  country: string;
  asn: string;
  userAgent: string;
  deviceFingerprint: string;
  attackScenario: string;
}

interface SessionContextType {
  userId: string | null;
  sessionId: string | null;
  sessionStartMs: number | null;
  precedingEvents: ProcessedEvent[];
  userBaseline: UserBaseline | null;
  telemetryConfig: TelemetryConfig;
  updateTelemetryConfig: (config: Partial<TelemetryConfig>) => void;
  login: (userId: string, options?: { customUA?: string; customDevice?: string }) => Promise<RiskAssessment>;
  logout: () => void;
  submitBankEvent: (type: EventType, details?: Partial<SentinelEvent>) => Promise<RiskAssessment>;
  knownPayeesList: { id: string; name: string }[];
  addLocalPayee: (id: string, name: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Helper to generate simple client-side UUID
function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Map payee IDs to friendly names for high fidelity display
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

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);
  const [precedingEvents, setPrecedingEvents] = useState<ProcessedEvent[]>([]);
  const [knownPayeesList, setKnownPayeesList] = useState<{ id: string; name: string }[]>([]);

  // Telemetry configuration - dynamically adjustable (perfect for /app/attacker later!)
  const [telemetryConfig, setTelemetryConfig] = useState<TelemetryConfig>({
    ip: '',
    country: 'AL',
    asn: '',
    userAgent: '',
    deviceFingerprint: '',
    attackScenario: 'none',
  });

  // Keep track of local storage for session recovery if desired
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUserId = localStorage.getItem('sentinel_userId');
      const savedSessionId = localStorage.getItem('sentinel_sessionId');
      const savedStart = localStorage.getItem('sentinel_sessionStartMs');
      const savedTelemetry = localStorage.getItem('sentinel_telemetry');

      if (savedUserId && savedSessionId && savedStart) {
        setUserId(savedUserId);
        setSessionId(savedSessionId);
        setSessionStartMs(Number(savedStart));
        
        const baseline = USERS[savedUserId];
        if (baseline) {
          const payees = baseline.knownPayees.map(id => ({
            id,
            name: PAYEE_NAMES[id] || id.replace('payee_', '').toUpperCase()
          }));
          setKnownPayeesList(payees);
        }
      }

      if (savedTelemetry) {
        try {
          setTelemetryConfig(JSON.parse(savedTelemetry));
        } catch (e) {}
      }
    }
  }, []);

  const updateTelemetryConfig = (config: Partial<TelemetryConfig>) => {
    setTelemetryConfig(prev => {
      const next = { ...prev, ...config };
      localStorage.setItem('sentinel_telemetry', JSON.stringify(next));
      return next;
    });
  };

  const login = async (selectedUserId: string, options?: { customUA?: string; customDevice?: string }) => {
    const baseline = USERS[selectedUserId];
    if (!baseline) throw new Error(`User baseline not found for ${selectedUserId}`);

    const newSessionId = generateUUID();
    const startTime = Date.now();

    // Default telemetry values based on user baseline
    const defaultTelemetry: TelemetryConfig = {
      ip: baseline.usualIPs[0],
      country: baseline.usualCountry,
      asn: baseline.usualASNs[0],
      userAgent: options?.customUA || baseline.usualUserAgent,
      deviceFingerprint: options?.customDevice || baseline.usualDevices[0],
      attackScenario: 'none',
    };

    setUserId(selectedUserId);
    setSessionId(newSessionId);
    setSessionStartMs(startTime);
    setPrecedingEvents([]);
    setTelemetryConfig(defaultTelemetry);

    localStorage.setItem('sentinel_userId', selectedUserId);
    localStorage.setItem('sentinel_sessionId', newSessionId);
    localStorage.setItem('sentinel_sessionStartMs', startTime.toString());
    localStorage.setItem('sentinel_telemetry', JSON.stringify(defaultTelemetry));

    // Setup initial payees list
    const payees = baseline.knownPayees.map(id => ({
      id,
      name: PAYEE_NAMES[id] || id.replace('payee_', '').toUpperCase()
    }));
    setKnownPayeesList(payees);

    // Call submitEvent for the 'login' action
    const event: SentinelEvent = {
      userId: selectedUserId,
      type: 'login',
      timestamp: startTime,
      ip: defaultTelemetry.ip,
      country: defaultTelemetry.country,
      asn: defaultTelemetry.asn,
      userAgent: defaultTelemetry.userAgent,
      deviceFingerprint: defaultTelemetry.deviceFingerprint,
      attackScenario: 'none',
      inputMethod: 'typed', // standard typed click
    };

    const assessment = await submitEvent(event);
    const processedEvent: ProcessedEvent = {
      ...event,
      id: assessment.eventId,
      ...assessment,
    };

    setPrecedingEvents([processedEvent]);
    return assessment;
  };

  const logout = () => {
    setUserId(null);
    setSessionId(null);
    setSessionStartMs(null);
    setPrecedingEvents([]);
    setKnownPayeesList([]);
    setTelemetryConfig({
      ip: '',
      country: 'AL',
      asn: '',
      userAgent: '',
      deviceFingerprint: '',
      attackScenario: 'none',
    });

    localStorage.removeItem('sentinel_userId');
    localStorage.removeItem('sentinel_sessionId');
    localStorage.removeItem('sentinel_sessionStartMs');
    localStorage.removeItem('sentinel_telemetry');
  };

  const submitBankEvent = async (type: EventType, details?: Partial<SentinelEvent>) => {
    if (!userId || !sessionId) {
      throw new Error("Cannot submit event: No active session.");
    }

    // Merge baseline telemetry (or overrides) with custom event details
    const event: SentinelEvent = {
      userId,
      type,
      timestamp: Date.now(),
      ip: telemetryConfig.ip,
      country: telemetryConfig.country,
      asn: telemetryConfig.asn,
      userAgent: telemetryConfig.userAgent,
      deviceFingerprint: telemetryConfig.deviceFingerprint,
      attackScenario: telemetryConfig.attackScenario !== 'none' ? telemetryConfig.attackScenario : undefined,
      ...details,
    };

    const assessment = await submitEvent(event);
    const processed: ProcessedEvent = {
      ...event,
      id: assessment.eventId,
      ...assessment,
    };

    setPrecedingEvents(prev => [...prev, processed]);
    return assessment;
  };

  const addLocalPayee = (id: string, name: string) => {
    setKnownPayeesList(prev => [...prev, { id, name }]);
  };

  const userBaseline = userId ? USERS[userId] : null;

  return (
    <SessionContext.Provider value={{
      userId,
      sessionId,
      sessionStartMs,
      precedingEvents,
      userBaseline,
      telemetryConfig,
      updateTelemetryConfig,
      login,
      logout,
      submitBankEvent,
      knownPayeesList,
      addLocalPayee,
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
