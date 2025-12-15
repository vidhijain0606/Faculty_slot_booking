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
  const [userProfile, setUserProfile] = useState<{ name: string; email: string } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    employeeEmail: '',
    scholarName: '',
    scholarId: '',
    projectTitle: '',
    meetingType: 'dc1',
    finalReview: '',
  });

  useEffect(() => {
    if (slotId) fetchSlot();
    if (user?.id) fetchUserProfile();
  }, [slotId, user]);

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setUserProfile(data);
        // Auto-fill employee details
        setFormData(prev => ({
          ...prev,
          employeeName: data.name || user.email?.split('@')[0] || '',
          employeeEmail: data.email || user.email || '',
        }));
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      // Fallback to user email
      if (user.email) {
        setFormData(prev => ({
          ...prev,
          employeeEmail: user.email || '',
          employeeName: user.email?.split('@')[0] || '',
        }));
      }
    }
  };

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
        navigate('/dashboard');
        return;
      }
      setSlot(data);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load slot information',
      });
      navigate('/dashboard');
    }
  };

  const handleBooking = async () => {
    if (!slot || !user) {
      return toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please sign in to book this slot.',
      });
    }

    // Validate all required fields
    if (!formData.employeeId || !formData.employeeName || !formData.employeeEmail ||
        !formData.scholarName || !formData.scholarId || !formData.projectTitle ||
        !formData.meetingType || !formData.finalReview) {
      return toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all required fields',
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
        navigate('/dashboard');
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

      // Save booking details to slot_requests
      await supabase.from('slot_requests').insert({
        scholar_name: formData.scholarName,
        emp_id: formData.employeeId,
        registration: formData.scholarId,
        meeting_type: formData.meetingType,
        notes: `Project Title: ${formData.projectTitle}, Employee Name: ${formData.employeeName}, Employee Email: ${formData.employeeEmail}, Final Review: ${formData.finalReview}`,
      });

      const { error: insertError } = await supabase.from('appointments').insert({
        faculty_id: slot.faculty_id || '00000000-0000-0000-0000-000000000000',
        scholar_id: user.id,
        scholar_name: formData.scholarName,
        scholar_email: formData.employeeEmail,
        purpose: `Meeting Type: ${formData.meetingType}, Final Review: ${formData.finalReview}`,
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6 hover:bg-primary/10 transition-colors" 
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="max-w-3xl mx-auto shadow-2xl border-2 border-primary/20 bg-card/95 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/20">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Book Appointment
            </CardTitle>
            <CardDescription className="text-base font-medium">
              Complete the form below to book this time slot
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Slot Information */}
            <div className="space-y-4 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl border-2 border-primary/20 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <span className="font-bold text-lg">
                  {(() => {
                    const parsed = new Date(`${slot.date}T00:00:00`);
                    return !isNaN(parsed.getTime())
                      ? format(parsed, "PPP")
                      : slot.date;
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <Clock className="h-5 w-5 text-secondary" />
                </div>
                <span className="font-bold text-lg">
                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                </span>
              </div>
            </div>

            {/* Employee Details (Auto-filled) */}
            <div className="space-y-4 p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border-2 border-primary/10 shadow-md">
              <h3 className="font-bold text-xl text-primary mb-4">Employee Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID*</Label>
                  <Input
                    id="employeeId"
                    placeholder="Employee ID"
                    value={formData.employeeId}
                    onChange={(e) => setFormData((s) => ({ ...s, employeeId: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Employee Name*</Label>
                  <Input
                    id="employeeName"
                    placeholder="Employee name"
                    value={formData.employeeName}
                    onChange={(e) => setFormData((s) => ({ ...s, employeeName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="employeeEmail">Employee Email*</Label>
                  <Input
                    id="employeeEmail"
                    type="email"
                    placeholder="Employee email"
                    value={formData.employeeEmail}
                    onChange={(e) => setFormData((s) => ({ ...s, employeeEmail: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Research Scholar Details */}
            <div className="space-y-4 p-6 bg-gradient-to-br from-accent/5 to-primary/5 rounded-xl border-2 border-accent/10 shadow-md">
              <h3 className="font-bold text-xl text-accent-foreground mb-4">Research Scholar Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scholarName">Research Scholar Name*</Label>
                  <Input
                    id="scholarName"
                    placeholder="Enter research scholar name"
                    value={formData.scholarName}
                    onChange={(e) => setFormData((s) => ({ ...s, scholarName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scholarId">Scholar ID*</Label>
                  <Input
                    id="scholarId"
                    placeholder="Scholar registration ID"
                    value={formData.scholarId}
                    onChange={(e) => setFormData((s) => ({ ...s, scholarId: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="projectTitle">Project Title*</Label>
                  <Input
                    id="projectTitle"
                    placeholder="Title of research project"
                    value={formData.projectTitle}
                    onChange={(e) => setFormData((s) => ({ ...s, projectTitle: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingType">Type of Meeting*</Label>
                  <select
                    id="meetingType"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.meetingType}
                    onChange={(e) => setFormData((s) => ({ ...s, meetingType: e.target.value }))}
                    required
                  >
                    <option value="">Select meeting type</option>
                    <option value="dc1">DC1</option>
                    <option value="dc2">DC2</option>
                    <option value="dc3">DC3</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finalReview">Final Review*</Label>
                  <select
                    id="finalReview"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.finalReview}
                    onChange={(e) => setFormData((s) => ({ ...s, finalReview: e.target.value }))}
                    required
                  >
                    <option value="">Select review option</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </div>

            <Button
              onClick={handleBooking}
              disabled={loading || !formData.employeeId || !formData.employeeName || !formData.employeeEmail ||
                       !formData.scholarName || !formData.scholarId || !formData.projectTitle ||
                       !formData.meetingType || !formData.finalReview}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all text-lg py-6 font-bold"
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
                Please book the slot on VTOP.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => {
                setShowBookingPopup(false);
                navigate('/dashboard');
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
