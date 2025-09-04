# ADR-001: Data Contracts and Versioning Strategy

## Status
Accepted

## Context
We need a robust schema definition and versioning strategy for events flowing through the system, supporting evolution without breaking clients or downstream consumers.

## Decision

### Schema Definition
- **JSON Schema Draft 2020-12** for all event definitions
- **Zod** for runtime validation in TypeScript
- **OpenAPI 3.1** for REST endpoints
- Rationale: Industry standards, TypeScript type generation, runtime validation

### Canonical Event Model
```json
{
  "version": "1.0.0",
  "eventId": "uuid-v4",
  "eventType": "page_view|view_item|add_to_cart|purchase|custom_event",
  "timestamp": "ISO8601",
  "siteId": "string",
  "sessionId": "string",
  "userId": "hashed-string",
  "deviceId": "string",
  "consent": {},
  "context": {},
  "properties": {}
}
```

### Versioning Strategy
- **Semantic Versioning** for schemas (MAJOR.MINOR.PATCH)
- **Forward Compatibility**: New fields are optional
- **Backward Compatibility**: Required fields cannot be removed for 6 months
- **Version Header**: `X-Schema-Version` in all API requests
- **Multi-version Support**: Support n-1 versions (current + previous major)

### Ingestion API Shape
```
POST /collect
Content-Type: application/json
X-Idempotency-Key: <uuid>
X-Schema-Version: 1.0.0

GET /collect?d=<base64-encoded-json>  // Image pixel fallback
```

### Validation Pipeline
1. Structural validation (JSON Schema)
2. Business rule validation (Zod)
3. Privacy validation (consent gates)
4. Enrichment & normalization

## Consequences
- All events must pass schema validation before processing
- Schema registry needed for version management
- Clients must handle schema evolution gracefully
- Storage costs increase with versioning support

## Alternatives Considered
- **Protocol Buffers**: Better performance but harder client integration
- **Avro**: Good evolution support but complex for web clients
- **GraphQL**: Over-engineered for simple event tracking
- **No schemas**: Faster initially but maintenance nightmare