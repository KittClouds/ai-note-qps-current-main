
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { providerRegistry } from '@/lib/embeddings/providers/ProviderRegistry';
import { embeddingsService } from '@/lib/embeddings/embeddingsService';
import { useToast } from '@/hooks/use-toast';

export function EmbeddingProviderSelector() {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const activeProviderId = providerRegistry.getActiveProviderId();
    if (activeProviderId) {
      setSelectedProvider(activeProviderId);
    }

    // Check if Gemini API key exists
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setGeminiApiKey('••••••••••••••••');
    }
  }, []);

  const handleProviderChange = async (providerId: string) => {
    if (providerId === 'gemini' && !localStorage.getItem('gemini_api_key')) {
      setShowApiKeyInput(true);
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

  const handleGeminiSetup = async () => {
    if (!geminiApiKey || geminiApiKey === '••••••••••••••••') {
      toast({
        title: 'Error',
        description: 'Please enter a valid Gemini API key',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await embeddingsService.switchProvider('gemini', geminiApiKey);
      setSelectedProvider('gemini');
      setShowApiKeyInput(false);
      toast({
        title: 'Gemini configured',
        description: 'Successfully switched to Gemini embeddings',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to configure Gemini provider',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const providers = providerRegistry.getAvailableProviders();
  const currentProvider = embeddingsService.getCurrentProvider();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Embedding Provider
          {currentProvider && (
            <Badge variant="secondary">
              {currentProvider.dimension}D
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Provider</Label>
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
                    <Badge variant="outline">{provider.dimension}D</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showApiKeyInput && (
          <div className="space-y-2">
            <Label>Gemini API Key</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Enter your Gemini API key"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
              <Button onClick={handleGeminiSetup} disabled={isLoading}>
                Setup
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Get your API key from Google AI Studio
            </p>
          </div>
        )}

        {currentProvider && (
          <div className="text-sm text-muted-foreground">
            Current: {currentProvider.name} ({currentProvider.dimension} dimensions)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
