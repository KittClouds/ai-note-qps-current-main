
import React, { useState, useEffect } from 'react';
import { Key, Check, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export function APISettingsModal() {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showGeminiClearConfirm, setShowGeminiClearConfirm] = useState(false);
  const [showOpenrouterClearConfirm, setShowOpenrouterClearConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load existing API keys
    const storedGeminiKey = localStorage.getItem('gemini_api_key');
    const storedOpenrouterKey = localStorage.getItem('openrouter_api_key');
    
    if (storedGeminiKey) {
      setGeminiApiKey('••••••••••••••••');
    }
    if (storedOpenrouterKey) {
      setOpenrouterApiKey('••••••••••••••••');
    }
  }, []);

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
      localStorage.setItem('gemini_api_key', geminiApiKey);
      toast({
        title: 'Gemini API key saved',
        description: 'Your Gemini API key has been configured',
      });
      setGeminiApiKey('••••••••••••••••');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save Gemini API key',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenrouterSetup = async () => {
    if (!openrouterApiKey || openrouterApiKey === '••••••••••••••••') {
      toast({
        title: 'Error',
        description: 'Please enter a valid OpenRouter API key',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      localStorage.setItem('openrouter_api_key', openrouterApiKey);
      toast({
        title: 'OpenRouter API key saved',
        description: 'Your OpenRouter API key has been configured',
      });
      setOpenrouterApiKey('••••••••••••••••');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save OpenRouter API key',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearGeminiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setGeminiApiKey('');
    setShowGeminiClearConfirm(false);
    toast({
      title: 'Gemini API key cleared',
      description: 'Your Gemini API key has been removed',
    });
  };

  const handleClearOpenrouterKey = () => {
    localStorage.removeItem('openrouter_api_key');
    setOpenrouterApiKey('');
    setShowOpenrouterClearConfirm(false);
    toast({
      title: 'OpenRouter API key cleared',
      description: 'Your OpenRouter API key has been removed',
    });
  };

  const hasGeminiKey = localStorage.getItem('gemini_api_key');
  const hasOpenrouterKey = localStorage.getItem('openrouter_api_key');

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Key className="h-3 w-3" />
          API Settings
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Gemini API Key Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
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
                <AlertDialog open={showGeminiClearConfirm} onOpenChange={setShowGeminiClearConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <X className="h-3 w-3 mr-1" />
                      Clear Gemini Key
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Gemini API Key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove your Gemini API key and disable Gemini services.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearGeminiKey}>
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

          <Separator />

          {/* OpenRouter API Key Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <Label>OpenRouter API Key</Label>
            </div>
            
            {hasOpenrouterKey ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">API key configured</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Update API key..."
                    value={openrouterApiKey}
                    onChange={(e) => setOpenrouterApiKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleOpenrouterSetup} disabled={isLoading} size="sm">
                    Update
                  </Button>
                </div>
                <AlertDialog open={showOpenrouterClearConfirm} onOpenChange={setShowOpenrouterClearConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <X className="h-3 w-3 mr-1" />
                      Clear OpenRouter Key
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear OpenRouter API Key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove your OpenRouter API key and disable OpenRouter services.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearOpenrouterKey}>
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
                    placeholder="Enter your OpenRouter API key"
                    value={openrouterApiKey}
                    onChange={(e) => setOpenrouterApiKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleOpenrouterSetup} disabled={isLoading} size="sm">
                    Setup
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a 
                    href="https://openrouter.ai/keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    OpenRouter
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
