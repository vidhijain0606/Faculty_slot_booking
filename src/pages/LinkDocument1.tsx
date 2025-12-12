import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Link as LinkIcon, ArrowLeft } from 'lucide-react';

export default function LinkDocument1() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [documentTitle, setDocumentTitle] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!documentTitle || !documentUrl) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Document title and URL are required.',
      });
      return;
    }

    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to link documents.',
      });
      return;
    }

    setUploading(true);
    try {
      const { error } = await supabase.from('documents').insert({
        faculty_id: user.id,
        title: documentTitle,
        description: description || null,
        file_url: documentUrl,
        file_name: documentUrl.split('/').pop() || 'Linked Document',
        file_size: null,
        file_type: 'link',
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Document linked successfully.',
      });

      // Reset form
      setDocumentTitle('');
      setDocumentUrl('');
      setDescription('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to link document.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="max-w-2xl mx-auto shadow-medium">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <LinkIcon className="h-6 w-6" />
              Link Document 1
            </CardTitle>
            <CardDescription>
              Link an external document or resource
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Document Title*</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Enter document title"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Document URL*</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/document.pdf"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter document description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Linking...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Link Document
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

