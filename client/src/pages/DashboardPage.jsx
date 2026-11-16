import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';
import { StatusBadge, BloodBadge } from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import MemberDetailModal from '../components/MemberDetailModal';
import MemberFormModal from '../components/MemberFormModal';
import { getDisplayMemberId } from '../utils/memberUtils';
import {
  Users,
  UserCheck,
  UserX,
  QrCode,
  Plus,
  Upload,
  Download,
  ArrowUpRight,
  Clock,
  Building2,
  Heart
} from 'lucide-react';

const DashboardPage = () => {
  const { refreshTrigger, openAddModal } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedMember, setSelectedMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, recentRes] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecent()
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (recentRes.success) setRecent(recentRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger]);

  if (loading && !stats) {
    return <LoadingSpinner text="Loading dashboard analytics..." />;
  }

  const statCards = [
    {
      title: 'Total Members',
      value: stats?.totalMembers ?? 0,
      icon: Users,
      color: 'var(--primary)',
      bg: 'var(--primary-light)'
    },
    {
      title: 'Active Members',
      value: stats?.activeMembers ?? 0,
      icon: UserCheck,
      color: 'var(--success)',
      bg: 'var(--success-light)'
    },
    {
      title: 'Inactive Members',
      value: stats?.inactiveMembers ?? 0,
      icon: UserX,
      color: 'var(--danger)',
      bg: 'var(--danger-light)'
    },
    {
      title: 'QR Codes Active',
      value: stats?.qrCodesGenerated ?? 0,
      icon: QrCode,
      color: '#8B5CF6',
      bg: '#EDE9FE'
    }
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">
            Overview of membership records, QR verification, and driver statistics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            <span>Add Member</span>
          </button>
          <Link to="/import" className="btn btn-secondary">
            <Upload size={16} />
            <span>Import CSV</span>
          </Link>
          <Link to="/export" className="btn btn-outline">
            <Download size={16} />
            <span>Bulk Export</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}
      >
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  {card.title}
                </span>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: card.bg,
                    color: card.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Icon size={20} />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {card.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Recently Added Members & Top Companies */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        {/* Recently Added Members */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recently Added Members</h3>
              <p className="card-subtitle">Latest registered members</p>
            </div>
            <Link to="/members" className="btn btn-secondary btn-sm">
              <span>View All</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Transport Co.</th>
                  <th>Blood</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent?.recentlyAdded && recent.recentlyAdded.length > 0 ? (
                  recent.recentlyAdded.map((m) => (
                    <tr
                      key={m._id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedMember(m)}
                    >
                      <td>
                        <strong
                          style={{
                            fontFamily: 'monospace',
                            color: getDisplayMemberId(m) === 'No ID Assigned' ? 'var(--text-muted)' : 'var(--primary)'
                          }}
                        >
                          {getDisplayMemberId(m)}
                        </strong>
                      </td>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td>{m.transportCompany}</td>
                      <td>
                        <BloodBadge bloodGroup={m.bloodGroup} />
                      </td>
                      <td>
                        <StatusBadge status={m.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transport Companies & Blood Groups Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Transport Companies */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} color="var(--primary)" />
                <h3 className="card-title">Top Transport Companies</h3>
              </div>
            </div>
            <div className="card-body" style={{ padding: '1rem 1.5rem' }}>
              {stats?.topTransportCompanies && stats.topTransportCompanies.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {stats.topTransportCompanies.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0',
                        borderBottom: idx < stats.topTransportCompanies.length - 1 ? '1px solid var(--border)' : 'none'
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{item.company}</span>
                      <span className="badge badge-subtle">{item.count} drivers</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No company data.</p>
              )}
            </div>
          </div>

          {/* Blood Group Distribution */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Heart size={18} color="var(--danger)" />
                <h3 className="card-title">Blood Group Bank</h3>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {stats?.bloodGroupDistribution && stats.bloodGroupDistribution.length > 0 ? (
                  stats.bloodGroupDistribution.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.5rem 0.875rem',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{item.group}</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No blood group data.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedMember && (
        <MemberDetailModal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          member={selectedMember}
          onEdit={(m) => {
            setSelectedMember(null);
            setEditingMember(m);
          }}
          onStatusChanged={fetchDashboardData}
        />
      )}

      {editingMember && (
        <MemberFormModal
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          member={editingMember}
          onSaved={() => {
            setEditingMember(null);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;

