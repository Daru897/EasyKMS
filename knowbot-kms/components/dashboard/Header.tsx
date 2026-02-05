'use client';

import { Bell, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
    const { user } = useAuth();

    return (
        <header className="h-20 px-8 flex items-center justify-between sticky top-0 bg-gray-50/50 backdrop-blur-sm z-10">
            <div className="flex-1 max-w-xl">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search documents, knowledge, stats..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-6 ml-4">
                <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-white hover:shadow-sm">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-gray-50"></span>
                </button>

                <div className="h-8 w-px bg-gray-200"></div>

                <div className="flex items-center space-x-3">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-semibold text-gray-900">{user?.email?.split('@')[0]}</p>
                        <p className="text-xs text-gray-500">Admin</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 p-0.5 shadow-md">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
