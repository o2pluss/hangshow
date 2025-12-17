import { supabase } from '@/lib/supabase'
import { Event } from '@/types/database'
import EventRegistrationForm from '@/components/EventRegistrationForm'
import { notFound } from 'next/navigation'

async function getEvent(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error || !data) {
    return null
  }

  return data as Event
}

export default async function EventPage({
  params,
}: {
  params: { eventId: string }
}) {
  const event = await getEvent(params.eventId)

  if (!event) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {event.title}
          </h1>
          <div className="text-gray-600 space-y-2">
            <p>
              <span className="font-semibold">일시:</span>{' '}
              {new Date(event.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p>
              <span className="font-semibold">상태:</span> {event.status}
            </p>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            참가 신청
          </h2>
          <EventRegistrationForm eventId={params.eventId} />
        </div>
      </div>
    </div>
  )
}

