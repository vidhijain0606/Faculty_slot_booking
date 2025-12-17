import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [loading, setLoading] = useState(false);
  const [showBookingPopup, setShowBookingPopup] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    employeeEmail: '',
    scholarName: '',
    scholarId: '',
    projectTitle: '',
    meetingType: '',
    finalReview: '',
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

      if (error || !data) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Slot not found or already booked',
        });
        navigate('/dashboard');
        return;
      }

      setSlot(data);
    } catch {
      navigate('/dashboard');
    }
  };

  const handleBooking = async () => {
    if (!slot || !user) return;

    const {
      employeeId,
      employeeName,
      employeeEmail,
      scholarName,
      scholarId,
      projectTitle,
      meetingType,
      finalReview,
    } = formData;

    if (
      !employeeId ||
      !employeeName ||
      !employeeEmail ||
      !scholarName ||
      !scholarId ||
      !projectTitle ||
      !meetingType ||
      !finalReview
    ) {
      return toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill all required fields',
      });
    }

    // 🔒 Slot restriction rule
    const restrictedMeetings = ['synopsis_meeting', 'oral_exam'];
    const allowedTimes = ['10:00', '11:30', '14:30', '16:00'];
    const slotStart = slot.start_time.slice(0, 5);

    if (
      restrictedMeetings.includes(meetingType) &&
      !allowedTimes.includes(slotStart)
    ) {
      return toast({
        variant: 'destructive',
        title: 'Invalid Slot',
        description:
          'Synopsis Meeting and Oral Exam can only be booked at 10:00 AM, 11:30 AM, 2:30 PM, or 4:00 PM.',
      });
    }

    setLoading(true);

    try {
      const startTimestamp = new Date(`${slot.date}T${slot.start_time}`).toISOString();
      const endTimestamp = new Date(`${slot.date}T${slot.end_time}`).toISOString();

      await supabase.from('appointments').insert({
        faculty_id: slot.faculty_id,
        scholar_id: user.id,
        scholar_name: scholarName,
        scholar_email: employeeEmail,
        purpose: `Meeting Type: ${meetingType}, Final Review: ${finalReview}`,
        booked_at: new Date().toISOString(),
        start_time: startTimestamp,
        end_time: endTimestamp,
        slot_id: slot.id,
        status: 'confirmed',
      });

      await supabase
        .from('faculty_slots')
        .update({ status: 'booked' })
        .eq('id', slot.id);

      setShowBookingPopup(true);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Booking failed',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!slot) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/10">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card className="max-w-3xl mx-auto mt-6">
          <CardHeader>
            <CardTitle>Book Appointment</CardTitle>
            <CardDescription>Fill the details to confirm your slot</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Slot Info */}
            <div className="flex items-center gap-4">
              <Calendar /> {format(new Date(slot.date), 'PPP')}
              <Clock /> {slot.start_time} - {slot.end_time}
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Employee ID" onChange={(e) => setFormData(s => ({ ...s, employeeId: e.target.value }))} />
              <Input placeholder="Employee Name" onChange={(e) => setFormData(s => ({ ...s, employeeName: e.target.value }))} />
              <Input placeholder="Employee Email" onChange={(e) => setFormData(s => ({ ...s, employeeEmail: e.target.value }))} />
              <Input placeholder="Scholar Name" onChange={(e) => setFormData(s => ({ ...s, scholarName: e.target.value }))} />
              <Input placeholder="Scholar ID" onChange={(e) => setFormData(s => ({ ...s, scholarId: e.target.value }))} />
              <Input placeholder="Project Title" onChange={(e) => setFormData(s => ({ ...s, projectTitle: e.target.value }))} />

              <div>
                <Label>Type of Meeting</Label>
                <select
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) => setFormData(s => ({ ...s, meetingType: e.target.value }))}
                >
                  <option value="">Select</option>
                  <option value="dc_meeting">DC Meeting</option>
                  <option value="comprehensive_viva">Comprehensive Viva</option>
                  <option value="colloquium">Colloquium</option>
                  <option value="synopsis_meeting">Synopsis Meeting</option>
                  <option value="oral_exam">Oral Exam</option>
                </select>
                <p className="text-xs mt-1 text-muted-foreground">
                  <strong>Note:</strong> Synopsis Meeting and Oral Exam are allowed
                  only at <strong>10:00 AM, 11:30 AM, 2:30 PM, and 4:00 PM</strong>.
                  Other meeting types are available for all slots.
                </p>
              </div>

              <div>
                <Label>Final Review</Label>
                <select
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) => setFormData(s => ({ ...s, finalReview: e.target.value }))}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            <Button className="w-full" onClick={handleBooking} disabled={loading}>
              Confirm Booking
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showBookingPopup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Slot Booked Successfully</DialogTitle>
              <DialogDescription>Please book the slot on VTOP.</DialogDescription>
            </DialogHeader>
            <Button onClick={() => navigate('/dashboard')}>OK</Button>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
