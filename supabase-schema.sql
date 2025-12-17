-- 행사 참석 관리 서비스 데이터베이스 스키마

-- events 테이블 생성
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- attendees 테이블 생성
CREATE TABLE IF NOT EXISTS public.attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    qr_token TEXT NOT NULL UNIQUE,
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    printed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_attendees_event_id ON public.attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_qr_token ON public.attendees(qr_token);
CREATE INDEX IF NOT EXISTS idx_attendees_checked_in ON public.attendees(checked_in);

-- Realtime 활성화 (실시간 업데이트를 위해 필요)
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendees;

-- RLS (Row Level Security) 정책 설정 (익명 접근 허용)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

-- events 테이블 정책: 모든 사용자가 읽기/쓰기 가능
CREATE POLICY "Allow all operations on events" ON public.events
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- attendees 테이블 정책: 모든 사용자가 읽기/쓰기 가능
CREATE POLICY "Allow all operations on attendees" ON public.attendees
    FOR ALL
    USING (true)
    WITH CHECK (true);

