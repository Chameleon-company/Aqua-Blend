# AquaBlend Frontend Layout & Visual Design Specification

## 1. Purpose

This document defines the **frontend-only visual direction, layout system, interaction model, and UI behaviour** for AquaBlend.

It is intended to guide implementation in React / Next.js and can be given directly to Claude Code as a design and frontend-structure reference.

This document focuses on:
- page layout;
- visual hierarchy;
- interaction patterns;
- dashboard behaviour;
- motion and animation;
- presentation of MILP and AI outputs;
- responsive behaviour;
- frontend component structure.

This document does **not** define backend implementation, database logic, solver implementation, or API internals.

The frontend should treat all upstream systems as external services and depend only on stable response contracts.

## 2. Overall Design Direction

The AquaBlend frontend should combine two visual modes.

### 2.1 Landing / Entry Experience

The landing experience should feel:
- bold;
- editorial;
- technical;
- modern;
- high-confidence;
- visually distinctive.

The reference direction is a strong SaaS landing page with:
- oversized typography;
- restrained colour palette;
- subtle technical grid / dot patterns;
- one highly distinctive visual element;
- minimal copy;
- strong calls to action.

For AquaBlend, the distinctive visual element should be **animated water**, not a mascot or generic illustration.

### 2.2 Operational Dashboard

The application dashboard should be:
- cleaner;
- calmer;
- more data-dense;
- easier to scan;
- highly structured;
- less decorative.

The dashboard should use:
- strong top navigation;
- generous white space;
- simple borders;
- restrained panels;
- readable tables;
- clear filters;
- concise summary metrics;
- minimal icon usage.

The interface should **not** look like a generic AI dashboard filled with floating cards, colourful icons, or excessive rounded containers.

## 3. Visual Identity

### 3.1 Colour Direction

Recommended palette:
- deep navy / near-black for primary text;
- white / off-white for primary surfaces;
- AquaBlend blue for primary actions;
- cyan / aqua for interactive and water-related accents;
- muted grey for secondary labels;
- subtle green only for successful / healthy states;
- amber for warnings;
- red only for real errors or infeasible conditions.

Avoid:
- excessive gradients;
- neon effects;
- rainbow status colours;
- too many competing accent colours.

The water animation may use a more expressive aqua / blue range, but the dashboard itself should remain restrained.

### 3.2 Typography

Use strong hierarchy.

Recommended:
- large, bold display type for landing-page statements;
- medium-large page headings;
- compact dashboard labels;
- readable body text;
- monospace only where technical identifiers genuinely benefit from it.

Examples:
- Hero heading: 64–96px desktop
- Dashboard page title: 32–48px
- Section heading: 18–24px
- Body: 14–16px
- Data labels: 12–14px

Avoid making every section title oversized.

## 4. Animated Dotted Water Concept

### 4.1 Core Idea

The hero section should contain a **moving dotted water form**.

This should visually reference a particle / stippled / halftone object, but behave like water.

The animation should feel like:
- a flowing water surface;
- a moving wave;
- a fluid contour;
- a particle-based water body;
- a dynamic hydrological visualisation.

It should not look like:
- a static stock image;
- a literal photo;
- a generic blue blob;
- a particle explosion;
- a game effect.

### 4.2 Recommended Visual Behaviour

The water can be built from:
- thousands of small dots / particles;
- a procedural wave surface;
- a point-cloud mesh;
- a halftone / stipple shader;
- a canvas / WebGL particle field.

Preferred behaviour:
- slow continuous movement;
- soft wave deformation;
- subtle depth;
- cursor interaction;
- slight directional flow;
- optional scroll response.

Examples of useful interaction:
- water shifts slightly toward or away from cursor;
- nearby particles gently disperse or ripple;
- scroll changes wave amplitude slightly;
- reduced motion mode disables interaction and keeps a static low-motion state.

### 4.3 Technical Options

Preferred implementation order:

#### Option A — Three.js / React Three Fiber
Best for:
- interactive point clouds;
- subtle 3D movement;
- cursor-based displacement;
- high-quality visual effect.

