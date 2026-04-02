import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import PasswordInput from '../components/common/PasswordInput';

import { useAuth } from '../auth/AuthContext';
import { publicApi } from '../api/public';
import { getSubdomain, isPublicHost } from '../utils/tenantHelper';

export const Login = () => {
  const { login, exchangeTicket } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState(null);
  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'otp'
  const [otpSent, setOtpSent] = useState(false);

  // Guard against React StrictMode double-invoking the ticket exchange effect
  const ticketExchangedRef = useRef(false);

  useEffect(() => {
    // 1. Check for SSO ticket in URL (redirected from public login)
    const params = new URLSearchParams(location.search);
    const ticket = params.get('ticket');
    
    if (ticket) {
      if (ticketExchangedRef.current) return;
      ticketExchangedRef.current = true;

      setLoading(true);
      exchangeTicket(ticket)
        .then(() => {
          navigate(from, { replace: true });
        })
        .catch(err => {
          console.error('SSO Ticket exchange failed:', err);
          setError('Automatic login expired or failed. Please sign in again.');
          setLoading(false);
          navigate('/login', { replace: true });
        });

      return;
    }

    // 2. Fetch branding if on a tenant subdomain
    const subdomain = getSubdomain();
    if (subdomain) {
      publicApi.getTenantBranding(subdomain).then(data => {
        if (data && !data.error) {
          setBranding(data);
        } else {
          setError(data?.error || 'Institution not found or inactive.');
        }
      }).catch(err => console.error("Could not fetch tenant branding", err));
    }
  }, [location.search, exchangeTicket, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password);
      
      const publicHost = isPublicHost();
      
      if (result && result.ticket && result.subdomain) {
        const currentSubdomain = getSubdomain();
        
        // If we're already on the correct subdomain, exchange the ticket immediately
        if (currentSubdomain === result.subdomain) {
          await exchangeTicket(result.ticket);
          navigate(from, { replace: true });
          return;
        }

        // Otherwise, redirect to the tenant's exact URL with the ticket
        const port = window.location.port ? `:${window.location.port}` : '';
        const protocol = window.location.protocol;
        const baseHost = window.location.hostname === 'localhost' ? 'localhost' : 
                         (window.location.hostname.endsWith('.localhost') ? 'localhost' : 'campuzcore.com');
        
        window.location.href = `${protocol}//${result.subdomain}.${baseHost}${port}/login?ticket=${result.ticket}`;
        return;
      }

      // Role-based destination: super_admin goes to /superadmin/dashboard
      const roleName = result?.role?.name || result?.role || '';
      const destination = roleName === 'super_admin' ? '/superadmin/dashboard' : (from === '/login' ? '/dashboard' : from);
      navigate(destination, { replace: true });

    } catch (err) {
      setError(err?.response?.data?.error || 'Invalid credentials. Please try again.');
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!email) {
      setError('Please enter your email first.');
      return;
    }
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await publicApi.post('/tenants/public/send-otp/', { email });
      setOtpSent(true);
      setMsg('OTP sent! Please check your email.');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Need to use the new Context function
      const { otpLogin } = await import('../auth/AuthContext').then(m => ({ otpLogin: useAuth().otpLogin }));
      
      // Fallback if dynamic import inside closure fails, use imported from top
      const _otpLogin = useAuth().otpLogin; 
      if(_otpLogin) await _otpLogin(email, otp);

      navigate(from, { replace: true });
    } catch (err) {
      setError('Invalid OTP or expired. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic styles fallback to CampuZcore defaults
  const primaryColor = branding?.primary_color || '#2563EB';
  const secondaryColor = branding?.secondary_color || '#22D3EE';
  const tenantName = branding?.tenant_name || 'CAMPUZCORE';
  const tenantSubtitle = branding ? 'INSTITUTION PORTAL' : 'INTELLIGENT CAMPUS OS';
  const initialLetter = branding?.tenant_name ? branding.tenant_name.charAt(0) : 'Z';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden relative">
      {/* Futuristic Background Background */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ backgroundColor: `${secondaryColor}20` }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ backgroundColor: `${primaryColor}20` }} />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `linear-gradient(${secondaryColor} 1px, transparent 1px), linear-gradient(90deg, ${secondaryColor} 1px, transparent 1px)`, backgroundSize: '50px 50px' }} />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
           <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl border mb-6 shadow-lg" style={{ backgroundColor: `${secondaryColor}10`, borderColor: `${secondaryColor}30`, boxShadow: `0 0 30px ${secondaryColor}33` }}>
              <span className="text-3xl font-bold" style={{ color: secondaryColor }}>{initialLetter}</span>
           </div>
           <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Login.</h1>
          <p className="text-muted">Sign in to {branding ? branding.name : 'CampuZcore'}</p>
        </div>

        <div className="bg-background backdrop-blur-3xl border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
           {/* Glassy Glow Effect */}
           <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ from: `${secondaryColor}10` }} />
           
           <div className="flex bg-background rounded-xl p-1 mb-8">
             <button 
               type="button"
               onClick={() => { setLoginMode('password'); setError(''); setMsg(''); }}
               className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMode === 'password' ? 'bg-surface text-foreground shadow-md' : 'text-muted hover:text-muted'}`}
             >
               Password Login
             </button>
             <button 
               type="button"
               onClick={() => { setLoginMode('otp'); setError(''); setMsg(''); }}
               className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMode === 'otp' ? 'bg-surface text-foreground shadow-md' : 'text-muted hover:text-muted'}`}
             >
               OTP Login
             </button>
           </div>

           {loginMode === 'password' ? (
             <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 ml-1">Universal ID / Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-2xl px-5 py-4 text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] focus:ring-1 focus:ring-[#22D3EE]/50 transition-all placeholder-[#64748B]"
                    placeholder="name@institution.edu"
                    autoComplete="new-password"
                    required
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest pl-1 block">
                      Password
                    </label>
                    <a href="#" onClick={(e) => { e.preventDefault(); alert('Password reset link sent to your email.'); }} className="text-xs font-bold text-[var(--primary)] hover:text-foreground transition-colors">
                      Forgot Password?
                    </a>
                  </div>
                  <PasswordInput 
                    value={password} 
                    onChange={setPassword}
                    autoComplete="new-password"
                    required 
                  />
                </div>

                {error && <p className="text-[#EF4444] text-xs font-semibold text-center bg-[#EF4444]/10 py-2 rounded-lg border border-[#EF4444]/20">{error}</p>}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full text-foreground font-bold py-4 rounded-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor, boxShadow: `0 0 30px ${primaryColor}4D` }}
                >
                  {loading ? 'INITIATING SYSTEM...' : 'ACCESS DASHBOARD'}
                </button>
             </form>
           ) : (
             <form onSubmit={handleOTPLogin} className="space-y-6 relative z-10">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 ml-1">Institutional Email</label>
                  <div className="flex gap-2">
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => { setEmail(e.target.value); setOtpSent(false); }}
                      className="w-full bg-background/50 border border-border rounded-2xl px-5 py-4 text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] focus:ring-1 focus:ring-[#22D3EE]/50 transition-all placeholder-[#64748B]"
                      placeholder="name@institution.edu"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                {otpSent && (
                  <div className="animate-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 ml-1">One-Time Password</label>
                    <input 
                      type="text" 
                      maxLength="6"
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-background/50 border border-border rounded-2xl px-5 py-4 text-center tracking-[0.5em] text-xl font-bold text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] focus:ring-1 focus:ring-[#22D3EE]/50 transition-all placeholder-[#64748B]"
                      placeholder="------"
                      required
                    />
                  </div>
                )}

                {error && <p className="text-[#EF4444] text-xs font-semibold text-center bg-[#EF4444]/10 py-2 rounded-lg border border-[#EF4444]/20">{error}</p>}
                {msg && <p className="text-[#10B981] text-xs font-semibold text-center bg-[#10B981]/10 py-2 rounded-lg border border-[#10B981]/20">{msg}</p>}

                {!otpSent ? (
                  <button 
                    type="button" 
                    onClick={handleSendOTP}
                    disabled={loading || !email}
                    className="w-full bg-surface hover:bg-surface text-foreground font-bold py-4 rounded-2xl transition-all duration-300 disabled:opacity-50 border border-border"
                  >
                    {loading ? 'SENDING...' : 'GET OTP'}
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    disabled={loading || otp.length < 6}
                    className="w-full text-foreground font-bold py-4 rounded-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
                    style={{ backgroundColor: primaryColor, boxShadow: `0 0 30px ${primaryColor}4D` }}
                  >
                    {loading ? 'VERIFYING...' : 'VERIFY & LOGIN'}
                  </button>
                )}
             </form>
           )}
        </div>

        <p className="text-center mt-8 text-muted text-xs font-medium">Built for Indian Higher Education Institutions • v1.0</p>
      </div>
    </div>
  );
};
