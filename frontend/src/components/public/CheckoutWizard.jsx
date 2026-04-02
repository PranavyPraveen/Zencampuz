import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ChevronRight, Loader2, Building, User, Mail, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PasswordInput from '../common/PasswordInput';

export default function CheckoutWizard({ cart, total, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Org Details
  const [orgName, setOrgName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [themeColor, setThemeColor] = useState('#00E5FF'); // Default Cyan

  // Step 2: Admin Details
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Step 3: OTP
  const [otp, setOtp] = useState('');

  // Values
  const gstAmount = total * 0.18;
  const grandTotal = total + gstAmount;

  // Real-time subdomain check
  const [subdomainStatus, setSubdomainStatus] = useState('idle'); // 'idle', 'checking', 'available', 'taken'

  // Password validation
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pass)) score += 1;
    return score; // 0 to 4
  };

  // Auto-generate subdomain from orgName
  useEffect(() => {
    if (orgName) {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setSubdomain(slug);
    } else {
      setSubdomain('');
    }
  }, [orgName]);

  useEffect(() => {
    if (!subdomain) {
      setSubdomainStatus('idle');
      return;
    }
    setSubdomainStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/tenants/public/check-subdomain/?subdomain=${subdomain}`);
        if (res.ok) {
          setSubdomainStatus('available');
        } else {
          setSubdomainStatus('taken');
        }
      } catch {
        setSubdomainStatus('error');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [subdomain]);

  const handleNextStep1 = async () => {
    if (!orgName || !subdomain) {
      setError('Institution Name and Subdomain are required.');
      return;
    }
    if (subdomainStatus !== 'available') {
      setError('Please choose an available subdomain.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      setStep(2);
    } catch (err) {
      setError(err.message || 'Subdomain is already taken or invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep2 = async () => {
    if (!adminName || !adminEmail || !adminPassword) {
      setError('All admin details are required.');
      return;
    }
    const pwdScore = getPasswordStrength(adminPassword);
    if (pwdScore < 4) {
      setError('Please enter a stronger password (min. 8 chars, uppercase, lowercase, number, and special character).');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Trigger OTP
      const res = await fetch('http://localhost:8000/api/tenants/public/send-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send OTP.');
      }
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep3 = async () => {
    if (!otp || otp.length < 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Verify OTP
      const res = await fetch('http://localhost:8000/api/tenants/public/verify-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, otp })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid OTP.');
      }
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    setError('');
    setLoading(true);
    try {
      // Create Razorpay Order
      const orderRes = await fetch('http://localhost:8000/api/tenants/public/create-order/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, total: grandTotal })
      });
      const orderData = await orderRes.json();
      
      if (!orderRes.ok) throw new Error('Could not create order.');

      // Initialize Razorpay
      const options = {
        key: 'rzp_test_6fwqFFPoR210Wf', // From user prompt
        amount: orderData.amount,
        currency: 'INR',
        name: 'CampuZcore',
        description: 'Module Subscription',
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            // Validate Payment & Create Tenant
            const paymentRes = await fetch('http://localhost:8000/api/tenants/public/complete-checkout/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
                signature: response.razorpay_signature,
                tenant_details: { name: orgName, subdomain, theme_color: themeColor },
                admin_details: { name: adminName, email: adminEmail, password: adminPassword },
                cart_items: cart
              })
            });
            const successData = await paymentRes.json();
            if(!paymentRes.ok) throw new Error(successData.error || 'Tenant creation failed.');
            setStep(5); // Success step
          } catch(e) {
            setError(e.message);
            setStep(4);
          }
        },
        prefill: {
          name: adminName,
          email: adminEmail,
        },
        theme: {
          color: '#528FF0'   // Razorpay default blue — tenant color is applied to dashboard, not Razorpay
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        setError(`Payment Failed: ${response.error.description}`);
      });
      rzp.open();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0A0F1C]/90 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#0F172A] border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row">
        
        {/* Left Side: Summary Panel */}
        <div className="w-full md:w-1/3 bg-background p-8 border-r border-border flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-6 tracking-wide">Order Summary</h3>
            <div className="space-y-4 mb-8">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-sm">
                  <div className="text-muted max-w-[70%]">
                    <span className="font-bold text-muted block">{item.title}</span>
                    {item.billing === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
                  </div>
                  <div className="text-foreground font-bold">
                    ₹{item.billing === 'annual' ? item.priceAnnual : item.priceMonthly}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4 flex justify-between items-end mb-2">
              <span className="text-muted text-sm font-bold uppercase tracking-wider">Subtotal</span>
              <span className="text-xl font-black text-foreground">₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-end mb-4">
              <span className="text-muted text-sm font-bold uppercase tracking-wider">GST (18%)</span>
              <span className="text-xl font-black text-foreground">₹{gstAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="border-t border-border pt-4 flex justify-between items-end">
              <span className="text-muted text-sm font-bold uppercase tracking-wider">Grand Total</span>
              <span className="text-3xl font-black text-[#00E5FF]">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <div className="mt-8">
            <div className="flex items-center gap-2 text-xs text-muted">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> secure 256-bit encryption
            </div>
          </div>
        </div>

        {/* Right Side: Flow Content */}
        <div className="w-full md:w-2/3 p-8">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors">
            <X className="w-6 h-6" />
          </button>

          {/* Steps Header */}
          {step < 5 && (
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3, 4].map(num => (
                <React.Fragment key={num}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= num ? 'bg-[#00E5FF] text-[#0A0F1C]' : 'bg-surface text-muted'}`}>
                    {num}
                  </div>
                  {num < 4 && <div className={`h-[2px] w-8 ${step > num ? 'bg-[#00E5FF]/50' : 'bg-surface'}`} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-2">
                <Building className="w-6 h-6 text-[#00E5FF]" />
                <h2 className="text-2xl font-bold text-foreground">Institution Details</h2>
              </div>
              <p className="text-muted text-sm mb-6">Let's setup your customized tenant portal.</p>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Institution Name</label>
                  <input 
                    type="text" 
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-[#00E5FF] transition-colors"
                    placeholder="e.g., Global Tech University"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Portal Subdomain</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={subdomain}
                      onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-1/2 bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-[#00E5FF] transition-colors"
                      placeholder="global-tech"
                    />
                    <span className="text-muted">.campuzcore.com</span>
                  </div>
                  <p className="text-[10px] text-[#475569] mt-2 mb-1">This will be your unique login portal URL.</p>
                  {subdomain && (
                    <div className={`text-xs flex items-center gap-1 ${subdomainStatus === 'available' ? 'text-[#10B981]' : subdomainStatus === 'taken' ? 'text-red-400' : 'text-muted'}`}>
                      {subdomainStatus === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
                      {subdomainStatus === 'available' && <CheckCircle2 className="w-3 h-3" />}
                      {subdomainStatus === 'taken' && <X className="w-3 h-3" />}
                      {subdomainStatus === 'checking' ? 'Checking availability...' : subdomainStatus === 'available' ? 'Subdomain is available!' : subdomainStatus === 'taken' ? 'Subdomain is already taken.' : ''}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-border focus-within:border-[#00E5FF] transition-colors shrink-0">
                      <input 
                        type="color" 
                        value={themeColor}
                        onChange={e => setThemeColor(e.target.value)}
                        className="absolute -top-4 -left-4 w-20 h-20 cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-foreground font-mono text-sm">{themeColor.toUpperCase()}</span>
                      <span className="text-[10px] text-muted">Click circle to pick a color</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleNextStep1}
                  disabled={loading}
                  className="bg-gradient-to-r from-[#00E5FF] to-[#00F0B5] hover:from-[#00D0E0] hover:to-[#00D0A0] text-[#0A0F1C] px-8 py-3 rounded-xl font-bold flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Next <ChevronRight className="w-5 h-5" /></>}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-6 h-6 text-[#00E5FF]" />
                <h2 className="text-2xl font-bold text-foreground">Admin Account</h2>
              </div>
              <p className="text-muted text-sm mb-6">Create the primary Super Admin for {orgName}.</p>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    autoComplete="off"
                    placeholder="e.g. Dr. Ramesh Kumar"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Work Email</label>
                  <input 
                    type="email" 
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    autoComplete="off"
                    placeholder="admin@yourinstitution.edu"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Secure Password</label>
                  <PasswordInput 
                    value={adminPassword} 
                    onChange={setAdminPassword} 
                    required 
                    name="admin_password"
                  />
                  <p className="text-[10px] text-muted mt-2">Requires 8+ characters, uppercase, lowercase, number, and special character.</p>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(1)} className="text-muted hover:text-foreground font-bold px-4 py-3">Back</button>
                <button 
                  onClick={handleNextStep2}
                  disabled={loading}
                  className="bg-gradient-to-r from-[#00E5FF] to-[#00F0B5] hover:from-[#00D0E0] hover:to-[#00D0A0] text-[#0A0F1C] px-8 py-3 rounded-xl font-bold flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send OTP <ChevronRight className="w-5 h-5" /></>}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-6 h-6 text-[#00E5FF]" />
                <h2 className="text-2xl font-bold text-foreground">Verify Email</h2>
              </div>
              <p className="text-muted text-sm mb-6">We've sent a 6-digit code to <strong>{adminEmail}</strong>.</p>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">One-Time Password</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-background text-center tracking-[0.5em] text-2xl font-black border border-border rounded-xl px-4 py-4 text-foreground focus:outline-none focus:border-[#00E5FF]"
                    placeholder="------"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(2)} className="text-muted hover:text-foreground font-bold px-4 py-3">Back</button>
                <button 
                  onClick={handleNextStep3}
                  disabled={loading}
                  className="bg-gradient-to-r from-[#00E5FF] to-[#00F0B5] hover:from-[#00D0E0] hover:to-[#00D0A0] text-[#0A0F1C] px-8 py-3 rounded-xl font-bold flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Proceed <ChevronRight className="w-5 h-5" /></>}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-6 h-6 text-[#00E5FF]" />
                <h2 className="text-2xl font-bold text-foreground">Secure Payment</h2>
              </div>
              <p className="text-muted text-sm mb-6">Complete your purchase to provision the tenant.</p>
              
              <div className="bg-background border border-border rounded-xl p-6 mb-8 text-center">
                <div className="text-muted text-sm mb-2">Amount Due (Incl. 18% GST)</div>
                <div className="text-4xl font-black text-foreground">₹{grandTotal.toLocaleString('en-IN')}</div>
              </div>

              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(3)} className="text-muted hover:text-foreground font-bold px-4 py-3">Back</button>
                <button 
                  onClick={initiatePayment}
                  disabled={loading}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-foreground px-8 py-3 rounded-xl font-bold flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Pay via Razorpay <ChevronRight className="w-5 h-5" /></>}
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-in zoom-in duration-500 text-center flex flex-col items-center justify-center py-10">
              <div className="w-20 h-20 bg-[#10B981]/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">Payment Successful!</h2>
              <p className="text-muted mb-8 max-w-sm">
                Your institution <strong>{orgName}</strong> has been successfully registered and provisioned.
              </p>
              
              <button 
                onClick={() => {
                  onClose();
                  navigate('/');
                }}
                className="bg-gradient-to-r from-[#00E5FF] to-[#00F0B5] hover:from-[#00D0E0] hover:to-[#00D0A0] text-[#0A0F1C] px-8 py-3 rounded-xl font-bold"
              >
                Return to Home
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
