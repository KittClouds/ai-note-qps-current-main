
import { useState, useEffect } from 'react';
import { getLayoutDimensions, type LayoutDimensions } from '@/lib/layout-utils';

interface UseLayoutDimensionsOptions {
  includeConnections?: boolean;
  includeToolbar?: boolean;
}

export function useLayoutDimensions(options: UseLayoutDimensionsOptions = {}) {
  const [dimensions, setDimensions] = useState<LayoutDimensions>(() => 
    getLayoutDimensions(options)
  );

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions(getLayoutDimensions(options));
    };

    // Update on window resize
    window.addEventListener('resize', updateDimensions);
    
    // Initial update
    updateDimensions();

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [options.includeConnections, options.includeToolbar]);

  return dimensions;
}