Possible implementation:
- point geometry;
- shader-driven sine displacement;
- mouse-position uniform;
- animated time uniform;
- subtle opacity and depth variation.

#### Option B — HTML Canvas
Best for:
- simpler implementation;
- good performance;
- large particle count;
- easier 2D fluid-like motion.

#### Option C — CSS / SVG
Use only for:
- lightweight fallback;
- reduced-motion mode;
- simple dotted wave layers.

Avoid large DOM-based particle systems.

### 4.4 Performance Requirements

The animated water must:
- target 60fps on modern desktop devices;
- degrade gracefully on lower-powered devices;
- respect `prefers-reduced-motion`;
- pause or simplify when off-screen;
- not block initial page rendering;
- not interfere with form interaction;
- not create layout shift.

## 5. Global Application Layout

### 5.1 Top Navigation

Use a clean horizontal navigation similar to a modern technical SaaS product.

Recommended items:
- AquaBlend logo / wordmark
- Optimise
- Results
- Sources
- System Flow
- About

Right side:
- user / account
- optional environment/status indicator
- optional settings

Avoid:
- oversized sidebar for the main product;
- icon-only navigation;
- nested menus unless necessary.

### 5.2 Header Behaviour

Desktop:
- sticky top navigation;
- subtle bottom border;
- white / translucent background.

On scroll:
- maintain compact height;
- optionally introduce subtle blur.

Mobile:
- compact header;
- navigation in drawer / sheet.

## 6. Landing Page

### 6.1 Hero Layout

Recommended desktop structure:

```text
--------------------------------------------------------------
| NAVIGATION                                                   |
--------------------------------------------------------------
|                                                              |
|  LARGE HEADLINE                  ANIMATED DOTTED WATER       |
|  Clear AquaBlend statement       / PARTICLE WATER FORM       |
|                                                              |
|  Short supporting copy                                      |
|                                                              |
|  [ Start Optimising ] [ View System Flow ]                  |
|                                                              |
--------------------------------------------------------------
```

The hero should feel asymmetrical and editorial.

### 6.2 Suggested Hero Content

Primary message should communicate:
- water optimisation;
- explainable decisions;
- system-wide integration.

Example direction:

**Optimise water decisions.  
Understand every result.**

Supporting line:
AquaBlend combines validated source data, MILP optimisation and AI-assisted explanation into one operator-facing workflow.

Primary CTA:
- Start Optimising

Secondary CTA:
- Explore System Flow

### 6.3 Background Treatment

Recommended:
- very light technical grid;
- faint dot pattern;
- subtle coordinate-like lines;
- low-opacity water-flow contours.

Do not overdecorate.

## 7. Optimisation Workspace

This is the primary application screen.

### 7.1 Overall Layout

Recommended desktop layout:

```text
--------------------------------------------------------------
| TOP NAV                                                     |
--------------------------------------------------------------
| PAGE TITLE                     STATUS / ACTIVE SCENARIO      |
--------------------------------------------------------------
| INPUT / SCENARIO PANEL                                      |
--------------------------------------------------------------
| SOLVER STATUS                                               |
--------------------------------------------------------------
| SUMMARY METRICS                                             |
--------------------------------------------------------------
| SOURCE RESULTS                 NETWORK FLOW                 |
--------------------------------------------------------------
| QUALITY                       COST                          |
--------------------------------------------------------------
| AI EXPLANATION                                              |
--------------------------------------------------------------
| WARNINGS / TECHNICAL DETAILS                               |
--------------------------------------------------------------
```

The page should feel continuous rather than like a collection of disconnected cards.

## 8. Input Area

### 8.1 Natural-Language Input

Use:
- large text input / command bar;
- scenario selector;
- clear Run Optimisation action.

Fields:
- `request_text`
- `scenario_id`

Optional advanced controls:
- allow estimated values;
- source restrictions;
- source overrides;
- demand overrides.

Keep advanced controls collapsed by default.

### 8.2 Input Interaction

The input area should feel like the primary command surface.

Recommended:
- strong focus state;
- keyboard shortcut to submit;
- inline validation;
- recent scenarios;
- example prompt option.

Avoid chatbot-style bubbles.

