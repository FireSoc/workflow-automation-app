import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageLayoutState {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: ReactNode;
}

const defaultState: PageLayoutState = {
  title: '',
};

type SetPageLayout = (state: Partial<PageLayoutState>) => void;

const PageLayoutContext = createContext<{
  pageLayout: PageLayoutState;
  setPageLayout: SetPageLayout;
} | null>(null);

export function PageLayoutProvider({ children }: { children: ReactNode }) {
  const [pageLayout, setPageLayoutState] = useState<PageLayoutState>(defaultState);
  const location = useLocation();

  const setPageLayout = useCallback((state: Partial<PageLayoutState>) => {
    setPageLayoutState((prev) => ({ ...prev, ...state }));
  }, []);

  useLayoutEffect(() => {
    setPageLayoutState(defaultState);
  }, [location.pathname]);

  const value = useMemo(
    () => ({ pageLayout, setPageLayout }),
    [pageLayout, setPageLayout]
  );

  return (
    <PageLayoutContext.Provider value={value}>
      {children}
    </PageLayoutContext.Provider>
  );
}

export function usePageLayout() {
  const ctx = useContext(PageLayoutContext);
  if (!ctx) {
    throw new Error('usePageLayout must be used within PageLayoutProvider');
  }
  return ctx;
}
