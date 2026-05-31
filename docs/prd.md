# Requirements Document

## 1. Application Overview

### 1.1 Application Name
ShadowGrid AI

### 1.2 Application Description
A predictive smart city failure intelligence platform that detects early warning signs of urban infrastructure problems before they become emergencies. The system consolidates citizen reports, weather data, public signals, and historical patterns to compute zone-level risk scores and recommend preventive actions.

### 1.3 Core Objective
Help cities move from reactive response to predictive resilience by identifying which zones are most likely to fail next and recommending early interventions.

---

## 2. Users and Usage Scenarios

### 2.1 Target Users
- City administrators
- Municipal maintenance teams
- Emergency response coordinators
- Urban operations teams
- Citizens submitting incident reports

### 2.2 Core Usage Scenarios
- Monitor city-wide infrastructure risk levels in real-time
- Submit localized infrastructure issue reports
- Identify highest-risk zones requiring immediate attention
- Simulate cascading failure chains
- Allocate maintenance teams to priority zones
- Review preventive action recommendations

---

## 3. Page Structure and Functional Description

### 3.1 Page Hierarchy

```
ShadowGrid AI
├── Landing Page
├── Main Dashboard
├── Zone Details Page
├── Citizen Report Submission Page
├── Analytics Page
└── Admin/Operations Page
```

### 3.2 Page-by-Page Functional Description

#### 3.2.1 Landing Page
**Purpose**: Introduce the platform and provide entry to main features

**Content**:
- Platform overview and value proposition
- Problem statement explanation
- Key features summary
- Call-to-action to access dashboard

#### 3.2.2 Main Dashboard
**Purpose**: Display city-wide risk overview and key intelligence

**Dashboard Sections**:

**Top Summary Cards**:
- Total active risk signals
- Highest-risk zone count
- Most common failure type
- Estimated failures prevented

**City Risk Map Section**:
- Display city zones on interactive map using Leaflet
- Color-code zones by risk level (0-100 scale)
- Support click interaction to open zone details

**Highest-Risk Zones Panel**:
- List top 5-10 zones by risk score
- Show zone name, risk category, and score
- Provide quick access to zone details

**Recent Signals Panel**:
- Display latest citizen reports and external signals
- Show signal type, zone, severity, and timestamp
- Support filtering by signal source

**Recommendations Panel**:
- List top preventive actions by priority
- Show action description, target zone, and urgency level
- Display expected impact reduction

**Failure Chain Panel**:
- Visualize simulated cascading failure scenarios
- Show sequence: trigger event → intermediate failures → final impact
- Highlight affected zones and services

**Analytics Preview Section**:
- Show risk trend chart
- Display citizen report count vs. public signal count
- Show estimated response improvement metrics

#### 3.2.3 Zone Details Page
**Purpose**: Provide detailed risk analysis for a specific zone

**Content**:
- Zone name and location
- Current risk scores by category (drainage, road, water, power, traffic, emergency access)
- Risk explanation panel showing contributing factors
- Recent signals affecting this zone
- Recommended preventive actions
- Nearby zone influence indicators
- Historical failure rate

#### 3.2.4 Citizen Report Submission Page
**Purpose**: Allow citizens to submit infrastructure issue reports

**Form Fields**:
- Report type (required): street flooding, blocked drainage, low water pressure, power fluctuation, road cracks/potholes, traffic jam, streetlight outage, fallen tree/blocked route
- Location/zone (required): dropdown or map selection
- Severity (required): low, medium, high, critical
- Description (required): text area
- Image URL or attachment placeholder (optional)
- Contact details (optional)

**Submission Flow**:
- User fills form
- User submits report
- System stores report as citizen_reports entity
- System triggers risk score recalculation for related zone
- User receives confirmation message

#### 3.2.5 Analytics Page
**Purpose**: Display comprehensive analytics and trends

**Analytics Sections**:
- Total active risk signals over time
- Risk distribution by category
- Citizen report trends
- Public signal trends
- Zone risk heatmap
- Most common failure types
- Response improvement metrics
- Estimated failures prevented count

#### 3.2.6 Admin/Operations Page
**Purpose**: Support maintenance team allocation and operational decisions

**Content**:
- Ranked list of high-risk zones
- Preventive action recommendations with priority ranking
- Team allocation optimizer:
  - Input: number of available teams
  - Output: recommended deployment plan assigning teams to top-priority zones
- Action tracking status
- Expected risk reduction estimates

---

