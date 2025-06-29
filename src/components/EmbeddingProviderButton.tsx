
import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { providerRegistry } from '@/lib/embeddings/providers/ProviderRegistry';
import { embeddingsService } from '@/lib/embeddings/embeddingsService';
import { useToast } from '@/hooks/use-toast';

export function EmbeddingProviderButton() {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const activeProviderId = providerRegistry.getActiveProviderId();
    if (activeProviderId) {
      setSelectedProvider(activeProviderId);
    }
  }, []);

  const handleProviderChange = async (providerId: string) => {
    if (providerId === 'gemini' && !localStorage.getItem('gemini_api_key')) {
      toast({
        title: 'API Key Required',
        description: 'Please configure your Gemini API key in API Settings first.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await embeddingsService.switchProvider(providerId);
      setSelectedProvider(providerId);
      toast({
        title: 'Provider switched',
        description: `Now using ${providerRegistry.getProvider(providerId)?.name}`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to switch embedding provider',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const providers = providerRegistry.getAvailableProviders();
  const currentProvider = embeddingsService.getCurrentProvider();

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-3 w-3" />
            <span className="text-xs">
              {currentProvider ? currentProvider.name : 'Provider'}
            </span>
            {currentProvider && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {currentProvider.dimension}D
              </Badge>
            )}
          </div>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Embedding Provider Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Provider</Label>
            <Select
              value={selectedProvider}
              onValueChange={handleProviderChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select embedding provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map(({ id, provider }) => (
                  <SelectItem key={id} value={id}>
                    <div className="flex items-center gap-2">
                      <span>{provider.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {provider.dimension}D
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentProvider && (
            <>
              <Separator />
              <div className="text-sm text-muted-foreground">
                <strong>Current:</strong> {currentProvider.name} ({currentProvider.dimension} dimensions)
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
