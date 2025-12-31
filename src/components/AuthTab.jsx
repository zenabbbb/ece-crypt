import React, { useState } from 'react';
import { LogIn, LogOut, UserPlus } from 'lucide-react';
import { signUp, login, logout } from '../firebase/firebase/auth';
import { saveUserProfile } from '../firebase/firebase/userProfile';

const AuthTab = ({ user, username, setUsername }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localUsername, setLocalUsername] = useState(username || '');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validatePassword = (pw) => {
    const value = (pw || '').trim();
    const minLength = 8;

    if (value.length < minLength) {
      return 'Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character.';
    }
    if (!/[a-z]/.test(value)) {
      return 'Password must include at least one lowercase letter.';
    }
    if (!/[A-Z]/.test(value)) {
      return 'Password must include at least one uppercase letter.';
    }
    if (!/\d/.test(value)) {
      return 'Password must include at least one number.';
    }
    if (!/[@$!%*?&]/.test(value)) {
      return 'Password must include at least one special character (@ $ ! % * ? &).';
    }
    return null;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setSubmitting(true);
    try {
      const cred = await signUp(email.trim(), password);
      const cleanUsername = localUsername.trim();
      if (cleanUsername) {
        await saveUserProfile(cred.user.uid, {
          email: cred.user.email,
          username: cleanUsername,
        });
        setUsername(cleanUsername);
      }
      setStatus('Account created and signed in.');
    } catch (err) {
      console.error(err);
      if (err.code === 'username-taken' || err.message === 'That username is already taken.') {
        setError('That username is already taken.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('You already have an account with this email. Please sign in instead.');
      } else {
        setError('Could not sign up. Please check your details and try again.');
      }
    }
    setSubmitting(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      setStatus('Signed in successfully.');
    } catch (err) {
      console.error(err);
      setError('Failed to sign in. Please check your email and password.');
    }
    setSubmitting(false);
  };

  const handleLogout = async () => {
    setError('');
    setStatus('');
    setSubmitting(true);
    try {
      await logout();
      setStatus('Signed out.');
      setUsername('');
      setLocalUsername('');
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error(err);
      setError('Failed to sign out. Please try again.');
    }
    setSubmitting(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setStatus('');
    setSubmitting(true);
    try {
      const cleanUsername = localUsername.trim();
      await saveUserProfile(user.uid, {
        email: user.email,
        username: cleanUsername || null,
      });
      setUsername(cleanUsername);
      setStatus('Profile updated.');
    } catch (err) {
      console.error(err);
      if (err.code === 'username-taken' || err.message === 'That username is already taken.') {
        setError('That username is already taken.');
      } else {
        setError('Failed to save profile. Please try again.');
      }
    }
    setSubmitting(false);
  };

  const renderAuthForm = () => {
    if (user) {
      return (
        <div className="field-card" style={{ marginTop: '1.2rem' }}>
          <div className="field-card-header">
            <span className="field-label">Signed in</span>
          </div>
          <p className="field-description">
            You are signed in as <strong>{user.email}</strong>.
          </p>
          <label className="field-label" style={{ marginTop: '0.9rem' }}>
            Public username
          </label>
          <p className="field-description">
            This name is used when saving your public keys so others can look you up.
          </p>
          <input
            type="text"
            value={localUsername}
            onChange={(e) => setLocalUsername(e.target.value)}
            placeholder="e.g. alice"
          />
          <button
            onClick={handleSaveProfile}
            disabled={submitting}
            className="btn-secondary"
            style={{ marginTop: '0.9rem' }}
          >
            Save profile
          </button>
          <button
            onClick={handleLogout}
            disabled={submitting}
            className="btn-ghost"
            style={{ marginTop: '0.6rem' }}
          >
            <LogOut className="w-4 h-4" style={{ marginRight: '0.4rem' }} />
            Sign out
          </button>
        </div>
      );
    }

    return (
      <form
        onSubmit={mode === 'login' ? handleLogin : handleSignUp}
        className="field-card"
        style={{ marginTop: '1.2rem' }}
      >
        <div className="field-card-header">
          <span className="field-label">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </span>
        </div>
        <p className="field-description">
          Use email and password to {mode === 'login' ? 'sign in' : 'create a new account'}.
        </p>

        <label className="field-label" style={{ marginTop: '0.9rem' }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />

        <label className="field-label" style={{ marginTop: '0.9rem' }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {mode === 'signup' && (
          <p className="field-description" style={{ marginTop: '0.4rem' }}>
            Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (@ $ ! % * ? &).
          </p>
        )}

        {mode === 'signup' && (
          <>
            <label className="field-label" style={{ marginTop: '0.9rem' }}>
              Public username
            </label>
            <p className="field-description">
              This is the name others will use to fetch your public key.
            </p>
            <input
              type="text"
              value={localUsername}
              onChange={(e) => setLocalUsername(e.target.value)}
              placeholder="e.g. alice"
            />
          </>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{ marginTop: '1rem' }}
        >
          {submitting
            ? mode === 'login'
              ? 'Signing in…'
              : 'Creating account…'
            : mode === 'login'
            ? 'Sign in'
            : 'Sign up'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
            setStatus('');
          }}
          className="btn-ghost"
          style={{ marginTop: '0.6rem' }}
        >
          {mode === 'login'
            ? 'Need an account? Switch to sign up'
            : 'Already registered? Switch to sign in'}
        </button>
      </form>
    );
  };

  return (
    <section className="section-card step-card mb-6">
      <div className="section-card-inner">
        <div className="field-card" style={{ boxShadow: 'none', marginTop: 0 }}>
          <div className="step-chip">
            <span>1. Account</span>
          </div>
          <h2 className="step-title">Sign in &amp; manage username</h2>
          <p className="step-subtitle">
            Use your account to associate a public username with your public keys so others can encrypt to you by name.
          </p>
        </div>

        {status && (
          <p className="field-description" style={{ marginTop: '0.6rem', color: '#047857' }}>
            {status}
          </p>
        )}
        {error && (
          <p className="field-description" style={{ marginTop: '0.6rem', color: '#b91c1c' }}>
            {error}
          </p>
        )}

        {renderAuthForm()}
      </div>
    </section>
  );
};

export default AuthTab;
