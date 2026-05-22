@"/Users/aldid/Downloads/fibank-sentinel" # SENTINEL — Multi-Layer Fraud Detection System

## Mission
Fibank Hackathon 2026. Build an explainable, multi-layer fraud detection
system that catches what single-layer systems miss, and explains every
decision in one screen so analysts don't spend 20 minutes correlating logs.

## Stack (HARD CONSTRAINTS)
- Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- Server-Sent Events for real-time dashboard
- In-memory state only (Map/Set). NO database. NO Redis. NO Python.
- No auth, no real users, hard-coded baselines
- Single repo, 3 sub-apps under /app

## Structure
- /app/bank/*       — mock Fibank mobile banking UI
- /app/attacker/*   — red team console with 5 attack buttons
- /app/soc/*        — security operations dashboard
- /app/api/events   — POST: event ingestion
- /app/api/stream   — GET: SSE stream to dashboard
- /app/api/override — POST: analyst override
- /app/api/siem     — POST: mock SIEM forward endpoint (logs to console)
- /lib/sentinel/    — detection engine
- /lib/store.ts     — in-memory event/decision store
- /lib/users.ts     — hard-coded user baselines
- /lib/types.ts     — shared types

## Event Schema
[paste the SentinelEvent type from previous plan]

## 12 Detection Signals
Network layer:
- unknown_network (+20)
- impossible_travel (+35)
- request_flood (+40)  ← mini-DoS signal
- high_risk_geo (+25)

Behavioral layer:
- no_human_input (+25)
- pasted_credentials (+15)
- api_replay_pattern (+30)
- transfer_velocity (+25)

Transactional layer:
- amount_anomaly (+25)
- new_payee_large (+20)
- rapid_payee_transfer (+25)
- round_large_amount (+10)

## Risk Tiers
- 0-30:  allow
- 31-60: soft_challenge (SMS OTP modal)
- 61-85: hard_challenge (full re-auth modal)
- 86+:   block + alert + SIEM forward

## 3 Hard-Coded Users
user_001: Aldi — Tirana, iPhone, avg €120 transfer, payees: mom/landlord/dentist
user_002: Anest — Tirana, Samsung, avg €80, payees: family/internet/gym
user_003: Kristi — Durres, MacBook, avg €300, payees: business/rent

## 5 Attack Scenarios (attacker console buttons)
1. Phishing Login — stolen creds from RU IP, curl UA, pasted password
2. Account Takeover — login + add payee + €5000 transfer in 8 seconds
3. API Replay — direct POST /transfer, no preceding view_balance
4. Mini-DoS Cover — 50 req/s on /balance + transfer in the middle
5. Legitimate Travel — Italy IP but SAME device, normal typing, €80 to known payee

Scenario 5 MUST result in allow or soft_challenge. This proves false-positive control.

## Demo Flow (3 min)
[paste demo script from previous plan]

## Anti-rules (DO NOT)
- Do not add a database
- Do not add ML libraries (sklearn, tensorflow, etc.)
- Do not add authentication
- Do not add features after 09:00 next day
- Do not block scenario 5
