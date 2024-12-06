// src/lib/supabase/hooks.ts
import { useEffect, useState } from 'react'
import { supabase } from './client'
import type { Booking, PriceHistory } from './client'

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBookings()
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('booking_changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'bookings' }, 
          fetchBookings)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchBookings() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return { bookings, loading, error }
}

export function usePriceHistory(bookingId: string) {
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPriceHistory()
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('price_changes')
      .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'price_history',
            filter: `booking_id=eq.${bookingId}` 
          }, 
          payload => {
            setPriceHistory(current => [...current, payload.new as PriceHistory])
          })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [bookingId])

  async function fetchPriceHistory() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setPriceHistory(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return { priceHistory, loading, error }
}