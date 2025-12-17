'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Attendee } from '@/types/database'

export default function BadgePage({
  params,
}: {
  params: { eventId: string }
}) {
  const searchParams = useSearchParams()
  const attendeeId = searchParams.get('attendeeId')
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!attendeeId) {
      setLoading(false)
      return
    }

    async function fetchAttendee() {
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('id', attendeeId)
        .eq('event_id', params.eventId)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      setAttendee(data as Attendee)
      setLoading(false)

      if (data.printed) {
        setTimeout(() => {
          window.print()
        }, 500)
      }
    }

    fetchAttendee()

    const channel = supabase
      .channel(`badge-${attendeeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendees',
          filter: `id=eq.${attendeeId}`,
        },
        (payload) => {
          const updated = payload.new as Attendee
          setAttendee(updated)

          if (updated.printed) {
            setTimeout(() => {
              window.print()
            }, 500)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [attendeeId, params.eventId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    )
  }

  if (!attendee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">참가자 정보를 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="no-print min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="bg-white shadow rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">명찰 출력</h1>
        <p className="text-gray-600 mb-4">
          인쇄 대화상자가 자동으로 열립니다.
        </p>
        <p className="text-sm text-gray-500">
          {attendee.name}님의 명찰이 준비되었습니다.
        </p>
      </div>

      <div className="print-only hidden">
        <div className="w-full h-screen flex items-center justify-center bg-white p-8">
          <div className="border-2 border-gray-800 p-8 max-w-md w-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">명찰</h2>
              <div className="border-t-2 border-gray-800 pt-4 mb-4">
                <p className="text-xl font-semibold mb-2">{attendee.name}</p>
                <p className="text-gray-600">{attendee.phone}</p>
              </div>
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('ko-KR')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

