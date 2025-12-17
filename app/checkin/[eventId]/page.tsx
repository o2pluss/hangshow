'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
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
  const [debugLogs, setDebugLogs] = useState<Array<{ type: 'log' | 'error' | 'warn' | 'info', message: string, timestamp: Date }>>([])
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const isMobileRef = useRef(/iPhone|iPad|iPod|Android/i.test(typeof window !== 'undefined' ? navigator.userAgent : ''))
  const isMobile = isMobileRef.current

  // 디버그 로그 추가 함수
  const addDebugLogRef = useRef<(type: 'log' | 'error' | 'warn' | 'info', message: string) => void>()
  addDebugLogRef.current = (type: 'log' | 'error' | 'warn' | 'info', message: string) => {
    const logMessage = typeof message === 'string' ? message : JSON.stringify(message, null, 2)
    setDebugLogs(prev => [...prev.slice(-49), { type, message: logMessage, timestamp: new Date() }])
  }

  // 콘솔 가로채기 설정
  useEffect(() => {
    if (!isMobileRef.current) return

    const addDebugLog = (type: 'log' | 'error' | 'warn' | 'info', message: string) => {
      if (addDebugLogRef.current) {
        addDebugLogRef.current(type, message)
      }
    }

    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn
    const originalInfo = console.info

    console.log = (...args: any[]) => {
      originalLog(...args)
      addDebugLog('log', args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '))
    }

    console.error = (...args: any[]) => {
      originalError(...args)
      addDebugLog('error', args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '))
    }

    console.warn = (...args: any[]) => {
      originalWarn(...args)
      addDebugLog('warn', args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '))
    }

    console.info = (...args: any[]) => {
      originalInfo(...args)
      addDebugLog('info', args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '))
    }

    // 에러 이벤트 리스너
    const handleError = (event: ErrorEvent) => {
      addDebugLog('error', `Error: ${event.message} at ${event.filename}:${event.lineno}`)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addDebugLog('error', `Unhandled Promise Rejection: ${event.reason}`)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
      console.info = originalInfo
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [isMobile])

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
        await scannerRef.current.stop()
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
      const scanner = new Html5Qrcode('reader')
      scannerRef.current = scanner

      // 모바일 환경 감지
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      const qrboxSize = isMobile ? Math.min(window.innerWidth * 0.8, 300) : 250

      // 카메라 디바이스 선택 (아이폰에서는 facingMode를 직접 사용)
      let cameraIdOrConfig: string | { facingMode: string } = { facingMode: 'environment' }
      
      // 아이폰이 아닌 경우에만 카메라 디바이스 목록 가져오기 시도
      if (!isIOS) {
        try {
          // 카메라 디바이스 목록 가져오기
          const devices = await Html5Qrcode.getCameras()
          if (devices && devices.length > 0) {
            // 후면 카메라 찾기
            const backCamera = devices.find(device => 
              device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('rear') ||
              device.label.toLowerCase().includes('environment')
            )
            
            // 후면 카메라가 없으면 첫 번째 카메라 사용
            cameraIdOrConfig = backCamera?.id || devices[0].id
            console.log('Using camera:', backCamera?.label || devices[0].label)
          }
        } catch (deviceError) {
          // 디바이스 목록을 가져올 수 없으면 facingMode 사용
          console.log('Could not get camera devices, using facingMode:', deviceError)
          cameraIdOrConfig = { facingMode: 'environment' }
        }
      } else {
        console.log('iOS detected, using facingMode directly')
      }

      // 아이폰 특화 설정
      const config: any = {
        fps: isIOS ? 5 : 10, // 아이폰에서는 FPS를 낮춤
        qrbox: { width: qrboxSize, height: qrboxSize },
        aspectRatio: 1.0,
      }

      // 아이폰에서는 facingMode를 직접 사용하는 것이 더 안정적
      const cameraConfig = isIOS 
        ? { facingMode: 'environment' }
        : (typeof cameraIdOrConfig === 'string' ? cameraIdOrConfig : { facingMode: 'environment' })

      const configLog = { cameraConfig, isIOS, qrboxSize }
      console.log('Starting scanner with config:', configLog)
      if (addDebugLogRef.current) {
        addDebugLogRef.current('info', `스캐너 시작: ${JSON.stringify(configLog)}`)
      }

      // 타임아웃 설정 (10초)
      const timeoutId = setTimeout(() => {
        if (!scannerStartedRef.current) {
          const timeoutMsg = 'Scanner start timeout'
          console.error(timeoutMsg)
          if (addDebugLogRef.current) {
            addDebugLogRef.current('error', timeoutMsg)
          }
          setStatus('error')
          setMessage('카메라 시작 시간이 초과되었습니다. 페이지를 새로고침하고 다시 시도해주세요.')
          setIsScanning(false)
        }
      }, 10000)

      // Html5Qrcode가 직접 카메라 권한을 요청하도록 함
      await scanner.start(
        cameraConfig,
        config,
        (decodedText) => {
          clearTimeout(timeoutId)
          handleCheckIn(extractTokenFromUrl(decodedText))
        },
        (errorMessage) => {
          // 스캔 중 에러는 무시 (계속 스캔)
          console.log('Scan error (ignored):', errorMessage)
        }
      )

      clearTimeout(timeoutId)

      // 카메라가 실제로 시작되었는지 확인 (iOS에서 중요)
      await new Promise(resolve => setTimeout(resolve, 500)) // 짧은 대기
      
      // reader 요소 내부에 video 요소가 있는지 확인
      const readerElement = document.getElementById('reader')
      if (readerElement) {
        const videoElement = readerElement.querySelector('video')
        if (!videoElement) {
          throw new Error('카메라 비디오 요소를 찾을 수 없습니다. 카메라가 시작되지 않았을 수 있습니다.')
        }
        
        // 비디오가 실제로 재생 중인지 확인
        if (videoElement.readyState === 0 || videoElement.paused) {
          console.warn('Video element found but not playing, waiting...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          if (videoElement.readyState === 0 || videoElement.paused) {
            throw new Error('카메라 비디오 스트림이 시작되지 않았습니다.')
          }
        }
        
        console.log('Video element confirmed:', {
          readyState: videoElement.readyState,
          paused: videoElement.paused,
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight
        })
        
        if (addDebugLogRef.current) {
          addDebugLogRef.current('info', `비디오 확인: readyState=${videoElement.readyState}, paused=${videoElement.paused}, size=${videoElement.videoWidth}x${videoElement.videoHeight}`)
        }
      } else {
        throw new Error('Reader 요소를 찾을 수 없습니다.')
      }

      setIsScanning(true)
      scannerStartedRef.current = true
      console.log('Scanner started successfully')
      if (addDebugLogRef.current) {
        addDebugLogRef.current('info', '스캐너 시작 성공')
      }
    } catch (err: any) {
      console.error('Scanner error:', err)
      const errorDetails = {
        name: err.name,
        message: err.message,
        stack: err.stack,
        fullError: JSON.stringify(err, Object.getOwnPropertyNames(err))
      }
      
      if (addDebugLogRef.current) {
        addDebugLogRef.current('error', `스캐너 에러: ${err.name || 'Unknown'} - ${err.message || JSON.stringify(err)}`)
        addDebugLogRef.current('error', `에러 상세: ${JSON.stringify(errorDetails)}`)
      }
      
      setStatus('error')
      let errorMsg = '카메라를 시작할 수 없습니다.'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied')) {
        errorMsg = '카메라 권한이 거부되었습니다. 브라우저 주소창의 카메라 아이콘을 클릭하여 권한을 허용해주세요.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.message?.includes('No camera')) {
        errorMsg = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.'
      } else if (err.name === 'NotReadableError' || err.message?.includes('Could not start video stream')) {
        errorMsg = '카메라에 접근할 수 없습니다. 다른 애플리케이션에서 카메라를 사용 중인지 확인해주세요.'
      } else if (err.message?.includes('비디오 요소를 찾을 수 없습니다') || err.message?.includes('비디오 스트림이 시작되지 않았습니다')) {
        errorMsg = '카메라가 시작되었지만 화면에 표시되지 않습니다. 페이지를 새로고침하고 다시 시도해주세요.'
        if (addDebugLogRef.current) {
          addDebugLogRef.current('warn', '카메라 스트림 시작 문제 감지 - iOS 브라우저 호환성 문제일 수 있음')
        }
      } else if (err.message) {
        errorMsg = err.message
      }
      
      setMessage(errorMsg)
      setIsScanning(false)
      scannerStartedRef.current = false
      
      // 스캐너 정리
      try {
        if (scannerRef.current) {
          await scannerRef.current.stop().catch(() => {})
          await scannerRef.current.clear().catch(() => {})
        }
      } catch (cleanupError) {
        console.log('Cleanup error (ignored):', cleanupError)
      }
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
      {/* 디버그 패널 토글 버튼 (모바일에서만 표시) */}
      {isMobile && (
        <button
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className="fixed top-4 right-4 z-50 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs shadow-lg"
        >
          {showDebugPanel ? '디버그 숨기기' : '디버그 보기'}
        </button>
      )}

      {/* 디버그 패널 */}
      {isMobile && showDebugPanel && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 text-white p-4 max-h-64 overflow-y-auto border-t border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold">디버그 로그</h3>
            <button
              onClick={() => setDebugLogs([])}
              className="text-xs bg-red-600 px-2 py-1 rounded"
            >
              지우기
            </button>
          </div>
          <div className="space-y-1 text-xs font-mono">
            {debugLogs.length === 0 ? (
              <p className="text-gray-500">로그가 없습니다</p>
            ) : (
              debugLogs.map((log, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    log.type === 'error'
                      ? 'bg-red-900/50 text-red-200'
                      : log.type === 'warn'
                      ? 'bg-yellow-900/50 text-yellow-200'
                      : log.type === 'info'
                      ? 'bg-blue-900/50 text-blue-200'
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs">
                      {log.type.toUpperCase()}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="break-words whitespace-pre-wrap">{log.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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

