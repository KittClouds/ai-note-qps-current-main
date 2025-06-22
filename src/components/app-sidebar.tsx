
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
import { Note } from "@/types/notes"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { createNote, createFolder, getItemsByParent, state, selectItem } = useNotes();
  const [searchQuery, setSearchQuery] = useState("");
  const rootItems = getItemsByParent(); // Items without a parent

  // Get all notes from the state for search functionality
  const allNotes = state.items.filter(item => item.type === 'note') as Note[];

  // Filter items based on search query for text search
  const filteredItems = searchQuery.trim() 
    ? rootItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.type === 'note' && item.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : rootItems;

  const handleNoteSelect = (noteId: string) => {
    selectItem(noteId);
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Search</SidebarGroupLabel>
          <SidebarGroupContent>
            <EnhancedSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              notes={allNotes}
              onNoteSelect={handleNoteSelect}
              className="px-2"
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>All Notes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <FileTreeItem key={item.id} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
