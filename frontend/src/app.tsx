import { useEffect, useState } from "react";

import { AppShell } from "./components/AppShell.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { ZonePage } from "./pages/ZonePage.js";

export const APP_TITLE = "ZNF-Portal";

export const navigationItems = [
  { label: "Dashboard", path: "/" },
  { label: "Zones", path: "/zones" }
] as const;

export function App() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getCurrentPath());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return (
    <AppShell
      activePath={currentPath}
      navigationItems={navigationItems}
      onNavigate={path => navigateTo(path, setCurrentPath)}
      title={APP_TITLE}
    >
      {currentPath === "/zones" ? <ZonePage /> : <DashboardPage />}
    </AppShell>
  );
}

function getCurrentPath(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  return window.location.pathname;
}

function navigateTo(path: string, setCurrentPath: (path: string) => void): void {
  if (typeof window === "undefined") {
    setCurrentPath(path);
    return;
  }

  if (window.location.pathname === path) {
    setCurrentPath(path);
    return;
  }

  window.history.pushState(null, "", path);
  setCurrentPath(path);
}