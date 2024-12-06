// src/app/page.tsx
"use client"

import { useBookings } from '@/lib/supabase/hooks'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardSkeleton } from '@/components/ui/skeleton'
import BookingCard from '@/components/BookingCard'
import { withErrorBoundary } from '@/components/error-boundary'
import AddBookingButton from "@/components/add-booking-button"

function Dashboard() {
  const { data: bookings, loading, error, mutating, refetch } = useBookings()
  
  if (loading) {
    return <DashboardSkeleton />
  }
  
  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load bookings'}
          </AlertDescription>
          <Button onClick={refetch} className="mt-4">
            Try Again
          </Button>
        </Alert>
      </div>
    )
  }
  
  if (!bookings || bookings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="max-w-md w-full mx-auto p-6">
          <Alert>
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold">No bookings found</h2>
              <p className="text-sm text-blue-600">
                Add your first booking to start tracking car rental prices.
              </p>
              <AddBookingButton />
            </div>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Car Rental Price Monitor</h1>
          <div className="flex items-center gap-4">
            {mutating && (
              <span className="text-sm text-blue-500 flex items-center">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </span>
            )}
            <Button
              onClick={refetch}
              variant="default"
              disabled={mutating}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh All
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map(booking => (
            <BookingCard 
              key={booking.id} 
              booking={booking} 
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default withErrorBoundary(Dashboard)