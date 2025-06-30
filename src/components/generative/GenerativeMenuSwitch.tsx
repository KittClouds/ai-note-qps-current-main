
import { useEditor } from "@/contexts/EditorContext";
import { removeAIHighlight } from "@/extensions/AIHighlight";
import { Fragment, type ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Magic from "@/components/ui/icons/magic";
import { AISelector } from "./AISelector";

interface GenerativeMenuSwitchProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GenerativeMenuSwitch = ({ children, open, onOpenChange }: GenerativeMenuSwitchProps) => {
  const { editor } = useEditor();

  useEffect(() => {
    if (!open && editor) {
      removeAIHighlight(editor);
    }
  }, [open, editor]);

  if (!editor) return null;

  return (
    <div className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-muted bg-background shadow-xl">
      {open && <AISelector open={open} onOpenChange={onOpenChange} />}
      {!open && (
        <Fragment>
          <Button
            className="gap-1 rounded-none text-purple-500"
            variant="ghost"
            onClick={() => onOpenChange(true)}
            size="sm"
          >
            <Magic className="h-5 w-5" />
            Ask AI
          </Button>
          {children}
        </Fragment>
      )}
    </div>
  );
};

export default GenerativeMenuSwitch;
