import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Calendar, ArrowLeft, Clock } from 'lucide-react';
import { format, addMinutes } from 'date-fns';

interface Faculty {
  name: string;
  email: string;
}

interface TimeSlot {
  start: Date;
  end: Date;
}

export default function BookingPage() {
  const { facultyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (facultyId) fetchFaculty();
  }, [facultyId]);

  useEffect(() => {
    if (selectedDate) fetchAvailableSlots();
  }, [selectedDate]);

  const fetchFaculty = async () => {
    try {
      const { data, error } = await supabase
        .from('faculty')
        .select('name, email')
        .eq('id', facultyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Faculty not found');
      setFaculty(data);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load faculty information',
      });
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      if (!facultyId || !selectedDate) return setAvailableSlots([]);

      const normalizedDate = format(new Date(selectedDate), 'yyyy-MM-dd');
      const { data: availability, error } = await supabase
        .from('availability')
        .select('*')
        .eq('faculty_id', facultyId)
        .eq('date', normalizedDate);

      if (error) throw error;
      if (!availability?.length) return setAvailableSlots([]);

      const DEFAULT_SLOT_MINUTES = 60;
      const slots: TimeSlot[] = [];

      availability.forEach((avail: any) => {
        const [sh, sm] = String(avail.start_time).split(':').map(Number);
        const [eh, em] = String(avail.end_time).split(':').map(Number);

        let current = new Date(normalizedDate);
        current.setHours(sh, sm, 0, 0);
        const end = new Date(normalizedDate);
        end.setHours(eh, em, 0, 0);

        const slotDuration = Number(avail.slot_duration) || DEFAULT_SLOT_MINUTES;
        while (current < end) {
          const slotEnd = addMinutes(current, slotDuration);
          if (slotEnd <= end) slots.push({ start: new Date(current), end: slotEnd });
          current = slotEnd;
        }
      });

      setAvailableSlots(slots);
    } catch (err) {
      console.error('Slot fetch failed:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load available time slots',
      });
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot || !user || !reason.trim()) {
      return toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a time slot and provide a reason',
      });
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('appointments').insert({
        faculty_id: facultyId,
        scholar_name: user.email?.split('@')[0] || 'Scholar',
        scholar_email: user.email,
        purpose: reason.trim(),
        booked_at: new Date().toISOString(),
        start_time: selectedSlot.start.toISOString(),
        end_time: selectedSlot.end.toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Appointment booked successfully!',
      });
      navigate('/scholar');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Booking failed. Try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/scholar')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="max-w-2xl mx-auto shadow-medium">
          <CardHeader>
            <CardTitle className="text-2xl">Book Appointment</CardTitle>
            {faculty && (
              <CardDescription>
                Schedule a meeting with {faculty.name} ({faculty.email})
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="date">Select Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            {selectedDate && (
              <div className="space-y-2">
                <Label>Available Time Slots</Label>
                {availableSlots.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No available slots for this date</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableSlots.map((slot, index) => (
                      <Button
                        key={index}
                        variant={selectedSlot === slot ? 'default' : 'outline'}
                        onClick={() => setSelectedSlot(slot)}
                        className="text-sm"
                      >
                        {format(slot.start, 'p')} - {format(slot.end, 'p')}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Meeting</Label>
                  <Textarea
                    id="reason"
                    placeholder="Brief description of what you'd like to discuss..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleBooking}
                  disabled={loading || !reason.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      Confirm Booking
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
