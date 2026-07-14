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
      <aside className="sidebar" aria-label="主导航">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">Z</div>
          <div>
            <div className="brand">{title}</div>
            <p className="brand-subtitle">具身训练场运行中枢</p>
          </div>
        </div>
        <div className="side-kicker">
          <span>资源 · 调度 · 执行</span>
        </div>
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
        <div className="side-footer">
          <span>UTC+08 场馆时区</span>
          <strong>实时运行</strong>
        </div>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}
