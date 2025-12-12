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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  faculty_id?: string;
}

export default function BookingPage() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [slot, setSlot] = useState<Slot | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  
  // Scholar details form state
  const [scholarDetails, setScholarDetails] = useState({
    scholarName: '',
    scholarId: '',
    projectTitle: '',
    employeeId: '',
    employeeName: '',
  });

  useEffect(() => {
    if (slotId) fetchSlot();
  }, [slotId]);

  const fetchSlot = async () => {
    try {
      const { data, error } = await supabase
        .from('faculty_slots')
        .select('id, date, start_time, end_time, status, faculty_id')
        .eq('id', slotId)
        .eq('status', 'available')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Slot not found or already booked',
        });
        navigate('/');
        return;
      }
      setSlot(data);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load slot information',
      });
      navigate('/');
    }
  };

  const handleBooking = async () => {
    if (!slot || !user || !reason.trim()) {
      return toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please provide a reason for booking',
      });
    }

    // Validate scholar details
    if (!scholarDetails.scholarName || !scholarDetails.scholarId || !scholarDetails.projectTitle || 
        !scholarDetails.employeeId || !scholarDetails.employeeName) {
      return toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all scholar details',
      });
    }

    // Ensure we have a signed-in user before proceeding
    if (!user?.id) {
      return toast({
        variant: 'destructive',
        title: 'Not signed in',
        description: 'Please sign in again to book this slot.',
      });
    }

    setLoading(true);
    try {
      // Step 1: Double-check slot availability
      const { data: slotCheck } = await supabase
        .from('faculty_slots')
        .select('status')
        .eq('id', slot.id)
        .maybeSingle();

      if (slotCheck?.status !== 'available') {
        toast({
          variant: 'destructive',
          title: 'Slot Unavailable',
          description: 'This slot has already been booked. Please select another.',
        });
        setLoading(false);
        navigate('/');
        return;
      }

      // Step 2: Create appointment
      // Handle time format - ensure it's HH:mm:ss
      const startTimeFormatted = slot.start_time.includes(':') 
        ? (slot.start_time.split(':').length === 2 ? `${slot.start_time}:00` : slot.start_time)
        : `${slot.start_time}:00`;
      const endTimeFormatted = slot.end_time.includes(':')
        ? (slot.end_time.split(':').length === 2 ? `${slot.end_time}:00` : slot.end_time)
        : `${slot.end_time}:00`;
      
      const startTimestamp = new Date(`${slot.date}T${startTimeFormatted}`).toISOString();
      const endTimestamp = new Date(`${slot.date}T${endTimeFormatted}`).toISOString();
      
      // Validate timestamps
      if (isNaN(new Date(startTimestamp).getTime()) || isNaN(new Date(endTimestamp).getTime())) {
        throw new Error('Invalid time format. Please try again.');
      }

      // Save scholar details to slot_requests
      await supabase.from('slot_requests').insert({
        scholar_name: scholarDetails.scholarName,
        emp_id: scholarDetails.employeeId,
        registration: scholarDetails.scholarId,
        meeting_type: 'dc1',
        notes: `Project Title: ${scholarDetails.projectTitle}, Employee Name: ${scholarDetails.employeeName}`,
      });

      const { error: insertError } = await supabase.from('appointments').insert({
        faculty_id: slot.faculty_id || '00000000-0000-0000-0000-000000000000',
        scholar_id: user.id,
        scholar_name: scholarDetails.scholarName,
        scholar_email: user.email,
        purpose: reason.trim(),
        booked_at: new Date().toISOString(),
        start_time: startTimestamp,
        end_time: endTimestamp,
        slot_id: slot.id,
        status: 'confirmed',
      });

      if (insertError) {
        // If someone else booked the same slot first, surface a friendly message
        if ((insertError as any)?.code === '23505') {
          throw new Error('This slot was just booked by someone else. Please pick another slot.');
        }
        throw insertError;
      }

      // Step 3: Mark that slot as booked
      const { error: updateError } = await supabase
        .from('faculty_slots')
        .update({ status: 'booked' })
        .eq('id', slot.id);

      if (updateError) throw updateError;

      // Step 4: Fire reminder email (best-effort; errors are logged)
      try {
        await supabase.functions.invoke('send-slot-reminder', {
          body: {
            to: user.email,
            slotDate: slot.date,
            startTime: startTimestamp,
            endTime: endTimestamp,
            purpose: reason.trim(),
          },
        });
      } catch (emailErr) {
        console.warn('Reminder email failed', emailErr);
      }

      setShowBookingPopup(true);
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

  const formatTime = (time: string) => {
    if (!time) return "";
    if (time.includes("T")) {
      const d = new Date(time);
      if (isNaN(d.getTime())) return time;
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return time.split(":")[0] + ":" + time.split(":")[1];
  };

  if (!slot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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
            <CardTitle className="text-2xl">Book Appointment</CardTitle>
            <CardDescription>
              Book this time slot
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Slot Information */}
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">
                  {(() => {
                    const parsed = new Date(`${slot.date}T00:00:00`);
                    return !isNaN(parsed.getTime())
                      ? format(parsed, "PPP")
                      : slot.date;
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">
                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                </span>
              </div>
            </div>

            {/* Scholar Details Form */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-lg">Scholar Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scholarName">Scholar Name*</Label>
                  <Input
                    id="scholarName"
                    placeholder="Enter scholar name"
                    value={scholarDetails.scholarName}
                    onChange={(e) => setScholarDetails((s) => ({ ...s, scholarName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scholarId">Scholar ID*</Label>
                  <Input
                    id="scholarId"
                    placeholder="Scholar registration ID"
                    value={scholarDetails.scholarId}
                    onChange={(e) => setScholarDetails((s) => ({ ...s, scholarId: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="projectTitle">Project Title*</Label>
                  <Input
                    id="projectTitle"
                    placeholder="Title of research project"
                    value={scholarDetails.projectTitle}
                    onChange={(e) => setScholarDetails((s) => ({ ...s, projectTitle: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID*</Label>
                  <Input
                    id="employeeId"
                    placeholder="Employee ID"
                    value={scholarDetails.employeeId}
                    onChange={(e) => setScholarDetails((s) => ({ ...s, employeeId: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Employee Name*</Label>
                  <Input
                    id="employeeName"
                    placeholder="Employee name"
                    value={scholarDetails.employeeName}
                    onChange={(e) => setScholarDetails((s) => ({ ...s, employeeName: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Booking</Label>
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
              disabled={loading || !reason.trim() || !scholarDetails.scholarName || !scholarDetails.scholarId || 
                       !scholarDetails.projectTitle || !scholarDetails.employeeId || !scholarDetails.employeeName}
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
          </CardContent>
        </Card>

        {/* Booking Success Popup */}
        <Dialog open={showBookingPopup} onOpenChange={setShowBookingPopup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Slot Booked Successfully!</DialogTitle>
              <DialogDescription>
                Please book slot on VTOP rather than sending an email.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => {
                setShowBookingPopup(false);
                navigate('/');
              }}>
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
