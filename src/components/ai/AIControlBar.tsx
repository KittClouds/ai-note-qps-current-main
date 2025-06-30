
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandInput, CommandList } from '@/components/ui/command';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RefreshCcwDot, CheckCheck, ArrowDownWideNarrow, WrapText, StepForward, Sparkles, X } from 'lucide-react';
import { useAICompletion } from '@/hooks/useAICompletion';
import AISelectorCommands from './AISelectorCommands';
import AICompletionCommands from './AICompletionCommands';

interface AIControlBarProps {
  editor: any;
  isDarkMode?: boolean;
}

const aiOptions = [
  { key: 'continue', label: 'Continue', icon: StepForward },
  { key: 'improve', label: 'Improve', icon: RefreshCcwDot },
  { key: 'fix', label: 'Fix Grammar', icon: CheckCheck },
  { key: 'shorter', label: 'Shorter', icon: ArrowDownWideNarrow },
  { key: 'longer', label: 'Longer', icon: WrapText },
];

const AIControlBar = ({ editor, isDarkMode }: AIControlBarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'selector' | 'completion'>('selector');
  
  const { completion, isLoading, error, generateCompletion, reset } = useAICompletion({
    onComplete: () => setMode('completion'),
    onError: (error) => console.error('AI Error:', error),
  });

  const handleAISelect = async (text: string, option: string) => {
    setMode('completion');
    await generateCompletion(text, option);
  };

  const handleQuickAction = async (option: string) => {
    setIsOpen(true);
    setMode('completion');
    
    const { from, to } = editor.state.selection;
    let text = "";
    
    if (option === 'continue') {
      const pos = editor.state.selection.from;
      text = editor.state.doc.textBetween(Math.max(0, pos - 5000), pos, "\n");
    } else if (from !== to) {
      text = editor.state.doc.textBetween(from, to, "\n");
    } else {
      const pos = editor.state.selection.from;
      text = editor.state.doc.textBetween(Math.max(0, pos - 1000), pos, "\n");
    }
    
    await generateCompletion(text, option);
  };

  const handleDiscard = () => {
    reset();
    setIsOpen(false);
    setMode('selector');
  };

  if (!editor) return null;

  return (
    <div className="border-t bg-background p-2">
      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          AI Assistant
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        {aiOptions.map((option) => (
          <Button
            key={option.key}
            variant="ghost"
            size="sm"
            onClick={() => handleQuickAction(option.key)}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <option.icon className="h-3 w-3" />
            {option.label}
          </Button>
        ))}
      </div>

      {/* AI Command Interface */}
      {isOpen && (
        <Card className="mt-2 p-0 shadow-lg">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="text-sm font-medium">AI Assistant</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <Command className="border-0">
            {mode === 'selector' && (
              <>
                <CommandInput placeholder="Ask AI to help with your writing..." />
                <CommandList className="max-h-[200px]">
                  <AISelectorCommands onSelect={handleAISelect} editor={editor} />
                </CommandList>
              </>
            )}
            
            {mode === 'completion' && (
              <div className="p-4">
                {isLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
                    Generating response...
                  </div>
                )}
                
                {error && (
                  <div className="text-sm text-red-500 mb-4 p-3 bg-red-50 rounded-md">
                    {error}
                  </div>
                )}
                
                {completion && (
                  <div className="space-y-4">
                    <div className="text-sm bg-muted p-3 rounded-md max-h-[200px] overflow-y-auto">
                      <div className="whitespace-pre-wrap">{completion}</div>
                    </div>
                    
                    <Command>
                      <CommandList>
                        <AICompletionCommands
                          completion={completion}
                          onDiscard={handleDiscard}
                          editor={editor}
                        />
                      </CommandList>
                    </Command>
                  </div>
                )}
                
                {!isLoading && !completion && !error && (
                  <div className="text-sm text-muted-foreground">
                    Select text and choose an AI action to get started.
                  </div>
                )}
              </div>
            )}
          </Command>
        </Card>
      )}
    </div>
  );
};

export default AIControlBar;
