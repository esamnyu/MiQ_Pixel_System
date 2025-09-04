# ADR-006: CDN and Edge Strategy

## Status
Accepted

## Context
Global distribution of tracking SDK requires low latency, high availability, and efficient caching while maintaining real-time configuration updates.

## Decision

### CDN Architecture
- **Primary CDN**: CloudFlare (global presence, edge workers)
- **Fallback CDN**: Fastly (redundancy)
- **Multi-CDN**: DNS-based failover via Route53

### Asset Distribution
```typescript
// Static assets (long cache)
https://cdn.miqpixel.com/sdk/v1/miq.min.js
Cache-Control: public, max-age=86400, immutable  // 24 hours
ETag: <version-hash>
Vary: Accept-Encoding

// Dynamic config (short cache)  
https://config.miqpixel.com/sites/{siteId}/config.json
Cache-Control: public, max-age=300, stale-while-revalidate=60  // 5 min
ETag: <config-version>
```

### Edge Worker Functions
```typescript
// CloudFlare Worker for:
1. Geographic routing (GDPR region detection)
2. Config injection based on origin
3. SDK version negotiation
4. Consent pre-check via GPC header
5. Bot detection and filtering

// Example worker
addEventListener('fetch', event => {
  const country = event.request.headers.get('CF-IPCountry');
  const gpc = event.request.headers.get('Sec-GPC');
  
  if (EU_COUNTRIES.includes(country)) {
    // Serve privacy-first variant
    event.respondWith(serveGDPRVersion(event.request));
  }
});
```

### Cache Strategy
```typescript
interface CacheTiers {
  // L1: Browser cache
  browser: {
    sdk: '24h',
    config: '5m',
    maxSize: '50KB'
  },
  
  // L2: CDN edge
  edge: {
    sdk: '7d',
    config: '5m',
    purgeOn: ['deploy', 'config-change']
  },
  
  // L3: Origin shield
  shield: {
    sdk: '30d',
    config: '1m',
    location: 'us-east-1'
  }
}
```

### Cache Invalidation
```typescript
// Instant purge capabilities
1. Tag-based purging (CloudFlare)
2. Surrogate keys (Fastly)
3. Pattern-based: /sdk/v1/*
4. Global purge (emergency only)

// Purge triggers
- New SDK version deployment
- Critical security patch
- Config update for site
- Consent framework change
```

### Performance Optimization
```typescript
// Compression
- Brotli (primary): ~30% better than gzip
- Gzip (fallback): Universal support
- Target: <10KB compressed SDK

// HTTP/3 + QUIC
- 0-RTT connection resumption
- Reduced latency for repeat visitors
- Fallback to HTTP/2

// Preloading
<link rel="preconnect" href="https://cdn.miqpixel.com">
<link rel="dns-prefetch" href="https://collect.miqpixel.com">
<link rel="preload" as="script" href="https://cdn.miqpixel.com/sdk/v1/miq.min.js">
```

### Geographic Distribution
```
PoPs (Points of Presence):
- Americas: 40 locations
- Europe: 35 locations  
- Asia-Pacific: 30 locations
- China: Via separate CDN partner (regulatory)

Failover priorities:
1. Nearest PoP
2. Same continent
3. Global anycast
```

### Config Service Design
```typescript
interface ConfigUpdate {
  siteId: string;
  version: string;
  config: SiteConfig;
  effectiveAt?: Date;  // Schedule updates
  purgeCDN: boolean;
}

// Real-time updates via:
1. Redis pub/sub for config changes
2. CDN API purge
3. WebSocket push to active clients (future)
```

## Consequences
- Excellent global performance (<50ms latency for 95% users)
- Complex cache invalidation workflows
- Multi-CDN costs (~$5K/month baseline)
- Need monitoring across all PoPs

## Alternatives Considered
- **Single CDN**: Single point of failure
- **Self-hosted edges**: Operational overhead
- **No CDN**: Unacceptable latency for global users
- **AWS CloudFront only**: Limited edge compute capabilities