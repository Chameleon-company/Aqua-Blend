# AquaBlend

AquaBlend is a mathematical optimisation framework that helps drinking-water providers select, blend, and treat water from multiple sources across Victoria. The project uses Mixed Integer Linear Programming (MILP) to recommend cost-effective source blending and treatment strategies while maintaining drinking-water safety, regulatory compliance, and operational feasibility.

This is a SIT Capstone project (Product Owner: Dr Atabak Elmi), currently in its public-data proof-of-concept phase.

## Project Overview

Victorian water sources, reservoirs, rivers, and groundwater, have different mineral and quality profiles. AquaBlend explores whether intelligently selecting and blending these sources before or during treatment can reduce the amount of added chemicals and treatment required, lowering operating costs while keeping water safe and compliant.

The project starts with a public-data proof-of-concept (Scope 1) and is designed to evolve toward an operational model using real water corporation data in future trimesters.

## Team Structure

The project is organised into four teams, each owning a distinct part of the pipeline:

| Team                | Folder                     | Responsible For                                                                                                                                                                                                                                                  |
| ------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Optimisation (MILP) | `MILP/`                    | The mathematical formulation and optimisation model. Takes in water source data, demand, and quality constraints, and outputs a recommended blend, cost breakdown, and constraint status. This is the core decision engine the rest of the project builds around |
| Data Engineering    | `Data_sci_scripts/`        | Sourcing, cleaning, and documenting the real datasets the model runs on (reservoir, river, and groundwater data, water quality readings, etc.), and maintaining a clear record of what's been collected and what's still outstanding                             |
| AI and Analysis     | `AI/`                      | Demand forecasting, anomaly detection, and any applied AI/LLM features (e.g. natural-language summaries or a Q&A layer over model results)                                                                                                                       |
| App & Delivery      | `Frontend/` and `Backend/` | The dashboard and product interface. Consumes the MILP model's output and presents it to users through a working web application, frontend UI plus backend routes/services/database                                                                              |

Data Engineering prepares the source data used by the MILP model. The MILP pipeline processes scenario inputs, runs the optimisation and stores the results, which are then made available through the application. AI and Analysis will provide additional capabilities such as result interpretation and forecasting.

## Repository Structure

```
Aqua-Blend/
├── MILP/                  # Optimisation model: formulation, code, and documentation
├── AI/                    # AI and Analysis models and documentation
├── Data_sci_scripts/      # Data cleaning scripts and dataset documentation
├── Frontend/              # Dashboard frontend source
├── Backend/               # Dashboard backend: routes, services, controllers, ORM
└── README.md              # This file
```

## System Overview

The intended end-to-end workflow consists of:

1. **Scenario creation:** Users configure scenarios through the frontend, which are validated and stored by the backend.
2. **Data loading and preprocessing:** The MILP pipeline retrieves scenario information and source data, validates the inputs and prepares the model parameters.
3. **Optimisation:** The Pyomo model solves the source allocation and treatment optimisation problem.
4. **Postprocessing:** Solver outputs are validated, structured and stored in the database.
5. **Results and analysis:** The backend provides results to the frontend, with AI-assisted interpretation planned as an additional component.

The system is under active development, and some functionality remains to be implemented or integrated.

## Contributing

Development takes place in the main repository, Chameleon-company/Aqua-Blend, using feature branches and pull requests into master.

For the branch workflow, contribution rules and review requirements, see:

- [Contributing Guidelines](.github/CONTRIBUTING.md)
- [Review Guidelines](.github/REVIEW_GUIDELINES.md)

## Contact

Product Owner: Dr Atabak Elmi
Mentor: Saeedeh Javadi

---
