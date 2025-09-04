# ADR-002: Queueing Architecture with Redis and BullMQ

## Status
Accepted

## Context
We need reliable, scalable message processing for handling millions of tracking events with guaranteed delivery to multiple downstream partners.

## Decision

### Queue Infrastructure
- **Redis** as message broker (AWS ElastiCache/Redis Enterprise Cloud)
- **BullMQ** for job queue management
- **Separate queues** per processing stage and priority
- Rationale: Battle-tested, low latency, built-in retries, DLQ support

### Queue Design
```typescript
// Queue topology
- ingest.high     // Real-time conversions, purchases
- ingest.standard // Page views, standard events  
- ingest.low      // Batch, non-critical
- s2s.dv360       // Per-partner queues for isolation
- s2s.tradedesk
- s2s.yahoo
- s2s.amazon
- dlq.failed      // Dead letter queue
- dlq.poison      // Permanently failed
```

### Idempotency Strategy
- **Idempotency Keys**: Required `X-Idempotency-Key` header
- **24-hour cache** of processed keys in Redis
- **Duplicate Detection**: Hash of (siteId + eventId + timestamp)
- **Exactly-once semantics** for critical events (purchases)

### Dead Letter Queue (DLQ) Design
```typescript
interface DLQEntry {
  originalPayload: Event;
  error: Error;
  attempts: number;
  firstFailure: Date;
  lastFailure: Date;
  queue: string;
  reason: 'validation' | 'timeout' | 'partner_error' | 'rate_limit';
}
```

### Retry Strategy
- **Exponential backoff**: 1s, 2s, 4s, 8s, 16s, 32s, 64s
- **Max attempts**: 7 (configurable per queue)
- **Jitter**: ±25% to prevent thundering herd
- **Circuit breaker**: After 5 consecutive failures, pause queue

### Processing Guarantees
- **At-least-once** delivery (client must handle duplicates)
- **FIFO** within same priority queue
- **Concurrent workers**: 10 per queue (auto-scale based on depth)
- **Visibility timeout**: 30s (configurable)

## Consequences
- Redis becomes critical path dependency (needs HA setup)
- Memory requirements: ~1GB per 1M queued messages
- Operational complexity for queue monitoring
- Clear replay/reprocess capabilities from DLQ

## Alternatives Considered
- **AWS SQS/SNS**: Higher latency, less control over retry logic
- **Kafka**: Overkill for our throughput, complex operations
- **RabbitMQ**: Good but less Node.js ecosystem support than BullMQ
- **In-memory**: No durability, lost events on crash