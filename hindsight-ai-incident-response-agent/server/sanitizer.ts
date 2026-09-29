import { SanitizedLogEntry } from '../src/types';

export interface SanitizeResult {
  sanitized: string;
  redactedCount: number;
}

const REDACTION_PATTERNS = [
  // MongoDB / Database URIs with credentials
  {
    regex: /(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/gi,
    replacement: '$1[REDACTED_DB_PWD]$3',
    name: 'database_credentials',
  },
  {
    regex: /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi,
    replacement: '$1[REDACTED_DB_PWD]$3',
    name: 'postgres_credentials',
  },
  {
    regex: /(redis:\/\/[^:]*:)([^@]+)(@)/gi,
    replacement: '$1[REDACTED_REDIS_PWD]$3',
    name: 'redis_credentials',
  },
  // Bearer tokens & JWTs
  {
    regex: /(Bearer\s+)[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*/gi,
    replacement: '$1[REDACTED_JWT_TOKEN]',
    name: 'jwt_token',
  },
  // Authorization headers
  {
    regex: /(["']?authorization["']?\s*[:=]\s*["']?)([^"',\s]+)/gi,
    replacement: '$1[REDACTED_AUTH_HEADER]',
    name: 'auth_header',
  },
  // API Keys / Secrets in key-value format
  {
    regex: /(["']?(?:api[_-]?key|client[_-]?secret|secret[_-]?key|access[_-]?token|password|passwd|auth[_-]?token)["']?\s*[:=]\s*["']?)([^"',\s]{4,})/gi,
    replacement: '$1[REDACTED_SECRET]',
    name: 'api_secret_field',
  },
  // AWS Keys
  {
    regex: /\b(AKIA[0-9A-Z]{16,24})\b/g,
    replacement: '[REDACTED_AWS_ACCESS_KEY]',
    name: 'aws_access_key',
  },
  // Private keys
  {
    regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC )?PRIVATE KEY-----/g,
    replacement: '[REDACTED_PRIVATE_KEY_BLOCK]',
    name: 'private_key',
  },
  // Credit cards (13-16 digits with dashes or spaces)
  {
    regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    replacement: '[REDACTED_CARD_NUMBER]',
    name: 'payment_card',
  },
];

/**
 * Redacts secrets, tokens, credentials, and sensitive customer data from raw log strings.
 */
export function sanitizeLogText(rawText: string): SanitizeResult {
  if (!rawText) return { sanitized: '', redactedCount: 0 };
  let sanitized = rawText;
  let redactedCount = 0;

  for (const pattern of REDACTION_PATTERNS) {
    const matches = sanitized.match(pattern.regex);
    if (matches && matches.length > 0) {
      redactedCount += matches.length;
      sanitized = sanitized.replace(pattern.regex, pattern.replacement);
    }
  }

  return { sanitized, redactedCount };
}

/**
 * Parses a multiline log string into structured SanitizedLogEntry items
 */
export function parseAndSanitizeLogs(rawLogs: string, source: string = 'app-server'): SanitizedLogEntry[] {
  if (!rawLogs) return [];
  const lines = rawLogs.split('\n').filter(line => line.trim().length > 0);

  return lines.map(line => {
    const { sanitized, redactedCount } = sanitizeLogText(line);
    
    // Infer level
    let level: 'info' | 'warn' | 'error' | 'fatal' = 'info';
    const lower = line.toLowerCase();
    if (lower.includes('fatal') || lower.includes('panic') || lower.includes('oomkilled')) {
      level = 'fatal';
    } else if (lower.includes('error') || lower.includes('exception') || lower.includes('fail') || lower.includes('timeout')) {
      level = 'error';
    } else if (lower.includes('warn')) {
      level = 'warn';
    }

    // Try extracting timestamp if present, otherwise default to current ISO string
    let timestamp = new Date().toISOString();
    const timestampMatch = line.match(/^\[?(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\]?/);
    if (timestampMatch) {
      timestamp = timestampMatch[1];
    }

    return {
      timestamp,
      level,
      message: sanitized,
      source,
      redactedItemCount: redactedCount,
    };
  });
}
