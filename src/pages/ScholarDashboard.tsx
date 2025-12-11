import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Calendar, Clock, ClipboardList, FileText, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface Booking {
  id: string;
  purpose: string;
  booked_at: string;
  slot: Slot | null;
}

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  created_at: string;
}

export default function ScholarDashboard() {
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Redirect non-scholars away
    if (userRole && userRole !== 'scholar') {
      if (userRole === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }
    
    if (user && userRole === 'scholar') {
      setLoading(true);
      Promise.all([fetchAvailableSlots(), fetchBookings(), fetchDocuments()]).finally(() =>
        setLoading(false)
      );
    }
  }, [user, userRole, navigate]);

  // ✅ Fetch available slots (exclude booked ones)
  const fetchAvailableSlots = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
      // First get all available slots
      const { data: allSlots, error: slotsError } = await supabase
        .from("faculty_slots")
        .select("id, date, start_time, end_time, status")
        .eq("status", "available")
        .gte("date", today)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (slotsError) throw slotsError;

      // Get all booked slot IDs from appointments
      const { data: appointments, error: appError } = await supabase
        .from("appointments")
        .select("slot_id")
        .not("slot_id", "is", null);

      if (appError) throw appError;

      const bookedSlotIds = new Set(
        (appointments || []).map((a) => a.slot_id).filter(Boolean)
      );

      // Filter out booked slots
      const availableSlots = (allSlots || []).filter(
        (slot) => !bookedSlotIds.has(slot.id)
      );

      setAvailableSlots(availableSlots);
    } catch (err) {
      console.error("❌ Error fetching slots:", err);
    }
  };

  // ✅ Fetch scholar's booked appointments
  const fetchBookings = async () => {
    if (!user?.id) {
      console.warn("⏳ Waiting for user ID...");
      setLoading(false);
      return;
    }

    try {
      const { data: appointments, error: appError } = await supabase
        .from("appointments")
        .select("*")
        .eq("scholar_id", user.id)
        .order("booked_at", { ascending: false });

      if (appError) throw appError;

      if (!appointments?.length) {
        setBookings([]);
        return;
      }

      const slotIds = appointments.map((a) => a.slot_id).filter(Boolean);

      const { data: slots, error: slotError } = await supabase
        .from("faculty_slots")
        .select(`
          id,
          date,
          start_time,
          end_time,
          status
        `)
        .in(
          "id",
          slotIds.length
            ? slotIds
            : ["00000000-0000-0000-0000-000000000000"]
        );

      if (slotError) throw slotError;

      const mergedBookings: Booking[] = appointments.map((a) => {
        const slot = slots?.find((s) => s.id === a.slot_id);

        const safeDate = slot?.date 
          ? slot.date
          : (slot?.start_time && !isNaN(new Date(slot.start_time).getTime())
            ? format(new Date(slot.start_time), "yyyy-MM-dd")
            : null);

        return {
          id: a.id,
          purpose: a.purpose ?? "No purpose provided",
          booked_at: a.booked_at,
          slot: slot
            ? {
                id: slot.id,
                date: safeDate || "",
                start_time: slot.start_time || "",
                end_time: slot.end_time || "",
                status: slot.status || "",
              }
            : null,
        };
      });

      setBookings(mergedBookings);
    } catch (err) {
      console.error("❌ Error fetching bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Helper: format time safely
  const formatTime = (time: string | null) => {
    if (!time) return "";
    // Handle both TIME format (HH:mm:ss) and full timestamp
    if (time.includes("T")) {
      const d = new Date(time);
      if (isNaN(d.getTime())) return time;
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    // For TIME format, just return the time part
    return time.split(":")[0] + ":" + time.split(":")[1];
  };

  const handleBookSlot = (slotId: string) => {
    navigate(`/book/${slotId}`);
  };

  // ✅ Fetch Documents
  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, description, file_url, file_name, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  // ✅ Upload Document
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!docTitle || !docFile) {
      toast({ variant: "destructive", title: "Error", description: "Title and file are required." });
      return;
    }

    if (!user?.id) {
      toast({ variant: "destructive", title: "Error", description: "You must be signed in to upload." });
      return;
    }

    setUploading(true);
    try {
      const fileExt = docFile.name.split('.').pop();
      const fileName = `scholar/${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, docFile);

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('does not exist')) {
          throw new Error('Storage bucket "documents" not found. Please contact admin.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Use the scholar's own user ID for their uploads
      // The faculty_id field is used to track who uploaded it
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { error: insertError } = await supabase.from("documents").insert({
        faculty_id: user.id, // Use scholar's own ID
        title: docTitle,
        description: docDescription || null,
        file_url: publicUrl,
        file_name: docFile.name,
        file_size: docFile.size,
        file_type: docFile.type,
      });

      if (insertError) throw insertError;

      toast({
        title: "Success!",
        description: "Document uploaded successfully.",
      });
      setDocDialogOpen(false);
      setDocTitle("");
      setDocDescription("");
      setDocFile(null);
      fetchDocuments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error uploading document",
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Scholar Dashboard
          </h1>
          <p className="text-muted-foreground">
            Browse available slots and manage your appointments
          </p>
        </div>

        {/* ✅ Upcoming Appointments */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-6 w-6" />
            My Appointments
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <Card className="col-span-full">
                <CardContent className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </CardContent>
              </Card>
            ) : bookings.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No appointments booked yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              bookings.map((booking) => (
                <Card
                  key={booking.id}
                  className="hover:shadow-medium transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="text-lg">Appointment</CardTitle>
                    <CardDescription>
                      {booking.purpose}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {(() => {
                          const rawDate = booking.slot?.date;
                          if (!rawDate) return "No date available";
                          const parsed = new Date(
                            rawDate.includes("T")
                              ? rawDate
                              : `${rawDate}T00:00:00`
                          );
                          return !isNaN(parsed.getTime())
                            ? format(parsed, "PPP")
                            : "Invalid date";
                        })()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {booking.slot?.start_time && booking.slot?.end_time
                          ? `${formatTime(booking.slot.start_time)} - ${formatTime(
                              booking.slot.end_time
                            )}`
                          : "Time not set"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* ✅ Appointment Summary */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Appointment Summary
          </h2>
          <p className="text-muted-foreground mb-4">
            Total Appointments Booked: {bookings.length}
          </p>
        </section>

        {/* ✅ Documents Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Documents
            </h2>
            <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload New Document</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUploadDocument} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Document Title</Label>
                    <Input
                      type="text"
                      placeholder="Enter document title"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Enter document description"
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>File</Label>
                    <Input
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
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No documents available
                  </p>
                </CardContent>
              </Card>
            ) : (
              documents.map((doc) => (
                <Card key={doc.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{doc.title}</CardTitle>
                    {doc.description && (
                      <CardDescription>{doc.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{doc.file_name}</span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(doc.file_url, '_blank')}
                    >
                      View Document
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* ✅ Available Slots */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Available Slots
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableSlots.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No available slots at the moment
                  </p>
                </CardContent>
              </Card>
            ) : (
              availableSlots.map((slot) => (
                <Card
                  key={slot.id}
                  className="hover:shadow-medium transition-shadow"
                >
                  <CardHeader>
                    <CardTitle>
                      {(() => {
                        const parsed = new Date(`${slot.date}T00:00:00`);
                        return !isNaN(parsed.getTime())
                          ? format(parsed, "PPP")
                          : slot.date;
                      })()}
                    </CardTitle>
                    <CardDescription>
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() => handleBookSlot(slot.id)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Book This Slot
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
