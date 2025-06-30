
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TTSVoice } from "@/lib/tts/ttsService";

interface VoiceSelectorProps {
  voices: TTSVoice[];
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  disabled?: boolean;
}

export const VoiceSelector = ({ voices, selectedVoice, onVoiceChange, disabled }: VoiceSelectorProps) => {
  // Group voices by category and gender
  const groupedVoices = voices.reduce((acc, voice) => {
    const key = `${voice.category} (${voice.gender})`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(voice);
    return acc;
  }, {} as Record<string, TTSVoice[]>);

  const selectedVoiceName = voices.find(v => v.id === selectedVoice)?.name || selectedVoice;

  return (
    <Select value={selectedVoice} onValueChange={onVoiceChange} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={selectedVoiceName} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groupedVoices).map(([group, groupVoices]) => (
          <div key={group}>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
              {group}
            </div>
            {groupVoices.map((voice) => (
              <SelectItem key={voice.id} value={voice.id}>
                {voice.name}
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
};
