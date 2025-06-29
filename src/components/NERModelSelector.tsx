
import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, Check, X, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { nerServiceManager } from '@/lib/ner/nerServiceManager';
import { useToast } from '@/hooks/use-toast';

export function NERModelSelector() {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [status, setStatus] = useState(nerServiceManager.getStatus());
  const { toast } = useToast();

  useEffect(() => {
    const currentModel = nerServiceManager.getCurrentModel();
    if (currentModel) {
      setSelectedModel(currentModel.id);
    }
    setStatus(nerServiceManager.getStatus());
  }, []);

  const handleModelChange = async (modelId: string) => {
    setIsLoading(true);
    try {
      await nerServiceManager.switchModel(modelId);
      setSelectedModel(modelId);
      setStatus(nerServiceManager.getStatus());
      
      const modelInfo = nerServiceManager.getCurrentModel();
      toast({
        title: 'NER Model switched',
        description: `Now using ${modelInfo?.name}`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to switch NER model',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReinitialize = async () => {
    setIsLoading(true);
    try {
      await nerServiceManager.reinitialize();
      setStatus(nerServiceManager.getStatus());
      toast({
        title: 'NER Service reinitialized',
        description: 'Service has been refreshed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reinitialize NER service',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const availableModels = nerServiceManager.getAvailableModels();
  const currentModel = nerServiceManager.getCurrentModel();

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-3 w-3" />
            <span className="text-xs">
              {currentModel ? currentModel.name : 'NER Model'}
            </span>
            <Badge 
              variant={status.hasError ? 'destructive' : status.isInitialized ? 'default' : 'secondary'} 
              className="text-xs px-1 py-0"
            >
              {status.hasError ? 'Error' : status.isInitialized ? 'Ready' : 'Loading'}
            </Badge>
          </div>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>NER Model Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select NER Model</label>
            <Select
              value={selectedModel}
              onValueChange={handleModelChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select NER model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {model.provider}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {status.hasError && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded">
                <X className="h-4 w-4 text-destructive" />
                <div className="text-sm">
                  <div className="font-medium text-destructive">Error</div>
                  <div className="text-muted-foreground">{status.errorMessage}</div>
                </div>
              </div>
              <Button onClick={handleReinitialize} disabled={isLoading} size="sm" className="w-full">
                Reinitialize Service
              </Button>
            </div>
          )}

          <Separator />

          {currentModel && (
            <div className="text-sm text-muted-foreground">
              <div><strong>Current:</strong> {currentModel.name}</div>
              <div><strong>Provider:</strong> {currentModel.provider}</div>
              <div><strong>Status:</strong> {status.isInitialized ? 'Ready' : status.isLoading ? 'Loading' : 'Not Ready'}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
