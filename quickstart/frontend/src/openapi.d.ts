import type {
  OpenAPIClient,
  Parameters,
  UnknownParamsObject,
  OperationResponse,
  AxiosRequestConfig,
} from 'openapi-client-axios';

declare namespace Components {
    namespace Parameters {
        export type CommandId = string;
        export type ContractId = string;
        export type TenantId = string;
    }
    export interface PathParameters {
        ContractId?: Parameters.ContractId;
        TenantId?: Parameters.TenantId;
    }
    export interface QueryParameters {
        CommandId?: Parameters.CommandId;
    }
    namespace Responses {
        export type BadRequest = Schemas.ErrorResponse;
        export type Conflict = Schemas.ErrorResponse;
        export type Forbidden = Schemas.ErrorResponse;
        export type InternalError = Schemas.ErrorResponse;
        export type NotFound = Schemas.ErrorResponse;
        export type Unauthorized = Schemas.ErrorResponse;
    }
    namespace Schemas {
        export interface AcceptOfferWithTokenRequest {
            creditProfileId: string;
            requestId?: string | null;
            description?: string | null;
            /**
             * ISO-8601 duration until allocation window closes (e.g. PT2H)
             */
            prepareUntilDuration?: string | null;
            /**
             * ISO-8601 duration until settlement deadline (e.g. PT24H)
             */
            settleBeforeDuration?: string | null;
        }
        export interface AppInstall {
            contractId: string;
            provider: string;
            user: string;
            meta: Metadata;
            numLicensesCreated: number;
            licenseNum: number;
        }
        export interface AppInstallCancel {
            meta: Metadata;
        }
        export interface AppInstallCreateLicenseRequest {
            params: LicenseParams;
        }
        export interface AppInstallCreateLicenseResult {
            installId?: string;
            licenseId?: string;
        }
        export interface AppInstallRequest {
            contractId: string;
            provider: string;
            user: string;
            meta: Metadata;
        }
        export interface AppInstallRequestAccept {
            installMeta: Metadata;
            meta: Metadata;
        }
        export interface AppInstallRequestCancel {
            meta: Metadata;
        }
        export interface AppInstallRequestReject {
            meta: Metadata;
        }
        export interface AuthenticatedUser {
            name: string;
            party: string;
            roles: string[];
            isAdmin: boolean;
            walletUrl: string;
        }
        export interface CompleteLicenseRenewalRequest {
            /**
             * The contract ID of the LicenseRenewalRequest to complete
             */
            renewalRequestContractId: string;
            /**
             * The contract ID of the accepted allocation
             */
            allocationContractId: string;
        }
        export interface CompleteLoanFundingRequest {
            allocationContractId: string;
        }
        export interface CompleteLoanRepaymentRequest {
            allocationContractId: string;
        }
        export interface CreditProfile {
            contractId: string;
            borrower: string;
            creditScore: number;
            totalLoans: number;
            successfulLoans: number;
            defaultedLoans: number;
            createdAt?: string; // date-time
        }
        export interface ErrorResponse {
            /**
             * example:
             * TenantId is required
             */
            message?: string | null;
        }
        export interface FeatureFlags {
            authMode?: "oauth2" | "shared-secret";
        }
        export interface FundingIntentResult {
            fundingIntentId?: string;
        }
        export interface License {
            contractId: string;
            provider: string;
            user: string;
            params: LicenseParams;
            expiresAt: string; // date-time
            licenseNum: number;
            isExpired: boolean;
            renewalRequests?: LicenseRenewalRequest[];
        }
        export interface LicenseExpireRequest {
            meta: Metadata;
        }
        export interface LicenseParams {
            meta?: Metadata;
        }
        /**
         * Parameters used to initiate a license renewal.
         */
        export interface LicenseRenewRequest {
            /**
             * License fee amount
             */
            licenseFeeCc: number;
            /**
             * ISO-8601 duration specifying the requested extension period (e.g. 'P30D' for 30 days).
             */
            licenseExtensionDuration: string;
            /**
             * ISO-8601 duration after which the allocation request will be not accepted.
             */
            prepareUntilDuration: string;
            /**
             * ISO-8601 duration within which the transfer must be settled.
             */
            settleBeforeDuration: string;
            /**
             * Human-readable explanation of the renewal request.
             */
            description: string;
        }
        export interface LicenseRenewalRequest {
            contractId: string;
            provider: string;
            user: string;
            licenseNum: number;
            licenseFeeAmount: number;
            licenseFeeInstrument: string;
            /**
             * RelTime representing how long the license should be extended.
             */
            licenseExtensionDuration: string;
            /**
             * The time until the license renewal request can be prepared.
             */
            prepareUntil: string; // date-time
            /**
             * The time before which the payment must be settled.
             */
            settleBefore: string; // date-time
            /**
             * The time until the license renewal request can be prepared.
             */
            requestedAt: string; // date-time
            description: string;
            requestId: string;
            allocationCid?: string;
            prepareDeadlinePassed: boolean;
            settleDeadlinePassed: boolean;
        }
        export interface LicenseRenewalResult {
            licenseId?: string;
        }
        export interface Loan {
            contractId: string;
            lender: string;
            borrower: string;
            principal: number;
            interestRate: number;
            dueDate: string; // date-time
            status: "Active" | "Repaid" | "Defaulted";
        }
        export interface LoanFundRequest {
            creditProfileId: string;
        }
        export interface LoanFundResult {
            loanId?: string;
        }
        export interface LoanFundingIntent {
            contractId: string;
            requestId: string;
            lender: string;
            borrower: string;
            principal: number;
            interestRate: number;
            durationDays: number;
            prepareUntil: string; // date-time
            settleBefore: string; // date-time
            requestedAt: string; // date-time
            description?: string | null;
            loanRequestId: string;
            offerContractId: string;
            creditProfileId: string;
        }
        export interface LoanOffer {
            contractId: string;
            /**
             * Contract ID of the loan request this offer is for (so UI can hide it from "requests to fund").
             */
            loanRequestId?: string;
            lender: string;
            borrower: string;
            amount: number;
            interestRate: number;
            createdAt: string; // date-time
        }
        export interface LoanOfferCreate {
            loanRequestId: string;
            amount: number;
            interestRate: number;
        }
        export interface LoanPrincipalRequestResult {
            principalRequestId?: string;
        }
        export interface LoanPrincipalRequestSummary {
            contractId: string;
            requestId: string;
            lender: string;
            borrower: string;
            principal: number;
            interestRate: number;
            durationDays: number;
            prepareUntil: string; // date-time
            settleBefore: string; // date-time
            requestedAt: string; // date-time
            description?: string | null;
            loanRequestId: string;
            offerContractId: string;
            creditProfileId: string;
            allocationCid?: string | null;
            prepareDeadlinePassed?: boolean;
            settleDeadlinePassed?: boolean;
        }
        export interface LoanRepaymentRequestResult {
            repaymentRequestId?: string;
        }
        export interface LoanRepaymentRequestSummary {
            contractId: string;
            requestId: string;
            lender: string;
            borrower: string;
            repaymentAmount: number;
            prepareUntil: string; // date-time
            settleBefore: string; // date-time
            requestedAt: string; // date-time
            description?: string | null;
            loanContractId: string;
            creditProfileId: string;
            allocationCid?: string | null;
            prepareDeadlinePassed?: boolean;
            settleDeadlinePassed?: boolean;
        }
        export interface LoanRepaymentResult {
            creditProfileId?: string;
        }
        export interface LoanRequest {
            contractId: string;
            /**
             * When this row is from a disclosed view (LoanRequestForLender), the underlying LoanRequest contract id. Used so UI can match offers (which reference this id) to requests.
             */
            underlyingRequestContractId?: string;
            borrower: string;
            amount: number;
            interestRate: number;
            durationDays: number;
            purpose: string;
            createdAt: string; // date-time
        }
        export interface LoanRequestCreate {
            amount: number; // double
            interestRate: number; // double
            durationDays: number;
            purpose: string;
        }
        export interface LoginLink {
            name: string;
            url: string;
        }
        export interface Metadata {
            data?: {
                [name: string]: string;
            };
        }
        export interface RequestRepaymentRequest {
            requestId?: string | null;
            description?: string | null;
            /**
             * ISO-8601 duration until allocation window closes (e.g. PT2H)
             */
            prepareUntilDuration?: string | null;
            /**
             * ISO-8601 duration until settlement deadline (e.g. PT24H)
             */
            settleBeforeDuration?: string | null;
        }
        export interface TenantRegistration {
            /**
             * Tenant identifier
             */
            tenantId: string;
            /**
             * Party identifier
             */
            partyId: string;
            /**
             * Wallet URL for payment redirects
             */
            walletUrl: string; // uri
            /**
             * OAuth2 client identifier
             */
            clientId?: string;
            /**
             * Issuer URL
             */
            issuerUrl?: string; // uri
            /**
             * Internal registration
             */
            internal: boolean;
            users?: string[];
        }
        export interface TenantRegistrationRequest {
            tenantId: string;
            partyId: string;
            walletUrl: string;
            /**
             * Required when authMode is oauth2
             */
            clientId?: string;
            /**
             * Required when authMode is oauth2
             */
            issuerUrl?: string;
            /**
             * Required (non-empty) when authMode is shared-secret
             */
            users?: string[];
        }
    }
}
declare namespace Paths {
    namespace AcceptAppInstallRequest {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.AppInstallRequestAccept;
        namespace Responses {
            export type $201 = Components.Schemas.AppInstall;
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace AcceptLoanOfferWithToken {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.AcceptOfferWithTokenRequest;
        namespace Responses {
            export type $201 = Components.Schemas.FundingIntentResult;
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace CancelAppInstall {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.AppInstallCancel;
        namespace Responses {
            export interface $204 {
            }
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace CompleteLicenseRenewal {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.CompleteLicenseRenewalRequest;
        namespace Responses {
            export type $200 = Components.Schemas.LicenseRenewalResult;
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace CompleteLoanFunding {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.CompleteLoanFundingRequest;
        namespace Responses {
            export type $200 = Components.Schemas.LoanFundResult;
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace CompleteLoanRepayment {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.CompleteLoanRepaymentRequest;
        namespace Responses {
            export type $200 = Components.Schemas.LoanRepaymentResult;
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ConfirmFundingIntent {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        namespace Responses {
            export type $201 = Components.Schemas.LoanPrincipalRequestResult;
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace CreateLicense {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.AppInstallCreateLicenseRequest;
        namespace Responses {
            export type $201 = Components.Schemas.AppInstallCreateLicenseResult;
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace CreateLoanOffer {
        namespace Parameters {
            export type CommandId = string;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.LoanOfferCreate;
        namespace Responses {
            export type $201 = Components.Schemas.LoanOffer;
            export type $401 = Components.Responses.Unauthorized;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace CreateLoanRequest {
        namespace Parameters {
            export type CommandId = string;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.LoanRequestCreate;
        namespace Responses {
            export type $201 = Components.Schemas.LoanRequest;
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace CreateTenantRegistration {
        export type RequestBody = Components.Schemas.TenantRegistrationRequest;
        namespace Responses {
            export type $201 = Components.Schemas.TenantRegistration;
            export type $400 = Components.Responses.BadRequest;
            export type $409 = Components.Responses.Conflict;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace DeleteTenantRegistration {
        namespace Parameters {
            export type TenantId = string;
        }
        export interface PathParameters {
            tenantId: Parameters.TenantId;
        }
        namespace Responses {
            export interface $204 {
            }
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ExpireLicense {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.LicenseExpireRequest;
        namespace Responses {
            export type $200 = string | null;
            export type $401 = Components.Responses.Unauthorized;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace FundLoan {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.LoanFundRequest;
        namespace Responses {
            export type $200 = Components.Schemas.LoanFundResult;
            export type $401 = Components.Responses.Unauthorized;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace GetAuthenticatedUser {
        namespace Responses {
            export type $200 = Components.Schemas.AuthenticatedUser;
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace GetCreditProfile {
        namespace Responses {
            export type $200 = Components.Schemas.CreditProfile;
            export type $401 = Components.Responses.Unauthorized;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace GetFeatureFlags {
        namespace Responses {
            export type $200 = Components.Schemas.FeatureFlags;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListAppInstallRequests {
        namespace Responses {
            export type $200 = Components.Schemas.AppInstallRequest[];
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListAppInstalls {
        namespace Responses {
            export type $200 = Components.Schemas.AppInstall[];
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListFundingIntents {
        namespace Responses {
            export type $200 = Components.Schemas.LoanFundingIntent[];
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListLicenses {
        namespace Responses {
            export type $200 = Components.Schemas.License[];
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListLinks {
        namespace Responses {
            export type $200 = Components.Schemas.LoginLink[];
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListLoanOffers {
        namespace Responses {
            export type $200 = Components.Schemas.LoanOffer[];
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListLoanRequests {
        namespace Responses {
            export type $200 = Components.Schemas.LoanRequest[];
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListLoans {
        namespace Responses {
            export type $200 = Components.Schemas.Loan[];
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListPrincipalRequests {
        namespace Responses {
            export type $200 = Components.Schemas.LoanPrincipalRequestSummary[];
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListRepaymentRequests {
        namespace Responses {
            export type $200 = Components.Schemas.LoanRepaymentRequestSummary[];
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListTenantRegistrations {
        namespace Responses {
            export type $200 = Components.Schemas.TenantRegistration[];
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace RejectAppInstallRequest {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.AppInstallRequestReject;
        namespace Responses {
            export interface $204 {
            }
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace RenewLicense {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = /* Parameters used to initiate a license renewal. */ Components.Schemas.LicenseRenewRequest;
        namespace Responses {
            export interface $201 {
            }
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace RepayLoan {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        namespace Responses {
            export interface $200 {
            }
            export type $401 = Components.Responses.Unauthorized;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace RequestLoanRepayment {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.RequestRepaymentRequest;
        namespace Responses {
            export type $201 = Components.Schemas.LoanRepaymentRequestResult;
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace WithdrawLicenseRenewalRequest {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        namespace Responses {
            export interface $204 {
            }
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
}


export interface OperationMethods {
  /**
   * getFeatureFlags - Get feature flags
   */
  'getFeatureFlags'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetFeatureFlags.Responses.$200>
  /**
   * listLinks - Get list of links that initiate login
   */
  'listLinks'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListLinks.Responses.$200>
  /**
   * getAuthenticatedUser - Get Authenticated User
   */
  'getAuthenticatedUser'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetAuthenticatedUser.Responses.$200>
  /**
   * listTenantRegistrations - List all Tenant Registrations
   */
  'listTenantRegistrations'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListTenantRegistrations.Responses.$200>
  /**
   * createTenantRegistration - Create Tenant Registration
   */
  'createTenantRegistration'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.CreateTenantRegistration.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateTenantRegistration.Responses.$201>
  /**
   * deleteTenantRegistration - Delete Tenant Registration
   */
  'deleteTenantRegistration'(
    parameters?: Parameters<Paths.DeleteTenantRegistration.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.DeleteTenantRegistration.Responses.$204>
  /**
   * listAppInstallRequests - List all AppInstallRequests
   */
  'listAppInstallRequests'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListAppInstallRequests.Responses.$200>
  /**
   * acceptAppInstallRequest - Accept an AppInstallRequest
   */
  'acceptAppInstallRequest'(
    parameters?: Parameters<Paths.AcceptAppInstallRequest.QueryParameters & Paths.AcceptAppInstallRequest.PathParameters> | null,
    data?: Paths.AcceptAppInstallRequest.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.AcceptAppInstallRequest.Responses.$201>
  /**
   * rejectAppInstallRequest - Reject an AppInstallRequest
   */
  'rejectAppInstallRequest'(
    parameters?: Parameters<Paths.RejectAppInstallRequest.QueryParameters & Paths.RejectAppInstallRequest.PathParameters> | null,
    data?: Paths.RejectAppInstallRequest.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.RejectAppInstallRequest.Responses.$204>
  /**
   * listAppInstalls - List all AppInstalls
   */
  'listAppInstalls'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListAppInstalls.Responses.$200>
  /**
   * createLicense - Create a License using the AppInstall
   */
  'createLicense'(
    parameters?: Parameters<Paths.CreateLicense.QueryParameters & Paths.CreateLicense.PathParameters> | null,
    data?: Paths.CreateLicense.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateLicense.Responses.$201>
  /**
   * cancelAppInstall - Cancel an AppInstall
   */
  'cancelAppInstall'(
    parameters?: Parameters<Paths.CancelAppInstall.QueryParameters & Paths.CancelAppInstall.PathParameters> | null,
    data?: Paths.CancelAppInstall.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CancelAppInstall.Responses.$204>
  /**
   * listLicenses - List all Licenses (including renewal requests)
   */
  'listLicenses'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListLicenses.Responses.$200>
  /**
   * renewLicense - Renew a License
   */
  'renewLicense'(
    parameters?: Parameters<Paths.RenewLicense.QueryParameters & Paths.RenewLicense.PathParameters> | null,
    data?: Paths.RenewLicense.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.RenewLicense.Responses.$201>
  /**
   * completeLicenseRenewal - Complete the License Renewal
   */
  'completeLicenseRenewal'(
    parameters?: Parameters<Paths.CompleteLicenseRenewal.QueryParameters & Paths.CompleteLicenseRenewal.PathParameters> | null,
    data?: Paths.CompleteLicenseRenewal.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CompleteLicenseRenewal.Responses.$200>
  /**
   * expireLicense - Expire a License
   */
  'expireLicense'(
    parameters?: Parameters<Paths.ExpireLicense.QueryParameters & Paths.ExpireLicense.PathParameters> | null,
    data?: Paths.ExpireLicense.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ExpireLicense.Responses.$200>
  /**
   * withdrawLicenseRenewalRequest - Withdraw an LicenseRenewalRequest
   */
  'withdrawLicenseRenewalRequest'(
    parameters?: Parameters<Paths.WithdrawLicenseRenewalRequest.QueryParameters & Paths.WithdrawLicenseRenewalRequest.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.WithdrawLicenseRenewalRequest.Responses.$204>
  /**
   * createLoanRequest - Create a loan request (borrower)
   */
  'createLoanRequest'(
    parameters?: Parameters<Paths.CreateLoanRequest.QueryParameters> | null,
    data?: Paths.CreateLoanRequest.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateLoanRequest.Responses.$201>
  /**
   * createLoanOffer - Create a loan offer (lender)
   */
  'createLoanOffer'(
    parameters?: Parameters<Paths.CreateLoanOffer.QueryParameters> | null,
    data?: Paths.CreateLoanOffer.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateLoanOffer.Responses.$201>
  /**
   * fundLoan - Accept loan offer / fund loan (borrower)
   */
  'fundLoan'(
    parameters?: Parameters<Paths.FundLoan.QueryParameters & Paths.FundLoan.PathParameters> | null,
    data?: Paths.FundLoan.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.FundLoan.Responses.$200>
  /**
   * acceptLoanOfferWithToken - Accept loan offer with token settlement (borrower)
   */
  'acceptLoanOfferWithToken'(
    parameters?: Parameters<Paths.AcceptLoanOfferWithToken.QueryParameters & Paths.AcceptLoanOfferWithToken.PathParameters> | null,
    data?: Paths.AcceptLoanOfferWithToken.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.AcceptLoanOfferWithToken.Responses.$201>
  /**
   * confirmFundingIntent - Confirm a funding intent (lender)
   */
  'confirmFundingIntent'(
    parameters?: Parameters<Paths.ConfirmFundingIntent.QueryParameters & Paths.ConfirmFundingIntent.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ConfirmFundingIntent.Responses.$201>
  /**
   * listFundingIntents - List funding intents visible to the authenticated party
   */
  'listFundingIntents'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListFundingIntents.Responses.$200>
  /**
   * listPrincipalRequests - List loan principal requests (lender)
   */
  'listPrincipalRequests'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListPrincipalRequests.Responses.$200>
  /**
   * completeLoanFunding - Complete token funding for a loan principal request (lender)
   */
  'completeLoanFunding'(
    parameters?: Parameters<Paths.CompleteLoanFunding.QueryParameters & Paths.CompleteLoanFunding.PathParameters> | null,
    data?: Paths.CompleteLoanFunding.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CompleteLoanFunding.Responses.$200>
  /**
   * repayLoan - Repay a loan (borrower)
   */
  'repayLoan'(
    parameters?: Parameters<Paths.RepayLoan.QueryParameters & Paths.RepayLoan.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.RepayLoan.Responses.$200>
  /**
   * requestLoanRepayment - Request token-based repayment (borrower)
   */
  'requestLoanRepayment'(
    parameters?: Parameters<Paths.RequestLoanRepayment.QueryParameters & Paths.RequestLoanRepayment.PathParameters> | null,
    data?: Paths.RequestLoanRepayment.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.RequestLoanRepayment.Responses.$201>
  /**
   * listRepaymentRequests - List loan repayment requests visible to the authenticated party
   */
  'listRepaymentRequests'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListRepaymentRequests.Responses.$200>
  /**
   * completeLoanRepayment - Complete token-based repayment (lender)
   */
  'completeLoanRepayment'(
    parameters?: Parameters<Paths.CompleteLoanRepayment.QueryParameters & Paths.CompleteLoanRepayment.PathParameters> | null,
    data?: Paths.CompleteLoanRepayment.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CompleteLoanRepayment.Responses.$200>
  /**
   * listLoanRequests - List loan requests (borrower)
   */
  'listLoanRequests'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListLoanRequests.Responses.$200>
  /**
   * listLoanOffers - List loan offers visible to the authenticated party (lender or borrower)
   */
  'listLoanOffers'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListLoanOffers.Responses.$200>
  /**
   * listLoans - List loans visible to the authenticated party
   */
  'listLoans'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListLoans.Responses.$200>
  /**
   * getCreditProfile - Get credit profile for the authenticated party (borrower)
   */
  'getCreditProfile'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetCreditProfile.Responses.$200>
}

export interface PathsDictionary {
  ['/feature-flags']: {
    /**
     * getFeatureFlags - Get feature flags
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetFeatureFlags.Responses.$200>
  }
  ['/login-links']: {
    /**
     * listLinks - Get list of links that initiate login
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListLinks.Responses.$200>
  }
  ['/user']: {
    /**
     * getAuthenticatedUser - Get Authenticated User
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetAuthenticatedUser.Responses.$200>
  }
  ['/admin/tenant-registrations']: {
    /**
     * listTenantRegistrations - List all Tenant Registrations
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListTenantRegistrations.Responses.$200>
    /**
     * createTenantRegistration - Create Tenant Registration
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.CreateTenantRegistration.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateTenantRegistration.Responses.$201>
  }
  ['/admin/tenant-registrations/{tenantId}']: {
    /**
     * deleteTenantRegistration - Delete Tenant Registration
     */
    'delete'(
      parameters?: Parameters<Paths.DeleteTenantRegistration.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.DeleteTenantRegistration.Responses.$204>
  }
  ['/app-install-requests']: {
    /**
     * listAppInstallRequests - List all AppInstallRequests
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListAppInstallRequests.Responses.$200>
  }
  ['/app-install-requests/{contractId}:accept']: {
    /**
     * acceptAppInstallRequest - Accept an AppInstallRequest
     */
    'post'(
      parameters?: Parameters<Paths.AcceptAppInstallRequest.QueryParameters & Paths.AcceptAppInstallRequest.PathParameters> | null,
      data?: Paths.AcceptAppInstallRequest.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.AcceptAppInstallRequest.Responses.$201>
  }
  ['/app-install-requests/{contractId}:reject']: {
    /**
     * rejectAppInstallRequest - Reject an AppInstallRequest
     */
    'post'(
      parameters?: Parameters<Paths.RejectAppInstallRequest.QueryParameters & Paths.RejectAppInstallRequest.PathParameters> | null,
      data?: Paths.RejectAppInstallRequest.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.RejectAppInstallRequest.Responses.$204>
  }
  ['/app-installs']: {
    /**
     * listAppInstalls - List all AppInstalls
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListAppInstalls.Responses.$200>
  }
  ['/app-installs/{contractId}:create-license']: {
    /**
     * createLicense - Create a License using the AppInstall
     */
    'post'(
      parameters?: Parameters<Paths.CreateLicense.QueryParameters & Paths.CreateLicense.PathParameters> | null,
      data?: Paths.CreateLicense.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateLicense.Responses.$201>
  }
  ['/app-installs/{contractId}:cancel']: {
    /**
     * cancelAppInstall - Cancel an AppInstall
     */
    'post'(
      parameters?: Parameters<Paths.CancelAppInstall.QueryParameters & Paths.CancelAppInstall.PathParameters> | null,
      data?: Paths.CancelAppInstall.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CancelAppInstall.Responses.$204>
  }
  ['/licenses']: {
    /**
     * listLicenses - List all Licenses (including renewal requests)
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListLicenses.Responses.$200>
  }
  ['/licenses/{contractId}:renew']: {
    /**
     * renewLicense - Renew a License
     */
    'post'(
      parameters?: Parameters<Paths.RenewLicense.QueryParameters & Paths.RenewLicense.PathParameters> | null,
      data?: Paths.RenewLicense.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.RenewLicense.Responses.$201>
  }
  ['/licenses/{contractId}:complete-renewal']: {
    /**
     * completeLicenseRenewal - Complete the License Renewal
     */
    'post'(
      parameters?: Parameters<Paths.CompleteLicenseRenewal.QueryParameters & Paths.CompleteLicenseRenewal.PathParameters> | null,
      data?: Paths.CompleteLicenseRenewal.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CompleteLicenseRenewal.Responses.$200>
  }
  ['/licenses/{contractId}:expire']: {
    /**
     * expireLicense - Expire a License
     */
    'post'(
      parameters?: Parameters<Paths.ExpireLicense.QueryParameters & Paths.ExpireLicense.PathParameters> | null,
      data?: Paths.ExpireLicense.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ExpireLicense.Responses.$200>
  }
  ['/license-renewal-requests/{contractId}:withdraw']: {
    /**
     * withdrawLicenseRenewalRequest - Withdraw an LicenseRenewalRequest
     */
    'post'(
      parameters?: Parameters<Paths.WithdrawLicenseRenewalRequest.QueryParameters & Paths.WithdrawLicenseRenewalRequest.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.WithdrawLicenseRenewalRequest.Responses.$204>
  }
  ['/loans/request']: {
    /**
     * createLoanRequest - Create a loan request (borrower)
     */
    'post'(
      parameters?: Parameters<Paths.CreateLoanRequest.QueryParameters> | null,
      data?: Paths.CreateLoanRequest.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateLoanRequest.Responses.$201>
  }
  ['/loans/offer']: {
    /**
     * createLoanOffer - Create a loan offer (lender)
     */
    'post'(
      parameters?: Parameters<Paths.CreateLoanOffer.QueryParameters> | null,
      data?: Paths.CreateLoanOffer.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateLoanOffer.Responses.$201>
  }
  ['/loans/offers/{contractId}/fund']: {
    /**
     * fundLoan - Accept loan offer / fund loan (borrower)
     */
    'post'(
      parameters?: Parameters<Paths.FundLoan.QueryParameters & Paths.FundLoan.PathParameters> | null,
      data?: Paths.FundLoan.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.FundLoan.Responses.$200>
  }
  ['/loans/offer/{contractId}:accept-with-token']: {
    /**
     * acceptLoanOfferWithToken - Accept loan offer with token settlement (borrower)
     */
    'post'(
      parameters?: Parameters<Paths.AcceptLoanOfferWithToken.QueryParameters & Paths.AcceptLoanOfferWithToken.PathParameters> | null,
      data?: Paths.AcceptLoanOfferWithToken.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.AcceptLoanOfferWithToken.Responses.$201>
  }
  ['/loans/funding-intent/{contractId}:confirm']: {
    /**
     * confirmFundingIntent - Confirm a funding intent (lender)
     */
    'post'(
      parameters?: Parameters<Paths.ConfirmFundingIntent.QueryParameters & Paths.ConfirmFundingIntent.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ConfirmFundingIntent.Responses.$201>
  }
  ['/loans/funding-intents']: {
    /**
     * listFundingIntents - List funding intents visible to the authenticated party
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListFundingIntents.Responses.$200>
  }
  ['/loans/principal-requests']: {
    /**
     * listPrincipalRequests - List loan principal requests (lender)
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListPrincipalRequests.Responses.$200>
  }
  ['/loans/principal-requests/{contractId}:complete-funding']: {
    /**
     * completeLoanFunding - Complete token funding for a loan principal request (lender)
     */
    'post'(
      parameters?: Parameters<Paths.CompleteLoanFunding.QueryParameters & Paths.CompleteLoanFunding.PathParameters> | null,
      data?: Paths.CompleteLoanFunding.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CompleteLoanFunding.Responses.$200>
  }
  ['/loans/{contractId}/repay']: {
    /**
     * repayLoan - Repay a loan (borrower)
     */
    'post'(
      parameters?: Parameters<Paths.RepayLoan.QueryParameters & Paths.RepayLoan.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.RepayLoan.Responses.$200>
  }
  ['/loans/{contractId}:request-repayment']: {
    /**
     * requestLoanRepayment - Request token-based repayment (borrower)
     */
    'post'(
      parameters?: Parameters<Paths.RequestLoanRepayment.QueryParameters & Paths.RequestLoanRepayment.PathParameters> | null,
      data?: Paths.RequestLoanRepayment.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.RequestLoanRepayment.Responses.$201>
  }
  ['/loans/repayment-requests']: {
    /**
     * listRepaymentRequests - List loan repayment requests visible to the authenticated party
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListRepaymentRequests.Responses.$200>
  }
  ['/loans/repayment-requests/{contractId}:complete-repayment']: {
    /**
     * completeLoanRepayment - Complete token-based repayment (lender)
     */
    'post'(
      parameters?: Parameters<Paths.CompleteLoanRepayment.QueryParameters & Paths.CompleteLoanRepayment.PathParameters> | null,
      data?: Paths.CompleteLoanRepayment.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CompleteLoanRepayment.Responses.$200>
  }
  ['/loan-requests']: {
    /**
     * listLoanRequests - List loan requests (borrower)
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListLoanRequests.Responses.$200>
  }
  ['/loan-offers']: {
    /**
     * listLoanOffers - List loan offers visible to the authenticated party (lender or borrower)
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListLoanOffers.Responses.$200>
  }
  ['/loans']: {
    /**
     * listLoans - List loans visible to the authenticated party
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListLoans.Responses.$200>
  }
  ['/credit-profile']: {
    /**
     * getCreditProfile - Get credit profile for the authenticated party (borrower)
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetCreditProfile.Responses.$200>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>


export type AcceptOfferWithTokenRequest = Components.Schemas.AcceptOfferWithTokenRequest;
export type AppInstall = Components.Schemas.AppInstall;
export type AppInstallCancel = Components.Schemas.AppInstallCancel;
export type AppInstallCreateLicenseRequest = Components.Schemas.AppInstallCreateLicenseRequest;
export type AppInstallCreateLicenseResult = Components.Schemas.AppInstallCreateLicenseResult;
export type AppInstallRequest = Components.Schemas.AppInstallRequest;
export type AppInstallRequestAccept = Components.Schemas.AppInstallRequestAccept;
export type AppInstallRequestCancel = Components.Schemas.AppInstallRequestCancel;
export type AppInstallRequestReject = Components.Schemas.AppInstallRequestReject;
export type AuthenticatedUser = Components.Schemas.AuthenticatedUser;
export type CompleteLicenseRenewalRequest = Components.Schemas.CompleteLicenseRenewalRequest;
export type CompleteLoanFundingRequest = Components.Schemas.CompleteLoanFundingRequest;
export type CompleteLoanRepaymentRequest = Components.Schemas.CompleteLoanRepaymentRequest;
export type CreditProfile = Components.Schemas.CreditProfile;
export type ErrorResponse = Components.Schemas.ErrorResponse;
export type FeatureFlags = Components.Schemas.FeatureFlags;
export type FundingIntentResult = Components.Schemas.FundingIntentResult;
export type License = Components.Schemas.License;
export type LicenseExpireRequest = Components.Schemas.LicenseExpireRequest;
export type LicenseParams = Components.Schemas.LicenseParams;
export type LicenseRenewRequest = Components.Schemas.LicenseRenewRequest;
export type LicenseRenewalRequest = Components.Schemas.LicenseRenewalRequest;
export type LicenseRenewalResult = Components.Schemas.LicenseRenewalResult;
export type Loan = Components.Schemas.Loan;
export type LoanFundRequest = Components.Schemas.LoanFundRequest;
export type LoanFundResult = Components.Schemas.LoanFundResult;
export type LoanFundingIntent = Components.Schemas.LoanFundingIntent;
export type LoanOffer = Components.Schemas.LoanOffer;
export type LoanOfferCreate = Components.Schemas.LoanOfferCreate;
export type LoanPrincipalRequestResult = Components.Schemas.LoanPrincipalRequestResult;
export type LoanPrincipalRequestSummary = Components.Schemas.LoanPrincipalRequestSummary;
export type LoanRepaymentRequestResult = Components.Schemas.LoanRepaymentRequestResult;
export type LoanRepaymentRequestSummary = Components.Schemas.LoanRepaymentRequestSummary;
export type LoanRepaymentResult = Components.Schemas.LoanRepaymentResult;
export type LoanRequest = Components.Schemas.LoanRequest;
export type LoanRequestCreate = Components.Schemas.LoanRequestCreate;
export type LoginLink = Components.Schemas.LoginLink;
export type Metadata = Components.Schemas.Metadata;
export type RequestRepaymentRequest = Components.Schemas.RequestRepaymentRequest;
export type TenantRegistration = Components.Schemas.TenantRegistration;
export type TenantRegistrationRequest = Components.Schemas.TenantRegistrationRequest;
