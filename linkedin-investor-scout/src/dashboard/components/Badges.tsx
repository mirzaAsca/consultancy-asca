import { useMemo } from 'react';
import type { ProspectLevel, ScanStatus } from '@/shared/types';
import {
  LEVEL_COLORS,
  LEVEL_LABEL,
  SCAN_STATUS_LABEL,
} from '../helpers';

export function LevelBadge({ level }: { level: ProspectLevel }) {
  const color = LEVEL_COLORS[level];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ borderColor: `${color}55`, color, backgroundColor: `${color}1a` }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function ScanStatusBadge({ status }: { status: ScanStatus }) {
  const cls = useMemo(() => {
    switch (status) {
      case 'done':
        return 'text-green-300 border-green-700/50 bg-green-900/20';
      case 'failed':
        return 'text-red-300 border-red-700/50 bg-red-900/20';
      case 'in_progress':
        return 'text-blue-300 border-blue-600/50 bg-blue-900/30';
      case 'skipped':
        return 'text-yellow-300 border-yellow-700/50 bg-yellow-900/20';
      case 'pending':
      default:
        return 'text-gray-400 border-gray-700';
    }
  }, [status]);
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {SCAN_STATUS_LABEL[status]}
    </span>
  );
}

export function ActivityDots({
  connected,
  commented,
  messaged,
}: {
  connected: boolean;
  commented: boolean;
  messaged: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <span
        className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-gray-700'}`}
        title={connected ? 'Connected' : 'Not connected'}
      />
      <span
        className={`h-1.5 w-1.5 rounded-full ${commented ? 'bg-sky-400' : 'bg-gray-700'}`}
        title={commented ? 'Commented' : 'Not commented'}
      />
      <span
        className={`h-1.5 w-1.5 rounded-full ${messaged ? 'bg-violet-400' : 'bg-gray-700'}`}
        title={messaged ? 'Messaged' : 'Not messaged'}
      />
    </div>
  );
}
