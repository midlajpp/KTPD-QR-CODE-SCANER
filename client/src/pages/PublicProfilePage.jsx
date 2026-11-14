import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { memberService } from '../services/memberService';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfileCardView from '../components/ProfileCardView';
import { ShieldAlert } from 'lucide-react';

const PublicProfilePage = () => {
  const { token } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await memberService.getPublicProfile(token);
        if (res.success && res.data) {
          setProfileData(res);
        } else {
          setError(res.message || 'Member profile not found.');
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
          'Invalid or expired QR code.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProfile();
    }
  }, [token]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F172A',
          padding: '1.5rem 1rem'
        }}
      >
        <div
          style={{
            maxWidth: '400px',
            width: '100%',
            backgroundColor: '#1E293B',
            borderRadius: '16px',
            padding: '3rem 2rem',
            textAlign: 'center',
            color: '#FFFFFF',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
          }}
        >
          <LoadingSpinner text="Verifying credentials..." />
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F172A',
          padding: '1.5rem 1rem'
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '2.5rem 1.75rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            <ShieldAlert size={36} />
          </div>

          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#0F172A' }}>
            Invalid QR Code
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.9375rem', marginTop: '0.5rem', lineHeight: 1.6 }}>
            {error || 'This QR code is invalid, expired, or has not been issued.'}
          </p>

          <div
            style={{
              marginTop: '1.75rem',
              padding: '1rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              color: '#64748B'
            }}
          >
            Please contact <strong>Kerala Transport Drivers Association (KTPD)</strong> administration for verification.
          </div>
        </div>
      </div>
    );
  }

  const { data: member, isActive, design } = profileData;

  return (
    <ProfileCardView
      member={member}
      design={design || {}}
      isActive={isActive}
      isPreview={false}
      viewport="desktop"
    />
  );
};

export default PublicProfilePage;
