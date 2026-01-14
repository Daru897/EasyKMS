'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Files,
    Settings,
    PieChart,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Database
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();
    const { signOut } = useAuth();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: Files, label: 'Documents', href: '/documents' },
        { icon: Database, label: 'Knowledge Base', href: '/knowledge' },
        { icon: PieChart, label: 'Analytics', href: '/analytics' },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ];

    return (
        <motion.div
            animate={{ width: collapsed ? 80 : 250 }}
            className="h-screen bg-white/80 backdrop-blur-md border-r border-gray-200 sticky top-0 flex flex-col z-20"
        >
            <div className="p-4 flex items-center justify-between">
                {!collapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent"
                    >
                        EasyKMS
                    </motion.div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center p-3 rounded-xl transition-all duration-200 group relative
              ${pathname === item.href
                                ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <item.icon size={22} className={pathname === item.href ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-700'} />
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
            </nav>

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
