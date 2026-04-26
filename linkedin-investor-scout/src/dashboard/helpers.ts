import type { ProspectLevel, ScanStatus } from '@/shared/types';

export const LEVEL_COLORS: Record<ProspectLevel, string> = {
  '1st': '#22c55e',
  '2nd': '#3b82f6',
  '3rd': '#a855f7',
  NONE: '#4b5563',
};

export const LEVEL_LABEL: Record<ProspectLevel, string> = {
  '1st': '1st',
  '2nd': '2nd',
  '3rd': '3rd',
  NONE: '—',
};

export const SCAN_STATUS_LABEL: Record<ScanStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
  failed: 'Failed',
  skipped: 'Skipped',
};

export const SCAN_STATUS_COLOR: Record<ScanStatus, string> = {
  pending: 'text-gray-400 border-gray-700',
  in_progress: 'text-blue-300 border-blue-600/50 bg-blue-900/30',
  done: 'text-green-300 border-green-700/50 bg-green-900/20',
  failed: 'text-red-300 border-red-700/50 bg-red-900/20',
  skipped: 'text-yellow-300 border-yellow-700/50 bg-yellow-900/20',
};

export function formatRelativeTime(ts: number | null | undefined): string {
  if (!ts) return '—';
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function formatAbsolute(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

export function triggerCsvDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function triggerJsonDownload(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