## 9. Solver State

Immediately after submission, show a clear state strip.

Possible states:
- Queued
- Running
- Optimal
- Infeasible
- Failed

Display:
- scenario ID;
- current solver state;
- solve time when available;
- objective value when available;
- warning count.

Use a horizontal status strip rather than a large decorative card.

## 10. Summary Metrics

Use a compact horizontal metrics row similar to a modern analytics product.

Recommended metrics:
- Solver Status
- Total Cost
- Total Demand
- Total Delivered
- Selected Sources
- Active Plants
- Solve Time
- Warnings

Use:
- large value;
- small label;
- subtle divider.

Avoid separate rounded cards for every metric.

## 11. Source Results

### 11.1 Selected Sources Table

Required fields:
- source name / ID
- selected state
- withdrawal ML/day
- blend ratio
- source cost
- fixed cost contribution
- withdrawal cost contribution

Recommended additional fields:
- maximum capacity
- utilisation %
- readiness
- estimated-value indicator
- provenance
- binding evidence

Recommended table behaviour:
- sortable columns;
- sticky header;
- row hover;
- row expansion for technical details.

### 11.2 Unused Sources

Display below or in a tab:
- source;
- reason if available;
- availability;
- capacity;
- data-quality state.

Never invent a reason.

## 12. Network Flow Visualisation

This should be one of the most interactive parts of the product.

### 12.1 Structure

Show:

**Sources → Treatment Plants → Demand Zones**

Each edge:
- represents flow;
- displays ML/day;
- thickness can reflect flow magnitude.

Each node:
- displays ID/name;
- displays active state;
- supports click / hover.

### 12.2 Interaction

Hover:
- highlight connected path;
- dim unrelated nodes;
- show exact flow.

Click:
- open detail panel.

Potential animation:
- subtle directional particle motion along active flow paths.

Do not overanimate.

## 13. Demand Results

Fields:
- zone
- demand
- delivered
- unmet demand
- surplus
- satisfied state

Recommended visual:
- compact progress / comparison bar;
- numeric values always visible.

## 14. Water Quality

Display:
- pH
- alkalinity
- turbidity

For each parameter:
- blended value;
- lower limit;
- upper limit;
- margins;
- binding state.

Recommended visual:
- range bar;
- current value marker;
- limit markers.

Do not expose internal hydronium transformation in the normal user view.

## 15. Cost Breakdown

Fields:
- source fixed cost
- source withdrawal cost
- plant fixed cost
- plant treatment cost
- reconstructed total
- solver objective
- reconciliation state

Recommended:
- compact stacked cost table;
- optional simple bar chart;
- reconciliation indicator.

## 16. AI Explanation

The AI output must be clearly separated from solver facts.

Recommended section:

```text
AI EXPLANATION
------------------------------------------------
Human-readable explanation text

Evidence used:
- selected source X
- capacity binding
- quality within limits
- estimated data disclosure
------------------------------------------------
```

Important:
- label as AI-generated explanation;
- never imply AI made the optimisation decision;
- expose evidence / confidence when available;
- show deterministic fallback if LLM output is unavailable.

## 17. Results Page

Route:
`/results`

Use a clean table-first layout.

Columns:
- scenario
- status
- objective cost
- solve time
- selected sources
- created date
- warnings

Filters:
- scenario
- status
- date
- source
- optimal / infeasible

Use pagination or virtualised scrolling.

## 18. Result Detail Page

Route:
`/results/[resultId]`

Layout:
1. solver status
2. summary
3. source selection
4. network
5. demand
6. quality
7. cost
8. evidence
9. AI explanation
10. warnings / notes

Allow:
- copy result ID;
- export if upstream support exists;
- compare with another result in future.

## 19. Sources Page

Route:
`/sources`

Use a data-table layout similar to a clean repository list.

Fields:
- source name
- source type
- availability
- model-ready status
- capacity
- cost
- pH
- alkalinity
- turbidity
- estimated-data status
- provenance

Filters:
- source type
- availability
- model-ready
- estimated / measured

## 20. System Flow Page

Route:
`/system-flow`

This page should visually represent:

