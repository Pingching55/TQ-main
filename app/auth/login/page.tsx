"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import './login.css';

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    if (password.length < 6) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    if (password.length < 10) return { strength: 2, label: 'Fair', color: 'bg-yellow-500' };
    if (password.length < 14) return { strength: 3, label: 'Good', color: 'bg-blue-500' };
    return { strength: 4, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(registerData.password);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let emailToUse = loginData.username;

      const isEmail = loginData.username.includes('@');

      if (!isEmail) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', loginData.username)
          .single();

        if (profileError || !profile || !profile.email) {
          setError('Username not found. Please check your username or try logging in with your email address.');
          setLoading(false);
          return;
        }

        emailToUse = profile.email;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: loginData.password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials.');
        } else {
          setError(`Authentication error: ${signInError.message}`);
        }
        setLoading(false);
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authUser.id)
          .single();

        if (!existingProfile) {
          const username = authUser.email?.split('@')[0] || `user_${authUser.id.substring(0, 8)}`;
          await supabase
            .from('profiles')
            .insert({
              id: authUser.id,
              full_name: username,
              phone_number: '',
              username: username,
              email: authUser.email || '',
            });
        }
      }

      setSuccess('Login successful! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch (err) {
      setError('An error occurred during login');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
      });

      if (signUpError) {
        setError(`Registration failed: ${signUpError.message}`);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Registration failed - please try again');
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: registerData.fullName,
          phone_number: registerData.phoneNumber,
          username: registerData.username,
          email: registerData.email,
        });

      if (profileError) {
        setError(`Profile creation failed: ${profileError.message}`);
        setLoading(false);
        return;
      }

      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1000);

    } catch (err) {
      setError('Registration failed - please try again');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-gradient"></div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <TrendingUp className="logo-icon" />
            </div>
            <h1 className="auth-title">TradeQuest</h1>
            <p className="auth-subtitle">Professional Trading Journal & Analytics</p>
          </div>

          {error && (
            <Alert variant="destructive" className="auth-alert error-alert">
              <AlertCircle className="alert-icon" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="auth-alert success-alert">
              <CheckCircle2 className="alert-icon" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="auth-tabs">
            <button
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Create Account
            </button>
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <Label htmlFor="username" className="form-label">
                  <Mail className="label-icon" />
                  Email or Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your email or username"
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                  required
                  disabled={loading}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <Label htmlFor="password" className="form-label">
                  <Lock className="label-icon" />
                  Password
                </Label>
                <div className="password-input-wrapper">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    required
                    disabled={loading}
                    className="form-input password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="auth-button" disabled={loading}>
                {loading ? (
                  <div className="button-loading">
                    <div className="spinner" />
                    Signing in...
                  </div>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="button-icon" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="form-row">
                <div className="form-group">
                  <Label htmlFor="fullName" className="form-label">
                    <User className="label-icon" />
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData({...registerData, fullName: e.target.value})}
                    required
                    disabled={loading}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <Label htmlFor="phoneNumber" className="form-label">
                    <Phone className="label-icon" />
                    Phone
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={registerData.phoneNumber}
                    onChange={(e) => setRegisterData({...registerData, phoneNumber: e.target.value})}
                    required
                    disabled={loading}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <Label htmlFor="email" className="form-label">
                  <Mail className="label-icon" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                  required
                  disabled={loading}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <Label htmlFor="regUsername" className="form-label">
                  <User className="label-icon" />
                  Username
                </Label>
                <Input
                  id="regUsername"
                  type="text"
                  placeholder="johndoe"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                  required
                  disabled={loading}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <Label htmlFor="regPassword" className="form-label">
                  <Lock className="label-icon" />
                  Password
                </Label>
                <div className="password-input-wrapper">
                  <Input
                    id="regPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                    required
                    disabled={loading}
                    className="form-input password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {registerData.password && (
                  <div className="password-strength">
                    <div className="strength-bars">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`strength-bar ${level <= passwordStrength.strength ? passwordStrength.color : ''}`}
                        />
                      ))}
                    </div>
                    {passwordStrength.label && (
                      <span className="strength-label">{passwordStrength.label}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <Label htmlFor="confirmPassword" className="form-label">
                  <Lock className="label-icon" />
                  Confirm Password
                </Label>
                <div className="password-input-wrapper">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                    required
                    disabled={loading}
                    className="form-input password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="password-toggle"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {registerData.confirmPassword && (
                  <div className="password-match">
                    {registerData.password === registerData.confirmPassword ? (
                      <span className="match-success">
                        <CheckCircle2 size={14} />
                        Passwords match
                      </span>
                    ) : (
                      <span className="match-error">
                        <AlertCircle size={14} />
                        Passwords do not match
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" className="auth-button" disabled={loading}>
                {loading ? (
                  <div className="button-loading">
                    <div className="spinner" />
                    Creating account...
                  </div>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="button-icon" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
