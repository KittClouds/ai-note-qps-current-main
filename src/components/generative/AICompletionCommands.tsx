
import { CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";
import { useEditor } from "@/contexts/EditorContext";
import { Check, TextQuote, Trash } from "lucide-react";

interface AICompletionCommandsProps {
  completion: string;
  onDiscard: () => void;
}

const AICompletionCommands = ({ completion, onDiscard }: AICompletionCommandsProps) => {
  const { editor, isReady } = useEditor();
  
  if (!editor || !isReady) return null;

  const handleReplace = () => {
    try {
      const selection = editor.view.state.selection;
      editor
        .chain()
        .focus()
        .insertContentAt(
          {
            from: selection.from,
            to: selection.to,
          },
          completion,
        )
        .run();
    } catch (error) {
      console.warn('Failed to replace content:', error);
    }
  };

  const handleInsert = () => {
    try {
      const selection = editor.view.state.selection;
      editor
        .chain()
        .focus()
        .insertContentAt(selection.to + 1, completion)
        .run();
    } catch (error) {
      console.warn('Failed to insert content:', error);
    }
  };

  return (
    <>
      <CommandGroup>
        <CommandItem
          className="gap-2 px-4"
          value="replace"
          onSelect={handleReplace}
        >
          <Check className="h-4 w-4 text-muted-foreground" />
          Replace selection
        </CommandItem>
        <CommandItem
          className="gap-2 px-4"
          value="insert"
          onSelect={handleInsert}
        >
          <TextQuote className="h-4 w-4 text-muted-foreground" />
          Insert below
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup>
        <CommandItem onSelect={onDiscard} value="discard" className="gap-2 px-4">
          <Trash className="h-4 w-4 text-muted-foreground" />
          Discard
        </CommandItem>
      </CommandGroup>
    </>
  );
};

export default AICompletionCommands;
