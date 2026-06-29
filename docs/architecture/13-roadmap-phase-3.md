# Roadmap - Phase 3: National Ecosystem & Intelligence

**Duration:** 6–8 months  
**Prerequisite:** Phase 2 complete, national registry operational  
**Goal:** Transform the registry into a national ecosystem hub with inter-agency integration, advanced analytics, and field operations support.

---

## Phase 3 Deliverables

### Integration Ecosystem

#### e-Inspection Integration (Sprints 1–3)

| Deliverable | Details |
|-------------|---------|
| e-Inspection API adapter | Bidirectional integration with national e-Inspection platform |
| Inspection data sync | Import inspection results from e-Inspection |
| Inspection dispatch | Send scheduled inspections to e-Inspection for field execution |
| Unified inspection record | Single view combining ISHMT and e-Inspection data |
| Conflict resolution | Rules for reconciling discrepancies between systems |

**Value:** Inspectors use familiar e-Inspection tools in the field; results flow automatically to the elevator registry.

#### National GIS Integration (Sprint 2)

| Deliverable | Details |
|-------------|---------|
| Address validation | Validate and geocode addresses via national GIS |
| Map view | Elevator locations on municipality maps |
| Geographic reporting | Heat maps of compliance, inspections, reports |
| GPS capture | Mobile-friendly GPS capture for citizen reports |

#### Public API Gateway (Sprints 3–4)

| Deliverable | Details |
|-------------|---------|
| API gateway | Rate-limited, authenticated API for external consumers |
| Elevator lookup API | Registry number → public profile data |
| Compliance status API | Municipality-level compliance statistics |
| Webhook subscriptions | External systems subscribe to registry events |
| API documentation | OpenAPI 3.0 specification |
| API key management | Admin portal for API consumer management |

**Approved consumers (anticipated):**
- Municipal authorities
- Building permit systems
- Insurance companies
- Fire safety services
- Academic/research institutions (anonymized aggregate data)

#### Cross-Agency Data Exchange (Sprint 4)

| Deliverable | Details |
|-------------|---------|
| Event bus | Publish registry events (registration, deregistration, suspension) |
| Agency subscriptions | Configurable event subscriptions per agency |
| Data sharing agreements | Technical enforcement of data sharing scope |
| Exchange audit | All cross-agency data exchanges logged |

---

### Field Operations

#### Mobile Inspector Application (Sprints 2–5)

| Deliverable | Details |
|-------------|---------|
| Progressive Web App | Offline-capable inspector app |
| QR scanner | Scan elevator QR to pull up digital file |
| Inspection form | Mobile-optimized inspection data entry |
| Photo capture | On-site photo documentation |
| Offline sync | Queue actions when offline, sync when connected |
| GPS tagging | Automatic location tagging of inspections |

**Value:** Inspectors conduct field work without needing desktop access.

#### Citizen Mobile Experience (Sprint 3)

| Deliverable | Details |
|-------------|---------|
| QR scanner in browser | Scan QR without dedicated app |
| Report from mobile | Streamlined mobile report submission |
| Report tracking | Authenticated citizens track report status |

---

### Intelligence & Analytics

#### Advanced Analytics Platform (Sprints 4–6)

| Deliverable | Details |
|-------------|---------|
| Analytics dashboard | Executive-level KPI dashboard for ISHMT leadership |
| Predictive maintenance alerts | ML-based prediction of maintenance failures |
| Risk scoring | Elevator risk score based on age, maintenance, inspection history |
| Trend forecasting | Registration and compliance trend projections |
| Anomaly detection | Unusual patterns in maintenance/inspection data |
| Custom report builder | Drag-and-drop report designer for admins |

#### Business Intelligence Export (Sprint 5)

| Deliverable | Details |
|-------------|---------|
| Data warehouse sync | Nightly ETL to analytics data warehouse |
| BI tool connector | Power BI / Metabase connector |
| Regulatory submission | Automated generation of EU/national regulatory reports |
| Open data portal | Anonymized aggregate data for public transparency |

---

### Platform Maturity

