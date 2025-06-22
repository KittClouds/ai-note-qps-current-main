
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
import { useNotes } from "@/contexts/NotesContext"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { createNote, createFolder, getItemsByParent } = useNotes();
  const rootItems = getItemsByParent(); // Items without a parent

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
          <SidebarGroupLabel>All Notes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {rootItems.map((item) => (
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
