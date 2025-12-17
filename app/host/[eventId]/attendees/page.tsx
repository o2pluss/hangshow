'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Attendee } from '@/types/database'
import Link from 'next/link'

export default function AttendeesPage({
  params,
}: {
  params: { eventId: string }
}) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAttendees() {
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('event_id', params.eventId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching attendees:', error)
        setLoading(false)
        return
      }

      setAttendees((data as Attendee[]) || [])
      setLoading(false)
    }

    fetchAttendees()

    const channel = supabase
      .channel(`attendees-${params.eventId}`)
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
            .select('*')
            .eq('event_id', params.eventId)
            .order('created_at', { ascending: false })

          if (data) {
            setAttendees(data as Attendee[])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.eventId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">참가자 목록</h1>
          <Link
            href={`/host/${params.eventId}`}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    전화번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    체크인 상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    체크인 시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    명찰 출력
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    신청 시간
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      참가자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  attendees.map((attendee) => (
                    <tr key={attendee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {attendee.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {attendee.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attendee.checked_in ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            완료
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            대기
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {attendee.checked_in_at
                          ? new Date(attendee.checked_in_at).toLocaleString(
                              'ko-KR'
                            )
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attendee.printed ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            완료
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            대기
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(attendee.created_at).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

