'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Files,
  RefreshCw,
  CheckSquare,
  AlertCircle,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { signOut } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: RefreshCw, label: 'Sync Status', href: '/admin/sync' },
    { icon: CheckSquare, label: 'Approvals', href: '/admin/approvals' },
    { icon: AlertCircle, label: 'Knowledge Gaps', href: '/admin/knowledge-gaps' },
    { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
    { icon: FileText, label: 'Reports', href: '/admin/reports' },
  ];

  const secondaryItems = [
    { icon: Files, label: 'Documents', href: '/documents' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <motion.div
      animate={{ width: collapsed ? 80 : 260 }}
      className="h-screen bg-white/80 backdrop-blur-md border-r border-gray-200 sticky top-0 flex flex-col z-20"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-100">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Admin
              </span>
              <p className="text-xs text-gray-500">Control Center</p>
            </div>
          </motion.div>
        )}
        {collapsed && (
          <div className="p-2 bg-indigo-100 rounded-lg mx-auto">
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Admin
            </p>
          )}
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center p-3 rounded-xl transition-all duration-200 group relative
                ${isActive(item.href)
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <item.icon
                size={22}
                className={isActive(item.href) ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-700'}
              />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-3 font-medium"
                >
                  {item.label}
                </motion.span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-gray-100" />

        {/* Secondary navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              General
            </p>
          )}
          {secondaryItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center p-3 rounded-xl transition-all duration-200 group relative
                ${isActive(item.href)
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <item.icon
                size={22}
                className={isActive(item.href) ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-700'}
              />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-3 font-medium"
                >
                  {item.label}
                </motion.span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                </div>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => signOut()}
          className="flex items-center w-full p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={22} />
          {!collapsed && (
            <span className="ml-3 font-medium">Sign Out</span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
