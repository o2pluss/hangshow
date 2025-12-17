# Supabase 설정 가이드

## 1. Supabase 프로젝트 접속

Supabase 대시보드(https://supabase.com)에 로그인하고 프로젝트를 선택합니다.

## 2. SQL Editor에서 스키마 실행

1. Supabase 대시보드에서 **SQL Editor** 메뉴로 이동
2. `supabase-schema.sql` 파일의 내용을 복사하여 붙여넣기
3. **Run** 버튼 클릭하여 실행

## 3. Realtime 설정 확인

1. **Database** → **Replication** 메뉴로 이동
2. `events`와 `attendees` 테이블이 활성화되어 있는지 확인
3. 활성화되어 있지 않다면 각 테이블 옆의 토글을 켜기

## 4. 테이블 구조 확인

**Database** → **Tables** 메뉴에서 다음 테이블이 생성되었는지 확인:

### events 테이블
- `id` (uuid, primary key)
- `title` (text)
- `date` (date)
- `status` (text)
- `created_at` (timestamptz)

### attendees 테이블
- `id` (uuid, primary key)
- `event_id` (uuid, foreign key → events.id)
- `name` (text)
- `phone` (text)
- `qr_token` (text, unique)
- `checked_in` (boolean)
- `checked_in_at` (timestamptz)
- `printed` (boolean)
- `created_at` (timestamptz)

## 5. 환경 변수 확인

`.env.local` 파일이 올바르게 설정되어 있는지 확인:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 완료!

이제 애플리케이션을 실행하면 정상적으로 작동합니다.

