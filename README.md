# Credix

Decentralized microlending on the Canton Network. Borrowers request loans, lenders make offers, everything runs on DAML smart contracts with built-in privacy and credit scoring.

**Stack:** Next.js + TypeScript frontend, Spring Boot (Java 21) backend, Canton ledger with DAML contracts, PostgreSQL via PQS for reads.

## Architecture

```
  Borrower / Lender
        |
        | HTTPS
        v
+---------------+       REST        +------------------+
|   Next.js     | ----------------> |  Spring Boot     |
|   Frontend    | <---------------- |  Backend         |
|   (nginx)     |       JSON        |  (Java 21)       |
+---------------+                   +------------------+
                                      |            |
                              gRPC    |            | JDBC
                           (writes)   |            | (reads)
                                      v            v
                                +---------+   +----------+
                                | Canton  |   | Postgres |
                                | Ledger  |   |          |
                                | (DAML)  |   +----------+
                                +---------+        ^
                                      |            |
                                      | indexes    |
                                      v            |
                                +----------+-------+
                                |   PQS (Scribe)   |
                                |   event indexer   |
                                +------------------+
```

**Write path:** Frontend -> Backend -> Canton Ledger (gRPC commands)
**Read path:** Canton -> PQS indexes events into Postgres -> Backend queries via JDBC -> Frontend

### Loan Flow

```
Borrower                    Platform                     Lender
   |                           |                            |
   |-- LoanRequest ---------->|                            |
   |                           |-- disclose to lenders --->|
   |                           |                            |
   |                           |            LoanOffer -----|
   |<-- offer visible --------|<---------------------------|
   |                           |                            |
   |-- accept & fund -------->|                            |
   |                           |------- Loan created ----->|
   |                           |                            |
   |-- repay ----------------->|                            |
   |                           |-- update CreditProfile    |
   |                           |------- loan archived ---->|
```

## Prerequisites

- Java 21+ — `brew install --cask temurin@21` on macOS
- Node.js 18+ and npm
- Docker 27+ with Docker Compose 2.27+
- **Give Docker at least 8 GB of memory** (Docker Desktop → Settings → Resources)

## Getting Started

All commands run from the `quickstart/` directory:

```sh
cd quickstart

# configure your environment (auth mode, party hint, etc.)
make setup

# install the DAML SDK if you don't have it yet
JAVA_HOME=$(/usr/libexec/java_home -v 21) make install-daml-sdk

# build and start everything
JAVA_HOME=$(/usr/libexec/java_home -v 21) PATH="$HOME/.daml/bin:$PATH" make start

# check that containers are healthy
make status
```

Open **http://app-provider.localhost:3000** once everything is up. First boot takes a few minutes — Canton/Splice need ~2 min to initialize.

### Dev Mode (hot reload)

```sh
# terminal 1 — backend + infra
make start-vite-dev

# terminal 2 — frontend dev server
cd frontend && npm run dev
```

## Common Commands

| Command | What it does |
|---|---|
| `make start` | Build and launch everything |
| `make stop` | Shut down all containers |
| `make status` | Container health check |
| `make logs` / `make tail` | View or follow logs |
| `make restart-backend` | Rebuild + restart the backend only |
| `make restart-frontend` | Rebuild + restart the frontend only |
| `make clean-docker` | Stop containers, wipe volumes |
| `make clean-all` | Nuke build artifacts + Docker |
| `make canton-console` | Open the Canton REPL |

## Project Layout

