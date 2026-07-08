import type { ReactNode } from "react";

interface NavigationItem {
  label: string;
  path: string;
}

interface AppShellProps {
  title: string;
  navigationItems: readonly NavigationItem[];
  children: ReactNode;
}

export function AppShell({ title, navigationItems, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">{title}</div>
        <nav className="nav-list">
          {navigationItems.map(item => (
            <a className="nav-link" href={item.path} key={item.path}>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}
