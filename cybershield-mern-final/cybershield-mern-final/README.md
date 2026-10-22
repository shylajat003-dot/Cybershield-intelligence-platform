# CyberShield Intelligence Platform

> **Centralized Cyber Threat Intelligence & Security Operations Center (SOC) Platform**

CyberShield is a full-stack, production-style cybersecurity platform that consolidates, normalizes, scores, correlates, and visualizes cyber threat intelligence from multiple internal and external telemetry sources. It gives security teams a single-pane-of-glass view across threat indicators, active incidents, CVE vulnerabilities, monitored assets, and real-time security alerts.

---

## 🛡️ Core Problem & Solution

### The Problem
Modern Security Operations Centers face **data fragmentation**. Cyber threat indicators (IPs, domains, file hashes, URLs), CVE vulnerability notices, asset inventories, and security alerts are scattered across disparate tools. Analysts waste critical minutes context-switching during active incidents.

### The Solution
CyberShield provides a centralized platform that:
1. **Collects & Normalizes** threat indicators (IOCs) from multiple sources into a standardized internal schema
2. **Calculates Transparent Risk Scores (0–100)** via a rule-based algorithm using severity, confidence, source reliability, and recurrence frequency
3. **Correlates Threats** with internal assets, CVE vulnerabilities, security alerts, and MITRE ATT&CK tactics — all via real DB joins
4. **Tracks Incident Timelines** through analyst response workflow (`OPEN → INVESTIGATING → CONTAINED → RESOLVED`)
5. **Streams Real-Time Alerts** to the browser using Server-Sent Events (SSE) backed by PostgreSQL polling

---

## 💻 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Axios, Lucide React, React Router v6 |
| **Backend** | Node.js 20, Express.js, TypeScript, JWT (jsonwebtoken), bcryptjs, Zod validation, Helmet, Morgan, express-rate-limit |
| **Database** | PostgreSQL 15 — permanent relational storage with foreign keys, indexes, JSONB columns |
| **Cache / Events** | Redis 7 — dashboard metric caching + Redis Pub/Sub event publishing |
| **DevOps** | Docker, Docker Compose, multi-stage Dockerfiles, nginx reverse proxy |

---

## ⚙️ How Each Technology Is Actually Used

### PostgreSQL — Permanent Relational Storage
All application data is stored in PostgreSQL. This includes users, threat indicators (IOCs), incidents, vulnerabilities, assets, alerts, threat sources, and audit logs. Every API read and write goes to PostgreSQL. The schema is created automatically at startup by `runMigrations()` reading `database/init.sql`.

### Redis — Caching & Event Infrastructure
Redis is used for two purposes:
- **Dashboard metric caching**: The `/api/dashboard/summary` response is cached for 60 seconds to avoid repeated heavy aggregate queries on every page load. Cache is invalidated on relevant data mutations.
- **Redis Pub/Sub publishing**: When a new threat or alert is created, the backend publishes to the `sec_alerts` channel. This is infrastructure for future consumer integration (e.g., a dedicated notification service). The frontend does **not** subscribe to Redis directly.

### SSE — Frontend Real-Time Alert Delivery
The backend exposes `GET /api/alerts/stream` as a **Server-Sent Events** endpoint. It polls PostgreSQL every 15 seconds for new alerts and pushes `data:` events to connected clients. The nginx reverse proxy has `proxy_buffering off` to ensure events reach the browser in real time.

### Polling — Fallback Mechanism
The `Alerts` page opens a real `EventSource` connection to `/api/alerts/stream`. If SSE fails (network interruption, proxy timeout), the page falls back to polling PostgreSQL directly every 20 seconds. The Alerts header shows a **Live SSE** / **Polling** status indicator so the mode is always visible.

> **Honest note**: There is no WebSocket layer and no direct Redis → browser connection. The real-time path is: new data written to PostgreSQL → SSE endpoint detects it via DB poll → `data:` event sent to browser via SSE → React state updated.

---

## 🔑 Demo Credentials

| Role | Email | Password | Permissions |
|:-----|:------|:---------|:-----------|
| **ADMIN** | `admin@cybershield.io` | `Admin123!` | Full access — threats, incidents, assets, vulnerabilities, alerts, audit logs, user list |
| **SECURITY_ANALYST** | `analyst@cybershield.io` | `Analyst123!` | Create & manage threats, investigate incidents, manage CVEs & assets |
| **VIEWER** | `viewer@cybershield.io` | `Viewer123!` | Read-only access — dashboard, threats, incidents, reports (all POST/PUT/DELETE → 403) |

---

## 🎓 College Demo Flow

This is the recommended path for demonstrating the platform end-to-end:

