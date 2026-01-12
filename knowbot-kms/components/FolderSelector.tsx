'use client';

import { useState, useEffect } from 'react';

interface Folder {
  id: string;
  name: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
}

interface FolderSelectorProps {
  tenantId: string;
  currentFolderId?: string | null;
  onFolderSelected: (folderId: string) => void;
}

export default function FolderSelector({
  tenantId,
  currentFolderId,
  onFolderSelected,
}: FolderSelectorProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenantId) {
      loadFolders();
    }
  }, [tenantId]);

  const loadFolders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/google-drive/folders?tenantId=${tenantId}`);
      const data = await response.json();

      if (data.success) {
        setFolders(data.folders || []);
      } else {
        setError(data.error || 'Failed to load folders');
      }
    } catch (err) {
      console.error('Failed to load folders:', err);
      setError('Failed to load folders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFolderId) {
      alert('Please select a folder');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/google-drive/set-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          folderId: selectedFolderId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onFolderSelected(selectedFolderId);
        alert('Folder selected successfully!');
      } else {
        alert(`Failed to save folder: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to save folder:', err);
      alert('Failed to save folder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span>Loading folders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadFolders}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Google Drive Folder
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Choose the folder containing your SOP documents. Only files in this folder will be synced.
        </p>
        
        {folders.length === 0 ? (
          <div className="text-gray-500 text-sm">
            No folders found. Make sure you have folders in your Google Drive.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
            {folders.map((folder) => (
              <label
                key={folder.id}
                className={`flex items-center gap-3 p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedFolderId === folder.id ? 'bg-blue-50' : ''
                }`}
              >
                <input
                  type="radio"
                  name="folder"
                  value={folder.id}
                  checked={selectedFolderId === folder.id}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{folder.name}</div>
                  {folder.modifiedTime && (
                    <div className="text-xs text-gray-500">
                      Modified: {new Date(folder.modifiedTime).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {selectedFolderId && (
        <button
          onClick={handleSave}
          disabled={saving || selectedFolderId === currentFolderId}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? 'Saving...' : selectedFolderId === currentFolderId ? 'Already Selected' : 'Save Folder Selection'}
        </button>
      )}

      <button
        onClick={loadFolders}
        className="text-sm text-gray-600 hover:text-gray-800 underline"
      >
        Refresh Folders
      </button>
    </div>
  );
}
