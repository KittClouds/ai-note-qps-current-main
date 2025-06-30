
import { ArrowDownWideNarrow, CheckCheck, RefreshCcwDot, StepForward, WrapText } from "lucide-react";
import { CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";

const options = [
  {
    value: "improve",
    label: "Improve writing",
    icon: RefreshCcwDot,
  },
  {
    value: "fix",
    label: "Fix grammar",
    icon: CheckCheck,
  },
  {
    value: "shorter",
    label: "Make shorter",
    icon: ArrowDownWideNarrow,
  },
  {
    value: "longer",
    label: "Make longer",
    icon: WrapText,
  },
];

interface AISelectorCommandsProps {
  onSelect: (text: string, option: string) => void;
  editor: any; // TipTap editor instance
}

const AISelectorCommands = ({ onSelect, editor }: AISelectorCommandsProps) => {
  const getPrevText = (editor: any, pos: number, chars: number = 5000): string => {
    // Get text before cursor position
    const textBefore = editor.state.doc.textBetween(Math.max(0, pos - chars), pos, "\n");
    return textBefore;
  };

  return (
    <>
      <CommandGroup heading="Edit or review selection">
        {options.map((option) => (
          <CommandItem
            onSelect={(value) => {
              const { from, to } = editor.state.selection;
              let text = "";
              
              if (from !== to) {
                // Get selected text
                text = editor.state.doc.textBetween(from, to, "\n");
              } else {
                // Get surrounding text if no selection
                const pos = editor.state.selection.from;
                text = getPrevText(editor, pos, 1000);
              }
              
              onSelect(text, value);
            }}
            className="flex gap-2 px-4"
            key={option.value}
            value={option.value}
          >
            <option.icon className="h-4 w-4 text-purple-500" />
            {option.label}
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Use AI to do more">
        <CommandItem
          onSelect={() => {
            const pos = editor.state.selection.from;
            const text = getPrevText(editor, pos);
            onSelect(text, "continue");
          }}
          value="continue"
          className="gap-2 px-4"
        >
          <StepForward className="h-4 w-4 text-purple-500" />
          Continue writing
        </CommandItem>
      </CommandGroup>
    </>
  );
};

export default AISelectorCommands;
