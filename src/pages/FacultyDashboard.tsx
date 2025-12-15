// src/pages/Index.tsx - The ACTUAL Faculty Dashboard at /dashboard
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, CheckCircle, Upload } from 'lucide-react';
import { Header } from '@/components/Header';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Wait for userRole to load before redirecting
  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Redirect non-faculty users
  if (userRole === 'admin') {
    navigate('/admin', { replace: true });
    return null;
  }
  
  // Only faculty can access this page
  if (userRole !== 'faculty') {
    navigate('/auth', { replace: true });
    return null;
  }

  // Fetch available slots and booked appointments
  useEffect(() => {
    if (user && userRole === 'faculty') {
      fetchAvailableSlots();
      fetchBookedAppointments();
    } else {
      setLoading(false);
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

      if (slotsError) {
        console.error("Slots error:", slotsError);
        throw slotsError;
      }

      const { data: appointments, error: appError } = await supabase
        .from("appointments")
        .select("slot_id")
        .not("slot_id", "is", null);

      if (appError) {
        console.error("Appointments error:", appError);
        const availableSlots = (allSlots || []).filter(slot => slot);
        setAvailableSlots(availableSlots);
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

      if (error) {
        console.error("Error fetching booked appointments:", error);
        throw error;
      }

      if (!appointments || appointments.length === 0) {
        setBookedAppointments([]);
        return;
      }

      // Fetch slot details
      const slotIds = appointments.map(a => a.slot_id).filter(Boolean);
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

  // Ensure we have user and role before rendering
  if (!user || !userRole || userRole !== 'faculty') {
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

export default Index;import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, FileText, Upload, CheckCircle2 } from "lucide-react";
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

interface MyBookedSlot {
  id: string;
  slot_id: string;
  scholar_name: string;
  scholar_email: string;
  purpose: string;
  booked_at: string;
  start_time: string;
  end_time: string;
  status: string;
  slot?: {
    date: string;
    start_time: string;
    end_time: string;
  };
}

interface AvailableSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
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
  const [myBookedSlots, setMyBookedSlots] = useState<MyBookedSlot[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  
  // Document form state
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id && userRole === 'faculty') {
      fetchMyBookedSlots();
      fetchAvailableSlots();
      fetchDocuments();
    }
  }, [user, userRole, navigate]);

  // ✅ Fetch Available Slots
  const fetchAvailableSlots = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
      // Get all available slots
      const { data: allSlots, error: slotsError } = await supabase
        .from("faculty_slots")
        .select("id, date, start_time, end_time, status")
        .eq("status", "available")
        .gte("date", today)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (slotsError) throw slotsError;

      // Get all booked slot IDs
      const { data: appointments, error: appError } = await supabase
        .from("appointments")
        .select("slot_id")
        .not("slot_id", "is", null);

      if (appError) {
        console.error("Appointments error:", appError);
        setAvailableSlots(allSlots || []);
        return;
      }

      const bookedSlotIds = new Set(
        (appointments || []).map((a) => a.slot_id).filter(Boolean)
      );

      // Filter out booked slots
      const availableSlots = (allSlots || []).filter(
        (slot) => !bookedSlotIds.has(slot.id)
      );

      setAvailableSlots(availableSlots);
    } catch (err) {
      console.error("Error fetching available slots:", err);
      setAvailableSlots([]);
    }
  };

  // ✅ Fetch ONLY slots that THIS faculty member booked
  const fetchMyBookedSlots = async () => {
    try {
      if (!user?.id) {
        console.warn("No user ID available");
        setMyBookedSlots([]);
        setLoading(false);
        return;
      }

      console.log("Fetching appointments for user:", user.id);

      // Get appointments where THIS user is the scholar (the one who booked)
      const { data: appointments, error: appError } = await supabase
        .from("appointments")
        .select("id, slot_id, scholar_name, scholar_email, purpose, booked_at, start_time, end_time, status, scholar_id")
        .eq("scholar_id", user.id) // CRITICAL: Only get appointments I made
        .order("start_time", { ascending: true });
      
      console.log("Fetched appointments:", appointments);

      if (appError) throw appError;

      if (!appointments || appointments.length === 0) {
        setMyBookedSlots([]);
        setLoading(false);
        return;
      }

      // Fetch slot details for these appointments
      const slotIds = appointments.map(a => a.slot_id).filter(Boolean);
      
      if (slotIds.length === 0) {
        setMyBookedSlots(appointments as MyBookedSlot[]);
        setLoading(false);
        return;
      }

      const { data: slots, error: slotsError } = await supabase
        .from("faculty_slots")
        .select("id, date, start_time, end_time")
        .in("id", slotIds);

      if (slotsError) throw slotsError;

      // Merge appointment data with slot data
      // EXTRA SAFETY: Filter to only show appointments that match current user's email
      const mergedData: MyBookedSlot[] = appointments
        .filter(appointment => {
          // Double-check: only show if scholar_email matches current user's email
          return appointment.scholar_email === user.email;
        })
        .map(appointment => {
          const slot = slots?.find(s => s.id === appointment.slot_id);
          return {
            ...appointment,
            slot: slot ? {
              date: slot.date,
              start_time: slot.start_time,
              end_time: slot.end_time,
            } : undefined,
          };
        });

      setMyBookedSlots(mergedData);
    } catch (err) {
      console.error("Error fetching my booked slots:", err);
      setMyBookedSlots([]);
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

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

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
          <h1 className="text-3xl font-bold">Faculty Dashboard</h1>
          <p className="text-muted-foreground">Book available slots and view your appointments</p>
        </div>

        {/* Available Slots Section - FIRST */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-600" /> Available Slots to Book
          </h2>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </CardContent>
            </Card>
          ) : availableSlots.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No available slots at the moment</p>
              <p className="text-sm text-muted-foreground mt-2">Check back later or contact admin</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableSlots.map((slot) => {
                const dateFormatted = slot.date
                  ? format(new Date(`${slot.date}T00:00:00`), "PPP")
                  : "No date";

                return (
                  <Card key={slot.id} className="hover:shadow-lg transition-shadow border-blue-200 bg-blue-50/30">
                    <CardHeader>
                      <CardTitle className="text-lg">{dateFormatted}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => navigate(`/book/${slot.id}`)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Book This Slot
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* My Booked Slots Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" /> My Booked Appointments
          </h2>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </CardContent>
            </Card>
          ) : myBookedSlots.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">You haven't booked any appointments yet</p>
              <Button 
                className="mt-4" 
                onClick={() => navigate('/dashboard')}
              >
                Browse Available Slots
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBookedSlots
                .filter(booking => {
                  // SAFETY CHECK: Only show bookings that belong to current user
                  return booking.scholar_email === user?.email;
                })
                .map((booking) => {
                const dateFormatted = booking.slot?.date
                  ? format(new Date(`${booking.slot.date}T00:00:00`), "PPP")
                  : booking.start_time
                  ? format(new Date(booking.start_time), "PPP")
                  : "No date";

                const startTime = booking.slot?.start_time || booking.start_time;
                const endTime = booking.slot?.end_time || booking.end_time;

                return (
                  <Card key={booking.id} className="border-green-200 bg-green-50/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{dateFormatted}</CardTitle>
                        <Badge variant="default" className="bg-green-600">Booked</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formatTime(startTime)} - {formatTime(endTime)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-semibold">Purpose:</span> {booking.purpose}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Booked: {format(new Date(booking.booked_at), "PPp")}
                        </div>
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {booking.status || 'confirmed'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Document Upload Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Documents
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

          {/* Documents List */}
          {documents.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No documents uploaded yet</p>
            </Card>
          ) : (
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
          )}
        </section>
      </main>
    </div>
  );
}