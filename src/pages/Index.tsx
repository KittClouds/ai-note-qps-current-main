
import { AppSidebar } from "@/components/app-sidebar"
import RightSidebar from "@/components/RightSidebar"
import { RightSidebarProvider, RightSidebarTrigger } from "@/components/RightSidebarProvider"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import RichEditor from "@/components/RichEditor";
import { ConnectionsPanelContainer } from "@/components/ConnectionsPanelContainer";
import { useTheme } from "next-themes";
import { useState, useCallback } from "react";
import { NotesProvider, useNotes } from "@/contexts/NotesContext";
import { EntityManagerDrawer } from "@/components/entity-manager/EntityManagerDrawer";

function NotesApp() {
  const { theme } = useTheme();
  
  // State with localStorage persistence
  const [toolbarVisible, setToolbarVisible] = useState(() => {
    const saved = localStorage.getItem('editor-toolbar-visible');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [connectionsOpen, setConnectionsOpen] = useState(true);
  const { selectedNote, updateNoteContent } = useNotes();

  // Toggle handlers with localStorage persistence
  const handleToggleToolbar = useCallback(() => {
    setToolbarVisible(v => !v);
  }, []);

  const handleToolbarVisibilityChange = useCallback((visible: boolean) => {
    setToolbarVisible(visible);
    localStorage.setItem('editor-toolbar-visible', JSON.stringify(visible));
  }, []);

  const handleEditorChange = (content: string) => {
    if (selectedNote) {
      updateNoteContent(selectedNote.id, content);
    }
  };

  return (
    <SidebarProvider>
      <RightSidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-col">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">Notes</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {selectedNote ? selectedNote.title : 'Select a note'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleToggleToolbar}
                  title={toolbarVisible ? 'Hide toolbar (Ctrl+\\)' : 'Show toolbar (Ctrl+\\)'}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <EntityManagerDrawer />
                <RightSidebarTrigger />
              </div>
            </header>
            
            <div className="flex-1 flex flex-col min-h-0">
              {selectedNote ? (
                <>
                  <div className="flex-1 min-h-0">
                    <RichEditor
                      content={selectedNote.content}
                      onChange={handleEditorChange}
                      isDarkMode={theme === 'dark'}
                      toolbarVisible={toolbarVisible}
                      onToolbarVisibilityChange={handleToolbarVisibilityChange}
                      noteId={selectedNote.id}
                    />
                  </div>
                  <ConnectionsPanelContainer 
                    isOpen={connectionsOpen}
                    onToggle={() => setConnectionsOpen(!connectionsOpen)}
                  />
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a note to start editing
                </div>
              )}
            </div>
          </SidebarInset>
          <RightSidebar />
        </div>
      </RightSidebarProvider>
    </SidebarProvider>
  );
}

const Index = () => {
  return (
    <NotesProvider>
      <NotesApp />
    </NotesProvider>
  )
}

export default Index
