import crypto from 'crypto';
import { z } from 'zod';

export interface ValidationResult {
  valid: boolean;
  sanitized?: any;
  errors?: string[];
}

export interface SecurityConfig {
  maxStringLength: number;
  maxObjectDepth: number;
  maxArrayLength: number;
  allowedDomains: string[];
  blockedIPs: string[];
}

/**
 * Security validation and sanitization
 * References: ADR-007 (Security Model)
 */
export class SecurityValidator {
  static readonly LIMITS = {
    string: 1000,
    email: 254,
    url: 2048,
    customData: 10000,
    arraySize: 100
  };

  private static readonly BLOCKED_IPS = [
    '127.0.0.1',
    'localhost',
    '169.254.169.254', // AWS metadata
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16'
  ];

  private config: SecurityConfig;
  private piiSalt: string;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      maxStringLength: SecurityValidator.LIMITS.string,
      maxObjectDepth: 10,
      maxArrayLength: SecurityValidator.LIMITS.arraySize,
      allowedDomains: [],
      blockedIPs: SecurityValidator.BLOCKED_IPS,
      ...config
    };
    
    this.piiSalt = process.env.PII_SALT || '';
  }

  /**
   * Sanitize tracking data according to security policy
   */
  static sanitizeTrackingData(data: any): any {
    const sanitized = { ...data };
    
    // TODO: Type coercion
    // TODO: Length truncation
    // TODO: Character allowlisting
    // TODO: SQL/NoSQL injection prevention
    // TODO: XSS prevention (HTML encoding)
    // TODO: Path traversal prevention
    
    // Hash PII fields
    if (sanitized.email) {
      sanitized.email = this.hashPII(this.normalizeEmail(sanitized.email));
    }
    
    if (sanitized.phone) {
      sanitized.phone = this.hashPII(this.normalizePhone(sanitized.phone));
    }
    
    // Sanitize nested objects
    if (sanitized.customData) {
      sanitized.customData = this.sanitizeObject(sanitized.customData);
    }
    
    return sanitized;
  }

  /**
   * Hash PII data with salt
   */
  static hashPII(value: string): string {
    if (!value) return '';
    
    const normalized = value.toLowerCase().trim();
    const salt = process.env.PII_SALT || '';
    
    return crypto
      .createHash('sha256')
      .update(normalized + salt)
      .digest('hex');
  }

  /**
   * Normalize email for hashing
   */
  static normalizeEmail(email: string): string {
    // TODO: Remove dots from Gmail
    // TODO: Remove + aliases
    // TODO: Lowercase and trim
    
    return email.toLowerCase().trim();
  }

  /**
   * Normalize phone for hashing
   */
  static normalizePhone(phone: string): string {
    // TODO: Remove formatting
    // TODO: Convert to E.164
    // TODO: Validate format
    
    return phone.replace(/\D/g, '');
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj: any, depth = 0): any {
    if (depth > 10) {
      throw new Error('Object depth exceeded');
    }
    
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj
        .slice(0, this.LIMITS.arraySize)
        .map(item => this.sanitizeObject(item, depth + 1));
    }
    
    const sanitized: any = {};
    const keys = Object.keys(obj).slice(0, 100);
    
    for (const key of keys) {
      const sanitizedKey = this.sanitizeString(key);
      sanitized[sanitizedKey] = this.sanitizeObject(obj[key], depth + 1);
    }
    
    return sanitized;
  }

  /**
   * Sanitize individual value
   */
  static sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }
    
    if (typeof value === 'number') {
      return this.sanitizeNumber(value);
    }
    
    if (typeof value === 'boolean' || value === null) {
      return value;
    }
    
    return null; // Drop unsupported types
  }

  /**
   * Sanitize string value
   */
  static sanitizeString(str: string): string {
    // Truncate length
    let sanitized = str.substring(0, this.LIMITS.string);
    
    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    // HTML encode
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
    
    return sanitized;
  }

  /**
   * Sanitize number value
   */
  static sanitizeNumber(num: number): number {
    if (!Number.isFinite(num)) {
      return 0;
    }
    
    // Clamp to reasonable range
    return Math.max(-1e10, Math.min(1e10, num));
  }

  /**
   * Validate URL for SSRF prevention
   */
  validateURL(url: string): ValidationResult {
    try {
      const parsed = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, errors: ['Invalid protocol'] };
      }
      
      // Check for blocked IPs
      if (this.isBlockedIP(parsed.hostname)) {
        return { valid: false, errors: ['Blocked IP'] };
      }
      
      // Check allowed domains if configured
      if (this.config.allowedDomains.length > 0) {
        if (!this.config.allowedDomains.includes(parsed.hostname)) {
          return { valid: false, errors: ['Domain not allowed'] };
        }
      }
      
      return { valid: true, sanitized: url };
    } catch (error) {
      return { valid: false, errors: ['Invalid URL'] };
    }
  }

  /**
   * Check if IP is blocked
   */
  private isBlockedIP(hostname: string): boolean {
    // TODO: Resolve hostname to IP
    // TODO: Check against blocked ranges
    // TODO: Check for private IPs
    
    return SecurityValidator.BLOCKED_IPS.includes(hostname);
  }

  /**
   * Generate CSP nonce
   */
  static generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Validate CSP nonce
   */
  static validateNonce(nonce: string, expected: string): boolean {
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(nonce),
      Buffer.from(expected)
    );
  }
}