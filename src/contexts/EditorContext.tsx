
import React, { createContext, useContext, ReactNode } from 'react';

interface EditorContextType {
  editor: any | null;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider = ({ 
  children, 
  editor 
}: { 
  children: ReactNode; 
  editor: any | null; 
}) => {
  return (
    <EditorContext.Provider value={{ editor }}>
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