```
1.  Login            → admin@cybershield.io / Admin123!
2.  SOC Dashboard    → View live metric cards (DB counts), severity chart, trend chart, indicator type chart
3.  Threat Intel     → Navigate to /threats — browse IOC list with severity & risk scores
4.  Open IOC         → Click a CRITICAL threat (e.g., LockBit hash or C2 IP)
5.  Risk Score       → View the transparent risk breakdown panel (base severity + confidence + source + recurrence)
6.  Correlation      → Scroll to "Threat Relationship & Correlation Map" — see linked incidents, assets, CVEs
7.  MITRE ATT&CK     → View the tactic/technique mapping (pulled live from DB — e.g., Impact / T1486)
8.  Affected Asset   → Click linked asset to view its profile, type, criticality, and open vulnerabilities
9.  Alerts           → Navigate to /alerts — see real-time alert queue with SSE Live indicator
10. Acknowledge      → Click "Acknowledge" on a CRITICAL alert (ANALYST/ADMIN role)
11. Open Incident    → Navigate to /incidents — view open incident list
12. Create Incident  → Click "New Incident" → fill title, severity, analyst, asset, related threat
13. Investigate      → Open incident → update status to INVESTIGATING → add notes to timeline
14. Contain          → Update status to CONTAINED — timeline auto-records the action with timestamp
15. Resolve          → Update status to RESOLVED — incident closed with resolution notes
16. Reports          → Navigate to /reports — view 7/14/30-day aggregated metrics from DB
17. Audit Logs       → Navigate to /audit-logs (ADMIN only) — full tamper-evident action history
```

---

## 🚀 Quick Start (Docker Compose)

The entire platform (Frontend + Backend + PostgreSQL + Redis) starts with one command:

```bash
# From the repo root:
docker compose up --build
```

**Seed demo data** (first run only):
```bash
docker exec -it cybershield-backend node dist/config/seed.js
```

| Service | URL |
|---------|-----|
| Frontend SOC Console | http://localhost:5173 |
| Backend REST API | http://localhost:5000/api |
| Health Check | http://localhost:5000/health |

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js ≥ 20
- PostgreSQL ≥ 15 running locally
- Redis ≥ 7 running locally (optional — backend uses in-memory fallback if unavailable)

### Backend
```bash
cd backend
cp .env.example .env        # Edit POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD
npm install
npm run migrate             # Creates schema from database/init.sql
npm run seed                # Inserts demo users, threats, incidents, assets, CVEs, alerts
npm run dev                 # Starts ts-node dev server on port 5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                 # Vite dev server on port 5173
```

---

## 📊 Database Schema

| Table | Key Columns |
|-------|------------|
| `users` | id, name, email, password_hash, role (ADMIN / SECURITY_ANALYST / VIEWER) |
| `threat_sources` | id, name, type, reliability_score, status, indicator_count |
| `threats` | id, indicator, indicator_type, category, severity, confidence, risk_score, source_id, mitre_tactic, mitre_technique, tags[], recurrence_count |
| `assets` | id, name, ip_address, hostname, asset_type, environment, status, criticality |
| `incidents` | id, title, severity, status, analyst_id, affected_asset_id, related_threat_id, resolution_notes, timeline (JSONB) |
| `vulnerabilities` | id, cve_id, title, cvss_score, severity, affected_asset_id, status, remediation, due_date |
| `alerts` | id, title, severity, alert_type, source, related_threat_id, related_asset_id, status |
| `audit_logs` | id, user_id, user_email, user_role, action, entity, entity_id, details (JSONB), ip_address |

---

## 📡 REST API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Register new analyst account |
| POST | `/api/auth/login` | None | Login → returns JWT |
| GET | `/api/auth/me` | JWT | Current user profile |

### Threat Intelligence
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/threats` | JWT | List IOCs (search, severity, type, status, page) |
| GET | `/api/threats/:id` | JWT | Threat detail + risk breakdown + correlation |
| POST | `/api/threats` | ANALYST+ | Register new IOC |
| POST | `/api/threats/ingest` | ANALYST+ | Multi-source feed ingestion |
| PUT | `/api/threats/:id` | ANALYST+ | Update threat |
| DELETE | `/api/threats/:id` | ADMIN | Delete threat |

### Incidents
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/incidents` | JWT | List incidents |
| GET | `/api/incidents/:id` | JWT | Incident detail + timeline |
| POST | `/api/incidents` | ANALYST+ | Declare incident |
| PUT | `/api/incidents/:id` | ANALYST+ | Update status / add timeline entry |

