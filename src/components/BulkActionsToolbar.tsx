
import React, { useState } from 'react';
import { Trash2, X, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBulkSelection } from '@/contexts/BulkSelectionContext';
import { useNotes } from '@/contexts/LiveStoreNotesContext';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BulkActionsToolbarProps {
  allItemIds: string[];
}

export function BulkActionsToolbar({ allItemIds }: BulkActionsToolbarProps) {
  const { selectedIds, toggleAll, clearSelection, exitSelectionMode } = useBulkSelection();
  const { bulkDeleteItems } = useNotes();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const selectedCount = selectedIds.size;
  const allSelected = allItemIds.every(id => selectedIds.has(id));

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteItems(Array.from(selectedIds));
      toast({
        title: "Success",
        description: `Deleted ${selectedCount} items successfully`,
      });
      exitSelectionMode();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete selected items",
        variant: "destructive"
      });
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="flex items-center justify-between p-2 bg-muted border-b">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => toggleAll(allItemIds)}
          >
            {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </Button>
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={selectedCount === 0}
            className="h-8"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete ({selectedCount})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={exitSelectionMode}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} selected items? 
              This will also delete all their contents and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedCount} Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
