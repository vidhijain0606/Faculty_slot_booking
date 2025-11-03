import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  scholar_name: string;
  scholar_email: string;
  purpose: string;
  booked_at: string;
  start_time?: string;
  end_time?: string;
}

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [slotDuration, setSlotDuration] = useState("60");
  const { toast } = useToast();

  // ✅ Fetch Appointments
  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scholar_name, scholar_email, purpose, booked_at, start_time, end_time")
        .eq("faculty_id", user?.id)
        .order("booked_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchBookings();
  }, [user]);

  // ✅ Add Availability Slot
  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !startTime || !endTime) {
      toast({ variant: "destructive", title: "Error", description: "All fields are required." });
      return;
    }

    try {
      const { error } = await supabase.from("availability").insert({
        faculty_id: user?.id,
        date,
        start_time: startTime,
        end_time: endTime,
        slot_duration: Number(slotDuration),
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Availability added successfully.",
      });
      setOpen(false);
      setDate("");
      setStartTime("");
      setEndTime("");
      setSlotDuration("60");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding availability",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Faculty Dashboard</h1>
            <p className="text-muted-foreground">Manage your schedule and appointments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Availability
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Availability Slot</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddAvailability} className="space-y-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slot Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Save Availability
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ✅ Upcoming Appointments Section */}
        <section>
          <h2 className="text-2xl font-semibold flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5" /> Upcoming Appointments
          </h2>

          {loading ? (
            <p>Loading appointments...</p>
          ) : bookings.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No upcoming appointments</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookings.map((booking) => {
                const startLocal = booking.start_time
                  ? format(new Date(booking.start_time), "h:mm a")
                  : null;
                const endLocal = booking.end_time
                  ? format(new Date(booking.end_time), "h:mm a")
                  : null;

                return (
                  <Card key={booking.id}>
                    <CardHeader>
                      <CardTitle>{booking.scholar_name || "Unknown"}</CardTitle>
                      <p className="text-sm text-muted-foreground">{booking.scholar_email}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="h-4 w-4" />
                        {booking.start_time
                          ? format(new Date(booking.start_time), "MMMM d, yyyy")
                          : "No date"}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Clock className="h-4 w-4" />
                        {startLocal && endLocal
                          ? `${startLocal} - ${endLocal}`
                          : "Time not set"}
                      </div>
                      <p className="text-sm">{booking.purpose || "No details"}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
