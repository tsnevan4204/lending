"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ArrowDownToLine, ArrowUpFromLine, Loader2, AlertCircle, ArrowLeft } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

type Role = "borrower" | "lender"

interface Props {
  onLogin: (role: Role) => void
  login: (username: string, password?: string) => Promise<boolean>
  /** If backend is unreachable, we still allow "demo mode" with mock data */
  noBackend?: boolean
}

const ROLE_CONFIG = {
  borrower: {
    icon: ArrowDownToLine,
    title: "Borrower",
    desc: "Request loans, review offers, manage repayments",
    defaultUsername: "app-user",
  },
  lender: {
    icon: ArrowUpFromLine,
    title: "Lender",
    desc: "Browse requests, provide liquidity, track returns",
    defaultUsername: "",
  },
}

export function LoginScreen({ onLogin, login, noBackend }: Props) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  function handleRoleSelect(role: Role) {
    setSelectedRole(role)
    setUsername(ROLE_CONFIG[role].defaultUsername)
    setPassword("")
    setLoginError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRole || !username.trim()) return
    setSubmitting(true)
    setLoginError(null)
    try {
      const ok = await login(username.trim(), password)
      if (ok) {
        onLogin(selectedRole)
      } else {
        setLoginError("Login failed — check your username and password.")
      }
    } catch {
      setLoginError("Could not reach the backend. Check that the quickstart stack is running.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleDemoMode() {
    if (selectedRole) {
      onLogin(selectedRole)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
      {/* Top nav */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex items-center justify-between px-8 h-16 border-b border-border"
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="size-8 rounded-full bg-primary flex items-center justify-center"
          >
            <span className="text-primary-foreground font-bold text-sm">D</span>
          </motion.div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Denver Lending
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span className="text-sm text-muted-foreground">Canton Network</span>
        </div>
      </motion.header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-10 max-w-md w-full -mt-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center flex flex-col gap-3"
          >
            <h1 className="text-4xl font-bold tracking-tight text-foreground text-balance leading-tight">
              Decentralized lending, simplified.
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Borrow and lend with privacy-preserving smart contracts on the Canton Network.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {!selectedRole ? (
              /* Role selection */
              <motion.div
                key="role-select"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-3 w-full"
              >
                {(["borrower", "lender"] as Role[]).map((role, i) => {
                  const cfg = ROLE_CONFIG[role]
                  const Icon = cfg.icon
                  return (
                    <motion.button
                      key={role}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                      whileHover={{ scale: 1.015, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleRoleSelect(role)}
                      className="flex items-center gap-4 w-full rounded-xl border border-border p-5 text-left transition-colors duration-200 hover:border-primary/40 hover:bg-primary/[0.03] group cursor-pointer"
                    >
                      <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors duration-200">
                        <Icon className="size-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-foreground">{cfg.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{cfg.desc}</p>
                      </div>
                    </motion.button>
                  )
                })}
              </motion.div>
            ) : (
              /* Login form */
              <motion.div
                key="login-form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <button
                  onClick={() => { setSelectedRole(null); setLoginError(null) }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </button>

                <div className="flex items-center gap-3 mb-6">
                  {(() => {
                    const cfg = ROLE_CONFIG[selectedRole]
                    const Icon = cfg.icon
                    return (
                      <>
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="size-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Sign in as {cfg.title}</p>
                          <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {noBackend && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-3 mb-5 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="size-4 mt-0.5 shrink-0" />
                    <span>
                      Backend not detected. Credentials won&apos;t be verified.{" "}
                      <button
                        onClick={handleDemoMode}
                        className="underline font-medium"
                      >
                        Continue in demo mode
                      </button>
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground" htmlFor="username">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. app-user"
                      required
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground" htmlFor="password">
                      Password <span className="text-muted-foreground font-normal">(leave blank if none set)</span>
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>

                  {loginError && (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
                      <AlertCircle className="size-4 mt-0.5 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={submitting || !username.trim()}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-1 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      `Sign in as ${ROLE_CONFIG[selectedRole].title}`
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-xs text-muted-foreground"
          >
            All transactions are privacy-preserving via DAML smart contracts
          </motion.p>
        </div>
      </main>
    </div>
  )
}
