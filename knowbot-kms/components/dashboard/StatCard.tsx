'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    trend?: string;
    trendUp?: boolean;
    icon: LucideIcon;
    color: string;
    delay?: number;
}

export default function StatCard({ title, value, trend, trendUp, icon: Icon, color, delay = 0 }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                    <Icon size={24} className={color.replace('bg-', 'text-')} />
                </div>
            </div>
            {trend && (
                <div className="mt-4 flex items-center text-sm">
                    <span className={`font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                        {trendUp ? '+' : ''}{trend}
                    </span>
                    <span className="text-gray-400 ml-2">from last month</span>
                </div>
            )}
        </motion.div>
    );
}
