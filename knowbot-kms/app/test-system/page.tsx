'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  data?: unknown;
}

export default function TestSystemPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [tenantId, setTenantId] = useState('');

  const updateResult = (name: string, updates: Partial<TestResult>) => {
    setResults((prev) => {
      const existing = prev.find((r) => r.name === name);
      if (existing) {
        return prev.map((r) => (r.name === name ? { ...r, ...updates } : r));
      }
      return [...prev, { name, status: 'pending', ...updates }];
    });
  };

  const testDatabase = async () => {
    updateResult('Database', { status: 'running' });
    try {
      const response = await fetch('/api/test-db?action=health');
      const data = await response.json();
      updateResult('Database', {
        status: data.success ? 'success' : 'error',
        message: data.success ? 'Connected' : data.error,
        data,
      });
    } catch (error: unknown) {
      updateResult('Database', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const testPinecone = async () => {
    updateResult('Pinecone', { status: 'running' });
    try {
      const response = await fetch('/api/pinecone/test?action=health');
      const data = await response.json();
      updateResult('Pinecone', {
        status: data.success ? 'success' : 'error',
        message: data.success ? 'Connected' : data.error,
        data,
      });
    } catch (error: unknown) {
      updateResult('Pinecone', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const testGoogleDrive = async () => {
    if (!tenantId) {
      alert('Please enter a tenant ID first');
      return;
    }
    updateResult('Google Drive', { status: 'running' });
    try {
      const response = await fetch(`/api/google-oauth/status?tenantId=${tenantId}`);
      const data = await response.json();
      updateResult('Google Drive', {
        status: data.success ? 'success' : 'error',
        message: data.connected
          ? `Connected as ${data.email}`
          : 'Not connected',
        data,
      });
    } catch (error: unknown) {
      updateResult('Google Drive', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const testSync = async () => {
    if (!tenantId) {
      alert('Please enter a tenant ID first');
      return;
    }
    updateResult('Sync Status', { status: 'running' });
    try {
      const response = await fetch(`/api/google-drive/sync?tenantId=${tenantId}`);
      const data = await response.json();
      updateResult('Sync Status', {
        status: data.success ? 'success' : 'error',
        message: data.success
          ? `Last sync: ${data.lastSync ? new Date(data.lastSync.created_at).toLocaleString() : 'Never'}`
          : data.error,
        data,
      });
    } catch (error: unknown) {
      updateResult('Sync Status', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const testDocuments = async () => {
    if (!tenantId) {
      alert('Please enter a tenant ID first');
      return;
    }
    updateResult('Documents', { status: 'running' });
    try {
      const response = await fetch(
        `/api/test-db?action=health&tenantId=${tenantId}`
      );
      const data = await response.json();
      const docCount = data.tables?.documents?.count || 0;
      updateResult('Documents', {
        status: 'success',
        message: `${docCount} document(s) found`,
        data: { count: docCount },
      });
    } catch (error: unknown) {
      updateResult('Documents', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const runAllTests = async () => {
    setRunning(true);
    setResults([]);

    await testDatabase();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testPinecone();
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (tenantId) {
      await testGoogleDrive();
      await new Promise((resolve) => setTimeout(resolve, 500));

      await testSync();
      await new Promise((resolve) => setTimeout(resolve, 500));

      await testDocuments();
    }

    setRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'running':
        return '⏳';
      default:
        return '⏸️';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'running':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          System Health Check
        </h1>

        {!user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">
              ⚠️ Please log in first to test authenticated features
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tenant ID (for Google Drive & Document tests)
              </label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="Enter tenant UUID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get tenant ID from database or create one via /api/test-db POST
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Tests</h2>
            <button
              onClick={runAllTests}
              disabled={running}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? 'Running...' : 'Run All Tests'}
            </button>
          </div>

          <div className="space-y-3">
            <TestButton
              label="1. Database Connection"
              onClick={testDatabase}
              disabled={running}
            />
            <TestButton
              label="2. Pinecone Connection"
              onClick={testPinecone}
              disabled={running}
            />
            <TestButton
              label="3. Google Drive Status"
              onClick={testGoogleDrive}
              disabled={running || !tenantId}
            />
            <TestButton
              label="4. Sync Status"
              onClick={testSync}
              disabled={running || !tenantId}
            />
            <TestButton
              label="5. Documents Count"
              onClick={testDocuments}
              disabled={running || !tenantId}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          {results.length === 0 ? (
            <p className="text-gray-500">No tests run yet. Click &quot;Run All Tests&quot; to start.</p>
          ) : (
            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.name}
                  className={`border rounded-lg p-4 ${
                    result.status === 'success'
                      ? 'border-green-200 bg-green-50'
                      : result.status === 'error'
                      ? 'border-red-200 bg-red-50'
                      : result.status === 'running'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getStatusIcon(result.status)}</span>
                      <div>
                        <h3 className="font-medium">{result.name}</h3>
                        {result.message && (
                          <p className={`text-sm ${getStatusColor(result.status)}`}>
                            {result.message}
                          </p>
                        )}
                      </div>
                    </div>
                    {result.status === 'running' && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                  {result.data && (
                    <details className="mt-3">
                      <summary className="text-sm text-gray-600 cursor-pointer">
                        View Details
                      </summary>
                      <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Quick Links</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>
              • <a href="/dashboard" className="underline">Dashboard</a>
            </li>
            <li>
              • <a href="/api/test-db?action=health" className="underline" target="_blank">
                Database Health API
              </a>
            </li>
            <li>
              • <a href="/api/pinecone/test?action=health" className="underline" target="_blank">
                Pinecone Health API
              </a>
            </li>
            <li>
              • <a href="http://localhost:8288" className="underline" target="_blank">
                Inngest Dashboard
              </a>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

function TestButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}
