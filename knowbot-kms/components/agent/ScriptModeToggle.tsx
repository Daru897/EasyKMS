'use client';

import { motion } from 'framer-motion';
import { BookOpen, FileText } from 'lucide-react';

interface ScriptModeToggleProps {
  isScriptMode: boolean;
  onToggle: () => void;
}

export default function ScriptModeToggle({ isScriptMode, onToggle }: ScriptModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
        ${isScriptMode
          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
          : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
        }
      `}
    >
      <motion.div
        animate={{ rotate: isScriptMode ? 360 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isScriptMode ? (
          <BookOpen className="w-4 h-4" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
      </motion.div>
      <span>{isScriptMode ? 'Script Mode' : 'Standard Mode'}</span>

      {/* Status indicator */}
      <span className={`
        w-2 h-2 rounded-full
        ${isScriptMode ? 'bg-indigo-500' : 'bg-gray-400'}
      `} />
    </button>
  );
}
