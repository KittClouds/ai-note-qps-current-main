
import { CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";
import { useEditor } from "@/contexts/EditorContext";
import { Check, TextQuote, Trash } from "lucide-react";

interface AICompletionCommandsProps {
  completion: string;
  onDiscard: () => void;
}

const AICompletionCommands = ({ completion, onDiscard }: AICompletionCommandsProps) => {
  const { editor } = useEditor();
  
  if (!editor) return null;

  return (
    <>
      <CommandGroup>
        <CommandItem
          className="gap-2 px-4"
          value="replace"
          onSelect={() => {
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
          }}
        >
          <Check className="h-4 w-4 text-muted-foreground" />
          Replace selection
        </CommandItem>
        <CommandItem
          className="gap-2 px-4"
          value="insert"
          onSelect={() => {
            const selection = editor.view.state.selection;
            editor
              .chain()
              .focus()
              .insertContentAt(selection.to + 1, completion)
              .run();
          }}
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
