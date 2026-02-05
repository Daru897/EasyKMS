'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2, Check, Send } from 'lucide-react';

interface IssueReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  queryText: string;
  answerText?: string;
}

const issueTypes = [
  { id: 'incorrect', label: 'Incorrect information' },
  { id: 'outdated', label: 'Outdated content' },
  { id: 'incomplete', label: 'Incomplete answer' },
  { id: 'irrelevant', label: 'Not relevant to question' },
  { id: 'other', label: 'Other issue' },
];

export default function IssueReportModal({
  isOpen,
  onClose,
  queryText,
  answerText,
}: IssueReportModalProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const issueDescription = `[${selectedType}] ${description}`.trim();

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryText,
          answerText,
          rating: 'not_helpful',
          issue: issueDescription,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          // Reset state after closing
          setTimeout(() => {
            setSubmitted(false);
            setSelectedType('');
            setDescription('');
          }, 300);
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to submit issue:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      // Reset state after closing animation
      setTimeout(() => {
        setSubmitted(false);
        setSelectedType('');
        setDescription('');
      }, 300);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Report an Issue</h3>
                  <p className="text-sm text-gray-500">Help us improve our knowledge base</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Issue Reported
                  </h4>
                  <p className="text-gray-600">
                    Thank you for helping us improve our knowledge base.
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {/* Query context */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Regarding query:</p>
                    <p className="text-sm text-gray-700 italic">&quot;{queryText}&quot;</p>
                  </div>

                  {/* Issue type selection */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      What type of issue is this?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {issueTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setSelectedType(type.id)}
                          className={`
                            p-3 text-left text-sm rounded-lg border transition-all
                            ${selectedType === type.id
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }
                          `}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Additional details (optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide more context about the issue..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!submitted && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedType || isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
