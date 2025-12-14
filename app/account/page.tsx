"use client";

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/lib/theme-context';
import './account.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, User, LogOut, Trash2, Camera, Check, BarChart3, BookOpen, Newspaper, Users, MessageSquare } from 'lucide-react';
import { MobileNav } from '@/components/ui/mobile-nav';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface TradingAccount {
  id: string;
  name: string;
  initial_balance: number;
  current_balance: number;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  phone_number: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
}

interface Certificate {
  id: string;
  title: string;
  firm_name: string;
  description: string;
  image_url: string;
  date_achieved: string;
}

export default function AccountPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, isLoaded } = useTheme();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Wall of Fame states
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isAddingCertificate, setIsAddingCertificate] = useState(false);
  const [newCertificate, setNewCertificate] = useState({
    title: '',
    firm_name: '',
    description: '',
    date_achieved: new Date().toISOString().split('T')[0]
  });
  const [certificateImage, setCertificateImage] = useState<File | null>(null);
  const [certificateImagePreview, setCertificateImagePreview] = useState<string | null>(null);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [enlargedCertificate, setEnlargedCertificate] = useState<string | null>(null);

  if (!isLoaded) {
    return (
      <div className="loading-container theme-dark">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (accounts.length > 0) {
      const savedAccount = localStorage.getItem('selectedTradingAccount');
      if (savedAccount) {
        const accountExists = accounts.find(acc => acc.id === savedAccount);
        if (accountExists) {
          setSelectedAccount(savedAccount);
        } else {
          const firstAccountId = accounts[0].id;
          setSelectedAccount(firstAccountId);
          localStorage.setItem('selectedTradingAccount', firstAccountId);
        }
      } else {
        const firstAccountId = accounts[0].id;
        setSelectedAccount(firstAccountId);
        localStorage.setItem('selectedTradingAccount', firstAccountId);
      }
    }
  }, [accounts]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError('Error loading profile');
        setLoading(false);
        return;
      }

      const profileData = {
        ...profile,
        email: user.email
      };

      setUserProfile(profileData);
      setDisplayName(profile.full_name || '');
      setEmail(user.email || '');
      setPhone(profile.phone_number || '');

      const { data: accountsData, error: accountsError } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (accountsError) {
        setError('Error loading trading accounts');
      } else {
        setAccounts(accountsData || []);
      }

      // Load certificates
      await loadCertificates(user.id);

      setLoading(false);
    } catch (err) {
      setError('An error occurred');
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountName || !newAccountBalance) {
      setError('Please fill in all fields');
      return;
    }

    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const initialBalance = parseFloat(newAccountBalance);

      const { data, error } = await supabase
        .from('trading_accounts')
        .insert({
          user_id: user.id,
          name: newAccountName,
          initial_balance: initialBalance,
          current_balance: initialBalance,
        })
        .select()
        .single();

      if (error) {
        setError('Error creating trading account');
        return;
      }

      setAccounts([data, ...accounts]);
      setNewAccountName('');
      setNewAccountBalance('');
      setIsAddingAccount(false);
    } catch (err) {
      setError('An error occurred while creating the account');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trading_accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        setError('Error deleting account');
        return;
      }

      setAccounts(accounts.filter(acc => acc.id !== accountId));
    } catch (err) {
      setError('An error occurred while deleting the account');
    }
  };

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccount(accountId);
    localStorage.setItem('selectedTradingAccount', accountId);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    setUploadingAvatar(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userProfile.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (userProfile.avatar_url) {
        const oldPath = userProfile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${userProfile.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userProfile.id);

      if (updateError) throw updateError;

      setUserProfile({ ...userProfile, avatar_url: publicUrl });
    } catch (err: any) {
      setError(err.message || 'Error uploading avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;

    setIsSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: displayName,
          phone_number: phone,
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      setUserProfile({
        ...userProfile,
        full_name: displayName,
        phone_number: phone
      });

      alert('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getMembershipDate = () => {
    if (!userProfile?.created_at) return '';
    const year = new Date(userProfile.created_at).getFullYear();
    return `Member since ${year}`;
  };

  const getInitials = () => {
    if (!userProfile?.full_name) return '?';
    const names = userProfile.full_name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return userProfile.full_name[0].toUpperCase();
  };

  // Wall of Fame functions
  const loadCertificates = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', userId)
        .order('date_achieved', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (err) {
      console.error('Error loading certificates:', err);
    }
  };

  const handleCertificateImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertificateImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCertificateImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadCertificateImage = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading certificate image:', error);
      return null;
    }
  };

  const handleAddCertificate = async () => {
    if (!userProfile || !certificateImage || !newCertificate.title || !newCertificate.firm_name) {
      setError('Please fill in all required fields and select an image');
      return;
    }

    setUploadingCertificate(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Upload image
      const imageUrl = await uploadCertificateImage(certificateImage, user.id);
      if (!imageUrl) {
        setError('Failed to upload certificate image');
        setUploadingCertificate(false);
        return;
      }

      // Insert certificate
      const { data, error } = await supabase
        .from('certificates')
        .insert({
          user_id: user.id,
          title: newCertificate.title,
          firm_name: newCertificate.firm_name,
          description: newCertificate.description,
          image_url: imageUrl,
          date_achieved: newCertificate.date_achieved
        })
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setCertificates([data[0], ...certificates]);
      }

      // Reset form
      setNewCertificate({
        title: '',
        firm_name: '',
        description: '',
        date_achieved: new Date().toISOString().split('T')[0]
      });
      setCertificateImage(null);
      setCertificateImagePreview(null);
      setIsAddingCertificate(false);

    } catch (err: any) {
      setError(err.message || 'Error adding certificate');
    } finally {
      setUploadingCertificate(false);
    }
  };

  const handleDeleteCertificate = async (certificateId: string) => {
    if (!confirm('Are you sure you want to delete this certificate?')) return;

    try {
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', certificateId);

      if (error) throw error;

      setCertificates(certificates.filter(cert => cert.id !== certificateId));
    } catch (err: any) {
      setError(err.message || 'Error deleting certificate');
    }
  };

  if (loading) {
    return (
      <div className={`loading-container ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className={`loading-container ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="text-center">
          <p className="error-text">Error loading profile</p>
          <Button onClick={() => router.push('/auth/login')} className="btn-primary mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`account-page-v2 ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      {/* Top Navigation */}
      <nav className="nav-bar">
        <div className="nav-container">
          <div className="nav-content">
            <div className="nav-logo">
              <h1>TradeQuest</h1>
            </div>

            <div className="nav-tabs">
              <button onClick={() => router.push('/dashboard')} className="nav-tab">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
              <button onClick={() => router.push('/journal')} className="nav-tab">
                <BookOpen className="w-4 h-4" />
                Journal
              </button>
              <button onClick={() => router.push('/news')} className="nav-tab">
                <Newspaper className="w-4 h-4" />
                News
              </button>
              <button onClick={() => router.push('/community')} className="nav-tab">
                <MessageSquare className="w-4 h-4" />
                Community
              </button>
              <button onClick={() => router.push('/teams')} className="nav-tab">
                <Users className="w-4 h-4" />
                Teams
              </button>
              <button className="nav-tab active">
                <User className="w-4 h-4" />
                Account
              </button>
            </div>

            <div className="nav-actions">
              <span className="nav-username">{userProfile.username}</span>
              <button onClick={handleLogout} className="btn-logout">
                <LogOut className="w-4 h-4" />
                Logout
              </button>

              {/* Mobile Navigation */}
              <MobileNav
                logo={<h1 style={{ color: 'var(--accent-primary)', fontSize: '1.25rem', fontWeight: 'bold' }}>TradeQuest</h1>}
                actions={
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{userProfile.username}</span>
                    </div>
                    <button onClick={handleLogout} className="btn-logout" style={{ width: '100%', justifyContent: 'center' }}>
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                }
              >
                <div className="mobile-nav-items">
                  <button onClick={() => router.push('/dashboard')} className="mobile-nav-item">
                    <BarChart3 />
                    Dashboard
                  </button>
                  <button onClick={() => router.push('/journal')} className="mobile-nav-item">
                    <BookOpen />
                    Journal
                  </button>
                  <button onClick={() => router.push('/news')} className="mobile-nav-item">
                    <Newspaper />
                    News
                  </button>
                  <button onClick={() => router.push('/community')} className="mobile-nav-item">
                    <MessageSquare />
                    Community
                  </button>
                  <button onClick={() => router.push('/teams')} className="mobile-nav-item">
                    <Users />
                    Teams
                  </button>
                  <button className="mobile-nav-item active">
                    <User />
                    Account
                  </button>
                </div>
              </MobileNav>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="account-layout">
        {/* Sidebar */}
        <aside className="account-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-header">
              <h3>ACTIVE PORTFOLIO</h3>
            </div>

            <div className="portfolio-list">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`portfolio-item ${selectedAccount === account.id ? 'active' : ''}`}
                  onClick={() => handleAccountSelect(account.id)}
                >
                  <div className="portfolio-info">
                    <h4>{account.name}</h4>
                    <p className="portfolio-balance">
                      ${Number(account.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  {selectedAccount === account.id && (
                    <Check className="w-5 h-5 check-icon" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAccount(account.id);
                    }}
                    className="delete-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {isAddingAccount ? (
                <div className="add-portfolio-form">
                  <Input
                    type="text"
                    placeholder="Portfolio name"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="form-input-small"
                  />
                  <Input
                    type="number"
                    placeholder="Initial balance"
                    value={newAccountBalance}
                    onChange={(e) => setNewAccountBalance(e.target.value)}
                    className="form-input-small"
                  />
                  <div className="form-actions-small">
                    <button onClick={handleAddAccount} className="btn-small btn-primary">
                      Add
                    </button>
                    <button onClick={() => setIsAddingAccount(false)} className="btn-small btn-outline">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingAccount(true)}
                  className="add-portfolio-btn"
                >
                  <Plus className="w-4 h-4" />
                  Add New Portfolio
                </button>
              )}
            </div>
          </div>

          <div className="sidebar-footer">
            <button className="sidebar-menu-item active">
              <User className="w-5 h-5" />
              Profile & Security
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="account-main">
          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          {/* Profile Header */}
          <div className="profile-header">
            <div className="avatar-section">
              <div className="avatar-wrapper" onClick={handleAvatarClick}>
                {userProfile.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Avatar" className="avatar-img" />
                ) : (
                  <div className="avatar-initials">
                    {getInitials()}
                  </div>
                )}
                <div className="avatar-overlay">
                  <Camera className="w-6 h-6" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="profile-info-header">
              <h1>{userProfile.full_name || 'Unnamed User'}</h1>
              <p className="member-since">{getMembershipDate()}</p>
            </div>
          </div>

          {/* Profile Form */}
          <div className="profile-form">
            <div className="form-row">
              <div className="form-field">
                <Label htmlFor="displayName">DISPLAY NAME</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="form-input"
                  placeholder="John Doe"
                />
              </div>

              <div className="form-field">
                <Label htmlFor="email">EMAIL ADDRESS</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  className="form-input"
                  disabled
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <Label htmlFor="phone">PHONE NUMBER</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="form-field">
                <Label htmlFor="username">USERNAME</Label>
                <Input
                  id="username"
                  type="text"
                  value={userProfile.username}
                  className="form-input"
                  disabled
                />
              </div>
            </div>

            <div className="form-actions-bottom">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving || uploadingAvatar}
                className="btn-save"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Wall of Fame Section */}
          <div className="wall-of-fame-section">
            <div className="section-header">
              <h2>Wall of Fame</h2>
              <p className="section-subtitle">Showcase your prop firm certificates and achievements</p>
            </div>

            {isAddingCertificate ? (
              <div className="certificate-form">
                <div className="form-row">
                  <div className="form-field">
                    <Label htmlFor="certTitle">CERTIFICATE NAME</Label>
                    <Input
                      id="certTitle"
                      type="text"
                      value={newCertificate.title}
                      onChange={(e) => setNewCertificate({...newCertificate, title: e.target.value})}
                      placeholder="e.g., Phase 1 Passed"
                      className="form-input"
                    />
                  </div>

                  <div className="form-field">
                    <Label htmlFor="firmName">PROP FIRM NAME</Label>
                    <Input
                      id="firmName"
                      type="text"
                      value={newCertificate.firm_name}
                      onChange={(e) => setNewCertificate({...newCertificate, firm_name: e.target.value})}
                      placeholder="e.g., FTMO, MyForexFunds"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <Label htmlFor="achievedDate">DATE ACHIEVED</Label>
                    <Input
                      id="achievedDate"
                      type="date"
                      value={newCertificate.date_achieved}
                      onChange={(e) => setNewCertificate({...newCertificate, date_achieved: e.target.value})}
                      className="form-input"
                    />
                  </div>

                  <div className="form-field">
                    <Label htmlFor="description">DESCRIPTION (OPTIONAL)</Label>
                    <Input
                      id="description"
                      type="text"
                      value={newCertificate.description}
                      onChange={(e) => setNewCertificate({...newCertificate, description: e.target.value})}
                      placeholder="Additional details"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <Label htmlFor="certImage">CERTIFICATE IMAGE</Label>
                  <Input
                    id="certImage"
                    type="file"
                    accept="image/*"
                    onChange={handleCertificateImageSelect}
                    className="form-input"
                  />
                  {certificateImagePreview && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <img
                        src={certificateImagePreview}
                        alt="Certificate preview"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          borderRadius: '0.5rem',
                          objectFit: 'cover',
                          border: '2px solid var(--border-color)'
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="form-actions-bottom">
                  <Button
                    onClick={handleAddCertificate}
                    disabled={uploadingCertificate}
                    className="btn-save"
                  >
                    {uploadingCertificate ? 'Uploading...' : 'Add Certificate'}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAddingCertificate(false);
                      setCertificateImage(null);
                      setCertificateImagePreview(null);
                    }}
                    className="btn-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setIsAddingCertificate(true)}
                className="add-certificate-btn"
              >
                <Plus className="w-4 h-4" />
                Add Certificate
              </Button>
            )}

            {certificates.length > 0 && (
              <div className="certificates-grid">
                {certificates.map((cert) => (
                  <div key={cert.id} className="certificate-card">
                    <div className="certificate-frame">
                      <img
                        src={cert.image_url}
                        alt={cert.title}
                        className="certificate-image"
                        onClick={() => setEnlargedCertificate(cert.image_url)}
                      />
                      <button
                        onClick={() => handleDeleteCertificate(cert.id)}
                        className="certificate-delete-btn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="certificate-info">
                      <h3>{cert.title}</h3>
                      <p className="firm-name">{cert.firm_name}</p>
                      {cert.description && <p className="cert-description">{cert.description}</p>}
                      <p className="cert-date">{new Date(cert.date_achieved).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Certificate Enlargement Dialog */}
      {enlargedCertificate && (
        <div
          className="image-overlay"
          onClick={() => setEnlargedCertificate(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
        >
          <img
            src={enlargedCertificate}
            alt="Certificate"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '0.5rem'
            }}
          />
        </div>
      )}
    </div>
  );
}
