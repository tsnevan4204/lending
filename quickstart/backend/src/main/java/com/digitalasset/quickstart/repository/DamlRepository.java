// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.repository;

import com.digitalasset.quickstart.pqs.Contract;
import com.digitalasset.quickstart.pqs.Pqs;
import com.digitalasset.transcode.java.ContractId;
import com.digitalasset.transcode.java.Template;
import com.digitalasset.transcode.java.Utils;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;
import quickstart_licensing.licensing.appinstall.AppInstall;
import quickstart_licensing.licensing.appinstall.AppInstallRequest;
import quickstart_licensing.licensing.license.License;
import quickstart_licensing.licensing.license.LicenseRenewalRequest;
import quickstart_licensing.loan.creditprofile.CreditProfile;
import quickstart_licensing.loan.loan.Loan;
import quickstart_licensing.loan.loanoffer.FundingIntent;
import quickstart_licensing.loan.loanoffer.LoanOffer;
import quickstart_licensing.loan.loanoffer.LoanPrincipalRequest;
import quickstart_licensing.loan.loanrepaymentrequest.LoanRepaymentRequest;
import quickstart_licensing.loan.loanrequest.LoanRequest;
import quickstart_licensing.loan.loanrequest.LoanRequestForLender;
import quickstart_licensing.loan.marketmaker.LenderBid;
import quickstart_licensing.loan.marketmaker.BorrowerAsk;
import quickstart_licensing.loan.marketmaker.MatchingEngine;
import quickstart_licensing.loan.marketmaker.MatchedLoanProposal;
import splice_api_token_allocation_request_v1.splice.api.token.allocationrequestv1.AllocationRequest;
import splice_api_token_allocation_v1.splice.api.token.allocationv1.Allocation;

/**
 * Repository for accessing active Daml contracts via PQS.
 */
@Repository
public class DamlRepository {

    private static final Logger logger = LoggerFactory.getLogger(DamlRepository.class);

    private final Pqs pqs;

    @Autowired
    public DamlRepository(Pqs pqs) {
        this.pqs = pqs;
    }

