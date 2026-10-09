# Project Context & AI Agent Rules: Sentinel

This file dictates how Antigravity and any subagents should operate within this workspace. These rules supersede any conflicting general knowledge.

## 1. Frontend Aesthetics
- **Core Theme:** Retain the base `98.css` retro styling as the primary UI framework.
- **Modern Blending:** Enhance the retro UI with modern conveniences where appropriate (e.g., smooth micro-animations, better UX flows, or responsive adjustments) but DO NOT strip away the fundamental retro NOC console identity.

## 2. Feature Scope
- **Expansion Permitted:** We are NOT strictly limited to the original MVP scope in `PLAN.md`.
- **Allowed Explorations:** You may suggest and implement out-of-scope features that add high value (e.g., Kubernetes integrations, Slack OAuth, Advanced alerting logic, etc.) if it elevates the project.

## 3. Database Management
- **Strict Migrations:** Use Alembic strictly for database schema changes.
- **No Auto-Creation:** Moving forward, do not rely on `Base.metadata.create_all(bind=engine)` at startup. All schema changes must be captured in explicitly generated Alembic migration files to reflect production-grade practices.

## 4. Testing Strategy (Optimized for Placement Interviews)
- **Priority:** Rigorous test coverage for edge cases, core state transitions, and API security.
- **Rationale:** The user is a student preparing for placement drives. A portfolio project that demonstrates a "production-ready" engineering mindset—specifically via robust test suites (TDD, pytest, boundary testing)—is significantly more impressive to recruiters than a slightly larger feature set without tests. Always prioritize writing tests for new features.

## 5. Coding Style
- **Constraints:** No rigid stylistic constraints imposed, but maintain readable, Pythonic/TypeScript-standard code appropriate for a strong portfolio piece.
