# 행사 참석 관리 서비스 (Hangshow)

소규모 오프라인 행사에서 참가자 사전 신청 → QR 체크인 → 명찰 출력까지 지원하는 웹 서비스입니다.

## 기술 스택

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Supabase (Database + Realtime)

## 환경 설정

1. 의존성 설치
```bash
npm install
```

2. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 변수를 설정하세요:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. 개발 서버 실행
```bash
npm run dev
```

## Supabase 테이블 구조

### events
- id (uuid, PK)
- title (text)
- date (date)
- status (text)
- created_at (timestamptz)

### attendees
- id (uuid, PK)
- event_id (uuid, FK)
- name (text)
- phone (text)
- qr_token (text)
- checked_in (boolean)
- checked_in_at (timestamptz)
- printed (boolean)
- created_at (timestamptz)

## 라우팅 구조

- `/event/[eventId]` - 행사 안내 및 참가 신청
- `/event/[eventId]/complete` - 신청 완료 및 QR 코드
- `/host/[eventId]` - 행사 관리 대시보드
- `/host/[eventId]/attendees` - 참가자 목록
- `/checkin/[eventId]` - QR 체크인 화면

# hangshow
