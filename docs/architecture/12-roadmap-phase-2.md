# Roadmap - Phase 2: Operations Maturity & Integration

**Duration:** 4–6 months  
**Prerequisite:** Phase 1 pilot successful, national rollout begun  
**Goal:** Deepen operational capabilities, integrate with national systems, and achieve full national registry coverage.

---

## Phase 2 Deliverables

### Integration Track

#### e-Albania Authentication (Sprints 1–2)

| Deliverable | Details |
|-------------|---------|
| OIDC provider adapter | e-Albania as NextAuth provider |
| Account linking | NID-based linking to existing accounts |
| Single Sign-On | Citizens and business users login via e-Albania |
| Fallback auth | Credentials provider retained for non-e-Albania users |
| Session migration | Graceful transition for existing users |

**Exit criteria:** Users can login via e-Albania; existing accounts linked by NID.

#### QKB Integration (Sprints 2–3)

| Deliverable | Details |
|-------------|---------|
| QKB API adapter | Integration service bus with retry/circuit breaker |
| Automated validation | Real-time NIPT validation on maintenance company registration |
| Validation cache | Store QKB response with TTL (24 hours) |
| Re-validation job | Periodic re-validation of active maintenance companies |
| Manual override | Admin can override failed validation with justification |

**Exit criteria:** Maintenance companies auto-validated against QKB on registration.

#### Directorate Licensing Sync (Sprint 3)

| Deliverable | Details |
|-------------|---------|
| Licensing API adapter | Inbound sync from Directorate licensing registry |
| Webhook receiver | Real-time license status changes |
| Auto-deactivation | Companies with expired/revoked licenses auto-suspended |
| Sync audit | All sync operations logged |

**Exit criteria:** Installer/OMI company status stays synchronized with Directorate licensing system.

#### e-Albania Notifications (Sprint 4)

| Deliverable | Details |
|-------------|---------|
| SMS notification channel | Via e-Albania notification service |
| Notification preferences | User-configurable channel preferences |
| Template management | Admin-editable notification templates |

---

### Operations Track

#### Advanced Maintenance Compliance (Sprints 1–2)

| Deliverable | Details |
|-------------|---------|
| Compliance engine | Configurable intervals per elevator type |
| Grace period configuration | Admin-configurable grace days |
| Escalation workflow | Auto-escalation to ISHMT after threshold |
| Compliance dashboard | Municipality-level compliance rates |
| Non-compliance reports | Exportable regulatory reports |
| Bulk compliance recalculation | Nightly job |

#### Advanced Inspection Management (Sprints 2–3)

| Deliverable | Details |
|-------------|---------|
| Regional assignment | Inspectors assigned to municipalities |
| Inspection calendar | Calendar view for inspectors |
| Overdue detection | Daily job identifying overdue inspections |
| Extraordinary inspection trigger | From citizen reports and safety issues |
| Re-inspection workflow | Auto-scheduling after failed inspection |
| Auto-suspension | Elevator suspended if re-inspection deadline missed |

#### Certificate Lifecycle (Sprint 3)

| Deliverable | Details |
|-------------|---------|
| Expiry monitoring | Daily job checking certificate expiry |
| Multi-tier warnings | 30, 15, 7 day notifications |
| Auto-expire | Certificate status auto-changed on expiry date |
| Digital signature | PKI-based digital signatures on PDF certificates |
| Certificate verification | Public certificate verification endpoint |

---

### Security Track

#### Enhanced Security (Sprints 1–4, parallel)

| Deliverable | Details |
|-------------|---------|
| MFA for admin/inspector | TOTP-based multi-factor authentication |
| Password history | Prevent reuse of last 5 passwords |
| Session management UI | Admin can view/revoke active sessions |
| Security event alerts | Failed login spikes, permission denied patterns |
| Audit log partitioning | Monthly range partitions for performance |
| Read replica | Reporting queries on read replica |

---

### Reporting Track

#### Advanced Reporting (Sprints 3–4)

| Deliverable | Details |
|-------------|---------|
| Scheduled reports | Cron-based report generation and email delivery |
| Municipality comparison | Cross-municipality compliance comparison |
| Trend analysis | Registration, inspection, compliance trends over time |
| Custom date ranges | All reports support arbitrary date ranges |
| Report caching | Pre-computed report cache for heavy queries |
| Data export API | Authenticated API for report data export |

---

### Infrastructure Track

#### Production Hardening (Sprints 1–4, parallel)

| Deliverable | Details |
|-------------|---------|
| Redis integration | Session cache, notification queue, rate limiting |
| Background job processor | Async notification sending, compliance calculation |
| Horizontal scaling | Multiple app instances behind load balancer |
| Database read replica | Reporting and dashboard queries |
| Automated backups | Daily backup with tested restore procedure |
| Monitoring dashboard | Grafana/Prometheus or equivalent |
| Log aggregation | Centralized log search |

---

## Phase 2 Milestones

| Milestone | Target | Criteria |
|-----------|--------|----------|
| M1: e-Albania Live | Month 2 | SSO operational for all user types |
| M2: QKB Live | Month 3 | Automated maintenance company validation |
| M3: Full Compliance | Month 4 | Maintenance and inspection compliance engine operational |
| M4: National Coverage | Month 5 | All municipalities onboarded, legacy data > 95% imported |
| M5: Production Hardened | Month 6 | HA deployment, monitoring, MFA, digital signatures |

## Phase 2 Success Metrics

| Metric | Target |
|--------|--------|
| e-Albania login adoption | > 80% of users |
| QKB validation accuracy | > 99% |
| Maintenance compliance visibility | 100% of active elevators have compliance status |
| Certificate expiry prevention | < 5% of certificates expire without prior notification |
| National registry coverage | > 95% of known elevators registered |
| System availability | > 99.5% |

## Phase 2 Dependencies

| Dependency | Owner | Risk |
|------------|-------|------|
| e-Albania OIDC API access | AKSHI / e-Albania team | High - requires government coordination |
| QKB API access | QKB / Ministry | High - API may not exist; may need adapter to web services |
| Directorate licensing API | Directorate | Medium - may require manual sync initially |
| PKI infrastructure | National PKI authority | Medium - for digital signatures |
| Production infrastructure | ISHMT IT | Medium - server procurement / cloud approval |

## Phase 2 Explicitly Deferred

- e-Inspection integration
- Mobile inspector native app
- GIS integration
- Public API for third parties
- Multi-language support
- AI-assisted document validation
- IoT integration