    private static boolean isPqsIdentifierNotFound(Throwable t) {
        Throwable c = t;
        while (c != null) {
            if (c.getMessage() != null && c.getMessage().contains("Identifier not found")) {
                return true;
            }
            c = c.getCause();
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private static <T extends Template> List<Contract<T>> handlePqsTemplateNotFound(Throwable ex, String templateName) {
        var cause = ex instanceof CompletionException ce ? ce.getCause() : ex;
        if (cause != null && isPqsIdentifierNotFound(cause)) {
            logger.warn("{} template not yet in PQS schema (Identifier not found), returning empty list. " +
                    "Restart the PQS pipeline after deploying the licensing DAR (e.g. make restart-service SERVICE=pqs-app-provider).", templateName);
            return Collections.emptyList();
        }
        throw ex instanceof RuntimeException re ? re : new CompletionException(ex);
    }

    @SuppressWarnings("unchecked")
    private static <T extends Template> Optional<Contract<T>> handlePqsTemplateNotFoundOptional(Throwable ex, String templateName) {
        var cause = ex instanceof CompletionException ce ? ce.getCause() : ex;
        if (cause != null && isPqsIdentifierNotFound(cause)) {
            logger.info("{} template not yet in PQS schema (Identifier not found), returning empty", templateName);
            return Optional.empty();
        }
        throw ex instanceof RuntimeException re ? re : new CompletionException(ex);
    }

    public record LicenseRenewalRequestWithAllocationCid(
            Contract<LicenseRenewalRequest> renewal,
            Optional<ContractId<Allocation>> allocationCid) {
    }

    public record LicenseWithRenewalRequests(
            Contract<License> license,
            List<LicenseRenewalRequestWithAllocationCid> renewals) {
    }

    public record LoanPrincipalRequestWithAllocationCid(
            Contract<LoanPrincipalRequest> principalRequest,
            Optional<ContractId<Allocation>> allocationCid) {
    }

    public record LoanRepaymentRequestWithAllocationCid(
            Contract<LoanRepaymentRequest> repaymentRequest,
            Optional<ContractId<Allocation>> allocationCid) {
    }

    private <T extends Template> T extractPayload(Class<T> clazz, String payload) {
        return clazz.cast(pqs.getJson2Dto().template(Utils.getTemplateIdByClass(clazz)).convert(payload));
    }

    private <T extends Template> Contract<T> extract(Class<T> clazz, ContractId<T> cid, String payload) {
        return new Contract<>(cid, extractPayload(clazz, payload));
    }

    private <T extends Template> Optional<ContractId<T>> optionalCid(Class<T> clazz, String cid) {
        return Optional.ofNullable(cid).map(ContractId<T>::new);
    }

    private <T extends Template> ContractId<T> cid(Class<T> clazz, String cid) {
        return new ContractId<T>(cid);
    }

    private <T extends Template> String qualifiedName(Class<T> clazz) {
        return Utils.getTemplateIdByClass(clazz).qualifiedName();
    }

    /**
     * Finds active License contracts where the user or provider matches the given party.
     */
    public CompletableFuture<List<LicenseWithRenewalRequests>> findActiveLicenses(String party) {
        var map = new HashMap<String, LicenseWithRenewalRequests>();
        String sql = """
                SELECT license.contract_id    AS license_contract_id,
                       license.payload        AS license_payload,
                       renewal.contract_id    AS renewal_contract_id,
                       renewal.payload        AS renewal_payload,
                       allocation.contract_id AS allocation_contract_id
                FROM active(?) license
                LEFT JOIN active(?) renewal ON
                    license.payload->>'licenseNum' = renewal.payload->>'licenseNum'
                    AND license.payload->>'user' = renewal.payload->>'user'
                LEFT JOIN active(?) allocation ON
                    renewal.payload->>'requestId' = allocation.payload->'allocation'->'settlement'->'settlementRef'->>'id'
                    AND renewal.payload->>'user' = allocation.payload->'allocation'->'transferLeg'->>'sender'
                WHERE license.payload->>'user' = ? OR license.payload->>'provider' = ?
                ORDER BY license.contract_id
                """;
        return pqs.query(sql, rs -> {
                    var licenseId = rs.getString("license_contract_id");
                    if (!map.containsKey(licenseId)) {
                        map.put(licenseId,
                                new LicenseWithRenewalRequests(
                                        extract(License.class, cid(License.class, licenseId), rs.getString("license_payload")),
                                        new java.util.ArrayList<>()
                                )
                        );
                    }
                    var renewalCid = optionalCid(LicenseRenewalRequest.class, rs.getString("renewal_contract_id"));
                    if (renewalCid.isPresent()) {
                        map.get(licenseId).renewals.add(new LicenseRenewalRequestWithAllocationCid(
                                        extract(LicenseRenewalRequest.class, renewalCid.get(), rs.getString("renewal_payload")),
                                        optionalCid(Allocation.class, rs.getString("allocation_contract_id"))
                                )
                        );
                    }
                },
                qualifiedName(License.class),
                qualifiedName(LicenseRenewalRequest.class),
                qualifiedName(Allocation.class),
                party,
                party
        ).thenApply(v -> new java.util.ArrayList<>(map.values()));
    }

    /**
     * Fetches a License contract by contract ID.
     */
    public CompletableFuture<Optional<Contract<License>>> findLicenseById(String contractId) {
        return pqs.contractByContractId(License.class, contractId);
    }

    public CompletableFuture<Optional<Contract<LicenseRenewalRequest>>> findActiveLicenseRenewalRequestById(String contractId) {
       return pqs.contractByContractId(LicenseRenewalRequest.class, contractId);
    }

    public CompletableFuture<Optional<Contract<AllocationRequest>>> findActiveAllocationRequestById(String contractId) {
        return pqs.contractByContractId(AllocationRequest.class, contractId);
    }

    /**
     * Fetches an AppInstall contract by contract ID.
     */
    public CompletableFuture<Optional<Contract<AppInstall>>> findAppInstallById(String contractId) {
        return pqs.contractByContractId(AppInstall.class, contractId);
    }

    /**
     * Fetches an AppInstallRequest contract by contract ID.
     */
    public CompletableFuture<Optional<Contract<AppInstallRequest>>> findAppInstallRequestById(String contractId) {
        return pqs.contractByContractId(AppInstallRequest.class, contractId);
    }

    /**
     * Finds all active AppInstall contracts.
     */
    public CompletableFuture<List<Contract<AppInstall>>> findActiveAppInstalls() {
        return pqs.active(AppInstall.class);
    }

    /**
     * Finds all active AppInstallRequest contracts.
     */
    public CompletableFuture<List<Contract<AppInstallRequest>>> findActiveAppInstallRequests() {
        return pqs.active(AppInstallRequest.class);
    }

    // --- Loan module (privacy: queries use party filter; visibility is per-template) ---

    public CompletableFuture<List<Contract<CreditProfile>>> findActiveCreditProfilesByBorrower(String party) {
        return pqs.activeWhere(CreditProfile.class, "payload->>'borrower' = ?", party)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "CreditProfile"));
    }

