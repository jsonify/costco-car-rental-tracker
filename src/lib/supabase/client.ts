// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// Database types
export type CarCategory = 
  | 'Economy Car'
  | 'Compact Car'
  | 'Mid-size Car'
  | 'Full-size Car'
  | 'Premium Car'
  | 'Luxury Car'
  | 'Compact SUV'
  | 'Standard SUV'
  | 'Full-size SUV'
  | 'Premium SUV'
  | 'Minivan'

export interface Booking {
  id: string
  location: string
  location_full_name: string
  pickup_date: string
  dropoff_date: string
  pickup_time: string
  dropoff_time: string
  focus_category: CarCategory
  holding_price: number | null
  created_at: string
  updated_at: string
}

export interface PriceHistory {
  id: string
  booking_id: string
  prices: Record<string, number>
  lowest_price_category: string
  lowest_price: number
  created_at: string
}