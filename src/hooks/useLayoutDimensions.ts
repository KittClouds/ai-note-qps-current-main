
import { useState, useEffect } from 'react';
import { getLayoutDimensions, type LayoutDimensions } from '@/lib/layout-utils';
import { useSidebar } from '@/components/ui/sidebar';
import { useRightSidebar } from '@/components/RightSidebarProvider';
import { useIsMobile } from '@/hooks/use-mobile';

interface UseLayoutDimensionsOptions {
  includeConnections?: boolean;
  includeToolbar?: boolean;
  forHeader?: boolean;
}

export function useLayoutDimensions(options: UseLayoutDimensionsOptions = {}) {
  const { open: leftSidebarOpen } = useSidebar();
  const { open: rightSidebarOpen } = useRightSidebar();
  const isMobile = useIsMobile();

  const [dimensions, setDimensions] = useState<LayoutDimensions>(() => 
    getLayoutDimensions({
      ...options,
      leftSidebarOpen,
      rightSidebarOpen,
      isMobile
    })
  );

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions(getLayoutDimensions({
        ...options,
        leftSidebarOpen,
        rightSidebarOpen,
        isMobile
      }));
    };

    // Update on window resize
    window.addEventListener('resize', updateDimensions);
    
    // Initial update
    updateDimensions();

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [
    options.includeConnections, 
    options.includeToolbar, 
    options.forHeader,
    leftSidebarOpen, 
    rightSidebarOpen,
    isMobile
  ]);

  return dimensions;
}
