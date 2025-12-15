// src/pages/Index.tsx
import { useState, useEffect } from 'react';
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
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<BookedAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect logic
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    if (userRole === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    if (userRole !== 'faculty') {
      navigate('/auth', { replace: true });
      return;
    }
  }, [user, userRole, authLoading, navigate]);

  // Fetch data when user is ready
  useEffect(() => {
    if (user && userRole === 'faculty') {
      fetchAvailableSlots();
      fetchBookedAppointments();
    }
  }, [user, userRole]);

  const fetchAvailableSlots = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data: allSlots, error: slotsError } = await supabase
        .from("faculty_slots")
        .select("id, date, start_time, end_time, status")
        .eq("status", "available")
        .gte("date", today)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (slotsError) throw slotsError;

      const { data: appointments, error: appError } = await supabase
        .from("appointments")
        .select("slot_id")
        .not("slot_id", "is", null);

      if (appError) {
        console.error("Appointments error:", appError);
        setAvailableSlots(allSlots || []);
        setLoading(false);
        return;
      }

      const bookedSlotIds = new Set(
        (appointments || []).map((a) => a.slot_id).filter(Boolean)
      );

      const availableSlots = (allSlots || []).filter(
        (slot) => !bookedSlotIds.has(slot.id)
      );

      setAvailableSlots(availableSlots);
    } catch (err: any) {
      console.error("Error fetching slots:", err);
      setAvailableSlots([]);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Failed to load available slots.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBookedAppointments = async () => {
    try {
      if (!user?.id) return;

      const { data: appointments, error } = await supabase
        .from("appointments")
        .select("id, scholar_name, scholar_email, purpose, start_time, end_time, booked_at, slot_id")
        .eq("scholar_id", user.id)
        .order("start_time", { ascending: true });

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        setBookedAppointments([]);
        return;
      }

      // Fetch slot details
      const slotIds = appointments.map(a => a.slot_id).filter(Boolean);
      
      if (slotIds.length === 0) {
        setBookedAppointments(appointments as BookedAppointment[]);
        return;
      }

      const { data: slots, error: slotsError } = await supabase
        .from("faculty_slots")
        .select("id, date")
        .in("id", slotIds);

      if (slotsError) throw slotsError;

      // Merge data and filter by email for safety
      const mergedAppointments = appointments
        .filter(appointment => appointment.scholar_email === user.email)
        .map(appointment => {
          const slot = slots?.find(s => s.id === appointment.slot_id);
          return {
            ...appointment,
            slot: slot ? { date: slot.date } : undefined,
          };
        });

      setBookedAppointments(mergedAppointments as BookedAppointment[]);
    } catch (err: any) {
      console.error("Error fetching booked appointments:", err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load booked appointments.',
      });
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

  const handleBookSlot = (slotId: string) => {
    navigate(`/book/${slotId}`);
  };

  // Show loading state
  if (authLoading || !user || !userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-3">
            Faculty Research Portal
          </h2>
          <p className="text-muted-foreground text-lg">Manage your research activities and book appointment slots</p>
        </div>

        <div className="max-w-5xl mx-auto space-y-8">
          {/* Available Slots for Booking */}
          <Card className="shadow-lg border-2 border-primary/10 bg-card/95 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/20">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                Available Slots
              </CardTitle>
              <CardDescription className="text-base font-medium">Book available time slots for your research meetings</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No available slots at the moment</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 p-4">
                  {availableSlots.map((slot) => (
                    <Card key={slot.id} className="hover:shadow-xl transition-all duration-300 border-2 border-primary/10 hover:border-primary/30 bg-gradient-to-br from-card to-primary/5">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold">
                          {(() => {
                            const parsed = new Date(`${slot.date}T00:00:00`);
                            return !isNaN(parsed.getTime())
                              ? format(parsed, "PPP")
                              : slot.date;
                          })()}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 font-medium">
                          <Clock className="h-4 w-4 text-primary" />
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-md hover:shadow-lg transition-all font-semibold"
                          onClick={() => handleBookSlot(slot.id)}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Book This Slot
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booked Slot Details Section */}
          <Card className="shadow-lg border-2 border-accent/10 bg-card/95 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10 border-b border-accent/20">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-accent-foreground" />
                </div>
                Booked Slot Details
              </CardTitle>
              <CardDescription className="text-base font-medium">Your confirmed appointment bookings</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : bookedAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No booked appointments yet</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 p-4">
                  {bookedAppointments
                    .filter(appointment => appointment.scholar_email === user?.email)
                    .map((appointment) => (
                      <Card key={appointment.id} className="hover:shadow-xl transition-all duration-300 border-2 border-accent/10 hover:border-accent/30 bg-gradient-to-br from-card to-accent/5">
                        <CardHeader>
                          <CardTitle className="text-lg font-bold">
                            {appointment.scholar_name || "Unknown Scholar"}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {appointment.scholar_email}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-accent-foreground" />
                            <span className="font-medium">
                              {appointment.slot?.date
                                ? format(new Date(`${appointment.slot.date}T00:00:00`), "PPP")
                                : appointment.start_time
                                ? format(new Date(appointment.start_time), "PPP")
                                : "No date"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-accent-foreground" />
                            <span className="font-medium">
                              {appointment.start_time && appointment.end_time
                                ? `${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}`
                                : "Time not set"}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-accent/10">
                            <p className="text-sm text-muted-foreground font-medium">Purpose:</p>
                            <p className="text-sm mt-1">{appointment.purpose || "No purpose specified"}</p>
                          </div>
                          <div className="pt-2">
                            <p className="text-xs text-muted-foreground">
                              Booked: {format(new Date(appointment.booked_at), "PPP 'at' p")}
                            </p>
                          </div>
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