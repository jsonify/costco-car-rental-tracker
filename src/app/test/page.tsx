// src/app/test/page.tsx
"use client"

import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';
import Dashboard from '@/app/dashboard/page';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Note: In production, use environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TestPage() {
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const addTestData = async () => {
    try {
      setStatus('Adding test booking...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No user logged in');
      }

      // Add a test booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          location: 'LAX',
          location_full_name: 'Los Angeles International Airport',
          pickup_date: '2024-12-25',
          dropoff_date: '2024-12-31',
          pickup_time: '12:00:00',
          dropoff_time: '12:00:00',
          focus_category: 'Economy Car',
          holding_price: 299.99
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      setStatus('Adding test price history...');

      // Add some test price history
      const basePrice = 299.99;
      const priceHistory = Array.from({ length: 5 }).map((_, i) => ({
        booking_id: booking.id,
        prices: {
          'Economy Car': basePrice - (i * 10),
          'Compact Car': basePrice + 20 - (i * 10),
          'Mid-size Car': basePrice + 40 - (i * 10)
        },
        lowest_price_category: 'Economy Car',
        lowest_price: basePrice - (i * 10),
        created_at: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString()
      }));

      const { error: priceError } = await supabase
        .from('price_history')
        .insert(priceHistory);

      if (priceError) throw priceError;

      setStatus('Test data added successfully!');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('Failed to add test data');
    }
  };

  const clearTestData = async () => {
    try {
      setStatus('Clearing test data...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No user logged in');
      }

      // Delete all bookings for this user (price history will be deleted via cascade)
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setStatus('Test data cleared successfully!');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('Failed to clear test data');
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 space-y-4">
          <h1 className="text-2xl font-bold">Dashboard Test Page</h1>
          
          <div className="flex gap-4">
            <Button onClick={addTestData}>Add Test Data</Button>
            <Button variant="destructive" onClick={clearTestData}>
              Clear Test Data
            </Button>
          </div>
          
          {status && (
            <Alert>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <Dashboard />
      </div>
    </div>
  );
}