import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Link as LinkIcon } from 'lucide-react';

export default function LinkDocument1() {
  const navigate = useNavigate();

  const handleRedirect = () => {
    window.open('https://docs.google.com/document/d/1MR8BtNzj3fVfgQSMJOMPQjLHSJ_P-5otiD7lM52qbzk/edit?tab=t.0', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/upload-document')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-2 border-primary/10">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/20">
              <CardTitle className="text-2xl flex items-center gap-2">
                <LinkIcon className="h-6 w-6" />
            Rules and Regulations! 
              </CardTitle>
              <CardDescription>
                Access the document!
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <ExternalLink className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                  
                    <p className="text-muted-foreground">
                      Click the button below to open the document !
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleRedirect}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-md hover:shadow-lg transition-all text-lg py-6 font-semibold"
                  size="lg"
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Open Document 1
                </Button>

                <div className="text-center">
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/upload-document')}
                    className="text-muted-foreground"
                  >
                    Go Back
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
 
);
}