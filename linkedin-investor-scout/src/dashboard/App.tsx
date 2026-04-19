import { useEffect } from 'react';
import { ClipboardList, Radar, Settings as SettingsIcon } from 'lucide-react';
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

export default function App() {
  const route = useDashboardStore((s) => s.route);
  const setRoute = useDashboardStore((s) => s.setRoute);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const initial = (hash.split('/')[0] || 'prospects') as DashboardRoute;
    if (['prospects', 'settings', 'logs'].includes(initial)) {
      setRoute(initial);
    }
  }, [setRoute]);

  useEffect(() => {
    const next = `#/${route}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', next);
    }
  }, [route]);

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
