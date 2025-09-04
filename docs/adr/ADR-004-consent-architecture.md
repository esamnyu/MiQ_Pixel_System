# ADR-004: Consent Architecture (TCF 2.2, GPC)

## Status
Accepted

## Context
Legal requirement to honor user consent for data collection and processing. Must support TCF 2.2 (EU), GPC (California), and future privacy frameworks.

## Decision

### Consent Framework Support
- **TCF 2.2** via `__tcfapi` (EU/UK)
- **Global Privacy Control** (GPC) header/JS API
- **Fallback consent modes** for non-TCF regions
- **Default deny** until explicit consent

### Consent State Model
```typescript
interface ConsentState {
  tcf?: {
    version: '2.2';
    cmpId: number;
    purposes: Record<number, boolean>;  // 1-11
    specialFeatures: Record<number, boolean>;
    vendorConsent: Record<number, boolean>;
    vendorLI: Record<number, boolean>;
    publisherCC: string;  // Country code
  };
  gpc: boolean;
  customConsent?: {
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
  };
  jurisdiction: 'EU' | 'CA' | 'US' | 'ROW';
  timestamp: string;
}
```

### Consent Gating Architecture
```typescript
// Three-tier consent checking
1. Client-side: Block SDK initialization
2. Server-side: Validate consent before processing  
3. Partner-side: Include consent string in S2S calls

// Required TCF purposes for operation
- Purpose 1: Store/access information (required)
- Purpose 7: Measure ad performance (required)
- Purpose 9: Market research (optional)
- Purpose 10: Product development (optional)
```

### Data Collection Rules by Consent
```typescript
NO_CONSENT: {
  collect: false,  // No data collection
  process: false,  // No processing
  s2s: false       // No partner syncing
}

PARTIAL_CONSENT: {
  collect: ['pageview', 'technical'],  // Basic analytics only
  process: true,    // Anonymous processing only
  s2s: false,       // No partner syncing
  hash_pii: true    // Always hash PII
}

FULL_CONSENT: {
  collect: '*',     // All event types
  process: true,    // Full enrichment
  s2s: true,        // Partner syncing allowed
  hash_pii: true    // Still hash PII for security
}
```

### GPC Handling
```typescript
if (navigator.globalPrivacyControl || gpcHeader) {
  // Auto-enable privacy mode
  consentState.gpc = true;
  
  // Jurisdiction-specific behavior
  if (jurisdiction === 'CA') {
    // Treat as opt-out of sale
    disableMarketing();
    disablePartnerSync();
  }
}
```

### Consent Change Management
- **Real-time updates** via CMP callbacks
- **Pause/resume** tracking on consent change
- **Purge queue** for events collected without consent
- **Consent log** for audit trail

### CMP Integration Points
```typescript
interface CMPAdapter {
  name: string;
  getTCFData(): Promise<TCData>;
  onConsentChange(callback: (consent: ConsentState) => void): void;
  requestConsent(): Promise<void>;
}

// Supported CMPs (via adapters)
- OneTrust
- Cookiebot  
- Usercentrics
- Quantcast Choice
- Custom CMP via standardized API
```

## Consequences
- Reduced data collection in non-consent scenarios
- Complex routing logic based on consent state
- Need for consent state synchronization across services
- Regular audits required for compliance

## Alternatives Considered
- **Server-side consent only**: Can't block client collection fast enough
- **Legitimate Interest only**: Legal risk, user trust issues
- **Geo-blocking**: Poor UX, lost legitimate traffic
- **No consent management**: Legal non-compliance, fines