'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  HomeIcon,
  CalendarIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  ChevronDownIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Daily Log', href: '/daily-log', icon: CalendarIcon },
  { name: 'Sales Rep Leaderboard', href: '/sales-reps', icon: UsersIcon },
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
  const [storesOpen, setStoresOpen] = useState(pathname.startsWith('/stores'));

  return (
    <aside className="fixed top-0 left-0 z-40 w-64 h-screen bg-white border-r border-gray-200 shadow-lg">
      <div className="h-full flex flex-col">
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="flex items-center justify-center w-11 h-11 bg-white rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Spametrics</h1>
              <p className="text-xs text-blue-100 font-medium">Georgia Spa Company</p>
            </div>
          </Link>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto py-6 px-3">
          {/* Main Navigation */}
          <div className="mb-6">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Menu</p>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && !pathname.startsWith('/stores'));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 pl-2'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 mr-3 ${
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    }`} />
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
              className="flex items-center justify-between w-full px-3 py-2.5 mb-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center">
                <BuildingStorefrontIcon className="w-5 h-5 mr-3 text-gray-400" />
                <span>Stores</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">
                  {stores.length}
                </span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${storesOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {storesOpen && (
              <div className="space-y-1 pb-4">
                {stores.map((store) => {
                  const isActive = pathname === store.href;
                  return (
                    <Link
                      key={store.name}
                      href={store.href}
                      className={`flex items-center px-3 py-2 pl-11 text-sm rounded-lg transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600 pl-10'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-2.5 ${
                        isActive ? 'bg-blue-600' : 'bg-gray-300'
                      }`} />
                      {store.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-sm font-bold text-white">GS</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Georgia Spa Co.</p>
              <p className="text-xs text-gray-500 truncate">2025 Dashboard</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
