'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Loader2, Check } from 'lucide-react';

interface FeedbackButtonProps {
  queryText: string;
  answerText?: string;
  onFeedbackSubmitted?: (rating: 'helpful' | 'not_helpful') => void;
}

export default function FeedbackButton({
  queryText,
  answerText,
  onFeedbackSubmitted,
}: FeedbackButtonProps) {
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = async (feedbackRating: 'helpful' | 'not_helpful') => {
    if (submitted || isSubmitting) return;

    setIsSubmitting(true);
    setRating(feedbackRating);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryText,
          answerText,
          rating: feedbackRating,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        onFeedbackSubmitted?.(feedbackRating);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setRating(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 text-sm text-emerald-600"
      >
        <Check className="w-4 h-4" />
        <span>Thanks for your feedback!</span>
      </motion.div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Was this helpful?</span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => handleFeedback('helpful')}
          disabled={isSubmitting}
          className={`
            p-2 rounded-lg transition-all
            ${rating === 'helpful'
              ? 'bg-emerald-100 text-emerald-600'
              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title="Yes, helpful"
        >
          <AnimatePresence mode="wait">
            {isSubmitting && rating === 'helpful' ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ThumbsUp className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={() => handleFeedback('not_helpful')}
          disabled={isSubmitting}
          className={`
            p-2 rounded-lg transition-all
            ${rating === 'not_helpful'
              ? 'bg-red-100 text-red-600'
              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title="Not helpful"
        >
          <AnimatePresence mode="wait">
            {isSubmitting && rating === 'not_helpful' ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ThumbsDown className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
