"use client"

import { Shield, Lock, Eye, EyeOff, Fingerprint, Server, Globe } from "lucide-react"

const privacyFeatures = [
  {
    icon: Lock,
    title: "Cryptographic Privacy",
    description:
      "Every contract on the Canton Network is encrypted. Only authorized parties can decrypt and see contract data.",
  },
  {
    icon: EyeOff,
    title: "Selective Disclosure",
    description:
      "Loan requests are only disclosed to lenders by the platform operator. Lenders cannot see other lenders' offers.",
  },
  {
    icon: Fingerprint,
    title: "Private Credit Profiles",
    description:
      "Your credit score is stored as a DAML contract where you are the sole signatory. No observers means nobody else can see it.",
  },
  {
    icon: Eye,
    title: "Need-to-Know Access",
    description:
      "Active loans are visible only to the lender and borrower involved. The platform operator has no access.",
  },
  {
    icon: Server,
    title: "DAML Smart Contracts",
    description:
      "All business logic runs on the Canton ledger using DAML, a purpose-built language for privacy-preserving applications.",
  },
  {
    icon: Globe,
    title: "Canton Network",
    description:
      "Built on Canton, the enterprise-grade blockchain for regulated industries. Global sync with sub-transaction privacy.",
  },
]

const contractVisibility = [
  {
    contract: "LoanRequest",
    signatories: "Borrower",
    observers: "Platform Operator",
    visibility: "Private until disclosed",
  },
  {
    contract: "LoanRequestForLender",
    signatories: "Platform Operator",
    observers: "Specific Lender",
    visibility: "Disclosed per-lender",
  },
  {
    contract: "LoanOffer",
    signatories: "Lender",
    observers: "Borrower",
    visibility: "Lender + Borrower only",
  },
  {
    contract: "Loan",
    signatories: "Lender, Borrower",
    observers: "None",
    visibility: "Both parties only",
  },
  {
    contract: "CreditProfile",
    signatories: "Borrower",
    observers: "None",
    visibility: "Borrower-eyes-only",
  },
  {
    contract: "LenderBid",
    signatories: "Lender",
    observers: "Platform Operator",
    visibility: "Lender + Operator",
  },
  {
    contract: "BorrowerAsk",
    signatories: "Borrower",
    observers: "Platform Operator",
    visibility: "Borrower + Operator",
  },
]

export function PrivacyView() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Privacy & Security</h2>
        <p className="text-sm text-muted-foreground mt-1">
          How Denver Lending protects your financial data
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {privacyFeatures.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-border p-5">
            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <feature.icon className="size-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">
              {feature.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Contract Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Contract Visibility Matrix</h3>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left text-xs font-medium text-muted-foreground py-3 px-5">
                Contract
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-3 px-5">
                Signatories
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-3 px-5">
                Observers
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-3 px-5">
                Visibility
              </th>
            </tr>
          </thead>
          <tbody>
            {contractVisibility.map((row, i) => (
              <tr
                key={row.contract}
                className={i < contractVisibility.length - 1 ? "border-b border-border" : ""}
              >
                <td className="py-3 px-5">
                  <code className="text-xs font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                    {row.contract}
                  </code>
                </td>
                <td className="py-3 px-5 text-sm text-foreground">
                  {row.signatories}
                </td>
                <td className="py-3 px-5 text-sm text-muted-foreground">
                  {row.observers}
                </td>
                <td className="py-3 px-5 text-xs text-muted-foreground">
                  {row.visibility}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
