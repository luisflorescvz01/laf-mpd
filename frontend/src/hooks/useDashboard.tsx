import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchDashboard } from '../api/client';
import type { DashboardData } from '../types';
interface State {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}
const Context = createContext<State | null>(null);
export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    const timeout = setTimeout(() => controller.abort('timeout'), 20000);
    try {
      const result = await fetchDashboard(controller.signal);
      if (request.current === controller) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (
        request.current === controller &&
        (!controller.signal.aborted || controller.signal.reason === 'timeout')
      )
        setError(
          e instanceof Error && !controller.signal.aborted
            ? e.message
            : 'La consulta tardó demasiado. Intenta actualizar nuevamente.',
        );
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 60000);
    const visible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', visible);
      request.current?.abort();
      request.current = null;
    };
  }, [refresh]);
  return <Context.Provider value={{ data, loading, error, refresh }}>{children}</Context.Provider>;
}
export function useDashboard() {
  const value = useContext(Context);
  if (!value) throw new Error('DashboardProvider missing');
  return value;
}
