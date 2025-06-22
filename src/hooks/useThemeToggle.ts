
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { flushSync } from "react-dom";

declare global {
  interface Document {
    startViewTransition?: (callback: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  }
}

export const useThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const toggleDarkMode = useCallback(async (toggleRef?: React.RefObject<HTMLElement>) => {
    const newTheme = theme === "dark" ? "light" : "dark";

    // Check for View Transitions API support and user preferences
    if (
      !toggleRef?.current ||
      !document.startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      // Fallback to simple toggle
      setTheme(newTheme);
      return;
    }

    // Start view transition
    await document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
      });
    }).ready;

    // Calculate animation parameters
    const { top, left, width, height } = toggleRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRadius = Math.hypot(
      Math.max(left, right),
      Math.max(top, bottom)
    );

    // Animate the transition
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
    );
  }, [theme, setTheme]);

  return {
    theme,
    toggleDarkMode,
  };
};
