import type { ReactNode } from "react";

interface NavigationItem {
  label: string;
  path: string;
}

interface AppShellProps {
  activePath: string;
  title: string;
  navigationItems: readonly NavigationItem[];
  onNavigate: (path: string) => void;
  children: ReactNode;
}

export function AppShell({ activePath, title, navigationItems, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">{title}</div>
        <nav className="nav-list">
          {navigationItems.map(item => (
            <a
              aria-current={item.path === activePath ? "page" : undefined}
              className={item.path === activePath ? "nav-link active" : "nav-link"}
              href={item.path}
              key={item.path}
              onClick={event => {
                event.preventDefault();
                onNavigate(item.path);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}