'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [eventId, setEventId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState('')

  const handleGoToEvent = () => {
    if (eventId.trim()) {
      router.push(`/event/${eventId.trim()}`)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEventTitle.trim() || !newEventDate) {
      alert('행사명과 일자를 입력해주세요.')
      return
    }

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: newEventTitle,
          date: newEventDate,
          status: 'open',
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      alert(`행사가 생성되었습니다!\n행사 ID: ${data.id}`)
      router.push(`/host/${data.id}`)
    } catch (err: any) {
      alert('행사 생성 중 오류가 발생했습니다: ' + err.message)
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            행사 참석 관리 서비스
          </h1>
          <p className="text-lg text-gray-600">
            소규모 오프라인 행사 참석 관리 시스템
          </p>
        </div>

        <div className="space-y-8">
          {/* 기존 행사 접속 */}
          <div className="bg-white shadow rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              기존 행사 접속
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="eventId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  행사 ID 입력
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="eventId"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleGoToEvent()}
                    placeholder="행사 ID를 입력하세요 (UUID)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleGoToEvent}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
                  >
                    접속
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <p>• 참가자: <code className="bg-gray-100 px-2 py-1 rounded">/event/[행사ID]</code></p>
                <p>• 호스트: <code className="bg-gray-100 px-2 py-1 rounded">/host/[행사ID]</code></p>
                <p>• 체크인: <code className="bg-gray-100 px-2 py-1 rounded">/checkin/[행사ID]</code></p>
              </div>
            </div>
          </div>

          {/* 새 행사 생성 */}
          <div className="bg-white shadow rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              새 행사 생성
            </h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label
                  htmlFor="eventTitle"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  행사명 *
                </label>
                <input
                  type="text"
                  id="eventTitle"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="예: 2024년 신년회"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="eventDate"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  행사 일자 *
                </label>
                <input
                  type="date"
                  id="eventDate"
                  required
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isCreating ? '생성 중...' : '행사 생성하기'}
              </button>
            </form>
          </div>

          {/* 사용 가이드 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              사용 방법
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>위에서 "새 행사 생성"으로 행사를 만듭니다</li>
              <li>생성된 행사 ID를 복사합니다</li>
              <li>참가자에게 <code className="bg-blue-100 px-1 rounded">/event/[행사ID]</code> 링크를 공유합니다</li>
              <li>행사 당일 태블릿에서 <code className="bg-blue-100 px-1 rounded">/checkin/[행사ID]</code>로 체크인합니다</li>
              <li>호스트는 <code className="bg-blue-100 px-1 rounded">/host/[행사ID]</code>에서 실시간 현황을 확인합니다</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