## 4. Business Rules and Logic

### 4.1 Risk Scoring Formula

Final Risk Score = 0.30 × Citizen Complaint Density + 0.25 × Weather Severity + 0.20 × Public Web Signal Strength + 0.15 × Historical Failure Rate + 0.10 × Nearby Zone Impact

**Component Definitions**:
- Citizen Complaint Density: normalized count of citizen reports per zone
- Weather Severity: normalized severity from weather API data
- Public Web Signal Strength: normalized severity from news/public sources
- Historical Failure Rate: zone's past failure frequency
- Nearby Zone Impact: propagated risk from connected zones

### 4.2 Risk Categories

Supported risk categories:
- Drainage overflow risk
- Road blockage risk
- Water supply risk
- Power outage risk
- Traffic congestion risk
- Emergency access risk

### 4.3 Signal Normalization

**Input Sources**:
- Citizen reports
- Open-Meteo (weather data)
- NewsAPI (public news signals)
- OpenStreetMap/Overpass (infrastructure context)
- Seeded demo data

**Normalization Process**:
- Extract signal type, zone, severity, confidence, timestamp
- Detect keywords: flooding, power outage, road closure, water shortage, traffic disruption, blocked drains
- Assign source type and confidence score
- Store as external_signals entity

### 4.4 Graph-Based Risk Propagation

**Zone Graph Model**:
- Zones represented as nodes
- Roads, drainage links, operational dependencies represented as edges

**Propagation Rules**:
- Drainage risk spreads to low-lying connected zones
- Traffic risk spreads along road dependencies
- Power risk spreads through grid-connected areas
- Use configurable propagation weights per category

### 4.5 Failure Chain Simulation

**Example Chain**:
Heavy Rainfall → Drainage Overflow → Road Blockage → Traffic Congestion → Ambulance Delay → Hospital Access Risk

**Simulation Logic**:
- Use pre-defined failure chain templates
- Match current risk data to chain triggers
- Identify affected zones and impacted services
- Generate readable chain sequence

### 4.6 Preventive Action Recommendation

**Recommendation Generation**:
- Based on zone, category, urgency, and impact
- Example actions: dispatch drainage team, alert residents, inspect power lines, redirect traffic, protect hospital access routes
- Rank by priority score
- Include urgency level and expected impact reduction

### 4.7 Team Allocation Optimization

**Input**:
- Number of available maintenance teams
- Current zone risk scores

**Output**:
- Ranked deployment plan
- Team assignments to top-priority zones
- Expected risk reduction per assignment

### 4.8 Signal Recency and Time Decay

- Newer signals have stronger impact on risk scores
- Apply time decay function to older signals
- Configurable decay rate per signal type

---

## 5. Exception and Boundary Conditions

| Scenario | Handling |
|----------|----------|
| External API unavailable | Use seeded fallback data, display warning message |
| No citizen reports for a zone | Rely on external signals and historical data only |
| Multiple duplicate reports | Cluster reports, increase complaint density score |
| Zone with no connected neighbors | Skip propagation step for that zone |
| Zero available maintenance teams | Display warning, show recommendations without allocation |
| Invalid report submission | Display validation error, require correction |
| Risk score calculation failure | Log error, use last known score, alert admin |
| Map rendering failure | Display fallback zone list view |

---

## 6. Acceptance Criteria

1. User opens the landing page and views platform overview
2. User navigates to main dashboard and views city risk map with color-coded zones
3. User clicks a high-risk zone and views detailed risk scores, explanation, and recommendations
4. User navigates to citizen report submission page, fills form, and submits a report successfully
5. System stores the report and recalculates related zone risk score
6. User views updated risk score on dashboard reflecting the new report
7. User views analytics page showing risk trends and signal counts
8. Admin user opens operations page, inputs available team count, and receives deployment plan

---

## 7. Out of Scope for This Release

- Real-time IoT sensor integration
- Full mobile app development
- SMS or WhatsApp alert notifications
- Full historical ML model training pipeline
- Enterprise-grade access control and multi-tenancy
- Advanced GIS administration tools
- Production-grade municipal system integrations
- Complex authentication flows (admin-only auth may be added later)
- Live external API ingestion (use seeded data for MVP)
- Advanced risk algorithms (use weighted formula placeholders)
- File upload for citizen report images (use URL placeholder only)
- Multi-city support (focus on single city or simulated model)
- Traffic API integration
- Emergency vehicle routing
- Government complaint portal integration