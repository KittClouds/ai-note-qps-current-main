
import React from 'react';
import { useLayoutDimensions } from '@/hooks/useLayoutDimensions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRightSidebar } from '@/components/RightSidebarProvider';

interface LayoutSizerProps {
  children: React.ReactNode;
  className?: string;
  includeConnections?: boolean;
  includeToolbar?: boolean;
  style?: React.CSSProperties;
}

export function LayoutSizer({ 
  children, 
  className = '', 
  includeConnections = false,
  includeToolbar = false,
  style = {},
  ...props 
}: LayoutSizerProps) {
  const dimensions = useLayoutDimensions({ includeConnections, includeToolbar });
  const isMobile = useIsMobile();
  const { open: rightSidebarOpen } = useRightSidebar();

  // On desktop, don't set width when right sidebar is open since it uses its own spacer
  const shouldSetWidth = isMobile || !rightSidebarOpen;

  return (
    <div 
      className={className}
      style={{
        height: dimensions.availableHeight,
        ...(shouldSetWidth && { width: dimensions.availableWidth }),
        transition: 'width 0.2s ease-linear',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
