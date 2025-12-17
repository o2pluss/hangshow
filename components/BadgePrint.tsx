'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Attendee } from '@/types/database'
import { RealtimeChannel } from '@supabase/supabase-js'

interface BadgePrintProps {
  attendee: Attendee
  eventId: string
}

export default function BadgePrint({ attendee, eventId }: BadgePrintProps) {
  const [currentAttendee, setCurrentAttendee] = useState(attendee)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const channel = supabase
      .channel(`attendee-${attendee.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendees',
          filter: `id=eq.${attendee.id}`,
        },
        (payload) => {
          const updated = payload.new as Attendee
          setCurrentAttendee(updated)

          if (updated.printed && !attendee.printed) {
            window.open(`/badge/${eventId}?attendeeId=${attendee.id}`, '_blank')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel as RealtimeChannel)
    }
  }, [attendee.id, attendee.printed, eventId])

  return null
}

