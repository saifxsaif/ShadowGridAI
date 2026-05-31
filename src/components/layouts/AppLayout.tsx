// ShadowGrid AI — Main application layout with sidebar + topbar

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, LayoutDashboard, BarChart3, FileWarning, Settings2,
  Menu, Activity, Shield, Map, FlaskConical, Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/AppContext';
import { DataModeSwitcher } from '@/components/common/DataModeSwitcher';
import type { DataMode } from '@/lib/dataMode';

const NAV_ITEMS = [
  { href: '/',           label: 'Overview',     icon: Home },
  { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/map',        label: 'Risk Map',     icon: Map },
  { href: '/analytics',  label: 'Analytics',    icon: BarChart3 },
  { href: '/report',     label: 'Report Issue', icon: FileWarning },
  { href: '/operations', label: 'Operations',   icon: Settings2 },
];

// Data-mode badge config (runtime: demo | live)
const DATA_MODE_BADGE: Record<DataMode, { icon: typeof FlaskConical; color: string }> = {
  demo: { icon: FlaskConical, color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  live: { icon: Radio,        color: 'text-green-400 border-green-500/30 bg-green-500/10' },
};

function NavItem({
  href, label, icon: Icon, onClick,
}: { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; onClick?: () => void }) {
  const location = useLocation();
  const active = location.pathname === href;
  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 min-h-[44px]',
        active
          ? 'bg-primary/15 text-primary border border-primary/25'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon size={18} className="shrink-0" />
      <span>{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
    </Link>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const { lastRefresh, cityName } = useAppStore();

  return (
    <div className="flex flex-col h-full bg-sidebar-background">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 border border-primary/30">
          <Shield size={16} className="text-primary" />
        </div>
        <div>
          <span className="text-sm font-bold text-foreground">ShadowGrid AI</span>
          <span className="block text-xs text-muted-foreground leading-none">Smart City Intelligence</span>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-sidebar-border">
        <Activity size={12} className="text-green-400 shrink-0" />
        <span className="text-xs text-muted-foreground flex-1 truncate">{cityName}</span>
        <span className="text-xs font-mono text-green-400 shrink-0">ACTIVE</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Navigation</p>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.href} {...item} onClick={onNavClick} />
        ))}
      </nav>

      {/* Footer: data mode switcher + last refresh */}
      <div className="px-4 py-4 border-t border-sidebar-border space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Data Mode</p>
        <DataModeSwitcher variant="compact" />
        <p className="text-[11px] text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { zoneSummaries, dataMode } = useAppStore();

  const currentPage = NAV_ITEMS.find(n => n.href === location.pathname)?.label ?? 'ShadowGrid AI';
  const criticalCount = zoneSummaries.filter(s => s.risk_level === 'critical').length;
  const modeConfig = DATA_MODE_BADGE[dataMode] ?? DATA_MODE_BADGE.demo;
  const ModeIcon = modeConfig.icon;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar via Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar-background border-sidebar-border">
          <SidebarContent onNavClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-3 h-14 px-4 border-b border-border bg-background/95 backdrop-blur-sm">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-foreground border border-border/60 hover:bg-accent"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </Button>

          <div className="flex items-center gap-2 lg:hidden">
            <Shield size={15} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">ShadowGrid AI</span>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{currentPage}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Data mode badge */}
            <div className={cn(
              'hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs',
              modeConfig.color,
            )}>
              <ModeIcon size={10} />
              <span className="font-mono font-medium">{dataMode.toUpperCase()}</span>
            </div>

            {/* Critical zones chip */}
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/15 border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 risk-critical-pulse" />
                <span className="text-xs font-medium text-red-400">
                  {criticalCount} Critical
                </span>
              </div>
            )}

            {/* Clock */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
              <Activity size={12} className="text-primary" />
              <span className="text-xs text-muted-foreground font-mono">
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}



