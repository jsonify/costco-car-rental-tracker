// src/lib/supabase/hooks.ts

import { useEffect, useState, useCallback } from 'react'
import { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './client'
import type { Booking, PriceHistory } from './client'

interface QueryState<T> {
  data: T | null
  loading: boolean
  error: PostgrestError | Error | null
  mutating: boolean
}

/**
 * Enhanced hook for managing bookings with real-time updates, error handling,
 * and optimistic updates for mutations.
 */
export function useBookings() {
  const [state, setState] = useState<QueryState<Booking[]>>({
    data: null,
    loading: true,
    error: null,
    mutating: false
  })

  const fetchBookings = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setState(prev => ({ ...prev, data, error: null }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error('An error occurred')
      }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [])

  const addBooking = useCallback(async (newBooking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) => {
    setState(prev => ({ ...prev, mutating: true, error: null }))
    try {
      // Optimistically update the UI
      const optimisticBooking = {
        ...newBooking,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Booking

      setState(prev => ({
        ...prev,
        data: prev.data ? [optimisticBooking, ...prev.data] : [optimisticBooking]
      }))

      const { data, error } = await supabase
        .from('bookings')
        .insert([newBooking])
        .select()
        .single()

      if (error) throw error

      // Update with real data
      setState(prev => ({
        ...prev,
        data: prev.data?.map(booking => 
          booking.id === optimisticBooking.id ? data : booking
        )
      }))

      return data
    } catch (error) {
      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        data: prev.data?.filter(booking => !booking.id.startsWith('temp-')),
        error: error instanceof Error ? error : new Error('Failed to add booking')
      }))
      throw error
    } finally {
      setState(prev => ({ ...prev, mutating: false }))
    }
  }, [])

  const deleteBooking = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, mutating: true, error: null }))
    try {
      // Optimistically remove from UI
      setState(prev => ({
        ...prev,
        data: prev.data?.filter(booking => booking.id !== id)
      }))

      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      // Revert optimistic deletion on error
      await fetchBookings()
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to delete booking')
      }))
      throw error
    } finally {
      setState(prev => ({ ...prev, mutating: false }))
    }
  }, [fetchBookings])

  const updateHoldingPrice = useCallback(async (id: string, holdingPrice: number) => {
    setState(prev => ({ ...prev, mutating: true, error: null }))
    try {
      // Optimistically update the UI
      setState(prev => ({
        ...prev,
        data: prev.data?.map(booking =>
          booking.id === id
            ? { ...booking, holding_price: holdingPrice }
            : booking
        )
      }))

      const { error } = await supabase
        .from('bookings')
        .update({ holding_price: holdingPrice })
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      // Revert optimistic update on error
      await fetchBookings()
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to update holding price')
      }))
      throw error
    } finally {
      setState(prev => ({ ...prev, mutating: false }))
    }
  }, [fetchBookings])

  useEffect(() => {
    fetchBookings()
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('booking_changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'bookings' }, 
          async (payload) => {
            // Handle different types of changes
            switch (payload.eventType) {
              case 'INSERT':
                setState(prev => ({
                  ...prev,
                  data: prev.data ? [payload.new as Booking, ...prev.data] : [payload.new as Booking]
                }))
                break
              case 'UPDATE':
                setState(prev => ({
                  ...prev,
                  data: prev.data?.map(booking =>
                    booking.id === payload.new.id ? payload.new as Booking : booking
                  )
                }))
                break
              case 'DELETE':
                setState(prev => ({
                  ...prev,
                  data: prev.data?.filter(booking => booking.id !== payload.old.id)
                }))
                break
            }
          })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchBookings])

  return {
    ...state,
    addBooking,
    deleteBooking,
    updateHoldingPrice,
    refetch: fetchBookings
  }
}

/**
 * Enhanced hook for managing price history with real-time updates
 * and proper error handling
 */
export function usePriceHistory(bookingId: string) {
  const [state, setState] = useState<QueryState<PriceHistory[]>>({
    data: null,
    loading: true,
    error: null,
    mutating: false
  })

  const fetchPriceHistory = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setState(prev => ({ ...prev, data, error: null }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to fetch price history')
      }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [bookingId])

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
            setState(prev => ({
              ...prev,
              data: [...(prev.data || []), payload.new as PriceHistory]
            }))
          })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [bookingId, fetchPriceHistory])

  return {
    ...state,
    refetch: fetchPriceHistory
  }
}