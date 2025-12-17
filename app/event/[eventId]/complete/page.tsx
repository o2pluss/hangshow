'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'
import { Attendee } from '@/types/database'
import { getQrCheckinUrl } from '@/lib/utils'
import BadgePrint from '@/components/BadgePrint'

export default function CompletePage({
  params,
}: {
  params: { eventId: string }
}) {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    async function fetchAttendee() {
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('event_id', params.eventId)
        .eq('qr_token', token)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      setAttendee(data as Attendee)
      setLoading(false)
    }

    fetchAttendee()
  }, [token, params.eventId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    )
  }

  if (!attendee || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">참가자 정보를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const qrUrl = getQrCheckinUrl(params.eventId, token)

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8 mb-8">
          <div className="text-center mb-8">
            <div className="inline-block bg-green-100 rounded-full p-3 mb-4">
              <svg
                className="w-12 h-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              신청이 완료되었습니다!
            </h1>
            <p className="text-gray-600">
              행사 당일 QR 코드를 제시해주세요
            </p>
          </div>

          <div className="border-t pt-8">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 mb-2">참가자 정보</p>
              <p className="text-xl font-semibold text-gray-900">{attendee.name}</p>
              <p className="text-gray-600">{attendee.phone}</p>
            </div>

            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 border-2 border-gray-200 rounded-lg">
                <QRCodeSVG value={qrUrl} size={200} />
              </div>
            </div>

            <div className="text-center text-sm text-gray-500 mb-6">
              <p>이 QR 코드를 체크인 시 제시해주세요</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
              >
                QR 코드 인쇄
              </button>
            </div>
          </div>
        </div>
      </div>

      <BadgePrint attendee={attendee} eventId={params.eventId} />
    </div>
  )
}

