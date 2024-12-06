// src/components/BookingCard.tsx
"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, TrendingDown, TrendingUp, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePriceHistory } from "@/lib/supabase/hooks"
import { withErrorBoundary } from "@/components/error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import type { Booking, PriceHistory } from "@/lib/supabase/client"

const formatPrice = (price: number) => `$${price.toFixed(2)}`

interface PriceTrendProps {
  latestPrice: number
  previousPrice: number
}

const PriceTrend = ({ latestPrice, previousPrice }: PriceTrendProps) => {
  const priceChange = latestPrice - previousPrice
  const percentChange = ((priceChange / previousPrice) * 100).toFixed(1)
  
  return (
    <span 
      className={`ml-2 text-sm flex items-center ${
        priceChange > 0 ? "text-red-500" : "text-green-500"
      }`}
    >
      {priceChange > 0 ? (
        <TrendingUp className="h-4 w-4 mr-1" />
      ) : (
        <TrendingDown className="h-4 w-4 mr-1" />
      )}
      {formatPrice(Math.abs(priceChange))} ({Math.abs(parseFloat(percentChange))}%)
    </span>
  )
}

interface PriceStatsProps {
  priceHistory: PriceHistory[]
}

const PriceStats = ({ priceHistory }: PriceStatsProps) => {
  const prices = priceHistory.map(record => record.lowest_price)
  const lowest = Math.min(...prices)
  const highest = Math.max(...prices)
  const average = prices.reduce((a, b) => a + b, 0) / prices.length
  
  return (
    <div className="grid grid-cols-3 gap-4 mt-4">
      {[
        { label: "Lowest", value: lowest },
        { label: "Average", value: average },
        { label: "Highest", value: highest }
      ].map(({ label, value }) => (
        <div key={label} className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="text-sm text-gray-500">{label}</div>
          <div className="font-semibold">{formatPrice(value)}</div>
        </div>
      ))}
    </div>
  )
}

interface BookingCardProps {
  booking: Booking
}

function BookingCard({ booking }: BookingCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { data: priceHistory, loading, error, refetch, mutating } = usePriceHistory(booking.id)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
    } finally {
      setIsRefreshing(false)
    }
  }

  if (loading) {
    return <Skeleton className="h-[300px]" />
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load price history'}
        </AlertDescription>
      </Alert>
    )
  }

  if (!priceHistory) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No price history available</AlertDescription>
      </Alert>
    )
  }

  const latestPrice = priceHistory[priceHistory.length - 1]?.lowest_price
  const previousPrice = priceHistory[priceHistory.length - 2]?.lowest_price

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex flex-col">
            <span>{booking.location} - {booking.focus_category}</span>
            <span className="text-sm font-normal text-gray-500">
              {new Date(booking.pickup_date).toLocaleDateString()} to{' '}
              {new Date(booking.dropoff_date).toLocaleDateString()}
            </span>
          </div>
          <Button
            onClick={handleRefresh}
            variant="default"
            className="h-8 w-8 p-0"
            disabled={isRefreshing || mutating}
          >
            <RefreshCw 
              className={`h-4 w-4 ${isRefreshing || mutating ? 'animate-spin' : ''}`} 
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {latestPrice && (
          <div className="mb-4">
            <div className="text-2xl font-bold flex items-center">
              {formatPrice(latestPrice)}
              {previousPrice && (
                <PriceTrend 
                  latestPrice={latestPrice} 
                  previousPrice={previousPrice}
                />
              )}
            </div>
          </div>
        )}

        {booking.holding_price && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg mb-4">
            <span className="text-sm text-blue-700">Holding Price</span>
            <span className="font-semibold text-blue-700">
              {formatPrice(booking.holding_price)}
              {latestPrice && booking.holding_price > latestPrice && (
                <span className="ml-2 text-green-600 text-sm">
                  (Save {formatPrice(booking.holding_price - latestPrice)})
                </span>
              )}
            </span>
          </div>
        )}
        
        {priceHistory.length > 0 && (
          <PriceStats priceHistory={priceHistory} />
        )}

        {mutating && (
          <div className="mt-4 text-sm text-blue-500 flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Updating prices...
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default withErrorBoundary(BookingCard)