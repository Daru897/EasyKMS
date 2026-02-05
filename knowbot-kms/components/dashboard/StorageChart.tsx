'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
    { name: 'Documents', value: 400, color: '#6366f1' }, // Indigo-500
    { name: 'Images', value: 300, color: '#8b5cf6' },    // Violet-500
    { name: 'Other', value: 100, color: '#ec4899' },     // Pink-500
    { name: 'Free Space', value: 200, color: '#f3f4f6' },// Gray-100
];

export default function StorageChart() {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Storage Usage</h3>
            <div className="flex-1 w-full min-h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={10}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-3xl font-bold text-gray-900">75%</p>
                    <p className="text-xs text-gray-500 font-medium">Used</p>
                </div>
            </div>
            <div className="flex justify-center flex-wrap gap-4 mt-4">
                {data.slice(0, 3).map((item) => (
                    <div key={item.name} className="flex items-center text-xs text-gray-500 font-medium">
                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                        {item.name}
                    </div>
                ))}
            </div>
        </div>
    );
}
