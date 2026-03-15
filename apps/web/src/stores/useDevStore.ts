import { create } from 'zustand';

interface SourceInfo {
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
  componentName: string;
}

interface DevRequest {
  id: string;
  timestamp: string;
  element: {
    tagName: string;
    componentName: string;
    className: string;
    textContent: string;
    currentUrl: string;
  };
  source: {
    filePath: string;
    lineNumber: number;
  } | null;
  request: string;
  status: 'pending' | 'done';
}

interface DevState {
  // 인스펙터 활성화 여부
  enabled: boolean;
  // 호버/선택 상태
  hoveredElement: HTMLElement | null;
  selectedElement: HTMLElement | null;
  sourceInfo: SourceInfo | null;
  // 편집 패널
  editPanelOpen: boolean;
  // 요청 상태
  isSending: boolean;
  lastSendResult: { success: boolean; message: string } | null;
  recentRequests: DevRequest[];

  // 액션
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  setHoveredElement: (el: HTMLElement | null) => void;
  selectElement: (el: HTMLElement | null, source: SourceInfo | null) => void;
  clearSelection: () => void;
  setSending: (sending: boolean) => void;
  setSendResult: (result: { success: boolean; message: string } | null) => void;
  addRequest: (req: DevRequest) => void;
}

export const useDevStore = create<DevState>((set) => ({
  enabled: false,
  hoveredElement: null,
  selectedElement: null,
  sourceInfo: null,
  editPanelOpen: false,
  isSending: false,
  lastSendResult: null,
  recentRequests: [],

  toggle: () => set((state) => {
    const next = !state.enabled;
    if (!next) {
      return {
        enabled: false,
        hoveredElement: null,
        selectedElement: null,
        sourceInfo: null,
        editPanelOpen: false,
        lastSendResult: null,
      };
    }
    return { enabled: true };
  }),

  setEnabled: (enabled) => set({ enabled }),

  setHoveredElement: (el) => set({ hoveredElement: el }),

  selectElement: (el, source) => set({
    selectedElement: el,
    sourceInfo: source,
    editPanelOpen: !!el,
    lastSendResult: null,
  }),

  clearSelection: () => set({
    selectedElement: null,
    sourceInfo: null,
    editPanelOpen: false,
    lastSendResult: null,
  }),

  setSending: (isSending) => set({ isSending }),

  setSendResult: (lastSendResult) => set({ lastSendResult }),

  addRequest: (req) => set((state) => ({
    recentRequests: [req, ...state.recentRequests].slice(0, 20),
  })),
}));
