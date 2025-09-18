"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTheme } from "@/contexts/theme-context"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-[140px] border-border/50">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span>Light</span>
          </div>
        </SelectItem>
        <SelectItem value="dark">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            <span>Dark</span>
          </div>
        </SelectItem>
        <SelectItem value="system">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span>System</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

export function SimpleThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Determine the actual theme being used (resolve system preference)
  const resolvedTheme = React.useMemo(() => {
    if (!mounted) return 'light' // Default for SSR
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }, [theme, mounted])

  const toggleTheme = () => {
    // Only toggle between light and dark, ignoring system
    if (resolvedTheme === 'light') {
      setTheme('dark')
    } else {
      setTheme('light')
    }
  }

  const isDark = resolvedTheme === 'dark'

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="font-medium">
        <Monitor className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="font-medium relative overflow-hidden"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={isDark ? 'sun' : 'moon'}
          initial={{
            rotate: -90,
            scale: 0,
            opacity: 0
          }}
          animate={{
            rotate: 0,
            scale: 1,
            opacity: 1
          }}
          exit={{
            rotate: 90,
            scale: 0,
            opacity: 0
          }}
          transition={{
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="flex items-center justify-center absolute"
        >
          {isDark ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </motion.div>
      </AnimatePresence>
      <span className="sr-only">Switch to {isDark ? 'light' : 'dark'} mode</span>
    </Button>
  )
}