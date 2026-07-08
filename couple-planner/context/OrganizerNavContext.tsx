import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface OrganizerNavConfig {
  title: string;
  subtitle?: string;
  accent?: string;
  onBack: () => void;
}

interface OrganizerNavContextValue {
  nav: OrganizerNavConfig | null;
  setNav: (config: OrganizerNavConfig | null) => void;
}

const OrganizerNavContext = createContext<OrganizerNavContextValue | null>(null);

export function OrganizerNavProvider({ children }: { children: React.ReactNode }) {
  const [nav, setNavState] = useState<OrganizerNavConfig | null>(null);
  const setNav = useCallback((config: OrganizerNavConfig | null) => {
    setNavState(config);
  }, []);

  const value = useMemo(() => ({ nav, setNav }), [nav, setNav]);

  return <OrganizerNavContext.Provider value={value}>{children}</OrganizerNavContext.Provider>;
}

export function useOrganizerNav() {
  const ctx = useContext(OrganizerNavContext);
  if (!ctx) {
    throw new Error('useOrganizerNav must be used within OrganizerNavProvider');
  }
  return ctx;
}

/** Safe read for AppHeaderBar when provider may not wrap (fallback null). */
export function useOrganizerNavOptional() {
  return useContext(OrganizerNavContext);
}
