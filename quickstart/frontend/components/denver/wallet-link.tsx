"use client"

import { ExternalLink, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WalletLink({
  walletUrl,
  label = "Open Wallet",
  size = "sm",
  variant = "outline",
}: {
  walletUrl: string | null
  label?: string
  size?: "sm" | "default" | "lg"
  variant?: "outline" | "default" | "ghost"
}) {
  if (!walletUrl) return null

  return (
    <Button
      size={size}
      variant={variant}
      className="text-xs gap-1.5"
      onClick={() => window.open(walletUrl, "_blank", "noopener")}
    >
      <Wallet className="size-3" />
      {label}
      <ExternalLink className="size-3" />
    </Button>
  )
}
