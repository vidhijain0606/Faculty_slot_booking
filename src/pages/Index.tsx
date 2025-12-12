import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { Link as LinkIcon } from 'lucide-react';
import { Header } from '@/components/Header';

const Index = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  if (!user) {
    navigate('/auth');
    return null;
  }

  // Redirect non-faculty users to their respective dashboards
  if (userRole === 'scholar') {
    navigate('/scholar');
    return null;
  }
  if (userRole === 'admin') {
    navigate('/admin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold">Faculty Research Portal</h2>
          <p className="text-muted-foreground mt-2">Manage your scholars and research activities</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 md:grid-cols-2">
          {/* Column 1: Link Document 1 */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Link Document
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

          {/* Column 2: Link Document 2 */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Link Another Document
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
      </main>
    </div>
  );
};

export default Index;
