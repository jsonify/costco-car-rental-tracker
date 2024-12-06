import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Modal from "@/components/ui/modal"
import BookingForm from "@/components/ui/booking-form"
import { useBookings } from "@/lib/supabase/hooks"

export default function AddBookingButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { addBooking, mutating } = useBookings()

  const handleSubmit = async (formData: any) => {
    await addBooking({
      ...formData,
      pickup_time: "12:00 PM",
      dropoff_time: "12:00 PM",
      location_full_name: `${formData.location} Airport`
    })
  }

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        disabled={mutating}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Booking
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Booking"
      >
        <BookingForm
          onSubmit={handleSubmit}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>
    </>
  )
}