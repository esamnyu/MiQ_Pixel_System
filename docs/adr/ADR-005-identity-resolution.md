# ADR-005: Identity Resolution Policy

## Status
Accepted

## Context
Need to link user interactions across devices and sessions while respecting privacy regulations and avoiding prohibited fingerprinting techniques.

## Decision

### Identity Resolution Hierarchy
```typescript
Priority Order:
1. Deterministic (authenticated user ID) - PRIMARY
2. First-party cookie (same device)
3. Local storage ID (fallback)
4. Probabilistic (IP + UA family) - CONSENT REQUIRED & FEATURE FLAGGED
```

### Deterministic Identity
```typescript
interface DeterministicID {
  type: 'email' | 'phone' | 'account_id' | 'crm_id';
  value: string;        // Always SHA-256 hashed
  confidence: 1.0;      // 100% confidence
  source: 'login' | 'form' | 'api';
  timestamp: string;
}

// Hashing policy
hashEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  return sha256(normalized + SALT);  // SALT rotated quarterly
}
```

### Cookie Strategy
```typescript
// First-party cookie
Name: _miq_id
Domain: .client-domain.com  // First-party only
SameSite: Lax
Secure: true
HttpOnly: true
Max-Age: 31536000  // 1 year
Value: UUIDv4

// Backup: localStorage
Key: _miq_device_id
Value: UUIDv4
Fallback: sessionStorage if localStorage blocked
```

### Probabilistic Matching (Constrained)
```typescript
// ONLY enabled with:
// 1. Explicit consent (TCF Purpose 1 & 3)
// 2. Feature flag enabled
// 3. Non-EU/UK jurisdiction

interface ProbabilisticSignals {
  ipPrefix: string;      // First 3 octets only (privacy)
  userAgentFamily: string;  // Browser family, not full UA
  timezone: string;
  language: string;
  // Explicitly NOT using: canvas, webGL, fonts, plugins
}

confidence = calculateMatchConfidence(signals);
if (confidence < 0.85) {
  // Don't link - too uncertain
  createNewIdentity();
}
```

### Cross-Device Linking Rules
```
ALLOWED:
- Email/phone hash match (deterministic)
- Explicit account login
- CRM ID match

NOT ALLOWED:
- IP-only matching
- Browser fingerprinting
- Canvas/WebGL fingerprinting
- Cross-site tracking without consent
```

### Identity Graph Storage
```typescript
interface IdentityGraph {
  canonicalId: string;          // Primary ID
  deterministicIds: DeterministicID[];
  deviceIds: string[];
  lastSeen: Date;
  confidence: number;
  mergedFrom: string[];         // Audit trail
  jurisdiction: string;
  consentStatus: ConsentState;
}

// Retention: 
// - EU: 13 months max
// - US: 24 months max
// - Delete on opt-out
```

### Privacy Controls
- **Right to deletion**: Full graph purge within 30 days
- **Export on request**: GDPR/CCPA data portability
- **Consent-gated merge**: Only merge with full consent
- **Audit log**: All identity operations logged

## Consequences
- Conservative approach may reduce match rates
- Deterministic-first reduces legal risk
- Clear audit trail for compliance
- Need identity graph visualization tools for debugging

## Alternatives Considered
- **Universal ID solutions**: Privacy concerns, browser blocking
- **FLoC/Topics API**: Not mature, limited adoption
- **Full fingerprinting**: Legal risk, browser countermeasures
- **No identity resolution**: Severely limited attribution capabilities