```
quickstart/
├── daml/          # DAML smart contracts (loan lifecycle, credit scoring)
├── backend/       # Spring Boot REST API (talks to Canton via gRPC)
├── frontend/      # Next.js app (borrower + lender dashboards)
├── common/        # Shared OpenAPI spec
├── docker/        # Docker Compose modules (localnet, PQS, auth, observability)
├── compose.yaml   # Main compose file
└── Makefile       # All the commands above
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `splice` container never becomes healthy | Give Docker more RAM. Run `make clean-all && make setup && make start` |
| Build fails with "requires Java 17" | Set `JAVA_HOME=$(/usr/libexec/java_home -v 21)` before make commands |
| `daml` not found | Run `make install-daml-sdk`, add `~/.daml/bin` to your PATH |
| Loan requests don't show up for lenders | PQS indexing takes ~10 seconds, just wait a bit |
| `CONTRACT_NOT_FOUND` on fund | That request was already accepted or cancelled — pick another offer |

## API

Full spec lives in `quickstart/common/openapi.yaml`. Key endpoints:

- `POST /loans/request` — create a loan request
- `POST /loans/offer` — make an offer on a request
- `POST /loans/offers/{id}/fund` — accept an offer
- `POST /loans/{id}/repay` — repay a loan
- `GET /loan-requests`, `/loan-offers`, `/loans`, `/credit-profile` — read data

## Deployed Contract Addresses

### Package ID

The DAR package ID is deterministic — the same DAR always produces the same ID on any participant.

```
2d6c1fa0e899097fbc80936a32ce598c9424bffef5833c65dd5f980dd44c2446
```

### Template IDs

Format: `PackageId:Module:Template`

| Template | Full ID |
|---|---|
| **Loan** | `2d6c1fa…c2446:Loan.Loan:Loan` |
| **LoanRequest** | `2d6c1fa…c2446:Loan.LoanRequest:LoanRequest` |
| **LoanRequestForLender** | `2d6c1fa…c2446:Loan.LoanRequest:LoanRequestForLender` |
| **LoanOffer** | `2d6c1fa…c2446:Loan.LoanOffer:LoanOffer` |
| **FundingIntent** | `2d6c1fa…c2446:Loan.LoanOffer:FundingIntent` |
| **LoanPrincipalRequest** | `2d6c1fa…c2446:Loan.LoanOffer:LoanPrincipalRequest` |
| **CreditProfile** | `2d6c1fa…c2446:Loan.CreditProfile:CreditProfile` |
| **CreditScoreView** | `2d6c1fa…c2446:Loan.CreditScoreView:CreditScoreView` |
| **LoanRepaymentRequest** | `2d6c1fa…c2446:Loan.LoanRepaymentRequest:LoanRepaymentRequest` |
| **LenderBid** | `2d6c1fa…c2446:Loan.MarketMaker:LenderBid` |
| **BorrowerAsk** | `2d6c1fa…c2446:Loan.MarketMaker:BorrowerAsk` |
| **MatchingEngine** | `2d6c1fa…c2446:Loan.MarketMaker:MatchingEngine` |
| **MatchedLoanProposal** | `2d6c1fa…c2446:Loan.MarketMaker:MatchedLoanProposal` |
| **BorrowOrder** | `2d6c1fa…c2446:Loan.OrderBook:BorrowOrder` |
| **LendOrder** | `2d6c1fa…c2446:Loan.OrderBook:LendOrder` |
| **MatchedDeal** | `2d6c1fa…c2446:Loan.OrderBook:MatchedDeal` |
| **AppInstall** | `2d6c1fa…c2446:Licensing.AppInstall:AppInstall` |
| **AppInstallRequest** | `2d6c1fa…c2446:Licensing.AppInstall:AppInstallRequest` |
| **License** | `2d6c1fa…c2446:Licensing.License:License` |
| **LicenseRenewalRequest** | `2d6c1fa…c2446:Licensing.License:LicenseRenewalRequest` |

All template IDs share the package ID prefix above. Contract *instance* IDs are assigned at creation time and returned in the transaction response — they're not fixed.

### DAR Dependencies

| Package | Package ID |
|---|---|
| daml-stdlib 3.4.10 | `08e57d514689e8f95f397581e060d426957a44f3dd21f82872892d6c3a117f3f` |
| splice-api-token-metadata-v1-1.0.0 | `4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f` |
| splice-api-token-holding-v1-1.0.0 | `718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b` |
| splice-api-token-allocation-v1-1.0.0 | `93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d` |
| splice-api-token-allocation-request-v1-1.0.0 | `6fe848530b2404017c4a12874c956ad7d5c8a419ee9b040f96b5c13172d2e193` |
| daml-prim | multiple — run `daml damlc inspect-dar` to see all |
