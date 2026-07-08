import { AppShell } from "./components/AppShell.js";
import { DashboardPage } from "./pages/DashboardPage.js";

export const APP_TITLE = "ZNF-Portal";

export const navigationItems = [
  { label: "Dashboard", path: "/" }
] as const;

export function App() {
  return (
    <AppShell title={APP_TITLE} navigationItems={navigationItems}>
      <DashboardPage />
    </AppShell>
  );
}
