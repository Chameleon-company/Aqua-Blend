# AquaBlend API Contract

## 1. Overview

This document defines the REST API contract for the AquaBlend backend.

The API is implemented using ASP.NET Core and exposes JSON REST endpoints under
the `/api` route prefix.

The backend is responsible for:

- Water source management
- Scenario management
- Optimisation result retrieval
- Automatic change detection
- Health monitoring
- Authenticated user information

All timestamps returned by the API are UTC.

---

## 2. Base URL

Local development:

```text
http://localhost:5194