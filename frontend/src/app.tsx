import { AppShell } from "./components/AppShell.js";
import { HomePage } from "./pages/HomePage.js";

export const APP_TITLE = "ZNF-Portal";

export const navigationItems = [
  { label: "Home", path: "/" }
] as const;

export function App() {
  return (
    <AppShell title={APP_TITLE} navigationItems={navigationItems}>
      <HomePage />
    </AppShell>
  );
}
