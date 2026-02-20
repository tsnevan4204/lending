# Denver Frontend – Unique Features for Backend

This document lists features that appear in the **Denver Lending** frontend (`denver-lending-platform/`) and should be implemented or exposed by the backend. The existing quickstart backend already supports core loan lifecycle and token settlement; the items below are either not yet implemented or need new APIs.

---

## 1. Lending orderbook (bids & asks)

**Frontend:** `MarketDepth` view, lender “Place Bid”, “My Liquidity Bids” with cancel.

- **LenderBid** (standalone liquidity order):
  - Lender, amount, minInterestRate, maxDuration
  - Status: `active` | `filled` | `partial` | `cancelled`
  - `remainingAmount` (for partial fill)
  - Created at
- **BorrowerAsk** (standalone demand order):
  - Borrower, amount, maxInterestRate, duration
  - Status: `active` | `filled` | `cancelled`
  - Created at
- **Order book aggregation:** Bids/asks aggregated by rate (rate → total amount, count).
- **Spread:** Best bid vs best ask.
- **Backend needed:**
  - DAML: `LenderBid` and `BorrowerAsk` contract types (or equivalent), with platform as observer if required for indexing.
  - REST: Create/cancel lender bid; create/cancel borrower ask.
  - REST: List lender bids and borrower asks (for order book and “My Bids”); optionally aggregated by rate for depth.

---

## 2. Matching / settling (orderbook → loan)

**Frontend:** Copy says “Your bid will be added to the order book and **matched against borrower asks**.”

- When a lender bid and borrower ask are compatible (rate/duration/amount), they should be **matched** and **settled** into an active **Loan** (same as current loan contract).
- **Backend needed:**
  - Matching logic: either on-ledger (DAML) or in backend (e.g. when creating/updating bids/asks or via a “match”/“settle” endpoint).
  - Settlement: consume bid and ask (full or partial), create `Loan` and update bid/ask status (e.g. `remainingAmount`, `filled`/`partial`).

---

## 3. Platform stats (overview dashboard)

**Frontend:** `OverviewDashboard` shows:

- Total value locked (TVL)
- Total loans originated
- Average interest rate
- Active loans count
- Total lenders
- Total borrowers
- (Optional) Monthly volume / time-series

**Backend needed:**

- REST: e.g. `GET /platform-stats` or `GET /stats` returning:
  - `totalValueLocked`, `totalLoansOriginated`, `averageInterestRate`, `activeLoans`, `totalLenders`, `totalBorrowers`
- Implementation: aggregate from PQS/indexed data (loans, requests, parties) or maintain cached stats.

---

## 4. Contract visibility (privacy view)

**Frontend:** `PrivacyView` shows a contract visibility matrix including:

- LoanRequest, LoanRequestForLender, LoanOffer, Loan, CreditProfile (already in backend/DAML).
- **LenderBid:** signatories Lender, observers Platform Operator.
- **BorrowerAsk:** signatories Borrower, observers Platform Operator.

**Backend:** No new endpoint required for “visibility” text; once LenderBid and BorrowerAsk exist on-ledger, the frontend copy is accurate. Optional: a small `/contract-visibility` or doc endpoint that returns this matrix for consistency.

---

## 5. Already supported by current backend

- Loan request (create, list).
- Loan offer (create, list).
- Accept offer & fund loan (including token settlement path: funding intent, confirm, complete funding).
- Repay loan (including token repayment path: request repayment, complete repayment).
- Mark default (lender).
- Credit profile (get).
- Auth (shared-secret / OAuth2) and `/api` proxy via nginx.

---

## 6. Suggested backend implementation order

1. **Platform stats** – single read-only endpoint, no new DAML.
2. **LenderBid / BorrowerAsk** – DAML templates + create/cancel + list (and optional aggregated order book).
3. **Matching/settling** – logic to match bid/ask and create Loan (and update bid/ask state).

After that, the Denver UI can call real APIs for order book, “Place Bid”, “My Bids”, and overview stats; settling will complete the orderbook → loan flow.
