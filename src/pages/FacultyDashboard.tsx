import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, PlusCircle, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  created_at: string;
}

export default function FacultyDashboard() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  
  // Slot form state
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [slotDuration, setSlotDuration] = useState("60");
  
  // Document form state
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
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

  // ✅ Fetch Documents
  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, description, file_url, file_name, created_at")
        .eq("faculty_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  useEffect(() => {
    if (user?.id && userRole === 'faculty') {
      fetchBookings();
      fetchDocuments();
    }
  }, [user, userRole, navigate]);

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
        description: "Availability added successfully. Slots will be generated automatically.",
      });
      setSlotDialogOpen(false);
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
      // Upload file to Supabase Storage
      const fileExt = docFile.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, docFile);

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('does not exist')) {
          throw new Error('Storage bucket "documents" not found. Please create it in Supabase Storage settings.');
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Insert document record
      const { error: insertError } = await supabase.from("documents").insert({
        faculty_id: user?.id,
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Faculty Dashboard</h1>
          <p className="text-muted-foreground">Manage your schedule and appointments</p>
        </div>

        {/* Two Column Layout for Adding Slots and Documents */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Add Slots & Documents</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Slot Column */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Add Availability Slot
                </CardTitle>
                <CardDescription>
                  Create time slots for booking appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add New Slot
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Availability Slot</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddAvailability} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input 
                          type="date" 
                          value={date} 
                          onChange={(e) => setDate(e.target.value)} 
                          min={format(new Date(), 'yyyy-MM-dd')}
                          required 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input 
                            type="time" 
                            value={startTime} 
                            onChange={(e) => setStartTime(e.target.value)} 
                            required 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Input 
                            type="time" 
                            value={endTime} 
                            onChange={(e) => setEndTime(e.target.value)} 
                            required 
                          />
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
              </CardContent>
            </Card>

            {/* Add Document Column */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Add Document
                </CardTitle>
                <CardDescription>
                  Upload documents for access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
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
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Documents List */}
        {documents.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-semibold flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5" /> Uploaded Documents
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
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
              ))}
            </div>
          </section>
        )}

        {/* ✅ Upcoming Appointments Section */}
        <section>
          <h2 className="text-2xl font-semibold flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5" /> Upcoming Appointments
          </h2>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </CardContent>
            </Card>
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
