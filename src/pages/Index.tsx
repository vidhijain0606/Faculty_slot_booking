import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface BookedAppointment {
  id: string;
  scholar_name: string;
  scholar_email: string;
  purpose: string;
  start_time: string;
  end_time: string;
  booked_at: string;
  slot_id?: string;
  slot?: {
    date: string;
  };
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<BookedAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data once user is available
  useEffect(() => {
    if (!user) return;

    fetchAvailableSlots();
    fetchBookedAppointments();
  }, [user]);

  const fetchAvailableSlots = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: allSlots, error } = await supabase
        .from('faculty_slots')
        .select('id, date, start_time, end_time, status')
        .eq('status', 'available')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      setAvailableSlots(allSlots || []);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load available slots.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBookedAppointments = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, scholar_name, scholar_email, purpose, start_time, end_time, booked_at, slot_id')
        .eq('scholar_id', user.id)
        .order('start_time', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setBookedAppointments([]);
        return;
      }

      const slotIds = data.map(a => a.slot_id).filter(Boolean);

      const { data: slots } = await supabase
        .from('faculty_slots')
        .select('id, date')
        .in('id', slotIds);

      const merged = data.map(app => ({
        ...app,
        slot: slots?.find(s => s.id === app.slot_id),
      }));

      setBookedAppointments(merged as BookedAppointment[]);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load booked appointments.',
      });
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    if (time.includes('T')) {
      return format(new Date(time), 'hh:mm a');
    }
    return time.slice(0, 5);
  };

  const handleBookSlot = (slotId: string) => {
    navigate(`/book/${slotId}`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-3">
            Faculty Research Portal
          </h2>
          <p className="text-muted-foreground text-lg">
            Manage your research activities and book appointment slots
          </p>
        </div>

        <div className="max-w-5xl mx-auto space-y-8">
          {/* Available Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Available Slots
              </CardTitle>
              <CardDescription>Book available time slots</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No available slots
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {availableSlots.map(slot => (
                    <Card key={slot.id}>
                      <CardHeader>
                        <CardTitle>
                          {format(new Date(`${slot.date}T00:00:00`), 'PPP')}
                        </CardTitle>
                        <CardDescription>
                          <Clock className="inline h-4 w-4 mr-1" />
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full" onClick={() => handleBookSlot(slot.id)}>
                          Book Slot
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booked Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Your Booked Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookedAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center">
                  No appointments booked yet
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {bookedAppointments.map(app => (
                    <Card key={app.id}>
                      <CardHeader>
                        <CardTitle>{app.scholar_name}</CardTitle>
                        <CardDescription>{app.scholar_email}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <Calendar className="inline h-4 w-4 mr-1" />
                          {app.slot?.date
                            ? format(new Date(`${app.slot.date}T00:00:00`), 'PPP')
                            : 'No date'}
                        </div>
                        <div>
                          <Clock className="inline h-4 w-4 mr-1" />
                          {formatTime(app.start_time)} - {formatTime(app.end_time)}
                        </div>
                        <p className="text-sm text-muted-foreground">{app.purpose}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
