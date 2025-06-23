
import React, { useState } from 'react';
import { ChevronRight, File, Folder, FolderPlus, Plus, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from '@/components/ui/sidebar';
import { InlineEditor } from './InlineEditor';
import { useNotes } from '@/contexts/LiveStoreNotesContext';
import { useBulkSelection } from '@/contexts/BulkSelectionContext';
import { FileSystemItem } from '@/types/notes';

interface FileTreeItemProps {
  item: FileSystemItem;
  level?: number;
}

export function FileTreeItem({ item, level = 0 }: FileTreeItemProps) {
  const { 
    state, 
    createNote, 
    createFolder, 
    renameItem, 
    deleteItem, 
    selectItem, 
    toggleFolder, 
    getItemsByParent 
  } = useNotes();
  
  const { selectedIds, isSelectionMode, toggleSelection } = useBulkSelection();
  const [isRenaming, setIsRenaming] = useState(false);

  const isFolder = item.type === 'folder';
  const isExpanded = state.expandedFolders.has(item.id);
  const isSelected = state.selectedItemId === item.id;
  const isChecked = selectedIds.has(item.id);
  const children = getItemsByParent(item.id);

  const handleClick = () => {
    if (isSelectionMode) {
      toggleSelection(item.id);
    } else if (isFolder) {
      toggleFolder(item.id);
    } else {
      selectItem(item.id);
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      toggleSelection(item.id);
    } else {
      toggleSelection(item.id);
    }
  };

  const handleRename = (newTitle: string) => {
    renameItem(item.id, newTitle);
    setIsRenaming(false);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
      deleteItem(item.id);
    }
  };

  const paddingLeft = `${level * 12 + 8}px`;

  return (
    <>
      <SidebarMenuItem>
        <div className="group relative flex items-center w-full">
          {isSelectionMode && (
            <div className="flex-shrink-0 px-2">
              <Checkbox
                checked={isChecked}
                onCheckedChange={handleCheckboxChange}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <SidebarMenuButton
            className="flex-1 justify-start"
            data-active={isSelected && !isSelectionMode}
            onClick={handleClick}
            style={{ paddingLeft: isSelectionMode ? '8px' : paddingLeft }}
          >
            {isFolder && (
              <ChevronRight 
                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              />
            )}
            {isFolder ? <Folder className="h-4 w-4" /> : <File className="h-4 w-4" />}
            
            {isRenaming ? (
              <InlineEditor
                value={item.title}
                onSave={handleRename}
                onCancel={() => setIsRenaming(false)}
                className="h-6 text-sm"
              />
            ) : (
              <span className="flex-1 truncate">{item.title}</span>
            )}
          </SidebarMenuButton>

          {/* Dropdown Menu Button */}
          {!isRenaming && !isSelectionMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isFolder && (
                  <>
                    <DropdownMenuItem onClick={() => createNote(item.id)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => createFolder(item.id)}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Add Folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SidebarMenuItem>

      {/* Render children */}
      {isFolder && isExpanded && children.length > 0 && (
        <SidebarMenuSub>
          {children.map(child => (
            <FileTreeItem
              key={child.id}
              item={child}
              level={level + 1}
            />
          ))}
        </SidebarMenuSub>
      )}
    </>
  );
}
