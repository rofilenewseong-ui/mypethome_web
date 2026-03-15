'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useDevStore } from '@/stores/useDevStore';

// ─── React Fiber 정보 추출 ──────────────────────────────────
interface FiberSource {
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
  componentName: string;
}

interface ElementInfo {
  tagName: string;
  className: string;
  id: string;
  textContent: string;
  componentName: string;
  fiberSource: FiberSource | null;
  computedStyles: Record<string, string>;
}

function getElementInfo(el: HTMLElement): ElementInfo {
  const tagName = el.tagName.toLowerCase();
  const className = typeof el.className === 'string' ? el.className : '';
  const id = el.id || '';

  let directText = '';
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      directText += node.textContent || '';
    }
  }
  const textContent = directText.trim() || (el.textContent || '').trim().slice(0, 200);

  let componentName = 'Unknown';
  let fiberSource: FiberSource | null = null;

  const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
  if (fiberKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fiber = (el as any)[fiberKey];
    while (fiber) {
      if (fiber.type && typeof fiber.type === 'function') {
        componentName = fiber.type.displayName || fiber.type.name || componentName;
      }
      if (fiber._debugSource) {
        fiberSource = {
          fileName: fiber._debugSource.fileName,
          lineNumber: fiber._debugSource.lineNumber,
          columnNumber: fiber._debugSource.columnNumber,
          componentName,
        };
        break;
      }
      fiber = fiber.return;
    }
  }

  // 주요 computed styles
  const computed = window.getComputedStyle(el);
  const styleProps = ['color', 'background-color', 'font-size', 'padding', 'margin', 'border-radius', 'width', 'height'];
  const computedStyles: Record<string, string> = {};
  for (const prop of styleProps) {
    const val = computed.getPropertyValue(prop);
    if (val && val !== 'none' && val !== 'normal' && val !== '0px') {
      computedStyles[prop] = val;
    }
  }

  return { tagName, className, id, textContent, componentName, fiberSource, computedStyles };
}

// ─── API 호출 ────────────────────────────────────────────
const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:4000`
  : '';

async function searchText(text: string): Promise<{ filePath: string; lineNumber: number; context: string }[]> {
  const res = await fetch(`${API_BASE}/api/dev/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

