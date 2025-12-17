export interface Event {
  id: string
  title: string
  date: string
  status: string
  created_at: string
}

export interface Attendee {
  id: string
  event_id: string
  name: string
  phone: string
  qr_token: string
  checked_in: boolean
  checked_in_at: string | null
  printed: boolean
  created_at: string
}

export interface AttendeeWithEvent extends Attendee {
  event: Event
}

