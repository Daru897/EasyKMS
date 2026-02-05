'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, LogOut, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SearchInput from '@/components/agent/SearchInput';
import SearchResults from '@/components/agent/SearchResults';
import ScriptModeToggle from '@/components/agent/ScriptModeToggle';
import ScriptModeAnswer from '@/components/agent/ScriptModeAnswer';
import CopyToCRM from '@/components/agent/CopyToCRM';
import FeedbackButton from '@/components/agent/FeedbackButton';
import IssueReportModal from '@/components/agent/IssueReportModal';
import SearchHistory, { addToSearchHistory } from '@/components/agent/SearchHistory';
import SourcesList from '@/components/agent/SourcesList';

interface Source {
  document_id: string;
  document_version_id: string;
  document_title: string;
  chunk_index: number;
  chunk_text: string;
  score: number;
  effective_date?: string | null;
}

interface QueryResponse {
  type: 'ANSWER' | 'NO_DATA';
  answer?: string;
  confidence: number;
  sources: Source[];
  timings?: {
    totalMs: number;
  };
}

function AgentCockpitContent() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScriptMode, setIsScriptMode] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    setIsSearching(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to search knowledge base');
      }

      setResponse(data);

      // Add to search history
      addToSearchHistory(searchQuery, data.type === 'ANSWER');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSearching(false);
    }
  };

  const handleReportIssue = () => {
    setShowIssueModal(true);
  };

  const handleSelectFromHistory = (historyQuery: string) => {
    handleSearch(historyQuery);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-white/20"
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Headphones className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Agent Login Required</h2>
          <p className="text-gray-600 mb-8">
            Please sign in to access the Agent Cockpit.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-200"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 pb-16">
      {/* Minimal header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Headphones className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Agent Cockpit
              </h1>
              <p className="text-xs text-gray-500">Knowledge Search</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{user.email}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Welcome message (only shown when no search has been made) */}
          {!response && !isSearching && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Headphones className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Agent Cockpit
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Search the knowledge base to find answers quickly. Type your question below and press Enter.
              </p>
            </motion.div>
          )}

          {/* Search input */}
          <SearchInput
            onSearch={handleSearch}
            isLoading={isSearching}
            placeholder="Ask a question about policies, procedures, or products..."
            initialValue={query}
          />

          {/* Search history (shown when no active search) */}
          {!response && !isSearching && !error && (
            <SearchHistory onSelectQuery={handleSelectFromHistory} />
          )}

          {/* Results with enhanced features */}
          <AnimatePresence mode="wait">
            {isSearching ? (
              <SearchResults
                key="loading"
                query={query}
                response={null}
                isLoading={true}
                error={null}
                onReportIssue={handleReportIssue}
              />
            ) : error ? (
              <SearchResults
                key="error"
                query={query}
                response={null}
                isLoading={false}
                error={error}
                onReportIssue={handleReportIssue}
              />
            ) : response ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {response.type === 'ANSWER' && response.answer ? (
                  <>
                    {/* Controls bar */}
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <ScriptModeToggle
                        isScriptMode={isScriptMode}
                        onToggle={() => setIsScriptMode(!isScriptMode)}
                      />
                      <div className="flex items-center gap-3">
                        <CopyToCRM
                          answer={response.answer}
                          sources={response.sources}
                        />
                        <button
                          onClick={handleReportIssue}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-xl transition-colors"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span className="hidden sm:inline">Report Issue</span>
                        </button>
                      </div>
                    </div>

                    {/* Answer display */}
                    {isScriptMode ? (
                      <ScriptModeAnswer
                        answer={response.answer}
                        confidence={response.confidence}
                      />
                    ) : (
                      <SearchResults
                        query={query}
                        response={response}
                        isLoading={false}
                        error={null}
                        onReportIssue={handleReportIssue}
                      />
                    )}

                    {/* Sources (shown in both modes) */}
                    {isScriptMode && <SourcesList sources={response.sources} />}

                    {/* Feedback */}
                    <div className="flex items-center justify-center pt-4 border-t border-gray-100">
                      <FeedbackButton
                        queryText={query}
                        answerText={response.answer}
                      />
                    </div>
                  </>
                ) : (
                  <SearchResults
                    query={query}
                    response={response}
                    isLoading={false}
                    error={null}
                    onReportIssue={handleReportIssue}
                  />
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 py-2">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between text-xs text-gray-500">
          <span>Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">Ctrl+K</kbd> to focus search</span>
          <span>EasyKMS Agent v1.0</span>
        </div>
      </footer>

      {/* Issue Report Modal */}
      <IssueReportModal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        queryText={query}
        answerText={response?.answer}
      />
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-indigo-600 font-medium animate-pulse">Loading Agent Cockpit...</div>
      </div>
    }>
      <AgentCockpitContent />
    </Suspense>
  );
}
