# Sentinel Demo Guide

Sentinel is a NOC-styled API reliability platform.

## Architecture

- **Frontend**: React/Vite/TypeScript, using 98.css for a nostalgic NOC console feel.
- **Backend**: FastAPI, SQLAlchemy 2, Alembic, PostgreSQL.
- **Worker**: Celery and Redis handle scheduled automated HTTP checks for monitors.
- **Auth**: JWT-based authentication with `admin`, `operator`, and `viewer` RBAC.

## Running the Demo

1. Build and run using Docker Compose:
   ```bash
   docker-compose up --build
   ```
2. Navigate to `http://localhost:3001` to view the NOC Console.
3. Login using seeded credentials:
   - Email: `admin@local.test`
   - Password: `admin`
4. The system automatically provisions seeded demo roles.
5. Create a Service and a Monitor in the respective tabs. 
6. Automated checks run every 10 seconds (for demo purposes). 
7. If a monitor fails 3 consecutive checks, an Incident is automatically generated and an alert is delivered.
8. Acknowledge and resolve incidents in the **Incidents** tab.
9. Export a CSV report via `GET /api/maintenance/reports/csv`.
10. Check public status at `http://localhost:3001/status`.
