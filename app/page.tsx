'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Event } from '@/types/database'

export default function Home() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState('')

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching events:', error)
        return
      }

      setEvents(data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

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

      // 행사 목록 새로고침
      await fetchEvents()
      
      // 폼 초기화
      setNewEventTitle('')
      setNewEventDate('')
      
      alert(`행사가 생성되었습니다!\n행사명: ${data.title}`)
      router.push(`/host/${data.id}`)
    } catch (err: any) {
      alert('행사 생성 중 오류가 발생했습니다: ' + err.message)
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            행사 참석 관리 서비스
          </h1>
          <p className="text-lg text-gray-600">
            소규모 오프라인 행사 참석 관리 시스템
          </p>
        </div>

        <div className="space-y-8">
          {/* 기존 행사 목록 */}
          <div className="bg-white shadow rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              등록된 행사 목록
            </h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">행사 목록을 불러오는 중...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>등록된 행사가 없습니다.</p>
                <p className="text-sm mt-2">아래에서 새 행사를 생성해주세요.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => {
                  const eventDate = new Date(event.date)
                  const formattedDate = eventDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                  
                  return (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {formattedDate}
                      </p>
                      <div className="flex items-center gap-2 mb-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            event.status === 'open'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {event.status === 'open' ? '진행 중' : '종료'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => router.push(`/event/${event.id}`)}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
                        >
                          참가자 페이지
                        </button>
                        <button
                          onClick={() => router.push(`/host/${event.id}`)}
                          className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm font-medium"
                        >
                          호스트 대시보드
                        </button>
                        <button
                          onClick={() => router.push(`/checkin/${event.id}`)}
                          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-sm font-medium"
                        >
                          체크인
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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
              <li>등록된 행사 목록에서 원하는 행사를 선택합니다</li>
              <li>참가자 페이지 버튼을 클릭하여 참가자에게 링크를 공유합니다</li>
              <li>행사 당일 체크인 버튼을 클릭하여 QR 코드로 체크인합니다</li>
              <li>호스트 대시보드 버튼을 클릭하여 실시간 현황을 확인합니다</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
