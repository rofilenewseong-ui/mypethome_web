'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { adminApi, analyticsApi } from '@/lib/api';
import { Badge, Avatar, ProgressBar } from '@/components/ui';

// 데모 데이터 (fallback)
const demoStats = [
  { label: '전체 사용자', value: '128', change: '+12', icon: '👥' },
  { label: 'Silver 사용자', value: '94', change: '73.4%', icon: '⭐' },
  { label: '생성된 프로필', value: '312', change: '+28', icon: '🎬' },
  { label: '총 크레딧 사용', value: '15,840', change: '평균 123.7', icon: '💰' },
];

const demoKeyMetrics = [
  { label: '평균 시청 시간', value: '8분 32초', change: '+14%', positive: true },
  { label: '모션 클릭/세션', value: '4.7회', change: '+21%', positive: true },
  { label: '메신저 참여율', value: '69.5%', change: '+5%', positive: true },
  { label: '7일 리텐션', value: '72.3%', change: '-2%', positive: false },
];

const demoActivityLogs = [
  { time: '14:32', type: 'success', message: '사용자 #128 Silver 인증 완료' },
  { time: '14:28', type: 'info', message: '프로필 #312 베이스 영상 생성 시작' },
  { time: '14:15', type: 'success', message: '크레딧 충전 - 사용자 #95 (+120C)' },
  { time: '13:58', type: 'warn', message: 'Kling API 응답 지연 (12.3s)' },
  { time: '13:42', type: 'error', message: 'Gemini API 실패 - Rate limit exceeded' },
  { time: '13:30', type: 'info', message: '자동 삭제 실행 - 휴지통 5건 영구삭제' },
  { time: '12:55', type: 'success', message: '사용자 #127 펫 등록 완료 (코코)' },
];

const navItems = [
  { key: 'dashboard', icon: '📊', label: '대시보드' },
  { key: 'users', icon: '👥', label: '사용자 관리', badge: '128' },
  { key: 'credits', icon: '💰', label: '크레딧 관리' },
  { key: 'videos', icon: '🎬', label: '영상 분석', badge: '3' },
  { key: 'pets', icon: '🐾', label: '펫 데이터' },
  { key: 'messenger', icon: '💬', label: '메신저 분석' },
  { key: 'codes', icon: '🔑', label: '코드 관리' },
  { key: 'logs', icon: '📋', label: '시스템 로그' },
  { key: 'settings', icon: '⚙️', label: '설정' },
];

const ageDistribution = [
  { age: '20대', percentage: 15 },
  { age: '30대', percentage: 32 },
  { age: '40대', percentage: 31 },
  { age: '50대', percentage: 15 },
  { age: '60대+', percentage: 7 },
];

const locationDistribution = [
  { region: '서울', percentage: 38 },
  { region: '경기', percentage: 24 },
  { region: '부산', percentage: 12 },
  { region: '인천', percentage: 8 },
  { region: '대구', percentage: 6 },
  { region: '기타', percentage: 12 },
];

interface DashboardData {
  totalUsers: number;
  todaySignups: number;
  silverUsers: number;
  totalVideos: number;
  totalMotions: number;
  analytics?: {
    today?: {
      activeUsers?: number;
      totalPageViews?: number;
      totalPlaybackMinutes?: number;
      avgPlaybackMinutes?: number;
      totalMotionTaps?: number;
      totalMessagesSent?: number;
      totalCreditsSpent?: number;
      totalCreditsEarned?: number;
      newPets?: number;
      newProfiles?: number;
      newBaseVideos?: number;
      newMotions?: number;
      topPages?: Array<{ path: string; views: number }>;
    };
    yesterday?: Record<string, unknown>;
    trend?: Array<Record<string, unknown>>;
  };
}

