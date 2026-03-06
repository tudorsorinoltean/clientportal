import { useState, useEffect, useRef } from 'react';
import Topbar from '../../components/Topbar';
import api from '../../lib/api';

const FILE_ICONS = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/webp': '🖼️',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'text/plain': '📃',
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadClientId, setUploadClientId] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (clients.length > 0) {
      fetchAllFiles();
      setUploadClientId(clients[0].id);
    }
  }, [clients]);

  async function fetchClients() {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (err) {
      console.error('fetchClients error:', err);
    }
  }

  async function fetchAllFiles() {
    setLoading(true);
    try {
      const results = await Promise.all(
        clients.map(c => api.get(`/files/${c.id}`).then(r => r.data).catch(() => []))
      );
      setFiles(results.flat());
    } catch (err) {
      console.error('fetchAllFiles error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file || !uploadClientId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', uploadClientId);
      formData.append('description', uploadDescription);

      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFiles(prev => [res.data, ...prev]);
      setUploadDescription('');
      setShowUploadPanel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert(err.response?.data?.error || 'Error uploading file.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(file) {
    try {
      const res = await api.get(`/files/${file.clientId}/${file.fileId}/download`);
      window.open(res.data.url, '_blank');
    } catch (err) {
      alert('Error generating download link.');
    }
  }

  async function handleDelete(file) {
    if (!confirm(`Delete "${file.originalName}"?`)) return;
    try {
      await api.delete(`/files/${file.clientId}/${file.fileId}`);
      setFiles(prev => prev.filter(f => f.fileId !== file.fileId));
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting file.');
    }
  }

  function getClientName(clientId) {
    return clients.find(c => c.id === clientId)?.name || '—';
  }

  const filtered = selectedClientId === 'all'
    ? files
    : files.filter(f => f.clientId === selectedClientId);

  return (
    <div className="h-screen flex flex-col bg-[#f7f8f5] overflow-hidden">
      <Topbar />

      <div className="flex-1 overflow-y-auto p-6 pb-16 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1
              className="text-xl text-[#1a2a1a]"
              style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500 }}
            >
              Files
            </h1>
            <p className="text-sm text-[#7a8a7a] mt-0.5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {files.length} total
            </p>
          </div>
          <button
            onClick={() => setShowUploadPanel(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d7a2d] text-white text-sm rounded-md hover:bg-[#256425] transition-colors"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            <span className="text-lg leading-none">↑</span>
            Upload File
          </button>
        </div>

        {/* Client filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setSelectedClientId('all')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              selectedClientId === 'all'
                ? 'bg-[#1a2a1a] text-white'
                : 'bg-white border border-[#eceee6] text-[#4a5a4a] hover:bg-[#f0f7f0]'
            }`}
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            All clients
          </button>
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedClientId(c.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedClientId === c.id
                  ? 'bg-[#1a2a1a] text-white'
                  : 'bg-white border border-[#eceee6] text-[#4a5a4a] hover:bg-[#f0f7f0]'
              }`}
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Files grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-[#eceee6] rounded-lg p-4 animate-pulse">
                <div className="w-8 h-8 bg-[#eceee6] rounded mb-3" />
                <div className="h-3 bg-[#eceee6] rounded w-3/4 mb-2" />
                <div className="h-2 bg-[#eceee6] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#eceee6] rounded-lg p-12 text-center">
            <p className="text-sm text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              No files yet. Upload the first file using the button above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filtered.map(file => (
              <div key={file.fileId} className="bg-white border border-[#eceee6] rounded-lg p-4 hover:border-[#2d7a2d] transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{FILE_ICONS[file.mimeType] || '📁'}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(file)}
                      className="text-xs px-2 py-1 bg-[#dce8f7] text-[#1a3a6b] rounded hover:bg-[#c8d8f0] transition-colors"
                      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="text-xs px-2 py-1 bg-[#fde8e8] text-[#c0392b] rounded hover:bg-[#f5c0c0] transition-colors"
                      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm font-medium text-[#1a2a1a] truncate mb-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {file.originalName}
                </p>
                {file.description && (
                  <p className="text-xs text-[#7a8a7a] truncate mb-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {file.description}
                  </p>
                )}
                <div className="flex flex-col gap-0.5 mt-2">
                  <span className="text-xs text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {getClientName(file.clientId)}
                  </span>
                  <span className="text-xs text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {formatBytes(file.size)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload panel */}
      {showUploadPanel && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl border border-[#eceee6] shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-[#1a2a1a]" style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>
                Upload File
              </h2>
              <button onClick={() => setShowUploadPanel(false)} className="text-[#7a8a7a] hover:text-[#1a2a1a] text-xl leading-none">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#4a5a4a] mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Client *</label>
                <select
                  value={uploadClientId}
                  onChange={e => setUploadClientId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] text-[#1a2a1a]"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                >
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4a5a4a] mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Description</label>
                <input
                  type="text"
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  placeholder="Optional description..."
                  className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] text-[#1a2a1a]"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4a5a4a] mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>File * (max 10MB)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleUpload}
                  disabled={uploading}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
                  className="w-full text-sm text-[#4a5a4a] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-[#2d7a2d] file:text-white hover:file:bg-[#256425] file:cursor-pointer"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                />
              </div>

              {uploading && (
                <div className="flex items-center gap-2 text-sm text-[#4a5a4a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  <div className="w-4 h-4 border-2 border-[#2d7a2d] border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowUploadPanel(false)}
                className="flex-1 py-2 text-sm border border-[#eceee6] text-[#4a5a4a] rounded-md hover:bg-[#f7f8f5] transition-colors"
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}