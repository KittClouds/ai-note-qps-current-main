
import React from 'react';
import { useLayoutDimensions } from '@/hooks/useLayoutDimensions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRightSidebar } from '@/components/RightSidebarProvider';

interface LayoutSizerProps {
  children: React.ReactNode;
  className?: string;
  includeConnections?: boolean;
  includeToolbar?: boolean;
  forHeader?: boolean;
  style?: React.CSSProperties;
}

export function LayoutSizer({ 
  children, 
  className = '', 
  includeConnections = false,
  includeToolbar = false,
  forHeader = false,
  style = {},
  ...props 
}: LayoutSizerProps) {
  const dimensions = useLayoutDimensions({ includeConnections, includeToolbar, forHeader });
  const isMobile = useIsMobile();

  return (
    <div 
      className={className}
      style={{
        // Only set height for non-header elements or when specifically needed
        ...(forHeader ? {} : { height: dimensions.availableHeight }),
        // Always set width to ensure proper layout with sidebars
        width: dimensions.availableWidth,
        transition: 'width 0.2s ease-linear',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
