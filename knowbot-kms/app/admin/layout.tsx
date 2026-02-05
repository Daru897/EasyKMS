'use client';

import { Suspense } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Header from '@/components/dashboard/Header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Loading...</p>
              </div>
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
