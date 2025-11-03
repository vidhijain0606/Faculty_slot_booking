import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth'
import { Calendar, User, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

interface Faculty {
  id: string
  name: string
  email: string
}

interface Booking {
  id: string
  purpose: string
  booked_at: string
  slot: {
    date: string | null
    start_time: string | null
    end_time: string | null
  }
  faculty: Faculty
}

interface AvailabilitySlot {
  id: string
  date: string
  start_time: string
  end_time: string
  faculty: Faculty
}

export default function ScholarDashboard() {
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      fetchFaculty()
      fetchBookings()
    }
  }, [user])

  // ✅ Fetch faculty who have available slots
  const fetchFaculty = async () => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select(`
          id,
          date,
          start_time,
          end_time,
          faculty:faculty_id (
            id,
            name,
            email
          )
        `)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) throw error

      const uniqueFaculty: Faculty[] = []
      const seenIds = new Set<string>()

      ;(data as AvailabilitySlot[])?.forEach((slot) => {
        if (slot.faculty && !seenIds.has(slot.faculty.id)) {
          uniqueFaculty.push(slot.faculty)
          seenIds.add(slot.faculty.id)
        }
      })

      setFaculty(uniqueFaculty)
    } catch (error) {
      console.error('Error fetching faculty:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Fetch scholar’s own bookings
  const fetchBookings = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          purpose,
          booked_at,
          faculty_id,
          slot:slot_id (
            date,
            start_time,
            end_time
          ),
          faculty:faculty_id (
            id,
            name,
            email
          )
        `)
        .order('booked_at', { ascending: false })

      if (error) throw error

      setBookings(data as Booking[])
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Scholar Dashboard
          </h1>
          <p className="text-muted-foreground">
            Browse faculty and manage your appointments
          </p>
        </div>

        {/* ✅ Upcoming Appointments */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Upcoming Appointments
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bookings.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No upcoming appointments
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
                    <CardTitle className="text-lg">
                      {booking.faculty?.name || 'Unknown'}
                    </CardTitle>
                    <CardDescription>
                      {booking.faculty?.email || ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {booking.slot?.date
                          ? format(new Date(booking.slot.date), 'PPP')
                          : 'No date'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {booking.slot?.start_time && booking.slot?.end_time
                          ? `${booking.slot.start_time} - ${booking.slot.end_time}`
                          : 'Time not set'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {booking.purpose}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* ✅ Available Faculty */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <User className="h-6 w-6" />
            Available Faculty
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <Card className="col-span-full">
                <CardContent className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </CardContent>
              </Card>
            ) : faculty.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No faculty members available
                  </p>
                </CardContent>
              </Card>
            ) : (
              faculty.map((member) => (
                <Card
                  key={member.id}
                  className="hover:shadow-medium transition-shadow"
                >
                  <CardHeader>
                    <CardTitle>{member.name}</CardTitle>
                    <CardDescription>{member.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() => navigate(`/book/${member.id}`)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Book Appointment
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
