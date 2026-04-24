import type { BackendResult } from '../domain/model';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export async function computeFromExcel(file: File): Promise<BackendResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/compute/excel`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Backend error ${response.status}`);
  }

  return response.json() as Promise<BackendResult>;
}


export async function loadFixtureResult(name = 'PERT_v3_03_result.json'): Promise<BackendResult> {
  const response = await fetch(`/fixtures/${name}`);
  if (!response.ok) {
    throw new Error(`Failed to load fixture ${name}`);
  }
  return response.json() as Promise<BackendResult>;
}
