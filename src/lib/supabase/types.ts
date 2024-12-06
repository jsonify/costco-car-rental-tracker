// src/lib/supabase/types.ts

export type CarCategory =
  | 'Economy Car'
  | 'Compact Car'
  | 'Intermediate Car'
  | 'Standard Car'
  | 'Full-size Car'
  | 'Premium Car'
  | 'Luxury Car'
  | 'Electric Car'
  | 'Standard Sporty Car'
  | 'Standard Convertible'
  | 'Compact SUV'
  | 'Intermediate SUV'
  | 'Standard SUV'
  | 'Standard Elite SUV'
  | 'Full-size SUV'
  | 'Premium SUV'
  | 'Luxury SUV'
  | 'Large Luxury SUV'
  | 'Mini Van'
  | 'Jeep Wrangler 2 door'
  | 'Jeep Wrangler 4 door'
  | 'Midsize Pickup'
  | 'Full-size Pickup';

export interface HoldingPriceHistory {
  id: string;
  booking_id: string;
  price: number;
  note?: string;
  is_initial: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  location: string;
  location_full_name: string;
  pickup_date: string;
  dropoff_date: string;
  pickup_time: string;
  dropoff_time: string;
  focus_category: CarCategory;
  holding_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  booking_id: string;
  prices: Record<string, number>;
  lowest_price_category: string;
  lowest_price: number;
  created_at: string;
}

export const CAR_CATEGORIES: CarCategory[] = [
  'Economy Car',
  'Compact Car',
  'Intermediate Car',
  'Standard Car',
  'Full-size Car',
  'Premium Car',
  'Luxury Car',
  'Electric Car',
  'Standard Sporty Car',
  'Standard Convertible',
  'Compact SUV',
  'Intermediate SUV',
  'Standard SUV',
  'Standard Elite SUV',
  'Full-size SUV',
  'Premium SUV',
  'Luxury SUV',
  'Large Luxury SUV',
  'Mini Van',
  'Jeep Wrangler 2 door',
  'Jeep Wrangler 4 door',
  'Midsize Pickup',
  'Full-size Pickup'
];