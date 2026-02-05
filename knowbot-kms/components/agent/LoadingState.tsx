'use client';

import { motion } from 'framer-motion';
import { Loader2, Search } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Searching knowledge base...' }: LoadingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
    >
      <div className="flex flex-col items-center justify-center py-8">
        <div className="relative">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-indigo-400" />
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0"
          >
            <Loader2 className="w-16 h-16 text-indigo-600" />
          </motion.div>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-gray-600 font-medium"
        >
          {message}
        </motion.p>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="h-1 bg-indigo-200 rounded-full mt-4 max-w-[200px]"
        >
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/3 bg-indigo-600 rounded-full"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
