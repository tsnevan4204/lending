"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Loader2, AlertCircle } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

interface Props {
  onLogin: () => void
  login: (username: string, password?: string) => Promise<boolean>
  noBackend?: boolean
}

export function LoginScreen({ onLogin, login, noBackend }: Props) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) return
    setSubmitting(true)
    setLoginError(null)
    try {
      const ok = await login(username.trim(), password)
      if (ok) {
        onLogin()
      } else {
        setLoginError("Login failed — check your username and password.")
      }
    } catch {
      setLoginError("Could not reach the backend. Check that the quickstart stack is running.")
    } finally {
      setSubmitting(false)
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

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="w-full"
          >
            {noBackend && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-3 mb-5 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <span>
                  Backend not detected. Credentials won&apos;t be verified.{" "}
                  <button
                    onClick={onLogin}
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
                  "Sign in"
                )}
              </motion.button>
            </form>
          </motion.div>

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
