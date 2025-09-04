# MiQ Pixel System - Configuration Placeholders

## Critical Configuration Items to Fill

### 1. Security & Authentication

```env
# PII Hashing Salt (rotate quarterly)
PII_SALT=YOUR_SALT_HERE

# JWT Secret for Admin APIs
JWT_SECRET=YOUR_JWT_SECRET

# API Keys for Partners
API_KEY_DV360=YOUR_DV360_KEY
API_KEY_TRADEDESK=YOUR_TTD_KEY
API_KEY_YAHOO=YOUR_YAHOO_KEY
API_KEY_AMAZON=YOUR_AMAZON_KEY

# mTLS Certificates (if required)
PARTNER_CERT_PATH=/path/to/cert.pem
PARTNER_KEY_PATH=/path/to/key.pem
```

### 2. Partner Configuration

```json
{
  "dv360": {
    "advertiserId": "YOUR_ADVERTISER_ID",
    "customerId": "YOUR_CUSTOMER_ID",
    "floodlightActivityId": "YOUR_ACTIVITY_ID",
    "floodlightConfigurationId": "YOUR_CONFIG_ID"
  },
  "tradeDesk": {
    "advertiserId": "YOUR_TTD_ADVERTISER_ID",
    "trackingTag": "YOUR_TRACKING_TAG",
    "universalPixelId": "YOUR_PIXEL_ID"
  },
  "yahoo": {
    "accountId": "YOUR_YAHOO_ACCOUNT",
    "pixelId": "YOUR_YAHOO_PIXEL"
  },
  "amazon": {
    "advertiserId": "YOUR_AMZ_ADVERTISER",
    "campaignId": "YOUR_CAMPAIGN_ID"
  }
}
```

### 3. TCF/Consent Configuration

```json
{
  "tcf": {
    "vendorId": YOUR_IAB_VENDOR_ID, // Register at iabeurope.eu
    "cmpId": YOUR_CMP_ID,
    "purposeIds": [1, 7], // Required purposes
    "specialFeatureIds": [],
    "flexiblePurposeIds": [2, 9, 10]
  }
}
```

### 4. Infrastructure

```yaml
# Redis Configuration
REDIS_HOST: YOUR_REDIS_ENDPOINT
REDIS_PORT: 6379
REDIS_PASSWORD: YOUR_REDIS_PASSWORD
REDIS_TLS: true

# CDN Configuration
CLOUDFLARE_ZONE_ID: YOUR_ZONE_ID
CLOUDFLARE_API_TOKEN: YOUR_API_TOKEN
FASTLY_SERVICE_ID: YOUR_SERVICE_ID
FASTLY_API_KEY: YOUR_API_KEY

# Monitoring
PROMETHEUS_ENDPOINT: YOUR_METRICS_ENDPOINT
JAEGER_ENDPOINT: YOUR_TRACING_ENDPOINT
PAGERDUTY_KEY: YOUR_INCIDENT_KEY
```

### 5. Cloud Resources (Terraform Variables)

```hcl
variable "aws_region" {
  default = "us-east-1"
}

variable "aws_account_id" {
  default = "YOUR_AWS_ACCOUNT"
}

variable "domain_name" {
  default = "miqpixel.com"
}

variable "certificate_arn" {
  default = "arn:aws:acm:..."
}
```

## Next Steps to Complete

### Immediate Actions Required

1. **Register for Partner APIs**
   - DV360: Contact Google representative
   - The Trade Desk: Apply for API access
   - Yahoo: Request DSP integration
   - Amazon: Setup DSP account

2. **TCF Registration**
   - Register as vendor at https://iabeurope.eu/tcf
   - Obtain vendor ID
   - Define purpose requirements

3. **Infrastructure Setup**
   ```bash
   # Install dependencies
   pnpm install
   
   # Initialize Terraform
   cd infra/terraform
   terraform init
   
   # Setup Redis
   # Use AWS ElastiCache or Redis Enterprise Cloud
   ```

4. **Security Credentials**
   - Generate strong salts and secrets
   - Setup AWS Secrets Manager or HashiCorp Vault
   - Configure key rotation policies

5. **CDN Configuration**
   - Setup CloudFlare account
   - Configure DNS records
   - Create edge worker scripts
   - Setup Fastly as backup

### Development Workflow

```bash
# 1. Clone and setup
git clone https://github.com/ethansammiq/MiQ_Pixel_System.git
cd MiQ_Pixel_System
pnpm install

# 2. Setup environment
cp .env.example .env.local
# Fill in all configuration values

# 3. Start development
pnpm dev

# 4. Run tests
pnpm test
pnpm test:e2e

# 5. Build for production
pnpm build

# 6. Deploy
pnpm deploy
```

### Testing Checklist

- [ ] Unit tests for all packages
- [ ] Integration tests for API endpoints
- [ ] E2E tests for consent flows
- [ ] Load tests (10k RPS target)
- [ ] Security penetration testing
- [ ] Partner integration testing
- [ ] Ad blocker compatibility testing
- [ ] Performance budget validation (<10KB SDK)

### Compliance Checklist

- [ ] GDPR compliance audit
- [ ] CCPA compliance review
- [ ] TCF 2.2 implementation validation
- [ ] GPC signal handling verification
- [ ] Data retention policy implementation
- [ ] Right to deletion workflow
- [ ] Data portability endpoints

### Monitoring Setup

- [ ] Prometheus metrics configured
- [ ] Grafana dashboards created
- [ ] PagerDuty alerts configured
- [ ] SLO definitions in place
- [ ] Runbooks documented
- [ ] Circuit breaker monitoring
- [ ] Queue depth alerts

## Questions Requiring Clarification

1. **Business Requirements**
   - What is the expected traffic volume?
   - Which geographic regions to prioritize?
   - Partner priority order for sync?
   - Custom attribution model requirements?

2. **Technical Decisions**
   - Preferred cloud provider (AWS/GCP/Azure)?
   - Kubernetes or serverless for workers?
   - Time series database choice?
   - Analytics database preference?

3. **Legal/Compliance**
   - Specific data retention periods per region?
   - Required audit log retention?
   - Specific PII handling requirements?
   - Partner-specific compliance needs?

## Phase 1 Exit Criteria Validation

Before proceeding to Phase 2:

- [ ] SDK successfully builds under 10KB gzipped
- [ ] Events successfully enqueue to Redis
- [ ] Consent gating verified in browser
- [ ] Basic Prometheus metrics exposed
- [ ] Health check endpoint operational
- [ ] CSP nonce support validated
- [ ] Image pixel fallback working
- [ ] Rate limiting active

## Support & Resources

- Documentation: `/docs`
- ADRs: `/docs/adr`
- API Spec: `/docs/api/openapi.yaml`
- Schemas: `/schemas`
- Runbooks: `/docs/runbooks`

For questions or issues, contact: engineering@miq.com