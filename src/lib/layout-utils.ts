
export interface LayoutDimensions {
  availableHeight: string;
  availableWidth: string;
  headerHeight: number;
  connectionsHeight: number;
}

export const LAYOUT_CONSTANTS = {
  HEADER_HEIGHT: 64, // Header height in px
  CONNECTIONS_PANEL_HEIGHT: 300, // Default connections panel height
  TOOLBAR_HEIGHT: 60, // Approximate toolbar height
} as const;

export function calculateAvailableHeight(options: {
  includeConnections?: boolean;
  includeToolbar?: boolean;
  customOffset?: number;
} = {}): string {
  const { 
    includeConnections = false, 
    includeToolbar = false, 
    customOffset = 0 
  } = options;

  let totalOffset = LAYOUT_CONSTANTS.HEADER_HEIGHT + customOffset;
  
  if (includeConnections) {
    totalOffset += LAYOUT_CONSTANTS.CONNECTIONS_PANEL_HEIGHT;
  }
  
  if (includeToolbar) {
    totalOffset += LAYOUT_CONSTANTS.TOOLBAR_HEIGHT;
  }

  return `calc(100vh - ${totalOffset}px)`;
}

export function calculateAvailableWidth(): string {
  return '100%';
}

export function getLayoutDimensions(options: {
  includeConnections?: boolean;
  includeToolbar?: boolean;
}): LayoutDimensions {
  return {
    availableHeight: calculateAvailableHeight(options),
    availableWidth: calculateAvailableWidth(),
    headerHeight: LAYOUT_CONSTANTS.HEADER_HEIGHT,
    connectionsHeight: LAYOUT_CONSTANTS.CONNECTIONS_PANEL_HEIGHT,
  };
}
