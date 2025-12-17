'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateQrToken } from '@/lib/utils'

interface EventRegistrationFormProps {
  eventId: string
}

export default function EventRegistrationForm({
  eventId,
}: EventRegistrationFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const qrToken = generateQrToken()

      const { data, error: insertError } = await supabase
        .from('attendees')
        .insert({
          event_id: eventId,
          name,
          phone,
          qr_token: qrToken,
          checked_in: false,
          printed: false,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      router.push(`/event/${eventId}/complete?token=${qrToken}`)
    } catch (err: any) {
      setError(err.message || '신청 중 오류가 발생했습니다.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          이름 *
        </label>
        <input
          type="text"
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="이름을 입력하세요"
        />
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          전화번호 *
        </label>
        <input
          type="tel"
          id="phone"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="010-0000-0000"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isSubmitting ? '신청 중...' : '신청하기'}
      </button>
    </form>
  )
}

