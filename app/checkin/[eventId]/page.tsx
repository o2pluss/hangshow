'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabase'

export default function CheckInPage({
  params,
}: {
  params: { eventId: string }
}) {
  const searchParams = useSearchParams()
  const tokenParam = searchParams.get('token')
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [attendeeName, setAttendeeName] = useState('')
  const [attendeeId, setAttendeeId] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const scannerStartedRef = useRef(false)

  useEffect(() => {
    if (tokenParam) {
      handleCheckIn(tokenParam)
    }
  }, [tokenParam])

  useEffect(() => {
    if (status === 'scanning' && !isScanning && !scannerStartedRef.current) {
      startScanner()
    }

    return () => {
      stopScanner()
    }
  }, [status, isScanning])

  const stopScanner = async () => {
    if (scannerRef.current && scannerStartedRef.current) {
      try {
        const isScanning = scannerRef.current.getState() === Html5Qrcode.SCAN_STATE.SCANNING
        if (isScanning) {
          await scannerRef.current.stop()
        }
        await scannerRef.current.clear()
      } catch (err) {
        // 스캐너가 이미 정지된 경우 무시
        console.log('Scanner already stopped')
      } finally {
        scannerRef.current = null
        setIsScanning(false)
        scannerStartedRef.current = false
      }
    }
  }

  const startScanner = async () => {
    // 기존 스캐너가 있으면 정리
    await stopScanner()

    try {
      // 카메라 권한 요청
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        })
        stream.getTracks().forEach(track => track.stop())
      } catch (permError) {
        setStatus('error')
        setMessage('카메라 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.')
        return
      }

      const scanner = new Html5Qrcode('reader')
      scannerRef.current = scanner

      // 모바일 환경 감지
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const qrboxSize = isMobile ? Math.min(window.innerWidth * 0.8, 300) : 250

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: qrboxSize, height: qrboxSize },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleCheckIn(extractTokenFromUrl(decodedText))
        },
        (errorMessage) => {
          // 스캔 중 에러는 무시 (계속 스캔)
        }
      )

      setIsScanning(true)
      scannerStartedRef.current = true
    } catch (err: any) {
      console.error('Scanner error:', err)
      setStatus('error')
      let errorMsg = '카메라를 시작할 수 없습니다.'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.'
      } else if (err.message) {
        errorMsg = err.message
      }
      
      setMessage(errorMsg)
      setIsScanning(false)
      scannerStartedRef.current = false
    }
  }

  const extractTokenFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      return urlObj.searchParams.get('token') || ''
    } catch {
      return url
    }
  }

  const handleCheckIn = async (token: string) => {
    if (!token) {
      setStatus('error')
      setMessage('유효하지 않은 QR 코드입니다.')
      return
    }

    try {
      const { data: attendee, error: fetchError } = await supabase
        .from('attendees')
        .select('*')
        .eq('event_id', params.eventId)
        .eq('qr_token', token)
        .single()

      if (fetchError || !attendee) {
        setStatus('error')
        setMessage('참가자 정보를 찾을 수 없습니다.')
        return
      }

      if (attendee.checked_in) {
        setStatus('error')
        setMessage(`${attendee.name}님은 이미 체크인 완료되었습니다.`)
        setAttendeeName(attendee.name)
        return
      }

      const { error: updateError } = await supabase
        .from('attendees')
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        })
        .eq('id', attendee.id)

      if (updateError) {
        throw updateError
      }

      setStatus('success')
      setMessage('체크인 완료!')
      setAttendeeName(attendee.name)
      setAttendeeId(attendee.id)

      // 스캐너 정지
      await stopScanner()

      setTimeout(() => {
        setStatus('idle')
        setMessage('')
        setAttendeeName('')
        setAttendeeId(null)
      }, 3000)
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || '체크인 중 오류가 발생했습니다.')
    }
  }

  const handleStartScan = async () => {
    setStatus('scanning')
    setMessage('')
    setAttendeeName('')
    setAttendeeId(null)
    // startScanner는 useEffect에서 호출됨
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
            QR 체크인
          </h1>

          {status === 'idle' && (
            <div className="text-center">
              <button
                onClick={handleStartScan}
                className="bg-blue-600 text-white py-4 px-8 rounded-lg text-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                스캔 시작
              </button>
            </div>
          )}

          {status === 'scanning' && (
            <div>
              {!isScanning && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">카메라를 시작하는 중...</p>
                </div>
              )}
              <div
                id="reader"
                className="w-full mb-4 rounded-lg overflow-hidden"
                style={{ minHeight: isScanning ? 'auto' : '300px' }}
              ></div>
              {isScanning && (
                <p className="text-center text-gray-600">
                  QR 코드를 카메라에 맞춰주세요
                </p>
              )}
              <div className="mt-4 text-center">
                <button
                  onClick={async () => {
                    await stopScanner()
                    setStatus('idle')
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  스캔 중지
                </button>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="inline-block bg-green-100 rounded-full p-4 mb-4">
                <svg
                  className="w-16 h-16 text-green-600"
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
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                체크인 완료!
              </h2>
              <p className="text-xl text-gray-900 mb-6">{attendeeName}님</p>
              <button
                onClick={async () => {
                  if (!attendeeId) return
                  
                  try {
                    await supabase
                      .from('attendees')
                      .update({ printed: true })
                      .eq('id', attendeeId)
                    
                    window.open(`/badge/${params.eventId}?attendeeId=${attendeeId}`, '_blank')
                  } catch (err) {
                    console.error('Print error:', err)
                  }
                }}
                className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                명찰 출력
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="inline-block bg-red-100 rounded-full p-4 mb-4">
                <svg
                  className="w-16 h-16 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">오류</h2>
              <p className="text-lg text-gray-900 mb-4">{message}</p>
              {attendeeName && (
                <p className="text-gray-600 mb-4">{attendeeName}님</p>
              )}
              <button
                onClick={handleStartScan}
                className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

