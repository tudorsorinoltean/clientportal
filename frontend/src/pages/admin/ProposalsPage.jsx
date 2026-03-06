import { useState, useEffect } from "react";
import Topbar from "../../components/Topbar";
import api from "../../lib/api";
import { generateProposalPdf } from '../../lib/proposalPdf';

const STATUS_COLORS = {
  draft: "bg-[#f0f0ea] text-[#6a7a6a]",
  sent: "bg-[#dce8f7] text-[#1a3a6b]",
  accepted: "bg-[#e8f4e8] text-[#2d7a2d]",
  rejected: "bg-[#fde8e8] text-[#c0392b]",
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [proposalsRes, clientsRes] = await Promise.all([
        api.get("/proposals"),
        api.get("/clients"),
      ]);
      setProposals(proposalsRes.data);
      setClients(clientsRes.data);
    } catch (err) {
      console.error("fetchData error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(proposalId, newStatus) {
    try {
      const res = await api.put(`/proposals/${proposalId}/status`, {
        status: newStatus,
      });
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, ...res.data } : p)),
      );
    } catch (err) {
      console.error("handleStatusChange error:", err);
    }
  }

  async function handleDelete(proposalId) {
    if (!confirm("Delete this proposal?")) return;
    try {
      await api.delete(`/proposals/${proposalId}`);
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting proposal.");
    }
  }

  function getClientName(clientId) {
    return clients.find((c) => c.id === clientId)?.name || "—";
  }

  const filtered =
    filterStatus === "all"
      ? proposals
      : proposals.filter((p) => p.status === filterStatus);

  return (
    <div className="h-screen flex flex-col bg-[#f7f8f5] overflow-hidden">
      <Topbar />

      <div className="flex-1 overflow-y-auto p-6 pb-16 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1
              className="text-xl text-[#1a2a1a]"
              style={{ fontFamily: "Playfair Display, serif", fontWeight: 500 }}
            >
              Proposals
            </h1>
            <p
              className="text-sm text-[#7a8a7a] mt-0.5"
              style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
            >
              {proposals.length} total
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d7a2d] text-white text-sm rounded-md hover:bg-[#256425] transition-colors"
            style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
          >
            <span className="text-lg leading-none">+</span>
            New Proposal
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-4">
          {["all", "draft", "sent", "accepted", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 text-xs rounded-full transition-colors capitalize ${
                filterStatus === status
                  ? "bg-[#1a2a1a] text-white"
                  : "bg-white border border-[#eceee6] text-[#4a5a4a] hover:bg-[#f0f7f0]"
              }`}
              style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div
            className="p-8 text-center text-sm text-[#7a8a7a]"
            style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
          >
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="p-8 text-center text-sm text-[#7a8a7a]"
            style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
          >
            No proposals found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((proposal) => (
              <div key={proposal.id} className="bg-white border border-[#eceee6] rounded-lg p-4 hover:border-[#2d7a2d] transition-colors">
                {/* Top row: title + status badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-[#1a2a1a] leading-snug" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {proposal.title}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${STATUS_COLORS[proposal.status]}`}
                    style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {proposal.status}
                  </span>
                </div>

                {/* Description */}
                {proposal.description && (
                  <p className="text-xs text-[#7a8a7a] mb-3 line-clamp-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {proposal.description}
                  </p>
                )}

                {/* Client + Price row */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-[#4a5a4a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    👤 {getClientName(proposal.clientId)}
                  </span>
                  <span className="text-sm font-semibold text-[#1a2a1a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {proposal.price} {proposal.currency}
                  </span>
                </div>

                {/* Date + Actions row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#f7f8f5]">
                  <span className="text-xs text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateProposalPdf(proposal, getClientName(proposal.clientId))}
                      className="text-xs px-2 py-1 bg-[#f0f0ea] text-[#4a5a4a] rounded hover:bg-[#eceee6] transition-colors"
                      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    >
                      PDF
                    </button>
                    {proposal.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange(proposal.id, 'sent')}
                        className="text-xs px-2 py-1 bg-[#dce8f7] text-[#1a3a6b] rounded hover:bg-[#c8d8f0] transition-colors"
                        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                      >
                        Send
                      </button>
                    )}
                    {proposal.status === 'draft' && (
                      <button
                        onClick={() => handleDelete(proposal.id)}
                        className="text-xs px-2 py-1 bg-[#fde8e8] text-[#c0392b] rounded hover:bg-[#f5c0c0] transition-colors"
                        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                      >
                        Delete
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
        <NewProposalModal
          clients={clients}
          onClose={() => setShowModal(false)}
          onCreated={(newProposal) => {
            setProposals((prev) => [newProposal, ...prev]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function NewProposalModal({ clients, onClose, onCreated }) {
  const [form, setForm] = useState({
    clientId: clients[0]?.id || "",
    title: "",
    description: "",
    price: "",
    currency: "EUR",
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.clientId || !form.title || !form.price) {
      setError("Client, title and price are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/proposals", form);
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Error creating proposal.");
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
            style={{ fontFamily: "Playfair Display, serif", fontWeight: 500 }}
          >
            New Proposal
          </h2>
          <button
            onClick={onClose}
            className="text-[#7a8a7a] hover:text-[#1a2a1a] text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label
              className="block text-xs font-medium text-[#4a5a4a] mb-1 uppercase tracking-wide"
              style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
            >
              Client *
            </label>
            <select
              value={form.clientId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, clientId: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] transition-colors text-[#1a2a1a]"
              style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {[
            { label: "Title *", key: "title", placeholder: "Website Redesign" },
            {
              label: "Description",
              key: "description",
              placeholder: "Brief description...",
            },
            { label: "Price *", key: "price", placeholder: "2500" },
          ].map((field) => (
            <div key={field.key}>
              <label
                className="block text-xs font-medium text-[#4a5a4a] mb-1 uppercase tracking-wide"
                style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
              >
                {field.label}
              </label>
              <input
                type={field.key === "price" ? "number" : "text"}
                value={form[field.key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.placeholder}
                className="w-full px-3 py-2 text-sm bg-[#f7f8f5] border border-[#eceee6] rounded-md outline-none focus:border-[#2d7a2d] transition-colors text-[#1a2a1a]"
                style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
              />
            </div>
          ))}
        </div>

        {error && (
          <div
            className="mt-3 px-3 py-2 bg-[#fde8e8] border border-[#f5c0c0] rounded-md text-sm text-[#c0392b]"
            style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm border border-[#eceee6] text-[#4a5a4a] rounded-md hover:bg-[#f7f8f5] transition-colors"
            style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 text-sm bg-[#2d7a2d] text-white rounded-md hover:bg-[#256425] transition-colors disabled:opacity-50"
            style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
          >
            {loading ? "Creating..." : "Create Proposal"}
          </button>
        </div>
      </div>
    </div>
  );
}
