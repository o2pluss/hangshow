'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Event, Attendee } from '@/types/database'
import { RealtimeChannel } from '@supabase/supabase-js'
import Link from 'next/link'

export default function HostDashboard({
  params,
}: {
  params: { eventId: string }
}) {
  const [event, setEvent] = useState<Event | null>(null)
  const [totalAttendees, setTotalAttendees] = useState(0)
  const [checkedInCount, setCheckedInCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.eventId)
        .single()

      if (eventError || !eventData) {
        setLoading(false)
        return
      }

      setEvent(eventData as Event)

      const { data: attendeesData, error: attendeesError } = await supabase
        .from('attendees')
        .select('id, checked_in')
        .eq('event_id', params.eventId)

      if (!attendeesError && attendeesData) {
        setTotalAttendees(attendeesData.length)
        setCheckedInCount(attendeesData.filter((a) => a.checked_in).length)
      }

      setLoading(false)
    }

    fetchData()

    const channel = supabase
      .channel(`event-${params.eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendees',
          filter: `event_id=eq.${params.eventId}`,
        },
        async () => {
          const { data } = await supabase
            .from('attendees')
            .select('id, checked_in')
            .eq('event_id', params.eventId)

          if (data) {
            setTotalAttendees(data.length)
            setCheckedInCount(data.filter((a) => a.checked_in).length)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel as RealtimeChannel)
    }
  }, [params.eventId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">행사를 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
          <p className="text-gray-600">
            {new Date(event.date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 신청자</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {totalAttendees}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">체크인 완료</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {checkedInCount}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">관리 메뉴</h2>
          </div>
          <div className="space-y-3">
            <Link
              href={`/host/${params.eventId}/attendees`}
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center font-medium"
            >
              참가자 목록 보기
            </Link>
            <Link
              href={`/checkin/${params.eventId}`}
              className="block w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-center font-medium"
            >
              체크인 화면 열기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

