# Hindsight AI Incident Response Agent
### Built for HACKWITHHYDERABAD 3.0

An autonomous Site Reliability Engineering (SRE) incident triage, root cause diagnosis, memory learning loop, and safe human-in-the-loop remediation platform. Powered by **React.js & TypeScript**, **Node.js & Express.js**, **MongoDB Atlas**, **Groq LLaMA-3.3-70B**, and the official **Vectorize Hindsight Long-Term Memory System**.

---

## 🚀 Key Features

1. **Official Hindsight Long-Term Memory System (`@vectorize-io/hindsight-client`)**:
   - Isolates memory spaces per cluster using `bankId: "sre-incident-bank-prod"`.
   - Employs parallel multi-strategy retrieval (BM25 sparse search, dense semantic similarity, entity graph traversal, and temporal reasoning).
   - Automatically **retains** confirmed incident resolutions and post-mortem findings.
   - Grounded citations: **Never invents phantom incident IDs**; only past incidents actually recalled from Hindsight are cited in recommendations.

2. **Groq LLaMA-3.3-70B Diagnostic Reasoning**:
   - Rapid log synthesis and hypothesis formulation.
   - Strict SRE safety rule: **LLM-generated hypotheses are never treated as verified facts** until confirmed by an on-call engineer.
   - Compares prior successful versus failed resolutions to prevent repeat mistakes (e.g. warnings against restarting pods without scaling connection pools).

3. **Safe Human-in-the-Loop Remediation Engine**:
   - **Dry-run by default**: Every automated remediation generates a simulated before/after state diff.
   - Dual confirmation gates on production environments.
   - Strict prohibition against arbitrary shell commands or raw database executions.
   - Supported safe primitives: `scale_connection_pool`, `restart_service`, `flush_redis_cache`, `rollback_deployment`, `failover_read_replica`, `drain_node`.
   - Comprehensive rollback instructions for every proposed action.

4. **Demonstration Scenarios (HACKWITHHYDERABAD 3.0)**:
   - **Payment Gateway API to MongoDB Connection-Pool Failure (`INC-2026-7821`)**: Simulates promotion flash-sale concurrency exhausting `maxPoolSize=50`, triggering `MongoWaitQueueFullException` and HTTP 504 timeouts.
   - **Auth Service Redis OOM**: Cache eviction thrashing due to missing refresh token TTL.
   - **Kafka Inventory Lag**: Slow batch write exceeding poll intervals.

5. **Security & Governance**:
   - Automatic secret, token, JWT, database URI, and AWS key redaction before LLM analysis or memory persistence.
   - Role-Based Access Control: `Admin`, `Engineer`, and `Viewer`.
   - Immutable audit logging with actor tracking and action filtering.
   - Automated SRE post-mortem generation exportable as Markdown and JSON.

6. **Clear DEMO MODE**:
   - Activates automatically when external credentials are not supplied.
   - Utilizes deterministic SRE diagnostic engines and in-memory persistence.
   - **Never mixes mock data with real production clusters.**

---

## 🏗 Architecture & Incident Learning Loop

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Alert Ingestion (Datadog / CloudWatch / Webhook / Sim)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Secret & PII Sanitizer (Redacts DB Passwords, JWTs, Keys)│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Hindsight Memory Recall: client.recall(bankId, symptoms) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Groq LLM Diagnosis: LLaMA-3.3 Evidence-Backed Reasoning   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Safe Remediation Proposal (Dry-Run Telemetry Diff)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Human Approval Queue (Engineer / Admin Sign-Off)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Controlled Execution & Telemetry Normalization Check      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Resolution Confirmation & Post-Mortem Compilation         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. HINDSIGHT LEARNING LOOP: client.retain(bankId, learning) │
│    Future incidents with similar signatures recall this!    │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Environment Variables (`.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Web server port | `3000` |
| `NODE_ENV` | Runtime environment (`development` or `production`) | `development` |
| `MONGODB_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://...` |
| `MONGODB_DB_NAME` | Database name | `incident_agent` |
| `GROQ_API_KEY` | Groq API Key (`gsk_...`) | Optional (Demo Mode active if empty) |
| `GROQ_MODEL` | Groq LLM Model | `llama-3.3-70b-versatile` |
| `HINDSIGHT_API_BASE_URL` | Vectorize Hindsight API URL | `https://api.hindsight.vectorize.io` |
| `HINDSIGHT_API_KEY` | Vectorize Hindsight Key (`hs_...`) | Optional (Demo Mode active if empty) |
| `HINDSIGHT_BANK_ID` | Isolated Hindsight Memory Bank ID | `sre-incident-bank-prod` |
| `JWT_SECRET` | Secret key for session security | Secure string |

---

## 🛠 Local Setup & Running

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite (verifies sanitizer, approval gates, and learning loop)
npm test

# 3. Start full-stack development server (Express backend + Vite HMR)
npm run dev
```
The application will be live at `http://localhost:3000`.

---

## 🐳 Docker & Docker Compose

### Run with Docker Compose (includes local MongoDB instance):
```bash
docker-compose up --build -d
```

### Run standalone Docker container:
```bash
docker build -t hindsight-sre-agent:latest .
docker run -p 3000:3000 -e PORT=3000 hindsight-sre-agent:latest
```

---

## 🧪 Automated Test Suite

Run the end-to-end integration test:
```bash
npm test
```

### Verified Test Cases:
1. **Secret & Credential Sanitizer**: Confirms redaction of database passwords, JWT tokens, and AWS access keys.
2. **MongoDB Data Access & Pagination**: Confirms sorting, indexing, and seed incident availability.
3. **Safe Remediation & Approval Gate**: Verifies that remediation plans default to dry-run, viewer roles are denied approval authority, and audit entries are generated.
4. **Hindsight Long-Term Memory Learning Loop**: Verifies that retaining an incident resolution in Hindsight enables a subsequent incident with matching symptoms to recall the resolution with high semantic similarity.