    public CompletableFuture<Optional<Contract<CreditProfile>>> findCreditProfileById(String contractId) {
        return pqs.contractByContractId(CreditProfile.class, contractId)
                .exceptionally(ex -> handlePqsTemplateNotFoundOptional(ex, "CreditProfile"));
    }

    public CompletableFuture<List<Contract<LoanRequest>>> findActiveLoanRequestsByBorrower(String party) {
        return pqs.activeWhere(LoanRequest.class,
                "(payload->>'borrower' = ? OR payload->'borrower'->>'party' = ?)",
                party, party)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "LoanRequest"));
    }

    /**
     * Find LoanRequest by contract ID. Tries as-is first; if not found, tries format variants
     * and finally a PQS suffix lookup so both "participant::suffix" and "suffix" work.
     */
    public CompletableFuture<Optional<Contract<LoanRequest>>> findLoanRequestById(String contractId) {
        logger.info("[findLoanRequestById] lookup requested id={} (length={})", contractId, contractId != null ? contractId.length() : 0);
        return pqs.contractByContractId(LoanRequest.class, contractId)
                .thenCompose(opt -> {
                    if (opt.isPresent()) {
                        logger.info("[findLoanRequestById] FOUND by exact id");
                        return CompletableFuture.completedFuture(opt);
                    }
                    logger.info("[findLoanRequestById] exact match missed, trying fallbacks");
                    if (contractId == null || contractId.isEmpty())
                        return CompletableFuture.completedFuture(Optional.empty());
                    String suffix = contractId.contains("::")
                            ? contractId.substring(contractId.lastIndexOf("::") + 2)
                            : contractId;
                    String alt = !contractId.contains("::") && contractId.matches("^[0-9a-fA-F]+$")
                            ? "1::" + contractId
                            : null;
                    if (alt != null) {
                        logger.info("[findLoanRequestById] trying alt id={}", alt);
                        return pqs.contractByContractId(LoanRequest.class, alt)
                                .thenCompose(opt2 -> {
                                    if (opt2.isPresent()) {
                                        logger.info("[findLoanRequestById] FOUND by 1::suffix");
                                        return CompletableFuture.completedFuture(opt2);
                                    }
                                    logger.info("[findLoanRequestById] 1::suffix missed, trying suffix lookup suffix={}", suffix);
                                    return tryFindBySuffix(suffix);
                                })
                                .exceptionally(ex -> handlePqsTemplateNotFoundOptional(ex, "LoanRequest"));
                    }
                    if (suffix.matches("^[0-9a-fA-F]+$")) {
                        logger.info("[findLoanRequestById] trying suffix lookup suffix={}", suffix);
                        return tryFindBySuffix(suffix);
                    }
                    logger.info("[findLoanRequestById] no fallback applied, returning empty");
                    return CompletableFuture.completedFuture(Optional.empty());
                })
                .exceptionally(ex -> handlePqsTemplateNotFoundOptional(ex, "LoanRequest"));
    }

    private CompletableFuture<Optional<Contract<LoanRequest>>> tryFindBySuffix(String suffix) {
        return pqs.contractByContractIdSuffix(LoanRequest.class, suffix)
                .thenCompose(opt -> {
                    if (opt.isPresent()) {
                        logger.info("[findLoanRequestById] FOUND by suffix lookup (suffix length={})", suffix.length());
                        return CompletableFuture.completedFuture(opt);
                    }
                    // PQS may store shorter id; try last 64 hex chars (typical Canton contract id suffix length)
                    if (suffix.length() > 64 && suffix.matches("^[0-9a-fA-F]+$")) {
                        String shortSuffix = suffix.substring(suffix.length() - 64);
                        logger.info("[findLoanRequestById] full suffix missed, trying last-64 suffix length={}", shortSuffix.length());
                        return pqs.contractByContractIdSuffix(LoanRequest.class, shortSuffix)
                                .thenApply(opt2 -> {
                                    if (opt2.isPresent()) logger.info("[findLoanRequestById] FOUND by last-64 suffix");
                                    return opt2;
                                });
                    }
                    logger.info("[findLoanRequestById] suffix lookup returned empty");
                    return CompletableFuture.completedFuture(Optional.empty());
                });
    }

    /** All active loan requests observed by the platform (for disclosure to lenders). */
    public CompletableFuture<List<Contract<LoanRequest>>> findActiveLoanRequestsByPlatform(String platformParty) {
        // Party in PQS payload may be string or object {"party": "..."}; support both for robustness
        return pqs.activeWhere(LoanRequest.class,
                "(payload->>'platformOperator' = ? OR payload->'platformOperator'->>'party' = ?)",
                platformParty, platformParty)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "LoanRequest"));
    }

    /** Loan requests disclosed to this lender (marketplace view). */
    public CompletableFuture<List<Contract<LoanRequestForLender>>> findActiveLoanRequestForLenderByLender(String lenderParty) {
        return pqs.activeWhere(LoanRequestForLender.class,
                "(payload->>'lender' = ? OR payload->'lender'->>'party' = ?)",
                lenderParty, lenderParty)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "LoanRequestForLender"));
    }

    /**
     * Returns LoanRequestForLender contracts where this party is the borrower.
     * Used to recover the borrower's own requests after LoanRequest_DiscloseToLender
     * archives the original LoanRequest and replaces it with a LoanRequestForLender.
     */
    public CompletableFuture<List<Contract<LoanRequestForLender>>> findActiveLoanRequestForLenderByBorrower(String borrowerParty) {
        return pqs.activeWhere(LoanRequestForLender.class,
                "(payload->>'borrower' = ? OR payload->'borrower'->>'party' = ?)",
                borrowerParty, borrowerParty)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "LoanRequestForLender"));
    }

    /**
     * Find LoanRequestForLender by contract ID (what the lender UI sends).
     * The lender sees LoanRequestForLender contracts, not LoanRequest directly.
     */
    public CompletableFuture<Optional<Contract<LoanRequestForLender>>> findLoanRequestForLenderById(String contractId) {
        if (contractId == null || contractId.isEmpty()) {
            return CompletableFuture.completedFuture(Optional.empty());
        }
        return pqs.contractByContractId(LoanRequestForLender.class, contractId)
                .thenCompose(opt -> {
                    if (opt.isPresent()) {
                        logger.info("[findLoanRequestForLenderById] FOUND by exact id");
                        return CompletableFuture.completedFuture(opt);
                    }
                    String suffix = contractId.contains("::") ? contractId.substring(contractId.lastIndexOf("::") + 2) : contractId;
                    if (suffix.matches("^[0-9a-fA-F]+$")) {
                        return pqs.contractByContractIdSuffix(LoanRequestForLender.class, suffix)
                                .thenApply(opt2 -> {
                                    if (opt2.isPresent()) logger.info("[findLoanRequestForLenderById] FOUND by suffix");
                                    return opt2;
                                });
                    }
                    return CompletableFuture.completedFuture(Optional.<Contract<LoanRequestForLender>>empty());
                })
                .exceptionally(ex -> handlePqsTemplateNotFoundOptional(ex, "LoanRequestForLender"));
    }

    public CompletableFuture<List<Contract<LoanOffer>>> findActiveLoanOffersByLenderOrBorrower(String party) {
        return pqs.activeWhere(LoanOffer.class,
                "(payload->>'lender' = ? OR payload->'lender'->>'party' = ? OR payload->>'borrower' = ? OR payload->'borrower'->>'party' = ?)",
                party, party, party, party)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "LoanOffer"));
    }

    /**
     * Find LoanOffer by contract ID. Tries exact match, then suffix match (hex suffix after "::" or full id if already hex).
     */
    public CompletableFuture<Optional<Contract<LoanOffer>>> findLoanOfferById(String contractId) {
        if (contractId == null || contractId.isEmpty()) {
            return CompletableFuture.completedFuture(Optional.empty());
        }
        return pqs.contractByContractId(LoanOffer.class, contractId)
                .thenCompose(opt -> {
                    if (opt.isPresent()) {
                        logger.info("[findLoanOfferById] FOUND by exact id");
                        return CompletableFuture.completedFuture(opt);
                    }
                    String suffix = contractId.contains("::") ? contractId.substring(contractId.lastIndexOf("::") + 2) : contractId;
                    if (suffix.matches("^[0-9a-fA-F]+$")) {
                        return pqs.contractByContractIdSuffix(LoanOffer.class, suffix)
                                .thenApply(opt2 -> {
                                    if (opt2.isPresent()) logger.info("[findLoanOfferById] FOUND by suffix");
                                    return opt2;
                                });
                    }
                    return CompletableFuture.completedFuture(Optional.<Contract<LoanOffer>>empty());
                })
                .exceptionally(ex -> handlePqsTemplateNotFoundOptional(ex, "LoanOffer"));
    }

    public CompletableFuture<List<Contract<Loan>>> findActiveLoansByParty(String party) {
        return pqs.activeWhere(Loan.class,
                "(payload->>'lender' = ? OR payload->'lender'->>'party' = ? OR payload->>'borrower' = ? OR payload->'borrower'->>'party' = ?)",
                party, party, party, party)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "Loan"));
    }

    /** All active Loan contracts visible to the PQS node (used for aggregate platform stats). */
    public CompletableFuture<List<Contract<Loan>>> findAllActiveLoans() {
        return pqs.active(Loan.class)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "Loan"));
    }

    public CompletableFuture<Optional<Contract<Loan>>> findLoanById(String contractId) {
        return pqs.contractByContractId(Loan.class, contractId)
                .exceptionally(ex -> handlePqsTemplateNotFoundOptional(ex, "Loan"));
    }

    /**
     * Fetch FundingIntent by contract id.
     */
    public CompletableFuture<Optional<Contract<FundingIntent>>> findFundingIntentById(String contractId) {
        return pqs.contractByContractId(FundingIntent.class, contractId)
                .exceptionally(ex -> handlePqsTemplateNotFoundOptional(ex, "FundingIntent"));
    }

    /**
     * Fetch LoanPrincipalRequest by contract id.
     */
    public CompletableFuture<Optional<Contract<LoanPrincipalRequest>>> findLoanPrincipalRequestById(String contractId) {
        return pqs.contractByContractId(LoanPrincipalRequest.class, contractId)
                .exceptionally(ex -> handlePqsTemplateNotFoundOptional(ex, "LoanPrincipalRequest"));
    }

    /**
     * Fetch LoanRepaymentRequest by contract id.
     */
    public CompletableFuture<Optional<Contract<LoanRepaymentRequest>>> findLoanRepaymentRequestById(String contractId) {
        return pqs.contractByContractId(LoanRepaymentRequest.class, contractId)
                .exceptionally(ex -> handlePqsTemplateNotFoundOptional(ex, "LoanRepaymentRequest"));
    }

    /**
     * Find active FundingIntent contracts for a lender (observer).
     */
    public CompletableFuture<List<Contract<FundingIntent>>> findFundingIntentsByLender(String lenderParty) {
        return pqs.activeWhere(FundingIntent.class, "lender", lenderParty)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "FundingIntent"));
    }

    /**
     * Find active FundingIntent contracts for a borrower (signatory).
     */
    public CompletableFuture<List<Contract<FundingIntent>>> findFundingIntentsByBorrower(String borrowerParty) {
        return pqs.activeWhere(FundingIntent.class, "borrower", borrowerParty)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "FundingIntent"));
    }

    /**
     * Find LoanPrincipalRequest contracts for a lender, with optional Allocation CID if allocated.
     */
    public CompletableFuture<List<LoanPrincipalRequestWithAllocationCid>> findLoanPrincipalRequestsByLender(
            String lenderParty) {
        String sql = """
                SELECT pr.contract_id    AS pr_contract_id,
                       pr.payload        AS pr_payload,
                       alloc.contract_id AS allocation_contract_id
                FROM active(?) pr
                LEFT JOIN active(?) alloc ON
                    pr.payload->>'requestId' = alloc.payload->'allocation'->'settlement'->'settlementRef'->>'id'
                    AND pr.payload->>'lender' = alloc.payload->'allocation'->'transferLeg'->>'sender'
                WHERE pr.payload->>'lender' = ?
                ORDER BY pr.contract_id
                """;
        List<LoanPrincipalRequestWithAllocationCid> results = new java.util.ArrayList<>();
        return pqs.query(sql, rs -> {
                    var prId = rs.getString("pr_contract_id");
                    results.add(new LoanPrincipalRequestWithAllocationCid(
                            extract(LoanPrincipalRequest.class, cid(LoanPrincipalRequest.class, prId), rs.getString("pr_payload")),
                            optionalCid(Allocation.class, rs.getString("allocation_contract_id"))
                    ));
                },
                qualifiedName(LoanPrincipalRequest.class),
                qualifiedName(Allocation.class),
                lenderParty
        ).thenApply(v -> results);
    }

    /**
     * Find LoanRepaymentRequest contracts for a lender, with optional Allocation CID if allocated.
     */
    public CompletableFuture<List<LoanRepaymentRequestWithAllocationCid>> findLoanRepaymentRequestsByLender(
            String lenderParty) {
        String sql = """
                SELECT rr.contract_id    AS rr_contract_id,
                       rr.payload        AS rr_payload,
                       alloc.contract_id AS allocation_contract_id
                FROM active(?) rr
                LEFT JOIN active(?) alloc ON
                    rr.payload->>'requestId' = alloc.payload->'allocation'->'settlement'->'settlementRef'->>'id'
                    AND rr.payload->>'borrower' = alloc.payload->'allocation'->'transferLeg'->>'sender'
                WHERE rr.payload->>'lender' = ?
                ORDER BY rr.contract_id
                """;
        List<LoanRepaymentRequestWithAllocationCid> results = new java.util.ArrayList<>();
        return pqs.query(sql, rs -> {
                    var rrId = rs.getString("rr_contract_id");
                    results.add(new LoanRepaymentRequestWithAllocationCid(
                            extract(LoanRepaymentRequest.class, cid(LoanRepaymentRequest.class, rrId), rs.getString("rr_payload")),
                            optionalCid(Allocation.class, rs.getString("allocation_contract_id"))
                    ));
                },
                qualifiedName(LoanRepaymentRequest.class),
                qualifiedName(Allocation.class),
                lenderParty
        ).thenApply(v -> results);
    }

    /**
     * Find LoanRepaymentRequest contracts for a borrower (signatory).
     */
    public CompletableFuture<List<Contract<LoanRepaymentRequest>>> findLoanRepaymentRequestsByBorrower(
            String borrowerParty) {
        return pqs.activeWhere(LoanRepaymentRequest.class, "borrower", borrowerParty)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "LoanRepaymentRequest"));
    }

    // --- Market Maker module ---

    public CompletableFuture<List<Contract<LenderBid>>> findActiveLenderBids() {
        return pqs.active(LenderBid.class)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "LenderBid"));
    }

    public CompletableFuture<List<Contract<LenderBid>>> findActiveLenderBidsByLender(String lenderParty) {
        return pqs.activeWhere(LenderBid.class,
                "(payload->>'lender' = ? OR payload->'lender'->>'party' = ?)",
                lenderParty, lenderParty)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "LenderBid"));
    }

    public CompletableFuture<Optional<Contract<LenderBid>>> findLenderBidById(String contractId) {
        return pqs.contractByContractId(LenderBid.class, contractId)
                .exceptionally(ex -> handlePqsTemplateNotFoundOptional(ex, "LenderBid"));
    }

    /**
     * All active BorrowerAsk contracts (used for order book bids).
     * If the result is empty and logs show "BorrowerAsk template not yet in PQS schema",
     * ensure the licensing DAR (with Loan.MarketMaker) is deployed and restart the PQS pipeline.
     */
    public CompletableFuture<List<Contract<BorrowerAsk>>> findActiveBorrowerAsks() {
        return pqs.active(BorrowerAsk.class)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "BorrowerAsk"));
    }

    public CompletableFuture<List<Contract<BorrowerAsk>>> findActiveBorrowerAsksByBorrower(String borrowerParty) {
        return pqs.activeWhere(BorrowerAsk.class,
                "(payload->>'borrower' = ? OR payload->'borrower'->>'party' = ?)",
                borrowerParty, borrowerParty)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "BorrowerAsk"));
    }

    public CompletableFuture<Optional<Contract<BorrowerAsk>>> findBorrowerAskById(String contractId) {
        return pqs.contractByContractId(BorrowerAsk.class, contractId)
                .exceptionally(ex -> handlePqsTemplateNotFoundOptional(ex, "BorrowerAsk"));
    }

    public CompletableFuture<Optional<Contract<MatchingEngine>>> findMatchingEngine(String platformParty) {
        return pqs.activeWhere(MatchingEngine.class,
                "(payload->>'platformOperator' = ? OR payload->'platformOperator'->>'party' = ?)",
                platformParty, platformParty)
                .thenApply(list -> list.isEmpty() ? Optional.<Contract<MatchingEngine>>empty() : Optional.of(list.get(0)))
                .exceptionally(ex -> DamlRepository.<MatchingEngine>handlePqsTemplateNotFoundOptional(ex, "MatchingEngine"));
    }

    public CompletableFuture<List<Contract<MatchedLoanProposal>>> findMatchedLoanProposals(String party) {
        return pqs.activeWhere(MatchedLoanProposal.class,
                "(payload->>'lender' = ? OR payload->'lender'->>'party' = ? OR payload->>'borrower' = ? OR payload->'borrower'->>'party' = ?)",
                party, party, party, party)
                .exceptionally(ex -> handlePqsTemplateNotFound(ex, "MatchedLoanProposal"));
    }

    public CompletableFuture<Optional<Contract<MatchedLoanProposal>>> findMatchedProposalById(String contractId) {
        return pqs.contractByContractId(MatchedLoanProposal.class, contractId)
                .exceptionally(ex -> handlePqsTemplateNotFoundOptional(ex, "MatchedLoanProposal"));
    }

}
