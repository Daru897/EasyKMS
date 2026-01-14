'use client';

import { motion } from 'framer-motion';
import { FileText, Upload, Trash2, Edit } from 'lucide-react';

export default function RecentActivity() {
    const activities = [
        { id: 1, type: 'upload', user: 'Admin', action: 'uploaded', target: 'Q3_Financial_Review.pdf', time: '2 hours ago', icon: Upload, color: 'text-blue-500', bg: 'bg-blue-50' },
        { id: 2, type: 'edit', user: 'Sarah', action: 'edited', target: 'Employee_Handbook_v2.docx', time: '4 hours ago', icon: Edit, color: 'text-amber-500', bg: 'bg-amber-50' },
        { id: 3, type: 'delete', user: 'Mike', action: 'deleted', target: 'Old_Policy_2024.pdf', time: 'Yesterday', icon: Trash2, color: 'text-red-500', bg: 'bg-red-50' },
        { id: 4, type: 'create', user: 'Admin', action: 'created', target: 'Onboarding Checklist', time: '2 days ago', icon: FileText, color: 'text-green-500', bg: 'bg-green-50' },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h3>
            <div className="space-y-6">
                {activities.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start space-x-4"
                    >
                        <div className={`p-2 rounded-lg ${item.bg}`}>
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-900">
                                <span className="font-medium">{item.user}</span> {item.action} <span className="font-medium text-indigo-600">{item.target}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
