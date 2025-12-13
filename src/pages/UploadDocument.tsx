import { useState, useEffect } from 'react';
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
import { ArrowLeft, Upload, FileText, Link as LinkIcon } from 'lucide-react';

export default function UploadDocument() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!docTitle || !docFile) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Title and file are required.',
      });
      return;
    }

    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be signed in to upload documents.',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = docFile.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, docFile);

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('does not exist')) {
          throw new Error('Storage bucket "documents" not found. Please create it in Supabase Storage settings.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('documents').insert({
        faculty_id: user.id,
        title: docTitle,
        description: docDescription || null,
        file_url: publicUrl,
        file_name: docFile.name,
        file_size: docFile.size,
        file_type: docFile.type,
      });

      if (insertError) throw insertError;

      toast({
        title: 'Success!',
        description: 'Document uploaded successfully.',
      });

      setDocTitle('');
      setDocDescription('');
      setDocFile(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error uploading document',
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Upload Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Upload className="h-6 w-6" />
                  Upload Document
                </CardTitle>
                <CardDescription>
                  Upload a document to the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Document Title*</Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="Enter document title"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter document description"
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file">File*</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={uploading}>
                    {uploading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Document
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Link Documents */}
          <div className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Link Document 1
                </CardTitle>
                <CardDescription>Link your first document</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => navigate('/link-document-1')}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Go to Document Link Page 1
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Link Document 2
                </CardTitle>
                <CardDescription>Link your second document</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => navigate('/link-document-2')}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Go to Document Link Page 2
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