**Data Science → Shared Contracts → MILP → Backend → AI → Frontend**

The diagram should:
- be interactive;
- highlight stages on hover;
- show short descriptions;
- show key contracts;
- avoid exposing backend implementation internals.

This page is primarily educational / architectural.

## 21. Interaction Philosophy

The application should feel responsive and deliberate.

Use:
- hover states;
- smooth section transitions;
- data row expansion;
- subtle chart animations;
- flowing network paths;
- skeleton loading;
- meaningful empty states.

Avoid:
- bouncing UI;
- excessive motion;
- floating elements everywhere;
- unnecessary modals;
- decorative animations that distract from data.

## 22. Motion System

Use motion in three categories.

### 22.1 Ambient Motion
- dotted water hero;
- subtle background flow.

### 22.2 Functional Motion
- loading;
- route transitions;
- row expansion;
- network path highlighting;
- status changes.

### 22.3 Data Motion
- chart entry;
- flow line activation;
- range indicators.

All motion should be fast and subtle.

## 23. Loading States

Use skeletons rather than spinners where possible.

Examples:
- source table skeleton;
- result summary skeleton;
- network placeholder;
- AI explanation placeholder.

During solver execution:
- show clear progress state;
- show scenario ID;
- show elapsed time if available;
- show that optimisation is running.

## 24. Error / Infeasible States

### Infeasible
Display:
- clear headline;
- short explanation;
- warnings / constraint information;
- suggestion to modify scenario if appropriate.

Do not display zero-valued results as if they were valid.

### Failed
Display:
- error summary;
- retry;
- technical detail expandable.

## 25. Responsive Behaviour

### Desktop
- full data density;
- split layouts;
- large network visual.

### Tablet
- stacked major sections;
- horizontally scrollable tables.

### Mobile
- simplified metrics;
- stacked rows;
- compact navigation;
- network visual converted to vertically scrollable / simplified form.

## 26. Accessibility

Required:
- keyboard navigable;
- clear labels;
- accessible table headers;
- status not colour-only;
- sufficient contrast;
- reduced motion support;
- alternative text/table for network visualisation;
- screen-reader-friendly loading / error states.

## 27. Recommended Component Structure

```text
src/
├── app/
│   ├── page.tsx
│   ├── optimise/
│   ├── results/
│   ├── sources/
│   ├── system-flow/
│   └── about/
├── components/
│   ├── navigation/
│   ├── hero/
│   │   └── DottedWater
│   ├── optimisation/
│   ├── results/
│   ├── network/
│   ├── quality/
│   ├── ai/
│   ├── tables/
│   └── states/
├── types/
├── services/
├── hooks/
└── utils/
```

## 28. Dotted Water Component

Suggested component:

```text
DottedWater
├── WaterCanvas
├── ParticleField
├── PointerInteraction
├── MotionController
└── ReducedMotionFallback
```

Props may include:
- density
- amplitude
- speed
- interaction strength
- responsive quality level
- reduced motion flag

The exact implementation can use React Three Fiber or Canvas.

## 29. Design Rules for Claude Code

When implementing:

1. Do not generate a generic dashboard full of cards.
2. Use strong typography and whitespace.
3. Prefer bordered sections and tables over floating containers.
4. Keep colours restrained.
5. Keep the water motif visually important but not distracting.
6. Use one consistent data hierarchy.
7. Keep AI explanation visually separate from MILP facts.
8. Never expose internal PuLP variable names in the UI.
9. Do not implement backend logic in frontend components.
10. Build reusable typed components rather than page-specific duplicated structures.

## 30. Definition of Done

The frontend visual implementation is complete when:

- the landing page has a strong AquaBlend identity;
- the animated dotted-water element works smoothly;
- the dashboard is clear and data-first;
- users can submit optimisation requests;
- solver states are visible;
- selected sources and network flows are understandable;
- demand, quality, and costs are clearly displayed;
- AI explanations are clearly separated from solver output;
- warnings are visible;
- results can be revisited;
- the interface is responsive;
- accessibility requirements are met;
- motion respects reduced-motion preferences;
- no frontend component depends directly on backend/database or PuLP internals.
