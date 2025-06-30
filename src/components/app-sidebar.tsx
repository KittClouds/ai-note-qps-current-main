
import * as React from "react";
import { Plus, FolderPlus, CheckSquare, Settings } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarRail, SidebarHeader } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { FileTreeItem } from "./FileTreeItem";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { EnhancedSearchBar } from "./EnhancedSearchBar";
import { UndoRedoToolbar } from "./UndoRedoToolbar";
import { SystemStatusModal } from "./SystemStatusModal";
import { useNotes } from "@/contexts/LiveStoreNotesContext";
import { useBulkSelection } from "@/contexts/BulkSelectionContext";
import { useState } from "react";
import { Note } from "@/types/notes";

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const {
    createNote,
    createFolder,
    getItemsByParent,
    state,
    selectItem,
    getSystemStatus
  } = useNotes();
  const {
    isSelectionMode,
    enterSelectionMode,
    hasSelection
  } = useBulkSelection();
  const [searchQuery, setSearchQuery] = useState("");
  const rootItems = getItemsByParent(); // Items without a parent
  const [showSystemStatus, setShowSystemStatus] = useState(false);

  // Get all notes from the state for search functionality
  const allNotes = state.items.filter(item => item.type === 'note') as Note[];

  // Filter items based on search query for text search
  const filteredItems = searchQuery.trim() ? rootItems.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.type === 'note' && item.content.toLowerCase().includes(searchQuery.toLowerCase())) : rootItems;
  const handleNoteSelect = (noteId: string) => {
    selectItem(noteId);
    setSearchQuery(""); // Clear search when selecting a note
  };
  const allItemIds = state.items.map(item => item.id);
  return <Sidebar {...props}>
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between p-2">
          <h2 className="text-lg font-semibold">Notes</h2>
          <div className="flex gap-1">
            {!isSelectionMode && <>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => createNote()} title="New Note">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => createFolder()} title="New Folder">
                  <FolderPlus className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={enterSelectionMode} title="Bulk Select">
                  <CheckSquare className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowSystemStatus(true)} title="System Status">
                  <Settings className="h-4 w-4" />
                </Button>
              </>}
          </div>
        </div>
        <UndoRedoToolbar />
      </SidebarHeader>
      <SidebarContent className="mx-0">
        {isSelectionMode && <BulkActionsToolbar allItemIds={allItemIds} />}
        
        {!isSelectionMode && <SidebarGroup>
            <SidebarGroupLabel>Search</SidebarGroupLabel>
            <SidebarGroupContent>
              <EnhancedSearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} notes={allNotes} onNoteSelect={handleNoteSelect} className="px-2" />
            </SidebarGroupContent>
          </SidebarGroup>}
        
        <SidebarGroup>
          <SidebarGroupLabel>
            {isSelectionMode ? 'Select Items' : 'All Notes'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map(item => <FileTreeItem key={item.id} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
      <SystemStatusModal open={showSystemStatus} onOpenChange={setShowSystemStatus} mergeVacuumStats={getSystemStatus().mergeVacuum} />
    </Sidebar>;
}