async function sendRequest(payload: {
  element: {
    tagName: string;
    componentName: string;
    className: string;
    textContent: string;
    currentUrl: string;
    computedStyles: Record<string, string>;
  };
  source: { filePath: string; lineNumber: number } | null;
  request: string;
}): Promise<{ success: boolean; message: string; id?: string }> {
  const res = await fetch(`${API_BASE}/api/dev/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return data;
}

function shortPath(fullPath: string): string {
  const idx = fullPath.indexOf('/apps/web/src/');
  if (idx !== -1) return fullPath.slice(idx + '/apps/web/src/'.length);
  const idx2 = fullPath.indexOf('/src/');
  if (idx2 !== -1) return fullPath.slice(idx2 + 1);
  return fullPath;
}

// ─── DevInspector 컴포넌트 ───────────────────────────────
export default function DevInspector() {
  const {
    enabled,
    hoveredElement,
    selectedElement,
    editPanelOpen,
    isSending,
    lastSendResult,
    toggle,
    setHoveredElement,
    selectElement,
    clearSelection,
    setSending,
    setSendResult,
    addRequest,
  } = useDevStore();

  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [elementInfo, setElementInfo] = useState<ElementInfo | null>(null);
  const [requestText, setRequestText] = useState('');
  const [searchResults, setSearchResults] = useState<{ filePath: string; lineNumber: number; context: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ filePath: string; lineNumber: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    console.log('[DevInspector] mounted');
  }, []);

  // ─── 키보드 단축키 (Ctrl+Shift+D) ──────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  // ─── 요소 선택 시 정보 로드 ────────────────────────────
  useEffect(() => {
    if (!selectedElement) {
      setElementInfo(null);
      setRequestText('');
      return;
    }

    const info = getElementInfo(selectedElement);
    setElementInfo(info);
    setRequestText('');

    // 소스 파일 검색
    setSearchResults([]);
    setSelectedFile(
      info.fiberSource
        ? { filePath: info.fiberSource.fileName, lineNumber: info.fiberSource.lineNumber }
        : null
    );

    if (!info.fiberSource && info.textContent.length >= 2) {
      setIsSearching(true);
      const searchStr = info.textContent.slice(0, 50);
      searchText(searchStr)
        .then((results) => {
          setSearchResults(results);
          if (results.length === 1) {
            setSelectedFile({ filePath: results[0].filePath, lineNumber: results[0].lineNumber });
          }
        })
        .finally(() => setIsSearching(false));
    }

    // textarea 자동 포커스
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, [selectedElement]);

  // ─── 호버 오버레이 ─────────────────────────────────────
  useEffect(() => {
    if (!overlayRef.current || !tooltipRef.current) return;
    if (!hoveredElement || !enabled) {
      overlayRef.current.style.display = 'none';
      tooltipRef.current.style.display = 'none';
      return;
    }

    const rect = hoveredElement.getBoundingClientRect();
    const overlay = overlayRef.current;
    const tooltip = tooltipRef.current;

    overlay.style.display = 'block';
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    const info = getElementInfo(hoveredElement);
    tooltip.style.display = 'block';
    const label = info.componentName !== 'Unknown'
      ? `<${info.tagName}> ${info.componentName}`
      : `<${info.tagName}>${info.className ? ' .' + info.className.split(' ')[0] : ''}`;
    tooltip.textContent = label;

    const tooltipTop = rect.top + window.scrollY - 28;
    tooltip.style.top = `${tooltipTop < window.scrollY ? rect.bottom + window.scrollY + 4 : tooltipTop}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;
  }, [hoveredElement, enabled]);

  // ─── 마우스 이벤트 ─────────────────────────────────────
  const handleMouseOver = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-dev-inspector]')) return;
      setHoveredElement(target);
    },
    [enabled, setHoveredElement]
  );

  const handleMouseOut = useCallback(() => {
    if (!enabled) return;
    setHoveredElement(null);
  }, [enabled, setHoveredElement]);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-dev-inspector]')) return;
      e.preventDefault();
      e.stopPropagation();
      const src = getElementInfo(target).fiberSource;
      selectElement(target, src);
    },
    [enabled, selectElement]
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.removeEventListener('click', handleClick, true);
    };
  }, [enabled, handleMouseOver, handleMouseOut, handleClick]);

  // ─── Claude에게 수정 요청 보내기 ──────────────────────
  const handleSendRequest = async () => {
    if (!requestText.trim() || !elementInfo) return;
    setSending(true);
    setSendResult(null);

    try {
      const result = await sendRequest({
        element: {
          tagName: elementInfo.tagName,
          componentName: elementInfo.componentName,
          className: elementInfo.className.split(' ').slice(0, 5).join(' '),
          textContent: elementInfo.textContent.slice(0, 200),
          currentUrl: window.location.pathname,
          computedStyles: elementInfo.computedStyles,
        },
        source: selectedFile,
        request: requestText.trim(),
      });

      setSendResult(result);

      if (result.success) {
        addRequest({
          id: result.id || `req-${Date.now()}`,
          timestamp: new Date().toISOString(),
          element: {
            tagName: elementInfo.tagName,
            componentName: elementInfo.componentName,
            className: elementInfo.className.split(' ').slice(0, 5).join(' '),
            textContent: elementInfo.textContent.slice(0, 100),
            currentUrl: window.location.pathname,
          },
          source: selectedFile,
          request: requestText.trim(),
          status: 'pending',
        });
        setRequestText('');
      }
    } catch {
      setSendResult({ success: false, message: '요청 전송 실패' });
    } finally {
      setSending(false);
    }
  };

  // Ctrl+Enter로 전송
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendRequest();
    }
  };

  // ─── 렌더링 ─────────────────────────────────────────────
  return (
    <>
      {/* 호버 오버레이 */}
      <div
        ref={overlayRef}
        data-dev-inspector
        style={{
          display: 'none',
          position: 'absolute',
          pointerEvents: 'none',
          border: '2px solid #3B82F6',
          borderRadius: '2px',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          zIndex: 9998,
          transition: 'all 0.1s ease',
        }}
      />

      {/* 호버 툴팁 */}
      <div
        ref={tooltipRef}
        data-dev-inspector
        style={{
          display: 'none',
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 9998,
          backgroundColor: '#1E293B',
          color: '#E2E8F0',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          maxWidth: '500px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      />

      {/* 플로팅 토글 버튼 */}
      <button
        data-dev-inspector
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '16px',
          zIndex: 9999,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: enabled ? '3px solid #fff' : '2px solid rgba(255,255,255,0.5)',
          backgroundColor: enabled ? '#3B82F6' : '#64748B',
          color: '#fff',
          fontSize: '18px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        title="Dev Inspector (Ctrl+Shift+D)"
      >
        {enabled ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        )}
      </button>

      {/* 활성화 배너 */}
      {enabled && !editPanelOpen && (
        <div
          data-dev-inspector
          style={{
            position: 'fixed',
            top: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: '#3B82F6',
            color: '#fff',
            padding: '4px 16px',
            borderRadius: '0 0 8px 8px',
            fontSize: '12px',
            fontWeight: '600',
            pointerEvents: 'none',
          }}
        >
          요소를 클릭하면 Claude에게 수정 요청할 수 있습니다
        </div>
      )}

      {/* ─── 수정 요청 패널 ──────────────────────── */}
      {editPanelOpen && selectedElement && elementInfo && (
        <div
          data-dev-inspector
          style={{
            position: 'fixed',
            bottom: '0',
            left: '0',
            right: '0',
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#E2E8F0',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: '13px',
            maxHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px 16px 0 0',
          }}
        >
          {/* 핸들 바 + 닫기 */}
          <div
            style={{
              padding: '8px 16px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#334155', margin: '0 auto' }} />
            <button
              data-dev-inspector
              onClick={clearSelection}
              style={{
                position: 'absolute',
                right: '12px',
                top: '8px',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '20px',
                padding: '4px',
                lineHeight: 1,
              }}
            >
              &times;
            </button>
          </div>

          {/* 선택된 요소 정보 (컴팩트) */}
          <div style={{ padding: '4px 16px 8px', borderBottom: '1px solid #1E293B', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* 태그 + 컴포넌트 */}
              <span style={{
                backgroundColor: '#1E293B',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#3B82F6',
                fontWeight: '600',
              }}>
                &lt;{elementInfo.tagName}&gt; {elementInfo.componentName !== 'Unknown' ? elementInfo.componentName : ''}
              </span>

              {/* 소스 파일 */}
              {selectedFile && (
                <span style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#22C55E',
                }}>
                  {shortPath(selectedFile.filePath)}:{selectedFile.lineNumber}
                </span>
              )}

              {isSearching && (
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>파일 검색 중...</span>
              )}

              {/* URL */}
              <span style={{ fontSize: '10px', color: '#64748B', marginLeft: 'auto' }}>
                {window.location.pathname}
              </span>
            </div>

            {/* 텍스트 미리보기 */}
            {elementInfo.textContent && (
              <div style={{
                marginTop: '4px',
                fontSize: '11px',
                color: '#94A3B8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                &quot;{elementInfo.textContent.slice(0, 80)}{elementInfo.textContent.length > 80 ? '...' : ''}&quot;
              </div>
            )}

            {/* 파일 후보 (여러 개일 때) */}
            {!selectedFile && searchResults.length > 1 && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ fontSize: '10px', color: '#F59E0B', marginBottom: '4px' }}>
                  파일 후보 {searchResults.length}개:
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {searchResults.slice(0, 5).map((r, i) => (
                    <button
                      key={i}
                      data-dev-inspector
                      onClick={() => setSelectedFile({ filePath: r.filePath, lineNumber: r.lineNumber })}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: '#1E293B',
                        color: '#E2E8F0',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {shortPath(r.filePath)}:{r.lineNumber}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 수정 요청 입력 */}
          <div style={{ padding: '12px 16px', flex: 1, overflow: 'auto' }}>
            <textarea
              ref={textareaRef}
              data-dev-inspector
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="이 요소를 어떻게 수정할까요? (예: 색 파란색으로 바꿔줘, 텍스트 변경, 크기 키워줘...)"
              style={{
                width: '100%',
                minHeight: '60px',
                maxHeight: '120px',
                backgroundColor: '#1E293B',
                color: '#E2E8F0',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                lineHeight: '1.4',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <button
                data-dev-inspector
                onClick={handleSendRequest}
                disabled={isSending || !requestText.trim()}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: requestText.trim() ? '#3B82F6' : '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: requestText.trim() ? 'pointer' : 'default',
                  fontWeight: '700',
                  fontSize: '14px',
                  opacity: isSending ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isSending ? (
                  '전송 중...'
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 2L11 13" />
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                    </svg>
                    Claude에게 요청
                  </>
                )}
              </button>
              <span style={{ fontSize: '10px', color: '#64748B', flexShrink: 0 }}>
                Ctrl+Enter
              </span>
            </div>

            {/* 전송 결과 */}
            {lastSendResult && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  backgroundColor: lastSendResult.success
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                  color: lastSendResult.success ? '#22C55E' : '#EF4444',
                  border: `1px solid ${lastSendResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                {lastSendResult.message}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