function formatNum(n: number): string {
  return n >= 1000 ? n.toLocaleString() : String(n);
}

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await adminApi.dashboard();
        if (data?.data) {
          setDashboardData(data.data);
        }
      } catch {
        // API 실패 시 데모 데이터 유지
      }
    };
    fetchDashboard();
  }, []);

  const dd = dashboardData;
  const todayAnalytics = dd?.analytics?.today;

  const stats = dd ? [
    { label: '전체 사용자', value: formatNum(dd.totalUsers), change: `+${dd.todaySignups}`, icon: '👥' },
    { label: 'Silver 사용자', value: formatNum(dd.silverUsers), change: dd.totalUsers > 0 ? `${Math.round(dd.silverUsers / dd.totalUsers * 100)}%` : '0%', icon: '⭐' },
    { label: '오늘 활성 사용자', value: formatNum(todayAnalytics?.activeUsers || 0), change: `PV ${todayAnalytics?.totalPageViews || 0}`, icon: '📊' },
    { label: '총 크레딧 사용', value: formatNum(todayAnalytics?.totalCreditsSpent || 0), change: `+${todayAnalytics?.totalCreditsEarned || 0}`, icon: '💰' },
  ] : demoStats;

  const keyMetrics = dd && todayAnalytics ? [
    {
      label: '평균 시청 시간',
      value: `${Math.floor(todayAnalytics.avgPlaybackMinutes || 0)}분 ${Math.round(((todayAnalytics.avgPlaybackMinutes || 0) % 1) * 60)}초`,
      change: `총 ${Math.round(todayAnalytics.totalPlaybackMinutes || 0)}분`,
      positive: true,
    },
    {
      label: '모션 클릭 수',
      value: `${todayAnalytics.totalMotionTaps || 0}회`,
      change: `영상 ${dd.totalVideos}`,
      positive: true,
    },
    {
      label: '메시지 발송',
      value: `${todayAnalytics.totalMessagesSent || 0}건`,
      change: `모션 ${dd.totalMotions}`,
      positive: true,
    },
    {
      label: '신규 등록',
      value: `${(todayAnalytics.newPets || 0) + (todayAnalytics.newProfiles || 0)}건`,
      change: `펫 ${todayAnalytics.newPets || 0} / 프로필 ${todayAnalytics.newProfiles || 0}`,
      positive: true,
    },
  ] : demoKeyMetrics;

  const activityLogs = demoActivityLogs;

  // 관리자 권한 체크
  if (user?.role !== 'admin' && user?.role !== 'ADMIN') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--bg-warm)' }}
      >
        <div className="text-center">
          <span className="text-4xl">🔒</span>
          <h2 className="text-lg font-bold mt-3" style={{ color: 'var(--text-primary)' }}>
            접근 권한이 없습니다
          </h2>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
            관리자 계정으로 로그인해주세요
          </p>
          <button
            onClick={() => router.push('/home')}
            className="px-4 py-2 rounded-[var(--radius-sm)] text-sm font-bold"
            style={{ background: 'var(--accent-warm)', color: '#fff' }}
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f8f6f2' }}>
      {/* 사이드바 */}
      <aside
        className={`
          fixed lg:static top-0 left-0 h-full z-40
          w-[240px] flex flex-col
          transition-transform duration-300
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ background: 'var(--bg-warm)', borderRight: '1px solid var(--border-card)' }}
      >
        <div className="p-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-card)' }}>
          <span className="text-xl">🐾</span>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            PetHolo Admin
          </span>
          <Badge variant="count" className="ml-auto">관리자</Badge>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveNav(item.key); setSidebarOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-left transition-all"
              style={{
                background: activeNav === item.key ? 'var(--accent-warm-bg)' : 'transparent',
                color: activeNav === item.key ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-xs font-semibold flex-1">{item.label}</span>
              {item.badge && <Badge variant="count">{item.badge}</Badge>}
            </button>
          ))}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid var(--border-card)' }}>
          <div className="flex items-center gap-2">
            <Avatar fallback="👤" size="sm" />
            <div>
              <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {user?.name || '관리자'}
              </p>
              <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                {user?.email || 'admin@petholo.com'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 min-w-0">
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6 h-14"
          style={{ background: 'rgba(248, 246, 242, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-card)' }}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-lg p-1" style={{ color: 'var(--text-secondary)' }}>
              ☰
            </button>
            <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {navItems.find((n) => n.key === activeNav)?.label || '대시보드'}
            </h1>
          </div>
          <button
            onClick={() => router.push('/home')}
            className="text-xs px-3 py-1.5 rounded-[var(--radius-sm)]"
            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-card)' }}
          >
            앱으로 돌아가기
          </button>
        </header>

        <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
          {/* 실시간 통계 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[var(--radius-md)] p-4"
                style={{ background: 'var(--bg-warm)', border: '1px solid var(--border-card)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{stat.icon}</span>
                  <Badge variant="info" size="sm">{stat.change}</Badge>
                </div>
                <p className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {stat.value}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* 핵심 지표 */}
          <section
            className="rounded-[var(--radius-lg)] p-4 lg:p-5"
            style={{ background: 'var(--bg-warm)', border: '1px solid var(--border-card)' }}
          >
            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              📈 핵심 지표
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {keyMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="p-3 rounded-[var(--radius-sm)]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
                >
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{metric.label}</p>
                  <p className="text-base font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{metric.value}</p>
                  <span
                    className="text-[9px] font-bold"
                    style={{ color: metric.positive ? 'var(--accent-green)' : 'var(--accent-red)' }}
                  >
                    {metric.change}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 사용자 분포 */}
          <div className="grid lg:grid-cols-2 gap-4">
            <section
              className="rounded-[var(--radius-lg)] p-4 lg:p-5"
              style={{ background: 'var(--bg-warm)', border: '1px solid var(--border-card)' }}
            >
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                👥 연령대 분포
              </h3>
              <div className="space-y-2.5">
                {ageDistribution.map((item) => (
                  <div key={item.age} className="flex items-center gap-3">
                    <span className="text-[11px] w-10 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {item.age}
                    </span>
                    <div className="flex-1">
                      <ProgressBar value={item.percentage} color="var(--accent-warm)" height="16px" />
                    </div>
                    <span className="text-[11px] font-bold w-10" style={{ color: 'var(--text-primary)' }}>
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section
              className="rounded-[var(--radius-lg)] p-4 lg:p-5"
              style={{ background: 'var(--bg-warm)', border: '1px solid var(--border-card)' }}
            >
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                📍 지역 분포
              </h3>
              <div className="space-y-2.5">
                {locationDistribution.map((item) => (
                  <div key={item.region} className="flex items-center gap-3">
                    <span className="text-[11px] w-10 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {item.region}
                    </span>
                    <div className="flex-1">
                      <ProgressBar value={item.percentage} color="var(--accent-orange)" height="16px" />
                    </div>
                    <span className="text-[11px] font-bold w-10" style={{ color: 'var(--text-primary)' }}>
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 활동 로그 */}
          <section
            className="rounded-[var(--radius-lg)] p-4 lg:p-5"
            style={{ background: 'var(--bg-warm)', border: '1px solid var(--border-card)' }}
          >
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              📋 최근 활동
            </h3>
            <div className="space-y-2">
              {activityLogs.map((log, i) => {
                const typeColors: Record<string, string> = {
                  success: 'var(--accent-green)',
                  info: '#7B9DB6',
                  warn: 'var(--accent-orange)',
                  error: 'var(--accent-red)',
                };
                const typeLabels: Record<string, string> = {
                  success: '성공',
                  info: '정보',
                  warn: '경고',
                  error: '오류',
                };
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2"
                    style={{ borderBottom: i < activityLogs.length - 1 ? '1px solid var(--border-card)' : 'none' }}
                  >
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {log.time}
                    </span>
                    <Badge color={typeColors[log.type]} pill={false}>
                      {typeLabels[log.type]}
                    </Badge>
                    <p className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                      {log.message}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