### Vulnerabilities / Assets / Alerts / Sources
- `GET|POST /api/vulnerabilities`, `GET|POST /api/assets`, `GET|POST /api/alerts`, `GET|POST /api/sources`
- `GET /api/alerts/stream` — SSE endpoint for real-time alert streaming

### Dashboard & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Redis-cached SOC metrics |
| GET | `/api/dashboard/threat-trends` | Threat ingestion trend by day/severity |
| GET | `/api/dashboard/threat-severity` | Severity distribution from DB |
| GET | `/api/dashboard/threat-types` | Indicator type breakdown from DB |
| GET | `/api/dashboard/incident-status` | Incident status distribution |
| GET | `/api/dashboard/vulnerability-summary` | CVE severity/status counts |
| GET | `/api/dashboard/top-sources` | Most active threat feed sources |
| GET | `/api/dashboard/reports` | Period-based summary report (7/14/30 days) |
| GET | `/api/mitre/mappings` | Live MITRE ATT&CK tactic/technique groupings from DB |
| GET | `/api/search?q=` | Cross-entity full-text search |
| GET | `/api/audit-logs` | Tamper-evident action log (ADMIN only) |

---

## ⚙️ Rule-Based Risk Scoring

$$\text{Risk Score} = \min\!\left(100,\; \text{round}\!\left(\text{BaseSeverity} \times 0.65 + \text{ConfidenceContrib} + \text{SourceReliabilityContrib} + \text{RecurrenceContrib}\right)\right)$$

| Component | Formula |
|-----------|---------|
| Base Severity | CRITICAL=95, HIGH=75, MEDIUM=45, LOW=20 |
| Confidence Contribution | `(confidence / 100) × 15` |
| Source Reliability | `(reliability / 100) × 10` |
| Recurrence Factor | `min(10, (recurrence_count − 1) × 2.5)` |

The full breakdown is shown on the Threat Detail page per-IOC.

---

## 🔒 Security Implementation

| Control | Implementation |
|---------|---------------|
| Authentication | JWT (24h expiry), bcryptjs password hashing (10 rounds) |
| Authorization | Role-Based Access Control (`requireRole` middleware) — VIEWER cannot mutate state |
| HTTP Security | Helmet.js (XSS, clickjacking, MIME-sniffing headers) |
| Rate Limiting | `express-rate-limit` — 300 req/15min general, 20 req/15min on `/api/auth/` |
| SQL Injection | Parameterized queries throughout — no string concatenation in SQL |
| Audit Trail | All mutations logged to `audit_logs` table with user, role, IP, timestamp |

---

## 🏗️ Project Structure

```
cybershield-platform/
├── backend/
│   ├── src/
│   │   ├── app.ts                   # Express app (middleware + routes, no bootstrap)
│   │   ├── server.ts                # Bootstrap entrypoint (not imported by tests)
│   │   ├── config/                  # db.ts, redis.ts, env.ts, migrate.ts, seed.ts
│   │   ├── controllers/             # authController, threatController, dashboardController …
│   │   ├── middleware/              # authMiddleware, errorMiddleware
│   │   ├── routes/                  # authRoutes, threatRoutes, mitreRoutes …
│   │   ├── services/                # riskScoringService, auditService
│   │   └── __tests__/auth.test.ts
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Route-level lazy loading with React.lazy + Suspense
│   │   ├── context/                 # AuthContext, ToastContext
│   │   ├── layouts/SOCLayout.tsx    # Persistent sidebar + header shell
│   │   ├── pages/                   # Dashboard, Threats, ThreatDetail, Incidents …
│   │   ├── components/              # SeverityBadge, RiskScore, MetricCard, Modal …
│   │   └── services/               # api.ts (axios), index.ts (all service functions)
│   ├── nginx.conf                   # Nginx proxy config (API proxy + SSE support)
│   └── Dockerfile
├── database/
│   └── init.sql                     # Full schema DDL (auto-run on startup)
├── docker-compose.yml               # 4-service stack: postgres, redis, backend, frontend
└── .gitignore
```

---

## ⚠️ Known Limitations

1. **No WebSocket layer** — Real-time alerts use SSE (Server-Sent Events) with DB polling, not WebSocket push. Latency is ≤15 seconds.
2. **Redis Pub/Sub is publish-only** — The backend publishes to `sec_alerts` but there is no Redis subscriber in the current architecture. SSE uses DB polling. Redis Pub/Sub is infrastructure for future consumer services.
3. **Large initial bundle** — Before lazy loading: ~768KB. After route-level lazy loading, the initial bundle is significantly smaller; Recharts and page code load on demand per route.
4. **No HTTPS in development** — TLS termination would be handled by a load balancer (e.g., AWS ALB) in production.
