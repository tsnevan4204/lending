# Denver Lending

A decentralized microlending platform built on the Canton Network with DAML smart contracts. Borrowers request loans, lenders make offers, and all transactions are recorded on a privacy-preserving distributed ledger with automatic credit scoring.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  React UI   │────▶│  Spring Boot API  │────▶│  Canton Ledger      │
│  (Vite/TS)  │◀────│  (Java 21)        │◀────│  (DAML Contracts)   │
└─────────────┘     └──────────────────┘     └─────────────────────┘
                           │                          │
                           ▼                          ▼
                    ┌──────────────┐          ┌──────────────┐
                    │  PostgreSQL  │◀─────────│  PQS (Scribe)│
                    │  (read store)│          │  (indexer)   │
                    └──────────────┘          └──────────────┘
```

- **DAML Smart Contracts** — Define the loan lifecycle with cryptographic privacy guarantees. Only authorized parties can see contracts they are signatories or observers on.
- **Spring Boot Backend** — REST API that submits commands to the Canton ledger via gRPC and queries indexed contracts from PostgreSQL via PQS.
- **React Frontend** — TypeScript SPA with role-based dashboards for borrowers and lenders.
- **Canton Network + PQS** — Distributed ledger with PostgreSQL Query Service for efficient read queries.

## Features

### Loan Lifecycle
1. **Borrower requests a loan** — Creates a `LoanRequest` contract specifying amount, interest rate, duration, and purpose.
2. **Platform broadcasts to lenders** — The backend proactively discloses new requests to all registered lender parties. Lenders see requests immediately on their dashboard.
3. **Lender makes an offer** — Creates a `LoanOffer` contract, optionally adjusting the amount or interest rate.
4. **Borrower accepts an offer** — Exercises the `LoanOffer_Accept` choice, which archives the request/offer and creates an active `Loan` contract.
5. **Borrower repays the loan** — Exercises `Loan_RepayLoan`, which archives the loan and updates the borrower's credit profile.
6. **Lender can mark default** — If a borrower fails to repay, the lender exercises `Loan_MarkDefault`.

### Credit Scoring
- Each borrower has a private `CreditProfile` (only the borrower can see it).
- Initial score: **600** (range 300–850).
- Successful repayment: **+10 points**.
- Default: **-50 points**.
- Tracks total loans, successful repayments, and defaults.

### Privacy
- `LoanRequest` is visible only to the borrower and platform operator until disclosed.
- `LoanOffer` is visible only to the lender who made it and the borrower.
- `Loan` is visible only to the lender and borrower (both signatories).
- `CreditProfile` is private to the borrower (sole signatory, no observers).
- Lenders cannot see other lenders' offers for the same request.

## Smart Contracts

| Contract | Signatories | Observers | Purpose |
|---|---|---|---|
| `LoanRequest` | borrower | platformOperator | Borrower's loan request |
| `LoanRequestForLender` | platformOperator | lender | Disclosed view of a request for a specific lender |
| `LoanOffer` | lender | borrower | Lender's offer on a request |
| `Loan` | lender, borrower | — | Active funded loan |
| `CreditProfile` | borrower | — | Borrower's private credit history |

## Prerequisites

- **Java 21+** (e.g., `brew install --cask temurin@21`)
- **Node.js 18+** and npm
- **Docker 27+** with **Docker Compose 2.27+**
- **Docker memory: 8 GB minimum** (Docker Desktop > Settings > Resources)

## Quick Start

```sh
cd quickstart

# First-time: configure environment (auth mode, party hint, etc.)
make setup

# Build everything and start all Docker services
JAVA_HOME=$(/usr/libexec/java_home -v 21) PATH="$HOME/.daml/bin:$PATH" make start

# Check container health
make status

# Open the app
open http://app-provider.localhost:3000
```

First startup takes several minutes (Canton/Splice have a ~120s initialization period).

### Install DAML SDK (if not already installed)

```sh
JAVA_HOME=$(/usr/libexec/java_home -v 21) make install-daml-sdk
```

### Frontend Dev Mode (Hot Reload)

```sh
# Terminal 1: Start backend stack
make start-vite-dev

