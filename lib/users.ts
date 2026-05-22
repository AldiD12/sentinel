// /lib/users.ts
import type { UserBaseline } from './types';

export const USERS: Record<string, UserBaseline> = {
  user_001: {
    userId: 'user_001',
    name: 'Aldi Hoxha',
    usualIPs: ['85.31.45.12', '85.31.45.13'],
    usualASNs: ['AS21246 Vodafone AL'],
    usualCountry: 'AL',
    usualDevices: ['fp_aldi_iphone'],
    usualUserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
    avgTransferAmount: 120,
    stdTransferAmount: 40,
    knownPayees: ['payee_mom', 'payee_landlord', 'payee_dentist'],
    typicalTypingSpeedMs: 180,
  },
  user_002: {
    userId: 'user_002',
    name: 'Anest Buci',
    usualIPs: ['85.31.50.22'],
    usualASNs: ['AS21246 Vodafone AL'],
    usualCountry: 'AL',
    usualDevices: ['fp_anest_samsung'],
    usualUserAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B)',
    avgTransferAmount: 80,
    stdTransferAmount: 30,
    knownPayees: ['payee_family', 'payee_internet', 'payee_gym'],
    typicalTypingSpeedMs: 160,
  },
  user_003: {
    userId: 'user_003',
    name: 'Kristi Hoxha',
    usualIPs: ['85.27.10.5'],
    usualASNs: ['AS8585 ALBtelecom'],
    usualCountry: 'AL',
    usualDevices: ['fp_kristi_macbook'],
    usualUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    avgTransferAmount: 300,
    stdTransferAmount: 100,
    knownPayees: ['payee_business', 'payee_rent', 'payee_supplier'],
    typicalTypingSpeedMs: 145,
  },
};