#### Multi-Language Support (Sprint 1)

| Deliverable | Details |
|-------------|---------|
| i18n framework | next-intl or equivalent |
| Albanian (sq) | Primary language (already implemented) |
| English (en) | Full translation for international stakeholders |
| Translation management | Admin UI for translation updates |

#### Service Extraction (Sprints 5–7)

| Deliverable | Details |
|-------------|---------|
| Notification service | Extract to standalone service |
| Document service | Extract to standalone service with dedicated storage |
| Integration gateway | Extract to standalone service |
| Event bus | Message broker (RabbitMQ or equivalent) |
| Service mesh readiness | Health checks, circuit breakers, service discovery |

**Rationale:** As integration load grows, extract high-traffic modules without disrupting core registry operations.

#### Disaster Recovery (Sprint 6)

| Deliverable | Details |
|-------------|---------|
| DR site | Secondary deployment site |
| Automated failover | Database failover with < 1 hour RTO |
| DR testing | Quarterly DR drill |
| Geo-redundant storage | Document storage replicated across sites |

---

## Phase 3 Architecture Evolution

```
Phase 1: Modular Monolith
    │
    ▼
Phase 2: Modular Monolith + Integration Adapters + Redis
    │
    ▼
Phase 3: Core Monolith + Extracted Services + API Gateway + Event Bus
    │
    ├── Core Registry (Monolith)
    │   ├── Applications, Elevators, Certificates, QR
    │   ├── Workflow Engine, Audit
    │   └── Authentication, Authorization
    │
    ├── Notification Service
    ├── Document Service
    ├── Integration Gateway
    │   ├── e-Albania Adapter
    │   ├── QKB Adapter
    │   ├── e-Inspection Adapter
    │   └── GIS Adapter
    │
    ├── API Gateway
    │   ├── Public API
    │   └── Agency Webhooks
    │
    ├── Analytics Service
    │   ├── Data Warehouse ETL
    │   └── Report Builder
    │
    └── Event Bus
        ├── Registry Events
        └── Agency Subscriptions
```

## Phase 3 Milestones

| Milestone | Target | Criteria |
|-----------|--------|----------|
| M1: e-Inspection Live | Month 2 | Bidirectional inspection sync operational |
| M2: Mobile Inspector | Month 4 | PWA deployed, inspectors using in field |
| M3: Public API | Month 5 | API gateway live with first external consumer |
| M4: Analytics Live | Month 6 | Executive dashboard and risk scoring operational |
| M5: Platform Mature | Month 8 | Service extraction complete, DR tested |

## Phase 3 Success Metrics

| Metric | Target |
|--------|--------|
| e-Inspection sync accuracy | > 99% |
| Mobile inspector adoption | > 90% of field inspectors |
| Public API uptime | > 99.9% |
| Average inspection completion time | 50% reduction vs. Phase 1 |
| Risk score accuracy | > 85% correlation with actual incidents |
| Cross-agency data exchange | 3+ agencies connected |
| DR recovery time | < 1 hour |

## Phase 3 Long-Term Vision

Beyond Phase 3, the platform positions ISHMT for:

| Capability | Description |
|------------|-------------|
| EU market surveillance alignment | Data formats compatible with EU elevator directive reporting |
| IoT readiness | Webhook architecture supports future elevator sensor data ingestion |
| AI document processing | Architecture supports ML pipeline for automatic document extraction |
| Blockchain verification | QR verification via distributed ledger (if national initiative emerges) |
| Regional expansion | Platform architecture reusable for other Western Balkans countries |

## Total Program Timeline

```
Phase 1: Foundation & Core Registry     ████████████████░░░░  Months 1–8
Phase 2: Operations & Integration     ░░░░░░░░░░░░░░░░████████████  Months 7–13
Phase 3: Ecosystem & Intelligence     ░░░░░░░░░░░░░░░░░░░░░░░░████████████  Months 12–20
                                      ──────────────────────────────────────
                                      Month 1                    Month 20
```

Phases 2 and 3 overlap with Phase 1 tail (pilot expansion) to maintain continuous delivery momentum.
