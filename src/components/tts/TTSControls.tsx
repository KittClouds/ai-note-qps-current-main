
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Square, Volume2 } from "lucide-react";
import { VoiceSelector } from "./VoiceSelector";
import { useTTS } from "@/hooks/useTTS";

interface TTSControlsProps {
  text?: string;
  onClose?: () => void;
}

export const TTSControls = ({ text, onClose }: TTSControlsProps) => {
  const {
    isLoading,
    isPlaying,
    isPaused,
    currentVoice,
    error,
    speak,
    pause,
    resume,
    stop,
    setVoice,
    voices,
  } = useTTS();

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    } else if (text) {
      speak(text);
    }
  };

  const handleStop = () => {
    stop();
    onClose?.();
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayPause}
              disabled={isLoading || !text}
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              disabled={!isPlaying && !isPaused}
            >
              <Square className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <VoiceSelector
                voices={voices}
                selectedVoice={currentVoice}
                onVoiceChange={setVoice}
                disabled={isLoading}
              />
            </div>
          </div>

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>

        {error && (
          <div className="mt-2 text-sm text-red-500 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {(isPlaying || isPaused) && (
          <div className="mt-2 text-xs text-muted-foreground">
            {isPlaying ? 'Playing...' : 'Paused'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
