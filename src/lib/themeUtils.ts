
/**
 * Theme utility functions for managing app-wide theming
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Gets the current theme mode from the document class
 */
export const getCurrentTheme = (): 'light' | 'dark' => {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

/**
 * Applies a theme mode to the document
 */
export const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  
  switch (mode) {
    case 'dark':
      root.classList.add('dark');
      break;
    case 'light':
      root.classList.remove('dark');
      break;
    case 'system':
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      break;
  }
};

/**
 * Gets a CSS custom property value
 */
export const getCSSVariable = (variable: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(variable);
};

/**
 * Sets a CSS custom property value
 */
export const setCSSVariable = (variable: string, value: string) => {
  document.documentElement.style.setProperty(variable, value);
};

/**
 * Creates a new theme variant by modifying existing CSS variables
 */
export const createThemeVariant = (name: string, overrides: Record<string, string>) => {
  const root = document.documentElement;
  
  // Add a class for the theme variant
  root.classList.add(`theme-${name}`);
  
  // Apply CSS variable overrides
  Object.entries(overrides).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};

/**
 * Removes a theme variant
 */
export const removeThemeVariant = (name: string) => {
  const root = document.documentElement;
  root.classList.remove(`theme-${name}`);
};

/**
 * Notion-style light theme preset
 */
export const notionLightTheme = {
  '--background': '0 0% 100%',
  '--foreground': '0 0% 9%',
  '--card': '0 0% 100%',
  '--card-foreground': '0 0% 9%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '0 0% 9%',
  '--primary': '210 100% 50%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '210 40% 98%',
  '--secondary-foreground': '0 0% 9%',
  '--muted': '210 40% 98%',
  '--muted-foreground': '0 0% 45%',
  '--accent': '210 40% 96%',
  '--accent-foreground': '0 0% 9%',
  '--destructive': '0 84% 60%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '220 13% 91%',
  '--input': '220 13% 91%',
  '--ring': '210 100% 50%',
  '--editor-background': '0 0% 100%',
  '--editor-foreground': '0 0% 9%',
  '--editor-border': '220 13% 91%',
  '--editor-selection': '210 40% 96%',
  '--editor-toolbar-background': '0 0% 98%',
  '--editor-toolbar-border': '220 13% 91%',
  '--editor-button-hover': '210 40% 96%',
  '--editor-menu-background': '0 0% 100%',
  '--editor-menu-border': '220 13% 91%',
  '--editor-code-background': '210 40% 98%',
  '--editor-blockquote-border': '210 100% 50%',
  '--editor-table-border': '220 13% 91%',
  '--editor-placeholder': '0 0% 45%',
};
