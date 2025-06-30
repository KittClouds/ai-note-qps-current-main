
import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react';

interface EditorContextType {
  editor: any | null;
  isReady: boolean;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider = ({ 
  children, 
  editor 
}: { 
  children: ReactNode; 
  editor: any | null; 
}) => {
  const isReadyRef = useRef(false);
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    if (editor && !isReadyRef.current) {
      // Add small delay to ensure editor is fully initialized
      const timer = setTimeout(() => {
        isReadyRef.current = true;
        setIsReady(true);
      }, 100);

      return () => clearTimeout(timer);
    }
    
    if (!editor && isReadyRef.current) {
      isReadyRef.current = false;
      setIsReady(false);
    }
  }, [editor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isReadyRef.current = false;
    };
  }, []);

  return (
    <EditorContext.Provider value={{ editor, isReady }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
