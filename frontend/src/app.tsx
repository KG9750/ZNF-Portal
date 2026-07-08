import { useEffect, useState } from "react";

import { AppShell } from "./components/AppShell.js";
import { BookingPage } from "./pages/BookingPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { DevicePage } from "./pages/DevicePage.js";
import { ZonePage } from "./pages/ZonePage.js";

export const APP_TITLE = "ZNF-Portal";

export const navigationItems = [
  { label: "Dashboard", path: "/" },
  { label: "Zones", path: "/zones" },
  { label: "Devices", path: "/devices" },
  { label: "Bookings", path: "/bookings" }
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
      {renderPage(currentPath)}
    </AppShell>
  );
}

function renderPage(currentPath: string) {
  if (currentPath === "/zones") {
    return <ZonePage />;
  }

  if (currentPath === "/devices") {
    return <DevicePage />;
  }

  if (currentPath === "/bookings") {
    return <BookingPage />;
  }

  return <DashboardPage />;
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
