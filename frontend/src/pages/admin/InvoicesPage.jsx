import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import api from '../../lib/api';
import { generateInvoicePdf } from '../../lib/invoicePdf';

const STATUS_COLORS = {
  draft: 'bg-[#f0f0ea] text-[#6a7a6a]',
  sent: 'bg-[#dce8f7] text-[#1a3a6b]',
  paid: 'bg-[#e8f4e8] text-[#2d7a2d]',
  overdue: 'bg-[#fde8e8] text-[#c0392b]',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [invoicesRes, clientsRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/clients'),
      ]);
      setInvoices(invoicesRes.data);
      setClients(clientsRes.data);
    } catch (err) {
      console.error('fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(invoiceId, newStatus) {
    try {
      const res = await api.put(`/invoices/${invoiceId}/status`, { status: newStatus });
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, ...res.data } : inv));
    } catch (err) {
      console.error('handleStatusChange error:', err);
    }
  }

  function getClientName(clientId) {
    return clients.find(c => c.id === clientId)?.name || '—';
  }

  const filtered = filterStatus === 'all'
    ? invoices
    : invoices.filter(inv => inv.status === filterStatus);

  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  const totalPending = invoices
    .filter(inv => inv.status === 'sent')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  const totalOverdue = invoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  return (
    <div className="h-screen flex flex-col bg-[#f7f8f5] overflow-hidden">
      <Topbar activePage="Invoices" />

      <div className="flex-1 overflow-y-auto p-6 pb-16 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1
              className="text-xl text-[#1a2a1a]"
              style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500 }}
            >
              Invoices
            </h1>
            <p className="text-sm text-[#7a8a7a] mt-0.5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {invoices.length} total
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d7a2d] text-white text-sm rounded-md hover:bg-[#256425] transition-colors"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            <span className="text-lg leading-none">+</span>
            New Invoice
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-2 mb-5">
          {[
            { label: 'Collected', value: totalPaid, color: 'text-[#2d7a2d]' },
            { label: 'Pending', value: totalPending, color: 'text-[#1a3a6b]' },
            { label: 'Overdue', value: totalOverdue, color: 'text-[#c0392b]' },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-[#eceee6] rounded-lg px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-[#7a8a7a] uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                {stat.label}
              </p>
              <p className={`text-base font-semibold ${stat.color}`} style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                {stat.value.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
              </p>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-4">
          {['all', 'draft', 'sent', 'paid', 'overdue'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 text-xs rounded-full transition-colors capitalize ${
                filterStatus === status
                  ? 'bg-[#1a2a1a] text-white'
                  : 'bg-white border border-[#eceee6] text-[#4a5a4a] hover:bg-[#f0f7f0]'
              }`}
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="p-8 text-center text-sm text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            No invoices found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(invoice => (
              <div key={invoice.id} className="bg-white border border-[#eceee6] rounded-lg p-4 hover:border-[#2d7a2d] transition-colors">
                {/* Top row: invoice number + status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-[#1a2a1a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    #{invoice.number}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${STATUS_COLORS[invoice.status]}`}
                    style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {invoice.status}
                  </span>
                </div>

                {/* Line description */}
                {invoice.lines?.[0]?.description && (
                  <p className="text-xs text-[#7a8a7a] mb-3 line-clamp-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {invoice.lines[0].description}
                  </p>
                )}

                {/* Client + Total */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#4a5a4a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    👤 {getClientName(invoice.clientId)}
                  </span>
                  <span className="text-sm font-semibold text-[#1a2a1a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {invoice.total?.toFixed(2)} {invoice.currency}
                  </span>
                </div>

                {/* Due date */}
                <p className="text-xs text-[#7a8a7a] mb-3" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  Due: {invoice.dueDate || '—'}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#f7f8f5]">
                  <button
                    onClick={() => generateInvoicePdf(invoice, getClientName(invoice.clientId))}
                    className="text-xs px-2 py-1 bg-[#f0f0ea] text-[#4a5a4a] rounded hover:bg-[#eceee6] transition-colors"
                    style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                  >
                    PDF
                  </button>
                  <div className="flex gap-2">
                    {invoice.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange(invoice.id, 'sent')}
                        className="text-xs px-2 py-1 bg-[#dce8f7] text-[#1a3a6b] rounded hover:bg-[#c8d8f0] transition-colors"
                        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                      >
                        Send
                      </button>
                    )}
                    {invoice.status === 'sent' && (
                      <button
                        onClick={() => handleStatusChange(invoice.id, 'paid')}
                        className="text-xs px-2 py-1 bg-[#e8f4e8] text-[#2d7a2d] rounded hover:bg-[#d0ebd0] transition-colors"
                        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                      >
                        Mark Paid
                      </button>
                    )}
                    {invoice.status === 'sent' && (
                      <button
                        onClick={() => handleStatusChange(invoice.id, 'overdue')}
                        className="text-xs px-2 py-1 bg-[#fde8e8] text-[#c0392b] rounded hover:bg-[#f5c0c0] transition-colors"
                        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                      >
                        Overdue
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewInvoiceModal
          clients={clients}
          onClose={() => setShowModal(false)}
          onCreated={(newInvoice) => {
            setInvoices(prev => [newInvoice, ...prev]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function NewInvoiceModal({ clients, onClose, onCreated }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [number, setNumber] = useState(`CP-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`);
  const [lines, setLines] = useState([{ description: '', quantity: 1, unitPrice: '' }]);
  const [tax, setTax] = useState(19);
  const [currency, setCurrency] = useState('EUR');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.quantity) * Number(l.unitPrice) || 0), 0);
  const taxAmount = subtotal * (tax / 100);
  const total = subtotal + taxAmount;

  function updateLine(index, field, value) {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  }

  function addLine() {
    setLines(prev => [...prev, { description: '', quantity: 1, unitPrice: '' }]);
  }

  function removeLine(index) {
    if (lines.length === 1) return;
    setLines(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!clientId || !number || lines.some(l => !l.description || !l.unitPrice)) {
      setError('Client, number and all line items are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/invoices', { clientId, number, lines, tax, currency, dueDate });
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating invoice.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl border border-[#eceee6] shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg text-[#1a2a1a]" style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>
            New Invoice
          </h2>
          <button onClick={onClose} className="text-[#7a8a7a] hover:text-[#1a2a1a] text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#4a5a4a] mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Client *</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] text-[#1a2a1a]"
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4a5a4a] mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Number *</label>
              <input value={number} onChange={e => setNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] text-[#1a2a1a]"
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }} />
            </div>
          </div>

          {/* Line items */}
          <div>
            <label className="block text-xs font-medium text-[#4a5a4a] mb-2 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Line Items *</label>
            <div className="space-y-2">
              {lines.map((line, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    placeholder="Description"
                    value={line.description}
                    onChange={e => updateLine(index, 'description', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] text-[#1a2a1a]"
                    style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                  />
                  <input
                    placeholder="Qty"
                    type="number"
                    value={line.quantity}
                    onChange={e => updateLine(index, 'quantity', e.target.value)}
                    className="w-14 px-2 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] text-[#1a2a1a]"
                    style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                  />
                  <input
                    placeholder="Price"
                    type="number"
                    value={line.unitPrice}
                    onChange={e => updateLine(index, 'unitPrice', e.target.value)}
                    className="w-24 px-2 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] text-[#1a2a1a]"
                    style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                  />
                  <button onClick={() => removeLine(index)} className="text-[#c0392b] text-lg leading-none px-1">×</button>
                </div>
              ))}
            </div>
            <button onClick={addLine} className="mt-2 text-xs text-[#2d7a2d] hover:underline" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              + Add line
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#4a5a4a] mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Tax %</label>
              <input type="number" value={tax} onChange={e => setTax(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] text-[#1a2a1a]"
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4a5a4a] mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] text-[#1a2a1a]"
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                <option>EUR</option>
                <option>USD</option>
                <option>RON</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4a5a4a] mb-1 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] text-[#1a2a1a]"
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }} />
            </div>
          </div>

          {/* Total preview */}
          <div className="bg-[#f7f8f5] rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm text-[#4a5a4a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between text-sm text-[#4a5a4a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              <span>Tax ({tax}%)</span>
              <span>{taxAmount.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-[#1a2a1a] border-t border-[#eceee6] pt-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              <span>Total</span>
              <span>{total.toFixed(2)} {currency}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 px-3 py-2 bg-[#fde8e8] border border-[#f5c0c0] rounded-md text-sm text-[#c0392b]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-[#eceee6] text-[#4a5a4a] rounded-md hover:bg-[#f7f8f5] transition-colors" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 text-sm bg-[#2d7a2d] text-white rounded-md hover:bg-[#256425] transition-colors disabled:opacity-50" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}