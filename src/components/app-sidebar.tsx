
import * as React from "react"
import { Plus, FolderPlus } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarRail,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { FileTreeItem } from "./FileTreeItem"
import { EnhancedSearchBar } from "./EnhancedSearchBar"
import { useNotes } from "@/contexts/NotesContext"
import { useState } from "react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { createNote, createFolder, getItemsByParent, selectNote, notes } = useNotes();
  const [searchQuery, setSearchQuery] = useState("");
  const rootItems = getItemsByParent(); // Items without a parent

  // Filter items based on search query for text search
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return rootItems;
    
    const query = searchQuery.toLowerCase();
    return rootItems.filter(item => 
      item.title.toLowerCase().includes(query) ||
      (item.type === 'note' && item.content?.toLowerCase().includes(query))
    );
  }, [rootItems, searchQuery]);

  const handleNoteSelect = (noteId: string) => {
    selectNote(noteId);
    setSearchQuery(""); // Clear search when selecting a note
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between p-2">
          <h2 className="text-lg font-semibold">Notes</h2>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={() => createNote()}
              title="New Note"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={() => createFolder()}
              title="New Folder"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="px-2 pb-2">
          <EnhancedSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            notes={notes}
            onNoteSelect={handleNoteSelect}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {searchQuery ? `Search Results (${filteredItems.length})` : 'All Notes'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <FileTreeItem key={item.id} item={item} />
              ))}
              {filteredItems.length === 0 && searchQuery && (
                <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                  No notes found matching "{searchQuery}"
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
