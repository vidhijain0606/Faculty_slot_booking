import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, PlusCircle, FileText, Upload, CheckCircle2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Appointment {
  id: string;
  scholar_name: string;
  scholar_email: string;
  purpose: string;
  booked_at: string;
  start_time?: string;
  end_time?: string;
  faculty_id?: string;
}

interface BookedSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  faculty_id: string;
  appointment?: {
    scholar_name: string;
    scholar_email: string;
    purpose: string;
    booked_at: string;
  };
  faculty?: {
    name: string;
    email: string;
  };
}

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
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

  useEffect(() => {
    // Redirect non-admins away
    if (userRole && userRole !== 'admin') {
      if (userRole === 'faculty') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }
    
    if (user?.id && userRole === 'admin') {
      fetchAppointments();
      fetchAllBookedSlots();
      fetchDocuments();
    }
  }, [user, userRole, navigate]);

  // ✅ Fetch All Appointments
  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scholar_name, scholar_email, purpose, booked_at, start_time, end_time, faculty_id")
        .order("booked_at", { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch ALL Booked Slots (all appointments made by any user)
  const fetchAllBookedSlots = async () => {
    try {
      // Get all appointments (these represent booked slots)
      const { data: appointments, error: appError } = await supabase
        .from("appointments")
        .select(`
          id,
          slot_id,
          scholar_id,
          scholar_name,
          scholar_email,
          purpose,
          booked_at,
          start_time,
          end_time,
          status
        `)
        .order("start_time", { ascending: true });

      if (appError) throw appError;

      if (!appointments || appointments.length === 0) {
        setBookedSlots([]);
        return;
      }

      // Fetch slot details for these appointments
      const slotIds = appointments.map(a => a.slot_id).filter(Boolean);
      
      const { data: slots, error: slotsError } = await supabase
        .from("faculty_slots")
        .select("id, date, start_time, end_time, faculty_id")
        .in("id", slotIds);

      if (slotsError) throw slotsError;

      // Fetch user profiles (both who booked - scholar_id)
      const userIds = [...new Set([
        ...appointments.map(a => a.scholar_id),
        ...(slots || []).map(s => s.faculty_id)
      ].filter(Boolean))];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      if (profileError) throw profileError;

      // Merge all data together
      const mergedSlots: BookedSlot[] = appointments.map(appointment => {
        const slot = slots?.find(s => s.id === appointment.slot_id);
        const bookedByProfile = profiles?.find(p => p.id === appointment.scholar_id);
        
        return {
          id: appointment.id,
          date: slot?.date || format(new Date(appointment.start_time), "yyyy-MM-dd"),
          start_time: slot?.start_time || appointment.start_time,
          end_time: slot?.end_time || appointment.end_time,
          status: appointment.status || 'confirmed',
          faculty_id: slot?.faculty_id || '',
          appointment: {
            scholar_name: appointment.scholar_name,
            scholar_email: appointment.scholar_email,
            purpose: appointment.purpose,
            booked_at: appointment.booked_at,
          },
          faculty: bookedByProfile ? {
            name: bookedByProfile.name,
            email: bookedByProfile.email,
          } : undefined,
        };
      });

      setBookedSlots(mergedSlots);
    } catch (err) {
      console.error("Error fetching booked slots:", err);
      setBookedSlots([]);
    }
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

  // ✅ Add Availability Slot (Admin only)
  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !startTime || !endTime) {
      toast({ variant: "destructive", title: "Error", description: "All fields are required." });
      return;
    }

    try {
      const adminUserId = user?.id || '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase.from("availability").insert({
        faculty_id: adminUserId,
        date,
        start_time: startTime,
        end_time: endTime,
        slot_duration: Number(slotDuration),
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Availability slot added successfully. Slots will be generated automatically.",
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

    setUploading(true);
    try {
      const fileExt = docFile.name.split('.').pop();
      const fileName = `admin/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, docFile);

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('does not exist')) {
          throw new Error('Storage bucket "documents" not found. Please create it in Supabase Storage settings.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const adminUserId = user?.id || '00000000-0000-0000-0000-000000000000';

      const { error: insertError } = await supabase.from("documents").insert({
        faculty_id: adminUserId,
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

  const formatTime = (time: string) => {
    if (!time) return "";
    if (time.includes("T")) {
      const d = new Date(time);
      if (isNaN(d.getTime())) return time;
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return time.split(":")[0] + ":" + time.split(":")[1];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage slots and view all appointments</p>
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

        {/* Tabs for All Appointments and All Booked Slots */}
        <section className="mb-10">
          <Tabs defaultValue="booked-slots" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="booked-slots">All Booked Slots</TabsTrigger>
              <TabsTrigger value="appointments">All Appointments</TabsTrigger>
            </TabsList>

            {/* NEW: All Booked Slots Tab */}
            <TabsContent value="booked-slots">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    All Booked Slots
                  </CardTitle>
                  <CardDescription>
                    View all booked slots across all faculty members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : bookedSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No slots have been booked yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bookedSlots.map((slot) => {
                        const dateFormatted = slot.date
                          ? format(new Date(`${slot.date}T00:00:00`), "PPP")
                          : "No date";

                        return (
                          <Card key={slot.id} className="border-green-200 bg-green-50/50">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{dateFormatted}</CardTitle>
                                <Badge variant="default" className="bg-green-600">Booked</Badge>
                              </div>
                              <CardDescription className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {slot.faculty && (
                                  <div className="p-2 bg-blue-50 rounded-md border border-blue-200">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Users className="h-4 w-4 text-blue-600" />
                                      <span className="font-semibold text-sm">Booked By</span>
                                    </div>
                                    <div className="text-sm">{slot.faculty.name}</div>
                                    <div className="text-xs text-muted-foreground">{slot.faculty.email}</div>
                                  </div>
                                )}
                                {slot.appointment && (
                                  <div className="space-y-2 text-sm">
                                    <div className="font-semibold text-base border-b pb-1">Appointment Details:</div>
                                    <div>
                                      <span className="font-semibold">Scholar:</span> {slot.appointment.scholar_name}
                                    </div>
                                    <div>
                                      <span className="font-semibold">Email:</span> {slot.appointment.scholar_email}
                                    </div>
                                    <div>
                                      <span className="font-semibold">Purpose:</span> {slot.appointment.purpose}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Booked: {format(new Date(slot.appointment.booked_at), "PPp")}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Appointments Tab */}
            <TabsContent value="appointments">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    All Appointments
                  </CardTitle>
                  <CardDescription>
                    View all appointments in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : appointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No appointments yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {appointments.map((appointment) => {
                        const startLocal = appointment.start_time
                          ? format(new Date(appointment.start_time), "h:mm a")
                          : null;
                        const endLocal = appointment.end_time
                          ? format(new Date(appointment.end_time), "h:mm a")
                          : null;

                        return (
                          <Card key={appointment.id}>
                            <CardHeader>
                              <CardTitle>{appointment.scholar_name || "Unknown"}</CardTitle>
                              <p className="text-sm text-muted-foreground">{appointment.scholar_email}</p>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Calendar className="h-4 w-4" />
                                {appointment.start_time
                                  ? format(new Date(appointment.start_time), "MMMM d, yyyy")
                                  : "No date"}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Clock className="h-4 w-4" />
                                {startLocal && endLocal
                                  ? `${startLocal} - ${endLocal}`
                                  : "Time not set"}
                              </div>
                              <p className="text-sm">{appointment.purpose || "No details"}</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
      </main>
    </div>
  );
}