'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { Home, Calendar, Users, Store, ChevronDown, Target, Edit, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Daily Log', href: '/daily-log', icon: Calendar },
  { name: 'Sales Rep Leaderboard', href: '/sales-reps', icon: Users },
];

const adminNavigation = [
  { name: 'Data Entry', href: '/data-entry', icon: Edit },
  { name: 'Goal Management', href: '/goals', icon: Target },
];

const stores = [
  { name: 'Athens', href: '/stores/athens' },
  { name: 'Alpharetta', href: '/stores/alpharetta' },
  { name: 'Augusta', href: '/stores/augusta' },
  { name: 'Blairsville', href: '/stores/blairsville' },
  { name: 'Blue Ridge', href: '/stores/blue-ridge' },
  { name: 'Buford', href: '/stores/buford' },
  { name: 'Kennesaw', href: '/stores/kennesaw' },
  { name: 'Lake Oconee', href: '/stores/lake-oconee' },
  { name: 'Newnan', href: '/stores/newnan' },
  { name: 'Warehouse', href: '/stores/warehouse' },
  { name: 'Costco', href: '/stores/costco' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [storesOpen, setStoresOpen] = useState(pathname.startsWith('/stores'));
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-border shadow-sm">
      <div className="h-full flex flex-col overflow-hidden">
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-border bg-primary flex-shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-11 h-11 bg-white rounded-xl transition-shadow group-hover:shadow-md p-2">
              <Image
                src="/logo.svg"
                alt="Georgia Spa Company"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Spametrics</h1>
              <p className="text-xs text-primary-foreground/80 font-medium">Georgia Spa Company</p>
            </div>
          </Link>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto py-6 px-3">
          {/* Main Navigation */}
          <div className="mb-6">
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main Menu</p>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href) && !pathname.startsWith('/stores'));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Stores Section - Collapsible */}
          <div>
            <button
              onClick={() => setStoresOpen(!storesOpen)}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 mb-2 text-sm font-medium rounded-lg transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                pathname.startsWith('/stores')
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <Store className="h-5 w-5 flex-shrink-0" />
                <span>Stores</span>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  storesOpen && 'rotate-180'
                )}
              />
            </button>

            {storesOpen && (
              <div className="space-y-1 pb-4">
                {stores.map((store) => {
                  const isActive = pathname === store.href;
                  return (
                    <Link
                      key={store.name}
                      href={store.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 pl-11 text-sm rounded-lg transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full flex-shrink-0',
                        isActive ? 'bg-primary-foreground' : 'bg-muted-foreground/40'
                      )} />
                      {store.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin Section */}
          <div className="mt-6 pt-6 border-t border-border/40">
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">Admin</p>
            <nav className="space-y-1">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">GS</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Georgia Spa Co.</p>
              <p className="text-xs text-muted-foreground truncate">2025 Dashboard</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {loggingOut ? 'Signing out...' : 'Sign Out'}
          </Button>
        </div>
      </div>
    </aside>
  );
}
