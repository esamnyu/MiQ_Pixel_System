# ADR-007: Security Model

## Status
Accepted

## Context
Tracking pixels are attractive targets for XSS, data theft, and abuse. We need comprehensive security controls while maintaining performance.

## Decision

### Content Security Policy (CSP) Support
```typescript
// Nonce-based script loading
<script nonce="{random-nonce}" src="https://cdn.miqpixel.com/sdk/v1/miq.min.js"></script>

// SDK respects CSP
if (document.currentScript?.nonce) {
  const nonce = document.currentScript.nonce;
  // Apply to dynamically created scripts
}

// Recommended CSP header
Content-Security-Policy: 
  script-src 'nonce-{random}' https://cdn.miqpixel.com;
  connect-src https://collect.miqpixel.com;
  img-src https://collect.miqpixel.com;
```

### Input Validation & Sanitization
```typescript
class SecurityValidator {
  // Length limits
  static readonly LIMITS = {
    string: 1000,
    email: 254,
    url: 2048,
    customData: 10000,
    arraySize: 100
  };

  // Validation rules
  static sanitizeTrackingData(data: any): SanitizedData {
    // 1. Type coercion
    // 2. Length truncation
    // 3. Character allowlisting
    // 4. SQL/NoSQL injection prevention
    // 5. XSS prevention (HTML encoding)
    // 6. Path traversal prevention
    
    return {
      ...data,
      email: this.hashPII(this.normalizeEmail(data.email)),
      phone: this.hashPII(this.normalizePhone(data.phone)),
      customData: this.sanitizeObject(data.customData)
    };
  }

  // PII handling
  static hashPII(value: string): string {
    if (!value) return '';
    const normalized = value.toLowerCase().trim();
    return crypto
      .createHash('sha256')
      .update(normalized + process.env.PII_SALT!)
      .digest('hex');
  }
}
```

### SSRF Prevention
```typescript
// URL validation for webhooks/callbacks
class URLValidator {
  private static BLOCKED = [
    '127.0.0.1', 'localhost',
    '169.254.169.254',  // AWS metadata
    '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'  // Private IPs
  ];

  static isAllowed(url: string): boolean {
    const parsed = new URL(url);
    // Check against blocklist
    // Verify HTTPS only
    // Validate public DNS
    return true;
  }
}
```

### Secrets Management
```typescript
// AWS Secrets Manager / HashiCorp Vault
interface SecretRotation {
  service: 'dv360' | 'ttd' | 'yahoo' | 'amazon';
  currentVersion: string;
  previousVersion: string;  // For graceful rotation
  rotationSchedule: '90d';
  lastRotated: Date;
}

// Environment-based secrets
NODE_ENV=production
PII_SALT=${SECRET_PII_SALT}  // Rotated quarterly
API_KEY_DV360=${SECRET_DV360_KEY}
JWT_SECRET=${SECRET_JWT}  // For admin APIs
```

### Authentication & Authorization
```typescript
// SDK: No auth needed (public)

// Collection API: Optional API key for premium features
Authorization: Bearer {api-key}

// Admin API: JWT with role-based access
interface AdminToken {
  sub: string;  // User ID
  roles: ('admin' | 'viewer' | 'developer')[];
  sites: string[];  // Authorized site IDs
  exp: number;
}

// Partner S2S: mTLS where supported
{
  cert: fs.readFileSync('partner-cert.pem'),
  key: fs.readFileSync('partner-key.pem'),
  ca: fs.readFileSync('partner-ca.pem')
}
```

### Rate Limiting
```typescript
// Per-IP rate limits (Redis-backed)
const limits = {
  '/collect': {
    window: '1m',
    max: 1000,  // 1000 requests per minute
    keyGenerator: (req) => req.ip
  },
  '/config/*': {
    window: '1m',
    max: 100
  }
};

// Per-site limits (prevent abuse)
const siteLimits = {
  free: 100_000,    // Events per day
  pro: 1_000_000,
  enterprise: Infinity
};
```

### Security Headers
```typescript
// Response headers
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Vulnerability Management
- **SAST**: CodeQL, Semgrep in CI
- **DAST**: OWASP ZAP weekly scans  
- **Dependencies**: Snyk/Dependabot daily
- **Container scanning**: Trivy for Docker images
- **Penetration testing**: Annual third-party

## Consequences
- Slightly increased latency from validation (~5ms)
- CSP nonce requires server-side rendering
- Secret rotation requires coordination with partners
- Security overhead worth the risk mitigation

## Alternatives Considered
- **WAF only**: Doesn't catch application-level issues
- **Client-side only validation**: Easily bypassed
- **No CSP support**: Major security weakness
- **Plain text PII**: Unacceptable privacy risk