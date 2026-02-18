# Testing the Fund loan flow

## Do old loan contracts survive a backend restart?

- **Restart backend only:** The Canton ledger (participant + PQS) keeps running. **All contracts (loan requests, offers, loans) stay.** So after a backend restart you still see the same offers; some may be **stale** (underlying request already accepted by another offer).
- **Restart full stack** (e.g. `docker compose down` then `up`, or `make` targets that recreate ledger): The ledger is usually recreated, so **contracts are lost**. You need to run the full workflow again: borrower creates request → lender makes offer → borrower accepts (fund).

So: use **restart backend only** when you only changed backend code and want to keep the same ledger. Use a **full workflow restart** when you want a clean state (e.g. for a demo).

---

## Manual test (browser + logs)

### 1. Start from a clean or known state

- **Option A – Fresh workflow:** Restart the full stack, then as **app-user** create a loan request, then as **lender** make one offer on it, then continue below as borrower.
- **Option B – Use existing data:** Only restart backend if needed; go to Borrower dashboard as **app-user**.

### 2. Log in as borrower (app-user)

- Open `http://app-provider.localhost:3000/login`.
- Use **AppUser** (or shared-secret: user `app-user`, password `abc123`).
- After login you should see “app user” in the header.

### 3. Open Borrower dashboard and pick an offer

- Go to **Borrower** (or `/borrower`).
- In **“Offers you can accept”** you should see at least one offer. Use **“Accept & fund”** on one of them (do not reuse an old `/loans/fund?offerId=...` from a previous run; that offer may already be consumed).

### 4. Submit Fund loan

- You should land on `/loans/fund` with **Loan offer contract ID** and **Your credit profile contract ID** pre-filled.
- Click **“Fund loan”**.

### 5. What to check

**Frontend (browser):**

- **Success:** Redirect to `/borrower`, toast “Loan funded”, and the new loan appears under **Active loans**.
- **Stale offer:** Red alert with “This offer is no longer valid…” and the link back to Borrower dashboard. No redirect.

**Backend logs:**

- Look for `[fundLoan] party=... offerContractId=... creditProfileId=...`.
- **Success:** Then `[fundLoan] completed loanId=...`.
- **Stale/not found:** Then `[fundLoan] CONTRACT_NOT_FOUND (offer or underlying request no longer valid): ...` and HTTP 409.

**Frontend console (F12 → Console):**

- Success: no error; optional `[loanStore]` logs.
- Failure: network error (409/500) and the message shown in the alert.

---

## Automated test (Playwright)

From `quickstart/integration-test`:

1. Ensure the app is running and login has been run once so `storage/userState.json` exists (app-user session).
2. Run the loan tests:

   ```bash
   cd integration-test
   npx playwright test loan
   ```

The `loan` project uses the saved app-user session, goes to the Borrower dashboard, then either:

- Clicks “Accept & fund” on the first offer, submits the form, and asserts success or the “no longer valid” message, or  
- If there are no offers, skips or asserts the empty state.

This verifies the Fund loan button and API path end-to-end; backend and frontend logs from the run can be used to debug any failure.
