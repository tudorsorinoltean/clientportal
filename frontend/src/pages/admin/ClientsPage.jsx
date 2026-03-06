import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import MasterList from '../../components/MasterList';
import DetailPanel from '../../components/DetailPanel';
import api from '../../lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Fetch detail when client selected
  useEffect(() => {
    if (selectedClient) {
      fetchClientDetail(selectedClient.id);
    }
  }, [selectedClient?.id]);

  async function fetchClients() {
    setLoadingClients(true);
    try {
      const res = await api.get('/clients');
      setClients(res.data);
      if (res.data.length > 0 && !selectedClient) {
        setSelectedClient(res.data[0]);
      }
    } catch (err) {
      console.error('fetchClients error:', err);
    } finally {
      setLoadingClients(false);
    }
  }

  async function fetchClientDetail(clientId) {
    setLoadingDetail(true);
    try {
      const [proposalsRes, invoicesRes, activityRes] = await Promise.all([
        api.get(`/proposals?clientId=${clientId}`),
        api.get(`/invoices?clientId=${clientId}`),
        api.get(`/activity/${clientId}`),
      ]);
      setProposals(proposalsRes.data);
      setInvoices(invoicesRes.data);
      setActivities(activityRes.data);
    } catch (err) {
      console.error('fetchClientDetail error:', err);
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleSelectClient(client) {
    setSelectedClient(client);
    setDrawerOpen(false);
  }

  return (
    <div className="h-screen flex flex-col bg-[#f7f8f5] overflow-hidden">
      <Topbar
        activePage="Clients"
        onNewClient={() => setShowNewClientModal(true)}
        onMenuOpen={selectedClient ? undefined : () => setDrawerOpen(true)}
        onBack={selectedClient ? () => setSelectedClient(null) : undefined}
      />

      <div className="flex flex-1 overflow-hidden">
        <MasterList
          clients={clients}
          selectedId={selectedClient?.id}
          onSelect={handleSelectClient}
          loading={loadingClients}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />

        {/* Mobile: no client selected placeholder */}
        {!selectedClient && (
          <div
            className="flex-1 flex items-center justify-center md:hidden text-[#7a8a7a] text-sm"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            ← Select a client
          </div>
        )}

        {/* DetailPanel — full width on mobile, hidden when no client on mobile */}
        <div className={`flex-1 min-w-0 overflow-hidden pb-16 md:pb-0 ${!selectedClient ? 'hidden md:block' : 'block'}`}>
          <DetailPanel
            client={selectedClient}
            proposals={proposals}
            invoices={invoices}
            activities={activities}
            loading={loadingDetail}
            onNewProposal={() => console.log('New proposal for', selectedClient?.name)}
          />
        </div>
      </div>

      {showNewClientModal && (
        <NewClientModal
          onClose={() => setShowNewClientModal(false)}
          onCreated={(newClient) => {
            setClients(prev => [newClient, ...prev]);
            setSelectedClient(newClient);
            setShowNewClientModal(false);
          }}
        />
      )}
    </div>
  );
}

function NewClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', email: '', company: '', phone: '', type: 'retainer', notes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.type) {
      setError('Name, email and type are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/clients', form);
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating client.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl border border-[#eceee6] shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-lg text-[#1a2a1a]"
            style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500 }}
          >
            New Client
          </h2>
          <button
            onClick={onClose}
            className="text-[#7a8a7a] hover:text-[#1a2a1a] text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Name *', key: 'name', placeholder: 'John Smith' },
            { label: 'Email *', key: 'email', placeholder: 'john@company.com' },
            { label: 'Company', key: 'company', placeholder: 'Acme Inc.' },
            { label: 'Phone', key: 'phone', placeholder: '+40 700 000 000' },
          ].map(field => (
            <div key={field.key}>
              <label
                className="block text-xs font-medium text-[#4a5a4a] mb-1 uppercase tracking-wide"
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              >
                {field.label}
              </label>
              <input
                type="text"
                value={form[field.key]}
                onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] transition-colors text-[#1a2a1a]"
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              />
            </div>
          ))}

          <div>
            <label
              className="block text-xs font-medium text-[#4a5a4a] mb-1 uppercase tracking-wide"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              Type *
            </label>
            <select
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] transition-colors text-[#1a2a1a]"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              <option value="retainer">Retainer</option>
              <option value="one-shot">One-shot</option>
            </select>
          </div>
        </div>

        {error && (
          <div
            className="mt-3 px-3 py-2 bg-[#fde8e8] border border-[#f5c0c0] rounded-md text-sm text-[#c0392b]"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm border border-[#eceee6] text-[#4a5a4a] rounded-md hover:bg-[#f7f8f5] transition-colors"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 text-sm bg-[#2d7a2d] text-white rounded-md hover:bg-[#256425] transition-colors disabled:opacity-50"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            {loading ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  );
}