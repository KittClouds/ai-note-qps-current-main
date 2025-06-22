
import { useState, useRef } from 'react'
import { flushSync } from 'react-dom'
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [isAnimating, setIsAnimating] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const toggleDarkMode = async () => {
    if (!buttonRef.current || isAnimating) return

    const isDarkMode = theme === "dark"
    const newTheme = isDarkMode ? "light" : "dark"

    // Check if View Transitions API is supported
    if (!document.startViewTransition) {
      setTheme(newTheme)
      return
    }

    setIsAnimating(true)

    try {
      await document.startViewTransition(() => {
        flushSync(() => {
          setTheme(newTheme)
        })
      }).ready

      const { top, left, width, height } = buttonRef.current.getBoundingClientRect()
      const x = left + width / 2
      const y = top + height / 2
      const right = window.innerWidth - left
      const bottom = window.innerHeight - top
      
      // Calculate the radius of circle that can cover the screen
      const maxRadius = Math.hypot(
        Math.max(left, right),
        Math.max(top, bottom),
      )

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      )
    } catch (error) {
      // Fallback if animation fails
      console.warn('View transition failed:', error)
    } finally {
      setTimeout(() => setIsAnimating(false), 500)
    }
  }

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      className="h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors"
      onClick={toggleDarkMode}
      disabled={isAnimating}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
