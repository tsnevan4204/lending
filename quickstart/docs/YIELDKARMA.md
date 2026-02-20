# YieldKarma

**Do good. Earn yield. Stack Karma.**

YieldKarma is a DeFi lending platform where investors earn passive crypto yield while helping small businesses grow — powered by on-chain Karma and real-world lending pools.

## One-liner

A DeFi platform where investors earn passive crypto yield while helping small businesses grow — powered by on-chain Karma and real-world lending.

## Why it matters

- **Borrowers** get access to credit based on wallet credibility (Karma): score, repayment history, and platform activity. No KYC; no ML credit scoring — the existing credit model (score + successful/defaulted loans) is your Karma.
- **Investors** “Yield Karm” by funding specific loan requests (direct lending) or, in the future, staking into ETF-style pools for auto-deployment to top-performing loans.

## How it works (on Canton)

- **Karma** = Credit profile: score, total loans, successful vs defaulted. Built from on-chain repayment behavior. Terms and visibility improve with higher Karma.
- **Loan marketplace**: Borrowers submit needs (amount, rate, duration, purpose). Requests are disclosed to lenders; investors browse and make offers.
- **Direct lending**: Investor picks a request, makes an offer; borrower accepts and funds. Loan is created on-chain; repayments update Karma.
- **Passive pools (coming soon)**: Stake into pools (e.g. AgriPool, KarmaMax) for diversified, auto-managed deployment. Placeholder in the UI.

## Canton integration

- **Daml**: LoanRequest, LoanRequestForLender, LoanOffer, Loan, CreditProfile (Karma), LoanPrincipalRequest for token-backed funding.
- **PQS**: Backend queries active contracts as app-provider; platform operator visibility on offers/requests for reliable listing.
- **No KYC, no ML**: Credibility is entirely from the existing credit-scoring model (score + repayment history).

## README checklist

| Item | Status |
|------|--------|
| Title: YieldKarma | ✅ |
| Tagline: Do good. Earn yield. Stack Karma. | ✅ |
| One-sentence summary | ✅ (above) |
| Canton integration (Daml loan + Karma logic, PQS) | ✅ |
| No KYC / no ML credit scoring | ✅ (use existing credit profile as Karma) |
| Team & handles | Add your team + Twitter/GitHub |

## Running

From the `quickstart` directory:

```bash
make build-daml   # build DAR + backend
make start        # start Canton, PQS, backend, frontend
# or make restart after code changes
```

Open the app, log in (shared-secret: e.g. app-provider, lender, app-user), then use **Borrow** (submit needs, view Karma, accept offers) or **Invest** (loan marketplace, make offers, funded loans).

**Simplified two-step flow**

1. **Borrower submits their loan**  
   Log in as **app-user** (borrower) → **Submit a need** (amount, rate, days, purpose). The request is created on-chain and appears in the loan marketplace.

2. **Lender accepts the loan**  
   Log in as **lender** (investor) → open **Investor dashboard** → **Loan marketplace** shows borrower requests. Click **Accept loan (fund)** to commit to fund a request. The borrower then sees the offer under **Borrower dashboard** → **Accept & fund** to create the loan on-chain. The lender gives the borrower the principal (e.g. via stablecoins using the existing **LoanPrincipalRequest** / allocation flow); the borrower repays over time (repayment UI and token flow can be wired next).

Only offers whose underlying request is still active are shown, so the borrower never sees “already accepted” offers and avoids 409 conflicts.

**Stablecoin funding:** The repo has **LoanPrincipalRequest** (implements `AllocationRequest`) for lender → borrower principal transfer. After the borrower accepts the loan on-chain, you can wire the UI to create a funding request so the lender allocates in their wallet and the principal moves in stablecoins; see `docs/LOAN_TOKEN_INTEGRATION.md`.
