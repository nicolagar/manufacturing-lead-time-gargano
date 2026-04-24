import { create } from 'zustand';
import type { BackendResult, UiDiagram } from '../domain/model';

type DiagramState = {
  backendResult: BackendResult | null;
  uiDiagram: UiDiagram | null;
  status: string;
  error: string | null;
  setBackendResult: (result: BackendResult | null) => void;
  setUiDiagram: (diagram: UiDiagram | null) => void;
  setStatus: (status: string) => void;
  setError: (error: string | null) => void;
};

export const useDiagramStore = create<DiagramState>((set) => ({
  backendResult: null,
  uiDiagram: null,
  status: 'Idle',
  error: null,
  setBackendResult: (backendResult) => set({ backendResult }),
  setUiDiagram: (uiDiagram) => set({ uiDiagram }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
}));
