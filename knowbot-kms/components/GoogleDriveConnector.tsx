'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ConnectionStatus {
  connected: boolean;
  email?: string;
  expiresAt?: string;
  needsRefresh?: boolean;
}

interface GoogleDriveConnectorProps {
  tenantId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export default function GoogleDriveConnector({
  tenantId,
  onConnected,
  onDisconnected,
}: GoogleDriveConnectorProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Check connection status
  useEffect(() => {
    if (!tenantId) return;
    checkStatus();
  }, [tenantId]);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/google-oauth/status?tenantId=${tenantId}`);
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
      } else {
        setStatus({ connected: false });
      }
    } catch (error) {
      console.error('Failed to check Google Drive status:', error);
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!tenantId) {
      alert('Tenant ID is required');
      return;
    }

    setConnecting(true);
    try {
      // Redirect to OAuth authorization
      window.location.href = `/api/google-oauth/authorize?tenantId=${tenantId}`;
    } catch (error) {
      console.error('Failed to initiate Google OAuth:', error);
      alert('Failed to connect Google Drive. Please try again.');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? This will stop syncing.')) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch('/api/google-oauth/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus({ connected: false });
        onDisconnected?.();
        alert('Google Drive disconnected successfully');
      } else {
        alert(`Failed to disconnect: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to disconnect Google Drive:', error);
      alert('Failed to disconnect Google Drive. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span>Checking connection status...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-red-600">
        Failed to load connection status
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {status.connected ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-green-800 font-medium">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Connected to Google Drive
              </div>
              {status.email && (
                <p className="text-sm text-green-700 mt-1">
                  Connected as: {status.email}
                </p>
              )}
              {status.needsRefresh && (
                <p className="text-xs text-yellow-700 mt-1">
                  ⚠️ Token needs refresh
                </p>
              )}
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Google Drive Not Connected</h3>
              <p className="text-sm text-gray-600 mt-1">
                Connect your Google Drive to start syncing documents
              </p>
            </div>
            <button
              onClick={handleConnect}
              disabled={connecting || !user}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                  Connect Google Drive
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
