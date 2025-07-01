
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';
import { useToast } from '@/hooks/use-toast';

interface TTSButtonProps {
  text: string;
  className?: string;
}

export function TTSButton({ text, className }: TTSButtonProps) {
  const { speak, stop, isLoading, isSpeaking, error } = useTTS();
  const { toast } = useToast();

  const handleClick = async () => {
    if (isSpeaking) {
      stop();
    } else {
      try {
        await speak(text);
      } catch (err) {
        toast({
          title: "TTS Error",
          description: "Failed to generate speech. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // Show error toast when error occurs
  if (error) {
    toast({
      title: "TTS Error",
      description: error,
      variant: "destructive"
    });
  }

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="sm"
      className={className}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSpeaking ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
}