# Terminal 2: Start Vite dev server
cd frontend && npm run dev
```

## User Flows

### As a Borrower
1. Log in (username: `app-user` in shared-secret mode)
2. Navigate to **Borrower** dashboard
3. Click **Request loan** — fill in amount, interest rate, duration, purpose
4. Wait for lenders to make offers (they appear automatically)
5. Click **Accept & fund** on an offer
6. Once funded, click **Repay** to repay the loan

### As a Lender
1. Log in (username: `lender` in shared-secret mode)
2. Navigate to **Lender** dashboard
3. Browse loan requests (automatically disclosed by the platform)
4. Click **Make offer** on a request — optionally adjust terms
5. Wait for borrower to accept
6. Track funded loans in the dashboard

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/loans/request` | Create a loan request (borrower) |
| `POST` | `/loans/offer` | Create a loan offer (lender) |
| `POST` | `/loans/offers/{contractId}/fund` | Accept offer and create loan (borrower) |
| `POST` | `/loans/{contractId}/repay` | Repay a loan (borrower) |
| `GET` | `/loan-requests` | List loan requests visible to caller |
| `GET` | `/loan-offers` | List loan offers visible to caller |
| `GET` | `/loans` | List active loans visible to caller |
| `GET` | `/credit-profile` | Get borrower's credit profile |

Full OpenAPI spec: `quickstart/common/openapi.yaml`

## Project Structure

```
lending/
├── quickstart/
│   ├── daml/licensing/daml/Loan/     # DAML smart contracts
│   │   ├── Loan.daml                 # Active loan contract
│   │   ├── LoanRequest.daml          # Borrower request + disclosure
│   │   ├── LoanOffer.daml            # Lender offer + acceptance
│   │   ├── CreditProfile.daml        # Private credit scoring
│   │   └── LoanTypes.daml            # Shared types
│   ├── backend/src/main/java/        # Spring Boot REST API
│   │   ├── service/                   # API implementations
│   │   ├── repository/                # DAML contract queries
│   │   ├── ledger/                    # Canton ledger client
│   │   └── security/                  # Auth (OAuth2 / shared-secret)
│   ├── frontend/src/                  # React + TypeScript UI
│   │   ├── views/                     # Page components
│   │   ├── stores/                    # React Context state
│   │   └── components/                # Reusable UI components
│   ├── common/openapi.yaml            # REST API specification
│   ├── compose.yaml                   # Docker Compose orchestration
│   └── Makefile                       # Build and run commands
└── README.md
```

## Useful Commands

| Command | Description |
|---|---|
| `make start` | Build and start everything |
| `make stop` | Stop all containers |
| `make status` | Show container health status |
| `make logs` / `make tail` | View / follow container logs |
| `make restart-backend` | Rebuild and restart only the backend |
| `make restart-frontend` | Rebuild and restart only the frontend |
| `make clean-docker` | Stop containers and remove volumes (full reset) |
| `make clean-all` | Clean build artifacts + Docker |
| `make setup` | Reconfigure environment settings |
| `make canton-console` | Open Canton REPL |

## Troubleshooting

| Problem | Fix |
|---|---|
| `splice` container stuck / never healthy | Give Docker at least 8 GB RAM. Run `make stop && make clean-all && make setup && make start` |
| `splice-onboarding` hanging | Check `docker logs splice-onboarding` to see which step is running |
| Backend fails to start | Check `docker logs backend-service` for config or connection errors |
| Loan requests don't appear on lender dashboard | Wait ~10 seconds for PQS indexing. The platform proactively discloses requests, but there is a short delay. |
| `CONTRACT_NOT_FOUND` when funding | The underlying request was already accepted or cancelled. Pick a different offer. |
| Build fails with "requires Java 17" | Set `JAVA_HOME=$(/usr/libexec/java_home -v 21)` before running make commands |
| `daml` command not found | Run `make install-daml-sdk` and add `~/.daml/bin` to your PATH |
