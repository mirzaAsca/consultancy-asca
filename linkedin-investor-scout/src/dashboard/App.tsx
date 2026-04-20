import { useEffect } from 'react';
import { ClipboardList, Radar, Settings as SettingsIcon } from 'lucide-react';
import type { ProspectLevel } from '@/shared/types';
import { useDashboardStore, type DashboardRoute } from './store';
import { ProspectsRoute } from './routes/Prospects';
import { SettingsRoute } from './routes/Settings';
import { LogsRoute } from './routes/Logs';

const ROUTES: Array<{
  id: DashboardRoute;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'prospects', label: 'Prospects', Icon: Radar },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
  { id: 'logs', label: 'Logs', Icon: ClipboardList },
];

const VALID_ROUTES: DashboardRoute[] = ['prospects', 'settings', 'logs'];
const VALID_LEVELS: ProspectLevel[] = [
  '1st',
  '2nd',
  '3rd',
  'OUT_OF_NETWORK',
  'NONE',
];

function parseDashboardHash(
  hash: string,
): { route: DashboardRoute; prospectId: number | null; level: ProspectLevel | null } {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [pathPart, queryPart = ''] = raw.split('?');
  const routeToken = pathPart.replace(/^\/+/, '').split('/')[0];
  const route = VALID_ROUTES.includes(routeToken as DashboardRoute)
    ? (routeToken as DashboardRoute)
    : 'prospects';
  if (route !== 'prospects') {
    return { route, prospectId: null, level: null };
  }
  const params = new URLSearchParams(queryPart);
  const idRaw = params.get('id');
  const parsed = idRaw ? Number(idRaw) : NaN;
  const levelRaw = params.get('level');
  const level =
    levelRaw && VALID_LEVELS.includes(levelRaw as ProspectLevel)
      ? (levelRaw as ProspectLevel)
      : null;
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { route, prospectId: null, level };
  }
  return { route, prospectId: parsed, level };
}

export default function App() {
  const route = useDashboardStore((s) => s.route);
  const setRoute = useDashboardStore((s) => s.setRoute);
  const applyDeepLinkLevel = useDashboardStore((s) => s.applyDeepLinkLevel);
  const drawerProspectId = useDashboardStore((s) => s.drawerProspectId);
  const openDrawer = useDashboardStore((s) => s.openDrawer);

  useEffect(() => {
    const syncFromHash = () => {
      const parsed = parseDashboardHash(window.location.hash);
      setRoute(parsed.route);
      if (parsed.route === 'prospects') {
        openDrawer(parsed.prospectId);
        applyDeepLinkLevel(parsed.level);
      } else {
        openDrawer(null);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [applyDeepLinkLevel, openDrawer, setRoute]);

  useEffect(() => {
    if (route !== 'prospects' && drawerProspectId !== null) {
      openDrawer(null);
    }
  }, [drawerProspectId, openDrawer, route]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (route === 'prospects' && drawerProspectId !== null) {
      params.set('id', String(drawerProspectId));
    }
    const next = `#/${route}${params.toString() ? `?${params.toString()}` : ''}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', next);
    }
  }, [drawerProspectId, route]);

  return (
    <div className="min-h-screen bg-bg text-gray-100">
      <aside className="fixed left-0 top-0 hidden h-full w-56 flex-col gap-1 border-r border-gray-800 bg-bg-card p-4 md:flex">
        <div className="mb-5 flex items-center gap-2 px-1">
          <Radar className="h-4 w-4 text-blue-400" />
          <div className="text-sm font-semibold">Investor Scout</div>
        </div>
        {ROUTES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setRoute(id)}
            className={
              'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition ' +
              (route === id
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200')
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
        <div className="mt-auto px-1 text-[10px] text-gray-600">
          v{chrome.runtime?.getManifest?.().version ?? '1.0.0'}
        </div>
      </aside>
      <main className="min-h-screen md:ml-56">
        {route === 'prospects' && <ProspectsRoute />}
        {route === 'settings' && <SettingsRoute />}
        {route === 'logs' && <LogsRoute />}
      </main>
    </div>
  );
}
