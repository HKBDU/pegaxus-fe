# 🐎 Pegaxus Frontend (`pegaxus-fe`)

> **Racehorse Cross-Border Transport & Quarantine Logistics Management System**  
> *Course Project: SWP391 (Software Development Project)*

[![Quality CI](https://github.com/HKBDU/pegaxus-fe/actions/workflows/quality.yml/badge.svg)](https://github.com/HKBDU/pegaxus-fe/actions/workflows/quality.yml)
[![React Version](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite Version](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Linter: Oxlint](https://img.shields.io/badge/Linter-Oxlint-F27A1A?logo=rust&logoColor=white)](https://oxc.rs/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

## 📖 1. Project Overview

**Pegaxus** is a specialized enterprise logistics platform designed to manage the high-stakes international transportation of racehorses across borders. The system solves complex operational, veterinary, and regulatory challenges:

- **Multimodal Route Planning**: Coordination across Road, Air, and Sea transit legs with scheduled stops at certified equine stables, rest stops, and quarantine border gates.
- **Compliance & Quarantine Dossier Management**: End-to-end verification of strict veterinary health records, CITES certifications, import/export government permits, and customs clearance documents.
- **Real-Time Monitoring & Escort Tracking**: Live geolocation tracking, in-transit telemetry, and status updates provided by assigned drivers, grooms, and veterinary escorts.
- **Customer Portal & Transparent Billing**: Intuitive self-service booking for horse owners, trainers, and racing syndicates, with automated quote calculation, invoicing, and milestones tracking.

This repository hosts the single-page web application (**Frontend**) for the Pegaxus platform.

---

## 🛠️ 2. Technology Stack

| Category | Technology / Library | Version | Description |
| :--- | :--- | :--- | :--- |
| **Core Framework** | [React](https://react.dev/) | `^19.2.8` | Latest React 19 leveraging modern client hooks & concurrent features |
| **Build Tool & Bundler** | [Vite](https://vite.dev/) | `^8.3.0` | Ultra-fast Hot Module Replacement (HMR) and optimized ESM bundling |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `~6.0.2` | Configured with strict type checking enabled (`strict: true`) |
| **Linter & Code Quality** | [Oxlint](https://oxc.rs/) | `^1.81.0` | High-performance, Rust-based JavaScript/TypeScript linter |
| **CI / Automation** | [GitHub Actions](https://github.com/features/actions) | Workflow v4 | Automated validation of branch names, PR titles, linting, and build integrity |
| **Containerization** | [Docker](https://www.docker.com/) & [Nginx Alpine](https://hub.docker.com/_/nginx) | Multi-stage | Production container image with SPA fallback routing, gzip, and asset caching |

---

## 📂 3. Repository Structure

The project follows a **Feature-based Clean Architecture**, keeping domain modules isolated, modular, and maintainable:

```text
pegaxus-fe/
├── .github/
│   ├── workflows/
│   │   └── quality.yml           # CI Pipeline: validates PR metadata, lint, and build
│   └── PULL_REQUEST_TEMPLATE.md  # Standard Pull Request submission template
├── public/                       # Static public assets served directly
├── src/
│   ├── app/                      # Application root configuration (Router, Providers)
│   ├── assets/                   # Static media (SVG icons, imagery, custom fonts)
│   ├── features/                 # Encapsulated business domain modules
│   │   ├── auth/                 # Authentication, authorization, RBAC (Customer/Employee)
│   │   ├── booking/              # Racehorse transport booking forms & quotes
│   │   ├── transport/            # Transport planning, vehicle assignments, and routing
│   │   ├── dossier/              # Quarantine documents, veterinary health compliance
│   │   └── tracking/             # Real-time voyage milestones & tracking events
│   ├── lib/                      # Third-party integrations (Axios client, i18n, etc.)
│   ├── locales/                  # Multi-language translation dictionaries (en / vi)
│   ├── shared/                   # Cross-feature reusable codebase
│   │   ├── components/           # Generic UI component kit (Button, Modal, Table, Form)
│   │   ├── hooks/                # Global custom hooks (useDebounce, useMediaQuery)
│   │   ├── types/                # Shared TypeScript definitions & domain interfaces
│   │   └── utils/                # Utility helpers (currency, datetime, formatting)
│   ├── styles/                   # Design tokens, CSS variables, reset stylesheets
│   ├── App.tsx                   # Top-level root component
│   └── main.tsx                  # Client application entry point
├── .dockerignore                 # Exclusions for Docker build context
├── .env.example                  # Environment variables template
├── .oxlintrc.json                # Oxlint linter configuration rules
├── CONTRIBUTING.md               # Contribution workflow, commit specs & code standards
├── Dockerfile                    # Multi-stage production build (Node.js + Nginx)
├── docker-compose.yml            # Local container runtime definition
├── nginx.conf                    # Custom Nginx configuration for Vite SPA
├── package.json                  # Dependencies manifest and script definitions
├── RULESET.md                    # Branching strategy, PR naming & branch protection rules
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 🚀 4. Getting Started

### 4.1. Prerequisites
- **Node.js**: `20.x LTS` or `22.x LTS` recommended.
- **pnpm**: Version `11.x` or higher.
- **Docker Desktop** *(Optional)*: If running via containers.

### 4.2. Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/HKBDU/pegaxus-fe.git
   cd pegaxus-fe
   ```

2. **Install project dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure environment variables**:
   Create a local `.env` file from the provided template:
   ```bash
   # On Windows PowerShell:
   Copy-Item .env.example .env

   # On Linux/macOS:
   cp .env.example .env
   ```

4. **Start the local development server**:
   ```bash
   pnpm run dev
   ```
   Open your browser and navigate to: `http://localhost:5173` (or the port specified in terminal output).

---

## 📜 5. Available pnpm Scripts

| Command | Description |
| :--- | :--- |
| `pnpm run dev` | Starts Vite local development server with instant Hot Module Replacement (HMR). |
| `pnpm run lint` | Runs Oxlint across the codebase to check for syntax issues, dead code, and style errors. |
| `pnpm run build` | Runs TypeScript type checking (`tsc -b`) and produces an optimized production bundle in `dist/`. |
| `pnpm run preview` | Locally serves the production build in `dist/` for pre-deployment inspection. |

---

## 🐳 6. Docker Deployment

The application includes a production-ready **Multi-stage Dockerfile** paired with **Nginx Alpine** (configured with SPA client-side fallback routing, gzip compression, and static asset caching).

### 6.1. Running with Docker Compose (Recommended)
Launch the application with a single command:
```bash
docker compose up --build -d
```
The application will be accessible at:  
👉 **`http://localhost:3000`**

To stop and remove containers:
```bash
docker compose down
```

### 6.2. Running with Docker CLI Manually
```bash
# 1. Build the production image
docker build -t pegaxus-fe:latest .

# 2. Run the container mapping host port 3000 to container port 80
docker run -d -p 3000:80 --name pegaxus-fe-app pegaxus-fe:latest
```

---

## 🌿 7. Branching Strategy & CI Ruleset

To maintain a clean Git history and ensure stable deployments, all contributors must adhere to the team's branching policy:

- 🛡️ **Branching Model & Ruleset**: Refer to [RULESET.md](./RULESET.md) for full details.
  - Core branches: **`main`** (production-ready) and **`dev`** (sprint integration).
  - Feature branches: **`feat/<lowercase-name>`** (use `feat/`, **not** `feature/`).
  - Strict CI validation on PR creation via [.github/workflows/quality.yml](./.github/workflows/quality.yml):
    - **Branch regex**: `^(dev|(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)/[a-z0-9]+([._-][a-z0-9]+)*)$`
    - **PR Title regex**: `^(dev|(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._-]+\))?!?: .+)`
- 🤝 **Contributing Guidelines**: Refer to [CONTRIBUTING.md](./CONTRIBUTING.md) for Conventional Commits standards and code conventions.
- 📋 **Pull Request Template**: Use [.github/PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md) for all PR submissions.

---

## 🔐 8. Environment Variables

Vite requires public client environment variables to be prefixed with `VITE_`:

| Variable Name | Default Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:5001/api/v1` | Root URL of the Pegaxus Backend REST API |
| `VITE_USE_MOCK_PROFILE` | `false` | Development-only profile mock for testing without authentication |

---

## 👥 9. License & Academic Attribution

Developed as an academic capstone project for **SWP391** (Software Development Project).  
Licensed under the [Apache-2.0 License](./LICENSE).
