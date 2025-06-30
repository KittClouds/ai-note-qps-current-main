
import { useEditor } from "@/contexts/EditorContext";
import { removeAIHighlight } from "@/extensions/AIHighlight";
import { Fragment, type ReactNode, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Magic from "@/components/ui/icons/magic";
import { AISelector } from "./AISelector";
import GenerativeErrorBoundary from "./ErrorBoundary";

interface GenerativeMenuSwitchProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GenerativeMenuSwitch = ({ children, open, onOpenChange }: GenerativeMenuSwitchProps) => {
  const { editor, isReady } = useEditor();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open && editor && isReady) {
      // Debounce the cleanup to avoid race conditions
      cleanupRef.current = () => {
        try {
          removeAIHighlight(editor);
        } catch (error) {
          console.warn('Failed to remove AI highlight on close:', error);
        }
      };

      const timer = setTimeout(() => {
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        cleanupRef.current = null;
      };
    }
  }, [open, editor, isReady]);

  // Don't render if editor is not ready
  if (!editor || !isReady) return null;

  return (
    <GenerativeErrorBoundary>
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
    </GenerativeErrorBoundary>
  );
};

export default GenerativeMenuSwitch;
