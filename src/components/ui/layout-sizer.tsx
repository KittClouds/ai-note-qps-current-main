
import React from 'react';
import { useLayoutDimensions } from '@/hooks/useLayoutDimensions';

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

  return (
    <div 
      className={className}
      style={{
        height: dimensions.availableHeight,
        width: dimensions.availableWidth,
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
