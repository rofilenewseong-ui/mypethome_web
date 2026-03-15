# PetHolo 컴포넌트 시스템

**프로젝트 경로:** `/Users/ferion/Desktop/petholo/`
**프레임워크:** Next.js 16 + React 19 + Tailwind 4 + Zustand 5
**최종 정비일:** 2026-03-05

## UI 컴포넌트 목록 (14개)

모두 `apps/web/src/components/ui/`에 위치. 배럴 export: `index.ts`

```ts
import { Button, Card, Modal, Skeleton, Badge, Avatar, Alert, ProgressBar, EmptyState, TabToggle, FormField, ListItem, Toggle, Stepper } from '@/components/ui';
```

### 기존 컴포넌트 (건드리지 않음)
| 컴포넌트 | Props |
|---------|-------|
| Button | variant(primary/secondary/ghost/danger), size(sm/md/lg), fullWidth, disabled, loading, type |
| Card | children, className, onClick, hover |
| Modal | isOpen, onClose, title, children |

### 기본 컴포넌트 (Phase 1)
| 컴포넌트 | Props |
|---------|-------|
| Skeleton | variant(rect/circle), height, width, count, className |
| Badge | variant(default/status/tier/count/info), color, size(sm/md), pill, className |
| Avatar | src, fallback(emoji), size(xs/sm/md/lg/xl), online, className |
| Alert | variant(info/success/warning/error), icon, children, className |
| ProgressBar | value(0-100), color, height, showLabel, className |

### 복합 컴포넌트 (Phase 2)
| 컴포넌트 | Props |
|---------|-------|
| EmptyState | emoji, title, description, action({label,onClick}), className |
| TabToggle | tabs([{key,label,count?}]), activeTab, onChange, variant(filled/pill), className |
| FormField | label, icon, required, type, value, onChange, placeholder, multiline, error, className |
| ListItem | icon, label, description, trailing(ReactNode), onClick, className |
| Toggle | enabled, onChange, disabled, size(sm/md) |
| Stepper | totalSteps, currentStep, variant(dots/circles), labels, className |

## 디자인 토큰 (globals.css)

### 폰트 크기 토큰
- `--font-2xs: 9px` — 아주 작은 텍스트
- `--font-xs: 11px` — 작은 텍스트
- `--font-sm: 13px` — 본문 소

### @theme inline 매핑 (Tailwind용)
bg-warm, bg-card, bg-input, bg-card-hover, bg-white, text-primary, text-secondary, text-muted, text-inverse, accent-warm, accent-green, accent-red, accent-orange, accent-warm-bg, accent-blue, border-card, border-input, border-hover

## 페이지별 사용 컴포넌트

| 페이지 | 사용 컴포넌트 |
|--------|-------------|
| settings | TabToggle, ListItem, Toggle, Badge, Skeleton, Avatar, Card, Button, Modal |
| trash | TabToggle, Skeleton, EmptyState, Badge, Alert, Button, Modal |
| home | Skeleton, EmptyState, Badge, Avatar, Alert, Card, Button |
| messenger | Skeleton, EmptyState, Avatar, Badge |
| pets/manage | Skeleton, EmptyState, Avatar, Badge, Card, Button |
| pets/register | FormField, Stepper, Card, Button |
| auth | TabToggle, Alert, Button |
| profiles | Skeleton, EmptyState, Badge, Alert, Card, Button |
| pets/[id] | Skeleton, EmptyState, Avatar, Badge, Card, Button |
| admin | Badge, Avatar, ProgressBar |
| store | Badge, Card, Button, Modal |
| landing (/) | Badge, Button |
| profiles/new | Stepper, Badge, ProgressBar, Card, Button |

## 건드리지 않는 것
- MobileLayout, TopBar, BottomNav — 레이아웃 안정적
- player/[profileId] — 다크테마 전용 특수 UI
- profiles/[id]/settings — 도메인 특화 UI
