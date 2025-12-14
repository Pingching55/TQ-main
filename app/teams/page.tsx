"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme-context';
import '../account/account.css';
import './teams.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, LogOut, Moon, Sun, User, BarChart3, BookOpen, Newspaper, Copy, Check, Crown, UserMinus } from 'lucide-react';
import { MobileNav } from '@/components/ui/mobile-nav';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Team {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  member_count?: number;
  user_role?: string;
}

interface UserProfile {
  username: string;
  full_name: string;
  id: string;
}

export default function TeamsPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, isLoaded } = useTheme();
  const [teams, setTeams] = useState<Team[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isJoiningTeam, setIsJoiningTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: ''
  });
  
  const [joinCode, setJoinCode] = useState('');

  // Don't render until theme is loaded to prevent flash
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
    if (userProfile) {
      loadTeams();
    }
  }, [userProfile]);
  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError('Error loading profile');
        setLoading(false);
        return;
      }

      setUserProfile(profile);
      setLoading(false);
    } catch (err) {
      setError('An error occurred');
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      console.log('=== LOADING TEAMS DEBUG ===');
      console.log('User profile:', userProfile);
      
      // Get teams where user is a member
      const { data: teamMemberships, error: membershipsError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          teams (
            id,
            name,
            description,
            invite_code,
            created_by,
            created_at
          )
        `)
        .eq('user_id', userProfile?.id);

      console.log('Team memberships result:', { data: teamMemberships, error: membershipsError });
      if (membershipsError) {
        console.error('Error loading teams:', membershipsError);
        return;
      }

      // Get member counts for each team
      const teamsWithCounts = await Promise.all(
        (teamMemberships || []).map(async (membership: any) => {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', membership.teams.id);

          return {
            ...membership.teams,
            member_count: count || 0,
            user_role: membership.role
          };
        })
      );

      console.log('Teams with counts:', teamsWithCounts);
      setTeams(teamsWithCounts);
    } catch (err) {
      console.error('Error loading teams:', err);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      if (!newTeam.name.trim()) {
        setError('Please enter a team name');
        return;
      }

      // Generate invite code
      const generateInviteCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const inviteCode = generateInviteCode();

      console.log('=== TEAM CREATION DEBUG ===');
      console.log('Creating team with data:', {
        name: newTeam.name.trim(),
        description: newTeam.description.trim(),
        created_by: user.id,
        invite_code: inviteCode
      });
      console.log('User ID:', user.id);
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: newTeam.name.trim(),
          description: newTeam.description.trim(),
          created_by: user.id
          // Note: invite_code will be auto-generated by database trigger
        })
        .select()
        .single();

      console.log('Team creation result:', { data, error });
      if (error) {
        console.error('Error creating team:', error);
        setError(`Error creating team: ${error.message}`);
        return;
      }

      console.log('Team created successfully with invite code:', data?.invite_code);
      setNewTeam({ name: '', description: '' });
      setIsCreatingTeam(false);
      loadTeams();
    } catch (err) {
      console.error('Team creation error:', err);
      setError('An error occurred while creating the team');
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      if (!joinCode.trim()) {
        setError('Please enter an invite code');
        return;
      }

      console.log('=== TEAM JOIN DEBUG ===');
      console.log('User trying to join:', user.id);
      console.log('Invite code entered:', joinCode.trim().toUpperCase());
      
      // First, let's see what teams exist in the database
      const { data: allTeams, error: allTeamsError } = await supabase
        .from('teams')
        .select('id, name, invite_code')
        .limit(10);
      
      console.log('All teams in database:', allTeams);
      console.log('All teams error:', allTeamsError);
      
      // Find team by invite code
      console.log('Looking up team with invite code...');
      
      // Try multiple lookup strategies
      let team = null;
      let teamError = null;
      
      // Strategy 1: Exact match (case sensitive)
      const { data: team1, error: error1 } = await supabase
        .from('teams')
        .select('*')
        .eq('invite_code', joinCode.trim())
        .maybeSingle();
      
      if (team1) {
        team = team1;
      } else {
        // Strategy 2: Uppercase match
        const { data: team2, error: error2 } = await supabase
          .from('teams')
          .select('*')
          .eq('invite_code', joinCode.trim().toUpperCase())
          .maybeSingle();
        
        if (team2) {
          team = team2;
        } else {
          // Strategy 3: Case-insensitive search using ilike
          const { data: team3, error: error3 } = await supabase
            .from('teams')
            .select('*')
            .ilike('invite_code', joinCode.trim())
            .maybeSingle();
          
          team = team3;
          teamError = error3;
        }
      }

      console.log('Team lookup result:', { team, error: teamError });
      if (teamError) {
        console.error('Database error looking up team:', teamError);
        setError(`Database error: ${teamError.message}`);
        return;
      }
      
      if (!team) {
        console.warn('No team found with invite code:', joinCode.trim().toUpperCase());
        console.warn('Available teams:', allTeams?.map(t => `${t.name}: ${t.invite_code}`));
        setError(`No team found with invite code: ${joinCode.trim().toUpperCase()}`);
        return;
      }

      console.log('Team found:', team.id);
      // Check if already a member
      console.log('Checking existing membership...');
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', team.id)
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Existing member check:', existingMember);
      if (existingMember) {
        console.log('User is already a member');
        setError('You are already a member of this team');
        return;
      }

      // Join the team
      console.log('Attempting to join team...');
      const { error: joinError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'member'
        });

      console.log('Join result:', { error: joinError });
      if (joinError) {
        console.error('Error joining team:', joinError);
        setError(`Error joining team: ${joinError.message}`);
        return;
      }

      console.log('Successfully joined team!');
      setJoinCode('');
      setIsJoiningTeam(false);
      loadTeams();
    } catch (err) {
      console.error('Join team exception:', err);
      setError('An error occurred while joining the team');
    }
  };

  const handleCopyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleEnterTeamRoom = (teamId: string) => {
    router.push(`/teams/${teamId}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={`loading-container ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading teams...</p>
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
    <div className={`account-page ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      {/* Top Navigation */}
      <nav className="nav-bar">
        <div className="nav-container">
          <div className="nav-content">
            {/* Logo */}
            <div className="nav-logo">
              <h1>TradeQuest</h1>
            </div>

            {/* Navigation Tabs */}
            <div className="nav-tabs">
              <button
                onClick={() => router.push('/dashboard')}
                className="nav-tab"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => router.push('/journal')}
                className="nav-tab"
              >
                <BookOpen className="w-4 h-4" />
                Journal
              </button>
              <button
                onClick={() => router.push('/news')}
                className="nav-tab"
              >
                <Newspaper className="w-4 h-4" />
                News
              </button>
              <button
                onClick={() => router.push('/community')}
                className="nav-tab"
              >
                <Users className="w-4 h-4" />
                Community
              </button>
              <button className="nav-tab active">
                <Users className="w-4 h-4" />
                Teams
              </button>
              <button
                onClick={() => router.push('/account')}
                className="nav-tab"
              >
                <User className="w-4 h-4" />
                Account
              </button>
            </div>

            {/* Right side */}
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
                    <Users />
                    Community
                  </button>
                  <button className="mobile-nav-item active">
                    <Users />
                    Teams
                  </button>
                  <button onClick={() => router.push('/account')} className="mobile-nav-item">
                    <User />
                    Account
                  </button>
                </div>
              </MobileNav>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Teams Header */}
        <div className="teams-header">
          <div>
            <h1 className="teams-title">Private Teams</h1>
            <p className="teams-subtitle">Collaborate with your trading team in real-time</p>
          </div>
          
          <div className="teams-actions">
            <Dialog open={isJoiningTeam} onOpenChange={setIsJoiningTeam}>
              <DialogTrigger asChild>
                <button className="btn-outline">
                  Join Team
                </button>
              </DialogTrigger>
              <DialogContent className="team-dialog">
                <DialogHeader>
                  <DialogTitle>Join Team</DialogTitle>
                  <DialogDescription>
                    Enter the invite code to join a team
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleJoinTeam} className="team-form">
                  <div className="form-group">
                    <Label htmlFor="joinCode" className="form-label">Invite Code</Label>
                    <Input
                      id="joinCode"
                      type="text"
                      placeholder="Enter invite code (e.g., ABC12345)"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="form-input"
                      maxLength={8}
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <Button type="submit" className="btn-primary-form">
                      Join Team
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsJoiningTeam(false)}
                      className="btn-outline-form"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreatingTeam} onOpenChange={setIsCreatingTeam}>
              <DialogTrigger asChild>
                <button className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Create Team
                </button>
              </DialogTrigger>
              <DialogContent className="team-dialog">
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>
                    Create a private team for collaborative trading analysis
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTeam} className="team-form">
                  <div className="form-group">
                    <Label htmlFor="teamName" className="form-label">Team Name</Label>
                    <Input
                      id="teamName"
                      type="text"
                      placeholder="Enter team name"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                      className="form-input"
                      maxLength={50}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <Label htmlFor="teamDescription" className="form-label">Description (Optional)</Label>
                    <Textarea
                      id="teamDescription"
                      placeholder="Describe your team's focus..."
                      value={newTeam.description}
                      onChange={(e) => setNewTeam({...newTeam, description: e.target.value})}
                      className="form-textarea"
                      maxLength={200}
                      rows={3}
                    />
                  </div>

                  <div className="form-actions">
                    <Button type="submit" className="btn-primary-form">
                      Create Team
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsCreatingTeam(false)}
                      className="btn-outline-form"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Teams List */}
        <div className="teams-section">
          {teams.length === 0 ? (
            <div className="empty-state">
              <Users className="empty-icon" />
              <p>No teams yet</p>
              <p className="empty-subtitle">Create or join a team to start collaborating</p>
              <div className="empty-actions">
                <button onClick={() => setIsCreatingTeam(true)} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Create Team
                </button>
                <button onClick={() => setIsJoiningTeam(true)} className="btn-outline">
                  Join Team
                </button>
              </div>
            </div>
          ) : (
            <div className="teams-grid">
              {teams.map((team) => (
                <Card key={team.id} className="team-card">
                  <CardHeader className="team-header">
                    <div className="team-meta">
                      <div className="team-info">
                        <CardTitle className="team-name">{team.name}</CardTitle>
                        {team.user_role === 'admin' && (
                          <Badge variant="secondary" className="admin-badge">
                            <Crown className="w-3 h-3" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                    {team.description && (
                      <CardDescription className="team-description">
                        {team.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="team-content">
                    <div className="team-stats">
                      <div className="stat-item">
                        <Users className="w-4 h-4" />
                        <span>{team.member_count} members</span>
                      </div>
                      <div className="stat-item">
                        <span className="team-date">Created {formatDate(team.created_at)}</span>
                      </div>
                    </div>

                    <div className="invite-code-section">
                      <Label className="invite-label">Invite Code:</Label>
                      <div className="invite-code-container">
                        <code className="invite-code">{team.invite_code}</code>
                        <button
                          onClick={() => handleCopyInviteCode(team.invite_code)}
                          className="copy-button"
                          title="Copy invite code"
                        >
                          {copiedCode === team.invite_code ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="team-actions">
                      <Button 
                        onClick={() => handleEnterTeamRoom(team.id)}
                        className="enter-team-btn"
                      >
                        Enter Team Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}