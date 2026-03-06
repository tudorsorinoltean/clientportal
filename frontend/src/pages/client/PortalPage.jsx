import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import { generateProposalPdf } from '../../lib/proposalPdf';
import { generateInvoicePdf } from '../../lib/invoicePdf';

const STATUS_COLORS_PROPOSAL = {
  draft: 'bg-[#f0f0ea] text-[#6a7a6a]',
  sent: 'bg-[#dce8f7] text-[#1a3a6b]',
  accepted: 'bg-[#e8f4e8] text-[#2d7a2d]',
  rejected: 'bg-[#fde8e8] text-[#c0392b]',
};

const STATUS_COLORS_INVOICE = {
  draft: 'bg-[#f0f0ea] text-[#6a7a6a]',
  sent: 'bg-[#dce8f7] text-[#1a3a6b]',
  paid: 'bg-[#e8f4e8] text-[#2d7a2d]',
  overdue: 'bg-[#fde8e8] text-[#c0392b]',
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PortalPage() {
  const { user, clientId, logout } = useAuth();
  const [client, setClient] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [files, setFiles] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (clientId) fetchData();
  }, [clientId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [proposalsRes, invoicesRes, filesRes, activityRes] = await Promise.all([
        api.get(`/proposals?clientId=${clientId}`),
        api.get(`/invoices?clientId=${clientId}`),
        api.get(`/files/${clientId}`),
        api.get(`/activity/${clientId}`),
      ]);
      setProposals(proposalsRes.data);
      setInvoices(invoicesRes.data);
      setFiles(filesRes.data);
      setActivities(activityRes.data);
    } catch (err) {
      console.error('fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleProposalResponse(proposalId, status) {
    try {
      const res = await api.put(`/proposals/${proposalId}/status`, { status });
      setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, ...res.data } : p));
    } catch (err) {
      console.error('handleProposalResponse error:', err);
    }
  }

  async function handleDownloadFile(file) {
    try {
      const res = await api.get(`/files/${file.clientId}/${file.fileId}/download`);
      window.open(res.data.url, '_blank');
    } catch (err) {
      alert('Error generating download link.');
    }
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Client';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const pendingProposals = proposals.filter(p => p.status === 'sent');
  const unpaidInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const totalOwed = unpaidInvoices.reduce((sum, i) => sum + (i.total || 0), 0);

  const TABS = ['overview', 'proposals', 'invoices', 'files'];

  return (
    <div className="min-h-screen bg-[#f7f8f5]">
      {/* Topbar */}
      <header className="h-14 bg-white border-b border-[#eceee6] flex items-center px-6 justify-between">
        <span
          className="text-[#1a2a1a]"
          style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 500 }}
        >
          Client.Portal
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#4a5a4a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            {displayName}
          </span>
          <button
            onClick={logout}
            className="w-8 h-8 rounded-full bg-[#1a2a1a] text-white text-xs flex items-center justify-center hover:bg-[#2d7a2d] transition-colors"
            title="Logout"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            {initials}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 pb-8">
        {/* Welcome */}
        <div className="mb-6">
          <h1
            className="text-2xl text-[#1a2a1a]"
            style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500 }}
          >
            Welcome, {displayName.split(' ')[0]}
          </h1>
          <p className="text-sm text-[#7a8a7a] mt-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            Your client portal — proposals, invoices and files in one place.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-[#eceee6] rounded-lg p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm rounded-md capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-[#1a2a1a] text-white'
                  : 'text-[#4a5a4a] hover:bg-[#f0f7f0]'
              }`}
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#2d7a2d] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-1 gap-2 mb-4">
                  <div className="bg-white border border-[#eceee6] rounded-lg px-4 py-3 flex items-center justify-between">
                    <p className="text-xs text-[#7a8a7a] uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Pending Proposals</p>
                    <p className="text-xl font-semibold text-[#1a3a6b]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{pendingProposals.length}</p>
                  </div>
                  <div className="bg-white border border-[#eceee6] rounded-lg px-4 py-3 flex items-center justify-between">
                    <p className="text-xs text-[#7a8a7a] uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Amount Due</p>
                    <p className="text-xl font-semibold text-[#c0392b]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{totalOwed.toFixed(2)} EUR</p>
                  </div>
                  <div className="bg-white border border-[#eceee6] rounded-lg px-4 py-3 flex items-center justify-between">
                    <p className="text-xs text-[#7a8a7a] uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Files Shared</p>
                    <p className="text-xl font-semibold text-[#2d7a2d]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{files.length}</p>
                  </div>
                </div>

                {/* Pending proposals alert */}
                {pendingProposals.length > 0 && (
                  <div className="bg-[#dce8f7] border border-[#b8d0f0] rounded-lg p-4">
                    <p className="text-sm font-medium text-[#1a3a6b] mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      📋 You have {pendingProposals.length} proposal{pendingProposals.length > 1 ? 's' : ''} awaiting your response
                    </p>
                    {pendingProposals.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white rounded-md px-3 py-2 mt-2">
                        <div>
                          <p className="text-sm font-medium text-[#1a2a1a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{p.title}</p>
                          <p className="text-xs text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{p.price} {p.currency}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleProposalResponse(p.id, 'accepted')}
                            className="text-xs px-3 py-1 bg-[#2d7a2d] text-white rounded hover:bg-[#256425] transition-colors"
                            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleProposalResponse(p.id, 'rejected')}
                            className="text-xs px-3 py-1 bg-[#fde8e8] text-[#c0392b] rounded hover:bg-[#f5c0c0] transition-colors"
                            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent activity */}
                <div className="bg-white border border-[#eceee6] rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-[#1a2a1a] mb-3" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Recent Activity</h3>
                  {activities.length === 0 ? (
                    <p className="text-sm text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No activity yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {activities.slice(0, 5).map(act => (
                        <div key={act.id} className="flex items-start gap-3 py-1.5 border-b border-[#f7f8f5] last:border-0">
                          <div className="flex-1">
                            <p className="text-sm text-[#1a2a1a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{act.description}</p>
                            <p className="text-xs text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                              {act.createdAt ? new Date(act.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Proposals tab */}
            {activeTab === 'proposals' && (
              <div>
                {proposals.length === 0 ? (
                  <div className="bg-white border border-[#eceee6] rounded-lg p-8 text-center text-sm text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No proposals yet.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {proposals.map(p => (
                      <div key={p.id} className="bg-white border border-[#eceee6] rounded-lg p-4 hover:border-[#2d7a2d] transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold text-[#1a2a1a] leading-snug" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{p.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${STATUS_COLORS_PROPOSAL[p.status]}`} style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{p.status}</span>
                        </div>
                        {p.description && (
                          <p className="text-xs text-[#7a8a7a] mb-3 line-clamp-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{p.description}</p>
                        )}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-[#1a2a1a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{p.price} {p.currency}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-[#f7f8f5]">
                          <button onClick={() => generateProposalPdf(p, displayName)}
                            className="text-xs px-2 py-1 bg-[#f0f0ea] text-[#4a5a4a] rounded hover:bg-[#eceee6] transition-colors"
                            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>PDF</button>
                          {p.status === 'sent' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleProposalResponse(p.id, 'accepted')}
                                className="text-xs px-2 py-1 bg-[#e8f4e8] text-[#2d7a2d] rounded hover:bg-[#d0ebd0] transition-colors"
                                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Accept</button>
                              <button onClick={() => handleProposalResponse(p.id, 'rejected')}
                                className="text-xs px-2 py-1 bg-[#fde8e8] text-[#c0392b] rounded hover:bg-[#f5c0c0] transition-colors"
                                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Decline</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Invoices tab */}
            {activeTab === 'invoices' && (
              <div>
                {invoices.length === 0 ? (
                  <div className="bg-white border border-[#eceee6] rounded-lg p-8 text-center text-sm text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No invoices yet.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {invoices.map(inv => (
                      <div key={inv.id} className="bg-white border border-[#eceee6] rounded-lg p-4 hover:border-[#2d7a2d] transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold text-[#1a2a1a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>#{inv.number}</p>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${STATUS_COLORS_INVOICE[inv.status]}`} style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{inv.status}</span>
                        </div>
                        {inv.lines?.[0]?.description && (
                          <p className="text-xs text-[#7a8a7a] mb-3 line-clamp-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{inv.lines[0].description}</p>
                        )}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-[#1a2a1a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{inv.total?.toFixed(2)} {inv.currency}</span>
                          <span className="text-xs text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Due: {inv.dueDate || '—'}</span>
                        </div>
                        <div className="pt-2 border-t border-[#f7f8f5]">
                          <button onClick={() => generateInvoicePdf(inv, displayName)}
                            className="text-xs px-2 py-1 bg-[#f0f0ea] text-[#4a5a4a] rounded hover:bg-[#eceee6] transition-colors"
                            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>PDF</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Files tab */}
            {activeTab === 'files' && (
              <div>
                {files.length === 0 ? (
                  <div className="bg-white border border-[#eceee6] rounded-lg p-8 text-center text-sm text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    No files shared yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {files.map(file => (
                      <div key={file.fileId} className="bg-white border border-[#eceee6] rounded-lg p-4 flex items-center gap-3 hover:border-[#2d7a2d] transition-colors">
                        <span className="text-2xl shrink-0">📄</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1a2a1a] truncate" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{file.originalName}</p>
                          {file.description && <p className="text-xs text-[#7a8a7a] truncate" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{file.description}</p>}
                          <p className="text-xs text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{formatBytes(file.size)}</p>
                        </div>
                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="text-xs px-2 py-1 bg-[#dce8f7] text-[#1a3a6b] rounded hover:bg-[#c8d8f0] transition-colors shrink-0"
                          style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}