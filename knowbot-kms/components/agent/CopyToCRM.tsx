'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ChevronDown, FileText, Link, Quote } from 'lucide-react';

interface Source {
  document_title: string;
  chunk_index: number;
}

interface CopyToCRMProps {
  answer: string;
  sources: Source[];
}

type CopyFormat = 'plain' | 'with_citations' | 'formatted';

const formatOptions = [
  { id: 'plain' as CopyFormat, label: 'Plain Text', icon: FileText, description: 'Just the answer text' },
  { id: 'with_citations' as CopyFormat, label: 'With Citations', icon: Link, description: 'Include source references' },
  { id: 'formatted' as CopyFormat, label: 'CRM Format', icon: Quote, description: 'Formatted for CRM notes' },
];

export default function CopyToCRM({ answer, sources }: CopyToCRMProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<CopyFormat>('plain');

  const formatText = (format: CopyFormat): string => {
    // Remove citation markers from the answer
    const cleanAnswer = answer.replace(/\[\d+\]/g, '').trim();

    switch (format) {
      case 'plain':
        return cleanAnswer;

      case 'with_citations':
        const citationList = sources
          .map((s, i) => `[${i + 1}] ${s.document_title}`)
          .join('\n');
        return `${cleanAnswer}\n\n---\nSources:\n${citationList}`;

      case 'formatted':
        const timestamp = new Date().toLocaleString();
        const sourceList = sources.map(s => `• ${s.document_title}`).join('\n');
        return [
          '=== Knowledge Base Response ===',
          '',
          cleanAnswer,
          '',
          '---',
          `Generated: ${timestamp}`,
          'Sources:',
          sourceList,
          '===========================',
        ].join('\n');

      default:
        return cleanAnswer;
    }
  };

  const handleCopy = async (format: CopyFormat) => {
    const text = formatText(format);

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setSelectedFormat(format);
      setShowOptions(false);

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        {/* Main copy button */}
        <button
          onClick={() => handleCopy(selectedFormat)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-l-xl text-sm font-medium transition-all
            ${copied
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }
          `}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>

        {/* Dropdown toggle */}
        <button
          onClick={() => setShowOptions(!showOptions)}
          className={`
            p-2 rounded-r-xl text-sm font-medium transition-all border-l-0
            ${showOptions
              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }
          `}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown menu */}
      <AnimatePresence>
        {showOptions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOptions(false)}
              className="fixed inset-0 z-10"
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-20"
            >
              <div className="p-2">
                <p className="text-xs text-gray-500 px-2 py-1 mb-1">Copy Format</p>
                {formatOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleCopy(option.id)}
                    className={`
                      w-full flex items-start gap-3 p-2 rounded-lg transition-colors text-left
                      ${selectedFormat === option.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'hover:bg-gray-50 text-gray-700'
                      }
                    `}
                  >
                    <option.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
