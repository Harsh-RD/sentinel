# Sentinel — Project Plan

## Goal

Build a demonstrable API reliability platform with a deep, tested end-to-end workflow—not just a large set of CRUD screens. Keep the planned stack: React/Vite/TypeScript, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, Celery, Redis, and Docker Compose. Use the 98.css-inspired NOC console UI.

## Scope and priorities

Prioritize the complete outage-to-recovery workflow across checks, incidents, alerts, maintenance, and public status. Deliver reliable core behavior before polishing every screen. Defer lower-priority features if they threaten the core workflow, security, or demo reliability.

### Core modules

- Service catalog and monitor configuration
- Authentication, JWT, and `admin` / `operator` / `viewer` RBAC
- Scheduled and manual HTTP checks, including optional TLS expiry checks
- SLI/SLO tracking, error budgets, and `UP` / `DEGRADED` / `DOWN` states
- Incident timeline and war-room actions
- In-app alerts, webhook delivery, and optional SMTP email
- Maintenance windows that suppress notifications without removing history
- Public status page and historical status calendar
- Audit log and CSV reports

## Behavior to define before implementation

### SLOs and health states

- Define the SLO measurement window and which checks count toward availability.
- Calculate error budget from the target SLO and measured bad events; document how discrete checks approximate downtime.
- Specify thresholds for `DEGRADED` and `DOWN`, including latency and error-budget burn rules.
- Define recovery criteria to prevent repeated incident open/resolve cycles during flapping.

### Incidents and maintenance

- Define severity mapping, acknowledgement, assignment, comments, and resolution behavior.
- Calculate MTTA from incident start to acknowledgement and MTTR from incident start to resolution.
- Continue recording checks and incident history during maintenance; suppress notifications rather than hiding failures or deleting data.

### Alert delivery

- Persist each delivery attempt and its result.
- Make webhook and email failures visible in the alert history.
- Keep email optional when SMTP is configured.

## Security and quality requirements

- Protect monitor and webhook URL handling against SSRF: validate URLs, resolved IPs, and redirects; block localhost, private-network, and cloud-metadata destinations.
- Keep demo credentials explicitly local-only. Use environment-provided secrets and hashed passwords.
- Enforce authorization on every protected route and audit administrative changes.
- Test role permissions, incident transitions, SLO calculations, maintenance suppression, and URL validation.
- Add CI for tests and linting, and verify database migrations as part of the workflow.
- Describe Docker Compose as a reproducible local/demo environment, not as proof of production readiness.

## Phases and completion gates

### Phase 1 — Runnable skeleton

Compose starts the app; migrations run; seeded demo roles can log in; all planned pages have navigation placeholders.

**Gate:** A user can start the project and reach the NOC console using the documented local setup.

### Phase 2 — Catalog and access control

Implement services and monitors with HTTP options, RBAC, audit entries, and persisted manual checks.

**Gate:** An authorized user can safely create a service and run a monitor manually.

### Phase 3 — Automated checks

Add Celery Beat scheduling and workers; persist check results; show check history in the console. Scheduled and manual checks should use the same execution path.

**Gate:** A monitor produces persisted results both on demand and on schedule.

### Phase 4 — Reliability and incidents

Implement defined health/SLO rules, error-budget tracking, incident timelines, assignment, comments, MTTA, and MTTR.

**Gate:** Automated tests cover core state transitions and important edge cases.

### Phase 5 — Operations

Add the in-app alert inbox, webhook delivery, optional email, maintenance windows, and public status history.

**Gate:** The outage demo works end to end, including notification suppression and recovery.

### Phase 6 — Packaging

Add CSV reports, dashboard caching if it is useful, CI, architecture documentation, and a reproducible demo guide.

**Gate:** A new user can run the project and complete the demo by following the README.

## Demo acceptance path

1. A seeded Payments monitor starts healthy.
2. A demo failure switch makes its endpoint fail.
3. Scheduled checks persist failures; the system opens an incident and records an alert.
4. An operator acknowledges the incident and adds an investigation comment.
5. A maintenance window suppresses notifications without erasing check or incident history.
6. The endpoint recovers; the incident resolves and MTTR is visible.
7. The public status page and CSV export reflect the outage and recovery.

## Explicitly out of scope

Kubernetes, Prometheus federation, multi-tenant billing, Slack OAuth, mobile apps, and ML-based anomaly detection.
