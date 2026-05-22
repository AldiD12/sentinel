// /lib/types.ts

export type EventType =
  | 'login'
  | 'view_balance'
  | 'add_payee'
  | 'transfer'
  | 'change_password'
  | 'request_flood';

export type Verdict = 'allow' | 'soft_challenge' | 'hard_challenge' | 'block';

export type Layer = 'network' | 'behavioral' | 'transactional';

export interface Signal {
  name: string;
  layer: Layer;
  weight: number;
  reason: string;
}

export interface UserBaseline {
  userId: string;
  name: string;
  usualIPs: string[];
  usualASNs: string[];
  usualCountry: string;
  usualDevices: string[];
  usualUserAgent: string;
  avgTransferAmount: number;
  stdTransferAmount: number;
  knownPayees: string[];
  typicalTypingSpeedMs: number;
}

export interface SentinelEvent {
  id?: string;
  userId: string;
  type: EventType;
  timestamp?: number;
  ip: string;
  country?: string;
  geoCountry?: string;
  geoCity?: string;
  asn?: string;
  userAgent: string;
  deviceFingerprint: string;
  inputMethod?: 'typed' | 'pasted' | 'autofill';
  amount?: number;
  payeeId?: string;
  payeeName?: string;
  isKnownPayee?: boolean;
  requestRateLastMinute?: number;
  attackScenario?: string;
  typingSpeedMs?: number;
  precedingEvents?: string[];
}

export interface RiskAssessment {
  eventId: string;
  score: number;
  verdict: Verdict;
  signals: Signal[];
  latencyMs: number;
  overridden?: boolean;
  overrideNote?: string;
}

// ProcessedEvent is what gets stored and streamed — combines raw event + assessment
export type ProcessedEvent = SentinelEvent & RiskAssessment;
