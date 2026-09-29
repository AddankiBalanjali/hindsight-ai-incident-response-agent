import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  appUrl: string;
  isDemoMode: boolean;
  mongodb: {
    uri: string;
    dbName: string;
    isConfigured: boolean;
  };
  groq: {
    apiKey: string;
    model: string;
    isConfigured: boolean;
  };
  hindsight: {
    baseUrl: string;
    apiKey: string;
    bankId: string;
    isConfigured: boolean;
  };
  security: {
    jwtSecret: string;
    allowedEnvironments: string[];
    enableDryRunDefault: boolean;
    rateLimitWindowMs: number;
    rateLimitMax: number;
    logRetentionDays: number;
  };
}

const mongoUri = process.env.MONGODB_URI || '';
const groqKey = process.env.GROQ_API_KEY || '';
const hindsightKey = process.env.HINDSIGHT_API_KEY || '';

// Detect if running in demo mode
// True if any essential integration is missing or if DEMO_MODE=true
const isDemoMode = 
  process.env.DEMO_MODE === 'true' || 
  !mongoUri || 
  !groqKey || 
  !hindsightKey ||
  mongoUri.includes('<username>') ||
  groqKey.includes('your_groq_api_key') ||
  hindsightKey.includes('your_hindsight');

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  isDemoMode,
  mongodb: {
    uri: mongoUri,
    dbName: process.env.MONGODB_DB_NAME || 'incident_agent',
    isConfigured: Boolean(mongoUri && !mongoUri.includes('<username>')),
  },
  groq: {
    apiKey: groqKey,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    isConfigured: Boolean(groqKey && !groqKey.includes('your_groq')),
  },
  hindsight: {
    baseUrl: process.env.HINDSIGHT_API_BASE_URL || 'https://api.hindsight.vectorize.io',
    apiKey: hindsightKey,
    bankId: process.env.HINDSIGHT_BANK_ID || 'sre-incident-bank-prod',
    isConfigured: Boolean(hindsightKey && !hindsightKey.includes('your_hindsight')),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-sre-hackwithhyderabad-secret-key-2026',
    allowedEnvironments: (process.env.ALLOW_REMEDIATION_ENVIRONMENTS || 'development,staging')
      .split(',')
      .map(e => e.trim().toLowerCase()),
    enableDryRunDefault: process.env.ENABLE_DRY_RUN_DEFAULT !== 'false',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '90', 10),
  },
};
