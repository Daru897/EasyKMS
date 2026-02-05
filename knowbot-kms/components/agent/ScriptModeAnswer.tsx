'use client';

import { motion } from 'framer-motion';
import { BookOpen, Pause } from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';

interface ScriptModeAnswerProps {
  answer: string;
  confidence: number;
}

export default function ScriptModeAnswer({ answer, confidence }: ScriptModeAnswerProps) {
  // Convert paragraphs to bullet points
  const formatForScript = (text: string) => {
    // Remove citation markers for cleaner reading
    const cleanText = text.replace(/\[\d+\]/g, '');

    // Split into sentences/phrases for bullet points
    const sentences = cleanText
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());

    // Group sentences into logical sections (every 2-3 sentences)
    const sections: string[][] = [];
    let currentSection: string[] = [];

    sentences.forEach((sentence, index) => {
      currentSection.push(sentence);
      // Create new section every 2-3 sentences or at paragraph breaks
      if (currentSection.length >= 2 || index === sentences.length - 1) {
        sections.push([...currentSection]);
        currentSection = [];
      }
    });

    return sections;
  };

  const sections = formatForScript(answer);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/50 border-b border-indigo-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Script Mode</h3>
            <p className="text-xs text-gray-500">Optimized for reading aloud</p>
          </div>
        </div>
        <ConfidenceBadge score={confidence} size="md" />
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {sections.map((section, sectionIndex) => (
          <motion.div
            key={sectionIndex}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
            className="space-y-3"
          >
            {section.map((sentence, sentenceIndex) => (
              <div
                key={sentenceIndex}
                className="flex items-start gap-3"
              >
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                  {sectionIndex * 3 + sentenceIndex + 1}
                </span>
                <p className="text-gray-800 text-lg leading-relaxed">
                  {sentence}
                </p>
              </div>
            ))}

            {/* Pause marker between sections */}
            {sectionIndex < sections.length - 1 && (
              <div className="flex items-center gap-2 py-2 px-4 ml-9">
                <Pause className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-indigo-500 font-medium">Pause</span>
                <div className="flex-1 border-t border-dashed border-indigo-200" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Footer tip */}
      <div className="px-6 py-3 bg-white/50 border-t border-indigo-100">
        <p className="text-xs text-gray-500 text-center">
          💡 Tip: Pause briefly at each numbered point for clarity
        </p>
      </div>
    </motion.div>
  );
}
