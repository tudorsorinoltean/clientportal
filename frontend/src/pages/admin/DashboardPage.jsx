import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Topbar from '../../components/Topbar';
import api from '../../lib/api';

function KpiCard({ icon, label, value, loading }) {
  if (loading) {
    return (
      <div className="bg-white border border-[#eceee6] rounded-xl p-5 animate-pulse">
        <div className="w-10 h-10 rounded-lg bg-[#f0f7f0] mb-3" />
        <div className="h-8 bg-[#f0f7f0] rounded mb-2 w-24" />
        <div className="h-4 bg-[#f0f7f0] rounded w-32" />
      </div>
    );
  }
  return (
    <div className="bg-white border border-[#eceee6] rounded-xl p-5">
      <div className="w-10 h-10 rounded-lg bg-[#f0f7f0] flex items-center justify-center text-[#2d7a2d] mb-3">
        {icon}
      </div>
      <div
        className="text-3xl font-bold text-[#1a2a1a] leading-none mb-1"
        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
      >
        {value}
      </div>
      <div
        className="text-sm text-[#6a7a6a]"
        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
      >
        {label}
      </div>
    </div>
  );
}

const STATUSES = ['draft', 'sent', 'accepted', 'rejected'];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    retainerClients: 0,
    oneShotClients: 0,
    pendingProposals: 0,
    acceptedProposals: 0,
    totalProposals: 0,
    unpaidInvoices: 0,
    revenueThisMonth: 0,
    proposalsByStatus: [],
  });

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [clientsRes, proposalsRes, invoicesRes] = await Promise.all([
          api.get('/clients'),
          api.get('/proposals'),
          api.get('/invoices'),
        ]);

        const clients = clientsRes.data;
        const proposals = proposalsRes.data;
        const invoices = invoicesRes.data;

        // Clients
        const totalClients = clients.length;
        const retainerClients = clients.filter(c => c.type === 'retainer').length;
        const oneShotClients = clients.filter(c => c.type === 'one-shot').length;

        // Proposals
        const pendingProposals = proposals.filter(p => p.status === 'sent').length;
        const acceptedProposals = proposals.filter(p => p.status === 'accepted').length;
        const totalProposals = proposals.length;

        const proposalsByStatus = STATUSES.map(status => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count: proposals.filter(p => p.status === status).length,
        }));

        // Invoices
        const unpaidInvoices = invoices.filter(
          i => i.status === 'sent' || i.status === 'overdue'
        ).length;

        const now = new Date();
        const revenueThisMonth = invoices
          .filter(i => {
            if (i.status !== 'paid') return false;
            const d = new Date(i.paidAt || i.updatedAt || i.createdAt);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
          })
          .reduce((sum, i) => sum + (Number(i.total) || 0), 0);

        setStats({
          totalClients,
          retainerClients,
          oneShotClients,
          pendingProposals,
          acceptedProposals,
          totalProposals,
          unpaidInvoices,
          revenueThisMonth,
          proposalsByStatus,
        });
      } catch (err) {
        console.error('DashboardPage fetchAll error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const acceptanceRate =
    stats.totalProposals > 0
      ? Math.round((stats.acceptedProposals / stats.totalProposals) * 100)
      : 0;

  const formatRevenue = (amount) =>
    '€' + amount.toLocaleString('en-US', { minimumFractionDigits: 0 });

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f8f5]">
      <Topbar />

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-20 md:pb-8">
        {/* Page title */}
        <h1
          className="text-2xl text-[#1a2a1a] mb-6"
          style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500 }}
        >
          Dashboard
        </h1>

        {/* KPI cards — 2×2 on mobile, 4 cols on md+ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard
            loading={loading}
            icon={<UsersIcon />}
            label="Active Clients"
            value={stats.totalClients}
          />
          <KpiCard
            loading={loading}
            icon={<FileTextIcon />}
            label="Pending Proposals"
            value={stats.pendingProposals}
          />
          <KpiCard
            loading={loading}
            icon={<AlertCircleIcon />}
            label="Unpaid Invoices"
            value={stats.unpaidInvoices}
          />
          <KpiCard
            loading={loading}
            icon={<TrendingUpIcon />}
            label="Revenue This Month"
            value={formatRevenue(stats.revenueThisMonth)}
          />
        </div>

        {/* Proposals by Status chart */}
        {loading ? (
          <div className="bg-[#f0f7f0] rounded-xl h-[320px] animate-pulse mb-6" />
        ) : (
          <div className="bg-white border border-[#eceee6] rounded-xl p-5 mb-6">
            <h2
              className="text-base text-[#1a2a1a] mb-4"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 500 }}
            >
              Proposals by Status
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.proposalsByStatus} barCategoryGap="40%">
                <XAxis
                  dataKey="status"
                  tick={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fill: '#6a7a6a' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fill: '#6a7a6a' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    fontFamily: 'IBM Plex Sans, sans-serif',
                    fontSize: 13,
                    border: '1px solid #eceee6',
                    borderRadius: 8,
                  }}
                  cursor={{ fill: '#f0f7f0' }}
                />
                <Bar dataKey="count" fill="#2d7a2d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <>
              <div className="bg-[#f0f7f0] rounded-xl h-28 animate-pulse" />
              <div className="bg-[#f0f7f0] rounded-xl h-28 animate-pulse" />
            </>
          ) : (
            <>
              {/* Client types */}
              <div className="bg-white border border-[#eceee6] rounded-xl p-5">
                <h3
                  className="text-sm font-medium text-[#4a5a4a] uppercase tracking-wide mb-3"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                >
                  Client Types
                </h3>
                <div className="flex gap-6">
                  <div>
                    <div
                      className="text-2xl font-bold text-[#1a2a1a]"
                      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    >
                      {stats.retainerClients}
                    </div>
                    <div className="text-sm text-[#6a7a6a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Retainer
                    </div>
                  </div>
                  <div className="w-px bg-[#eceee6]" />
                  <div>
                    <div
                      className="text-2xl font-bold text-[#1a2a1a]"
                      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    >
                      {stats.oneShotClients}
                    </div>
                    <div className="text-sm text-[#6a7a6a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      One-shot
                    </div>
                  </div>
                </div>
              </div>

              {/* Proposal acceptance */}
              <div className="bg-white border border-[#eceee6] rounded-xl p-5">
                <h3
                  className="text-sm font-medium text-[#4a5a4a] uppercase tracking-wide mb-3"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                >
                  Proposal Acceptance
                </h3>
                <div className="flex gap-6">
                  <div>
                    <div
                      className="text-2xl font-bold text-[#1a2a1a]"
                      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    >
                      {stats.acceptedProposals}
                    </div>
                    <div className="text-sm text-[#6a7a6a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Accepted
                    </div>
                  </div>
                  <div className="w-px bg-[#eceee6]" />
                  <div>
                    <div
                      className="text-2xl font-bold text-[#1a2a1a]"
                      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    >
                      {stats.totalProposals}
                    </div>
                    <div className="text-sm text-[#6a7a6a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Total
                    </div>
                  </div>
                  <div className="w-px bg-[#eceee6]" />
                  <div>
                    <div
                      className="text-2xl font-bold text-[#2d7a2d]"
                      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    >
                      {acceptanceRate}%
                    </div>
                    <div className="text-sm text-[#6a7a6a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Rate
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  );
}
