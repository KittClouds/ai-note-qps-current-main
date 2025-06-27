
import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, Key, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { providerRegistry } from '@/lib/embeddings/providers/ProviderRegistry';
import { embeddingsService } from '@/lib/embeddings/embeddingsService';
import { useToast } from '@/hooks/use-toast';

export function EmbeddingProviderButton() {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
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
      // Don't switch yet, let user add API key first
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
      toast({
        title: 'Gemini configured',
        description: 'Successfully switched to Gemini embeddings',
      });
      setIsDialogOpen(false);
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

  const handleClearApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setGeminiApiKey('');
    setShowClearConfirm(false);
    
    // If currently using Gemini, switch back to HuggingFace
    if (selectedProvider === 'gemini') {
      handleProviderChange('huggingface');
    }
    
    toast({
      title: 'API key cleared',
      description: 'Gemini API key has been removed',
    });
  };

  const providers = providerRegistry.getAvailableProviders();
  const currentProvider = embeddingsService.getCurrentProvider();
  const hasGeminiKey = localStorage.getItem('gemini_api_key');

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

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <Label>Gemini API Key</Label>
            </div>
            
            {hasGeminiKey ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">API key configured</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Update API key..."
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleGeminiSetup} disabled={isLoading} size="sm">
                    Update
                  </Button>
                </div>
                <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <X className="h-3 w-3 mr-1" />
                      Clear API Key
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear API Key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove your Gemini API key and switch back to HuggingFace if currently using Gemini.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearApiKey}>
                        Clear Key
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter your Gemini API key"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleGeminiSetup} disabled={isLoading} size="sm">
                    Setup
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>
            )}
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
