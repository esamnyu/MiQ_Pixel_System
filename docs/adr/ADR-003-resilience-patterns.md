# ADR-003: Circuit Breaker and Retry Strategy

## Status
Accepted

## Context
Partner APIs (DV360, TTD, Yahoo, Amazon) have varying reliability. We need resilience patterns to prevent cascading failures and maintain service availability.

## Decision

### Circuit Breaker Implementation
- **Opossum** library for Node.js circuit breakers
- **Per-partner** circuit breaker instances
- **Shared state** in Redis for distributed coordination

### Circuit Breaker Configuration
```typescript
{
  timeout: 3000,           // 3s request timeout
  errorThresholdPercentage: 50,  // Trip at 50% error rate
  resetTimeout: 30000,     // Try again after 30s
  rollingCountTimeout: 10000,    // 10s rolling window
  rollingCountBuckets: 10,        // 1s buckets
  volumeThreshold: 20      // Min 20 requests before tripping
}
```

### States and Transitions
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Failing, reject requests immediately  
- **HALF_OPEN**: Testing recovery with limited traffic

### Retry Strategy with Exponential Backoff
```typescript
interface RetryConfig {
  maxAttempts: 7;
  baseDelay: 1000;      // 1 second
  maxDelay: 64000;      // 64 seconds cap
  factor: 2;            // Exponential factor
  jitter: 0.25;         // ±25% randomization
}

// Delays: 1s, 2s, 4s, 8s, 16s, 32s, 64s (±25%)
```

### Request Resilience Patterns
1. **Timeout**: 3s hard limit per request
2. **Retry**: Only for 5xx, network errors, timeouts
3. **Bulkhead**: Isolated connection pools per partner
4. **Rate Limiting**: Respect partner quotas (tracked in Redis)
5. **Hedging**: Not implemented initially (complexity vs benefit)

### Health Checks
```typescript
interface PartnerHealth {
  partner: string;
  circuitState: 'closed' | 'open' | 'half-open';
  successRate: number;    // Last 5 minutes
  latencyP50: number;
  latencyP99: number;
  queueDepth: number;
  lastError?: string;
  lastSuccessAt?: Date;
}
```

### Fallback Strategies
- **Queue for retry**: Failed requests go to partner-specific retry queue
- **Graceful degradation**: Accept events even if S2S failing
- **Batch and retry**: Accumulate failed events for batch retry
- **Alert on circuit open**: Notify ops team via PagerDuty

## Consequences
- Improved system resilience and partner isolation
- Added complexity in monitoring circuit states
- Memory overhead for circuit breaker state (~1KB per endpoint)
- Need comprehensive dashboards for circuit health

## Alternatives Considered
- **Hystrix**: Deprecated, maintenance mode
- **Custom implementation**: Risky, well-solved problem
- **Service mesh (Istio)**: Overkill for current scale
- **No circuit breaker**: Cascading failures, poor UX