import { useState } from "react"
import { Calendar, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { CarCategory } from "@/lib/supabase/client"

const CAR_CATEGORIES: CarCategory[] = [
  "Economy Car",
  "Compact Car",
  "Mid-size Car",
  "Full-size Car",
  "Premium Car",
  "Luxury Car",
  "Compact SUV",
  "Standard SUV",
  "Full-size SUV",
  "Premium SUV",
  "Minivan"
]

const AIRPORT_OPTIONS = [
  { code: "KOA", name: "Kailua-Kona International Airport" },
  { code: "HNL", name: "Daniel K. Inouye International Airport" },
  { code: "OGG", name: "Kahului Airport" },
  { code: "LIH", name: "Lihue Airport" }
]

interface FormData {
  location: string
  pickup_date: string
  dropoff_date: string
  focus_category: CarCategory
  holding_price?: number
}

interface BookingFormProps {
  onSubmit: (data: FormData) => Promise<void>
  onClose: () => void
}

export default function BookingForm({ onSubmit, onClose }: BookingFormProps) {
  const [formData, setFormData] = useState<FormData>({
    location: "",
    pickup_date: "",
    dropoff_date: "",
    focus_category: "Economy Car"
  })
  const [error, setError] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    // Basic validation
    if (!formData.location) {
      setError("Please select an airport")
      return
    }
    if (!formData.pickup_date || !formData.dropoff_date) {
      setError("Please select both pickup and dropoff dates")
      return
    }
    
    const pickup = new Date(formData.pickup_date)
    const dropoff = new Date(formData.dropoff_date)
    
    if (pickup < new Date()) {
      setError("Pickup date cannot be in the past")
      return
    }
    if (dropoff <= pickup) {
      setError("Dropoff date must be after pickup date")
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Airport Location
          </label>
          <select
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full p-2 border rounded-md"
            required
          >
            <option value="">Select an airport</option>
            {AIRPORT_OPTIONS.map((airport) => (
              <option key={airport.code} value={airport.code}>
                {airport.code} - {airport.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Pickup Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.pickup_date}
                onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                className="w-full p-2 border rounded-md pl-10"
                required
              />
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Dropoff Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.dropoff_date}
                onChange={(e) => setFormData({ ...formData, dropoff_date: e.target.value })}
                className="w-full p-2 border rounded-md pl-10"
                required
              />
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Car Category
          </label>
          <select
            value={formData.focus_category}
            onChange={(e) => setFormData({ ...formData, focus_category: e.target.value as CarCategory })}
            className="w-full p-2 border rounded-md"
            required
          >
            {CAR_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Holding Price (Optional)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.holding_price || ""}
            onChange={(e) => setFormData({ ...formData, holding_price: e.target.valueAsNumber })}
            className="w-full p-2 border rounded-md"
            placeholder="Enter current reservation price"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          onClick={onClose}
          className="bg-gray-100 hover:bg-gray-200 text-gray-900"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2"
        >
          {isSubmitting && (
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          Add Booking
        </Button>
      </div>
    </form>
  )
}