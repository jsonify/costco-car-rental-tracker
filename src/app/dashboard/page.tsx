// src/app/dashboard/page.tsx
"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useBookings } from "@/lib/supabase/hooks"
import BookingCard from "@/components/BookingCard"

export default function Dashboard() {
  const { bookings, loading, error } = useBookings()
  
  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse h-64 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load bookings</AlertDescription>
        </Alert>
      </div>
    )
  }
  
  if (bookings.length === 0) {
    return (
      <div className="p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No bookings found. Add a booking to get started.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Car Rental Price Monitor</h1>
          <span className="text-sm text-gray-500">
            Last updated: {new Date(bookings[0].updated_at).toLocaleString()}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map(booking => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      </div>
    </div>
  )
}