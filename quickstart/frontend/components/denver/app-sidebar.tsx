"use client"

import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"
import {
  FileText,
  HandCoins,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ThemeToggle } from "./theme-toggle"

type NavItem = {
  label: string
  icon: React.ElementType
  value: string
}

const navItems: NavItem[] = [
  { label: "My Loans", icon: FileText, value: "borrower" },
  { label: "Marketplace", icon: HandCoins, value: "lender" },
  { label: "Order Book", icon: BarChart3, value: "orderbook" },
]

export function AppSidebar({
  activeView,
  onViewChange,
  onLogout,
  collapsed,
  onToggleCollapse,
}: {
  activeView: string
  onViewChange: (view: string) => void
  onLogout: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1, width: collapsed ? 68 : 240 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col border-r border-border bg-background h-screen sticky top-0 overflow-hidden transition-colors duration-300"
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0 cursor-pointer"
            >
              <span className="text-primary-foreground font-bold text-sm">D</span>
            </motion.div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="text-base font-semibold text-foreground truncate tracking-tight"
                >
                  Denver
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-0.5 p-2 mt-2">
          {navItems.map((item, i) => {
            const isActive = activeView === item.value
            const button = (
              <motion.button
                key={item.value}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onViewChange(item.value)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 w-full",
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-lg bg-primary/10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-3">
                  <item.icon className="size-[18px] shrink-0" />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </motion.button>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.value}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            }

            return button
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t border-border flex flex-col gap-1">
          <div className="flex items-center gap-1 px-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onLogout}
                  className="flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200"
                  aria-label="Log out"
                >
                  <LogOut className="size-[18px]" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="right">Log out</TooltipContent>
            </Tooltip>

            <ThemeToggle className="ml-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggleCollapse}
                  className="flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200 ml-auto"
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? (
                    <ChevronRight className="size-[18px]" />
                  ) : (
                    <ChevronLeft className="size-[18px]" />
                  )}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? "Expand" : "Collapse"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  )
}
