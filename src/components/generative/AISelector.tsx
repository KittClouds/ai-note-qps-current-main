
import { Command, CommandInput } from "@/components/ui/command";
import { useCompletion } from "ai/react";
import { ArrowUp } from "lucide-react";
import { useEditor } from "@/contexts/EditorContext";
import { addAIHighlight } from "@/extensions/AIHighlight";
import { useState, useCallback } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CrazySpinner from "@/components/ui/icons/crazy-spinner";
import Magic from "@/components/ui/icons/magic";
import { ScrollArea } from "@/components/ui/scroll-area";
import AICompletionCommands from "./AICompletionCommands";
import AISelectorCommands from "./AISelectorCommands";
import { getSelectedText } from "@/lib/editorUtils";
import GenerativeErrorBoundary from "./ErrorBoundary";

interface AISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISelector({ onOpenChange }: AISelectorProps) {
  const { editor, isReady } = useEditor();
  const [inputValue, setInputValue] = useState("");

  const { completion, complete, isLoading } = useCompletion({
    api: "/api/generate",
    onResponse: (response) => {
      if (response.status === 429) {
        toast.error("You have reached your request limit for the day.");
        return;
      }
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const hasCompletion = completion.length > 0;

  const handleFocus = useCallback(() => {
    if (editor && isReady) {
      try {
        addAIHighlight(editor);
      } catch (error) {
        console.warn('Failed to add AI highlight on focus:', error);
      }
    }
  }, [editor, isReady]);

  const handleComplete = useCallback(() => {
    if (!editor || !isReady) return;

    try {
      if (completion) {
        return complete(completion, {
          body: { option: "zap", command: inputValue },
        }).then(() => setInputValue(""));
      }

      const text = getSelectedText(editor);
      complete(text, {
        body: { option: "zap", command: inputValue },
      }).then(() => setInputValue(""));
    } catch (error) {
      console.warn('Failed to complete:', error);
      toast.error("Failed to process AI request");
    }
  }, [editor, isReady, completion, inputValue, complete]);

  if (!editor || !isReady) return null;

  return (
    <GenerativeErrorBoundary>
      <Command className="w-[350px]">
        {hasCompletion && (
          <div className="flex max-h-[400px]">
            <ScrollArea>
              <div className="prose p-2 px-4 prose-sm">
                <Markdown>{completion}</Markdown>
              </div>
            </ScrollArea>
          </div>
        )}

        {isLoading && (
          <div className="flex h-12 w-full items-center px-4 text-sm font-medium text-muted-foreground text-purple-500">
            <Magic className="mr-2 h-4 w-4 shrink-0" />
            AI is thinking
            <div className="ml-2 mt-1">
              <CrazySpinner />
            </div>
          </div>
        )}
        
        {!isLoading && (
          <>
            <div className="relative">
              <CommandInput
                value={inputValue}
                onValueChange={setInputValue}
                autoFocus
                placeholder={hasCompletion ? "Tell AI what to do next" : "Ask AI to edit or generate..."}
                onFocus={handleFocus}
              />
              <Button
                size="icon"
                className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-purple-500 hover:bg-purple-900"
                onClick={handleComplete}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
            {hasCompletion ? (
              <AICompletionCommands
                onDiscard={() => {
                  try {
                    editor.chain().unsetAIHighlight().focus().run();
                    onOpenChange(false);
                  } catch (error) {
                    console.warn('Failed to discard completion:', error);
                    onOpenChange(false);
                  }
                }}
                completion={completion}
              />
            ) : (
              <AISelectorCommands 
                onSelect={(value, option) => complete(value, { body: { option } })} 
              />
            )}
          </>
        )}
      </Command>
    </GenerativeErrorBoundary>
  );
}
