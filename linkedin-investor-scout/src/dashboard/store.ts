import { create } from 'zustand';
import type { ProspectLevel, ProspectQuery, ScanStatus } from '@/shared/types';

export type DashboardRoute =
  | 'prospects'
  | 'engagement_tasks'
  | 'settings'
  | 'logs';

export interface DashboardState {
  route: DashboardRoute;
  setRoute: (route: DashboardRoute) => void;
  applyDeepLinkLevel: (level: ProspectLevel | null) => void;

  // Prospects table state
  query: ProspectQuery;
  selectedIds: Set<number>;
  drawerProspectId: number | null;

  setSearch: (search: string) => void;
  toggleLevel: (level: ProspectLevel) => void;
  toggleScanStatus: (status: ScanStatus) => void;
  toggleActivity: (kind: 'connected' | 'commented' | 'messaged') => void;
  setSort: (
    field: NonNullable<ProspectQuery['sort_field']>,
    direction: NonNullable<ProspectQuery['sort_direction']>,
  ) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;

  setSelectedIds: (ids: Set<number>) => void;
  toggleSelected: (id: number) => void;
  clearSelection: () => void;

  openDrawer: (id: number | null) => void;
}

const DEFAULT_QUERY: ProspectQuery = {
  search: '',
  levels: [],
  scan_statuses: [],
  activity: {},
  sort_field: 'created_at',
  sort_direction: 'desc',
  page: 0,
  page_size: 50,
};

function toggleInList<T>(arr: T[] | undefined, value: T): T[] {
  const list = arr ?? [];
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  route: 'prospects',
  setRoute: (route) => set({ route }),
  applyDeepLinkLevel: (level) =>
    set((s) => {
      if (!level) return {};
      return {
        query: {
          ...s.query,
          search: '',
          levels: [level],
          scan_statuses: [],
          activity: {},
          page: 0,
        },
        selectedIds: new Set<number>(),
      };
    }),

  query: { ...DEFAULT_QUERY, levels: [], scan_statuses: [], activity: {} },
  selectedIds: new Set<number>(),
  drawerProspectId: null,

  setSearch: (search) =>
    set((s) => ({ query: { ...s.query, search, page: 0 } })),
  toggleLevel: (level) =>
    set((s) => ({
      query: {
        ...s.query,
        levels: toggleInList(s.query.levels, level),
        page: 0,
      },
    })),
  toggleScanStatus: (status) =>
    set((s) => ({
      query: {
        ...s.query,
        scan_statuses: toggleInList(s.query.scan_statuses, status),
        page: 0,
      },
    })),
  toggleActivity: (kind) =>
    set((s) => {
      const current = s.query.activity ?? {};
      const next = { ...current };
      if (current[kind]) delete next[kind];
      else next[kind] = true;
      return { query: { ...s.query, activity: next, page: 0 } };
    }),
  setSort: (sort_field, sort_direction) =>
    set((s) => ({ query: { ...s.query, sort_field, sort_direction } })),
  setPage: (page) => set((s) => ({ query: { ...s.query, page } })),
  resetFilters: () =>
    set({
      query: { ...DEFAULT_QUERY, levels: [], scan_statuses: [], activity: {} },
      selectedIds: new Set<number>(),
    }),

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  toggleSelected: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  clearSelection: () => set({ selectedIds: new Set<number>() }),

  openDrawer: (id) => set({ drawerProspectId: id }),
}));
