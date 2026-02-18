# Loan principal and repayment with Canton’s native token standard

This app already uses **Canton’s native token standard** (Splice) for license fees. The same mechanism is the right way to move value for loans: **funding** (lender → borrower) and **repayment** (borrower → lender).

## What’s native on Canton

- **Splice token standard** (CIP-0056): fungible tokens represented as **Holdings** (UTXOs). Instruments (e.g. a stablecoin) are identified by **InstrumentId**.
- **AllocationRequest / Allocation**: an app creates an **AllocationRequest** (who pays whom, amount, instrument, time windows); the payer **allocates** (e.g. via wallet); the executor **completes** by running **Allocation_ExecuteTransfer**, which moves the tokens on-ledger.
- The **license renewal** flow in this repo is the reference: `LicenseRenewalRequest` implements `AllocationRequest` with one leg (user → provider for the fee). The same pattern applies to loans.

## Using it for loans

1. **Funding (lender pays borrower principal)**  
   When the borrower accepts an offer, instead of creating the `Loan` immediately you can create a **LoanPrincipalRequest** (implements `AllocationRequest`) with one leg:
   - **Sender:** lender  
   - **Receiver:** borrower  
   - **Amount:** principal  
   - **InstrumentId:** your stablecoin (or test instrument) on the network  

   The lender’s wallet allocates against this request; when the allocation is executed, you create the `Loan` and archive the offer (see `LoanPrincipalRequest` in DAML).

2. **Repayment (borrower pays lender principal + interest)**  
   Add a **LoanRepaymentRequest** (or similar) implementing `AllocationRequest` with one leg:
   - **Sender:** borrower  
   - **Receiver:** lender  
   - **Amount:** principal + interest  
   - **InstrumentId:** same (or agreed) instrument  

   Borrower allocates; on completion you exercise `Loan_RepayLoan` (and archive the loan / update credit profile).

## Instrument (stablecoin) on Canton

- **Production:** Use an **InstrumentId** for a token that exists on your Canton network (e.g. a listed stablecoin or your own token). The token’s admin must have created the instrument and participants must have **Holdings** in it.
- **Local / test:** The repo’s licensing tests use a test token (e.g. “amulet”); you can use the same or another test instrument for loans by referencing its **InstrumentId** in `LoanPrincipalRequest` / repayment request.

## DAML in this repo

- **`Loan/LoanPrincipalRequest.daml`** – Implements `AllocationRequest` for lender → borrower principal. When the lender allocates and the executor (lender) runs **LoanPrincipalRequest_CompleteFunding** with the allocation contract id and `ExtraArgs` (from `Splice.Api.Token.MetadataV1`), the transfer is executed and the **Loan** is created. Same pattern as `LicenseRenewalRequest` in `Licensing/License.daml`.  
  **Creating the request:** Both lender and borrower are signatories, so `LoanPrincipalRequest` must be created with both parties’ authority (e.g. backend multi-party submission, or a new choice on `LoanOffer` that creates it so both stakeholders authorize).
- The existing **LoanOffer_Accept** (create `Loan` immediately, no token) stays as-is for the current flow.

## Backend and UI

- Backend: add endpoints (or reuse existing) to create the token-backed request (e.g. call the new DAML choice), and to complete funding/repayment with an allocation contract id (e.g. after wallet allocation).
- UI: for “Fund loan”, either keep the current flow (create `Loan` only) or switch to the token flow (create `LoanPrincipalRequest`, show “Waiting for lender to allocate”, then “Complete funding” when allocation exists). Repayment UI can show “Repay with token” and drive the repayment allocation flow.

## References

- [Token Standard APIs (Splice)](https://docs.global.canton.network.sync.global/app_dev/token_standard/index.html) – Holdings, AllocationRequest, Allocation.
- [CIP-0056](https://github.com/global-synchronizer-foundation/cips/blob/main/cip-0056/cip-0056.md) – Canton token standard overview.
- This repo: `Licensing/License.daml` (LicenseRenewalRequest) and `Loan/LoanPrincipalRequest.daml` (loan funding).
