
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileTreeItem } from "./FileTreeItem"
import { EnhancedSearchBar } from "./EnhancedSearchBar"
import { useNotes } from "@/contexts/NotesContext"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { createNote, createFolder, getItemsByParent, state, selectItem } = useNotes();
  const rootItems = getItemsByParent(); // Items without a parent
  const [searchQuery, setSearchQuery] = React.useState("");

  // Filter notes for text search
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return rootItems;
    
    return state.items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.type === 'note' && item.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [rootItems, state.items, searchQuery]);

  const handleNoteSelect = (noteId: string) => {
    selectItem(noteId);
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
        <div className="p-2">
          <Tabs defaultValue="folders" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="folders" className="text-xs">Folders</TabsTrigger>
              <TabsTrigger value="nests" className="text-xs">Nests</TabsTrigger>
              <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
            </TabsList>
            
            <TabsContent value="folders" className="mt-0">
              <SidebarGroup>
                <SidebarGroupLabel>All Notes</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {rootItems.map((item) => (
                      <FileTreeItem key={item.id} item={item} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </TabsContent>
            
            <TabsContent value="nests" className="mt-0">
              <SidebarGroup>
                <SidebarGroupLabel>Nested Views</SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="text-sm text-muted-foreground p-4 text-center">
                    Coming soon...
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            </TabsContent>
            
            <TabsContent value="search" className="mt-0">
              <EnhancedSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                notes={state.items.filter(item => item.type === 'note')}
                onNoteSelect={handleNoteSelect}
              />
              
              {searchQuery.trim() && (
                <SidebarGroup>
                  <SidebarGroupLabel>Search Results</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {filteredItems.map((item) => (
                        <FileTreeItem key={item.id} item={item} />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
