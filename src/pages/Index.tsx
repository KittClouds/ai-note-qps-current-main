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
import { ThemeToggle } from "@/components/ThemeToggle";
import { LayoutSizer } from "@/components/ui/layout-sizer";

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
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex flex-col transition-all duration-200 ease-linear">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#" className="text-foreground hover:text-primary">Notes</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-foreground">
                      {selectedNote ? selectedNote.title : 'Select a note'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={handleToggleToolbar}
                  title={toolbarVisible ? 'Hide toolbar (Ctrl+\\)' : 'Show toolbar (Ctrl+\\)'}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <ThemeToggle />
                <EntityManagerDrawer />
                <RightSidebarTrigger />
              </div>
            </header>
            
            <LayoutSizer 
              className="flex-1 flex flex-col min-h-0"
              includeConnections={connectionsOpen}
              includeToolbar={toolbarVisible}
            >
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
                <div className="flex flex-col items-center justify-center bg-background h-full">
                  <div className="text-center space-y-6 max-w-md mx-auto px-6">
                    <div className="text-8xl mb-6 opacity-60">📝</div>
                    <div className="space-y-4">
                      <h2 className="text-3xl font-semibold text-foreground">No note selected</h2>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Select a note from the sidebar or create a new one to start editing your thoughts and ideas
                      </p>
                    </div>
                    <div className="pt-4">
                      <Button className="btn-purple-gradient text-white font-medium px-8 py-3 text-lg">
                        Create New Note
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </LayoutSizer>
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
