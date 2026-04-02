import { CheckCircle2, Zap, ShoppingCart, ChevronRight, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import CheckoutWizard from '../../components/public/CheckoutWizard';
import { publicApi } from '../../api/public';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('annual');
  const [cart, setCart] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [allModules, setAllModules] = useState([]);
  const [annualOnlyModules, setAnnualOnlyModules] = useState([]);
  const [bundle, setBundle] = useState(null);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const data = await publicApi.getPricing();
        const baseModules = data.filter(m => !m.is_annual_only && m.module_code !== 'mod_bundle');
        const enterpriseModules = data.filter(m => m.is_annual_only && m.module_code !== 'mod_bundle');
        const bundleModule = data.find(m => m.module_code === 'mod_bundle');
        
        // Map backend keys to what the UI expects
        const mapper = (m) => ({
          ...m,
          id: m.module_code,
          priceAnnual: m.price_annual,
          priceMonthly: m.price_monthly,
          isAnnualOnly: m.is_annual_only,
          popular: m.is_popular
        });

        setAllModules(baseModules.map(mapper));
        setAnnualOnlyModules(enterpriseModules.map(mapper));
        setBundle(bundleModule ? mapper(bundleModule) : null);
      } catch (err) {
        console.error("Failed to load pricing: ", err);
      } finally {
        setLoading(false);
      }
    };
    loadPricing();
  }, []);

  const toggleCartItem = (module) => {
    // Check if already in cart
    const exists = cart.find(item => item.id === module.id);
    if (exists) {
      setCart(cart.filter(item => item.id !== module.id));
    } else {
      setCart([...cart, { ...module, billing: module.isAnnualOnly ? 'annual' : billingCycle }]);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const priceStr = item.billing === 'annual' ? item.priceAnnual : item.priceMonthly;
      return total + parseInt(String(priceStr).replace(/,/g, ''), 10);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#00E5FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-32 pb-32 px-4 selection:bg-[#00E5FF] selection:text-black font-sans">
      <div className="max-w-[1200px] mx-auto space-y-24">
        
        {/* Bundle Section */}
        <section>
          <div className="relative bg-[#0F172A] border border-[#00E5FF]/30 rounded-3xl p-8 lg:p-12 shadow-[0_0_40px_rgba(0,229,255,0.05)] overflow-hidden">
            <div className="absolute top-0 right-10 bg-[#00E5FF] text-[#0A0F1C] px-6 py-2 rounded-b-xl text-sm font-bold tracking-wider">
              BEST VALUE
            </div>
            
            <div className="flex flex-col lg:flex-row gap-12 lg:items-center">
              <div className="flex-1">
                <div className="text-[#00E5FF] text-[11px] font-bold tracking-widest uppercase mb-4">Complete Campus Kit</div>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-4">Everything, Bundled</h2>
                <p className="text-muted text-lg mb-8 leading-relaxed max-w-xl">
                  All modules included — including Analytics, Timetabling, and Research Suite. Includes 24/7 support and unlimited users.
                </p>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl lg:text-6xl font-black text-foreground">₹{bundle.priceAnnual}</span>
                  <span className="text-[#00E5FF] font-bold text-lg">/year</span>
                </div>
                <div className="flex items-center gap-2 mb-8 text-[#10B981] text-sm">
                  <CheckCircle2 className="w-4 h-4" /> <span>Includes all enterprise modules</span>
                </div>
                
                <button 
                  onClick={() => toggleCartItem(bundle)}
                  className={`flex items-center gap-2 px-8 py-4 ${cart.find(c => c.id === bundle.id) ? 'bg-surface shadow-sm border border-[#00E5FF] text-foreground' : 'bg-gradient-to-r from-[#00E5FF] to-[#00F0B5] hover:from-[#00D0E0] hover:to-[#00D0A0] text-[#0A0F1C]'} text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all`}
                >
                  <Zap className="w-5 h-5" /> {cart.find(c => c.id === bundle.id) ? 'Remove Bundle' : 'Claim Bundle'}
                </button>
              </div>
              
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {[
                   "Core Platform", "Facility Booking", 
                   "Resource Management", "Exam Operations",
                   "Timetabling Engine", "Advanced Analytics",
                   "Research Suite"
                 ].map((mod, i) => (
                   <div key={i} className="flex items-center gap-3 bg-surface shadow-sm border border-border rounded-xl p-4">
                     <CheckCircle2 className="w-5 h-5 text-[#00E5FF] shrink-0" />
                     <span className="text-foreground font-medium text-sm">{mod}</span>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </section>

        {/* All Modules Section */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 pb-4 border-b border-border gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-widest uppercase">
              Select Modules
            </h2>
            <div className="flex items-center bg-[#0F172A] border border-border rounded-xl p-1 shrink-0">
              <button 
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-surface text-foreground shadow-md' : 'text-muted hover:text-foreground'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-[#00E5FF] text-[#0A0F1C] shadow-md' : 'text-muted hover:text-foreground'}`}
              >
                Annually <span className={`${billingCycle === 'annual' ? 'bg-[#0A0F1C] text-[#00E5FF]' : 'bg-[#00E5FF]/20 text-[#00E5FF]'} text-[10px] px-2 py-0.5 rounded-full`}>SAVE 20%</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allModules.map((module, idx) => (
              <div key={idx} className={`bg-[#0F172A] border ${cart.find(c => c.id === module.id) ? 'border-[#00E5FF]' : 'border-border hover:border-[#2563EB]/50'} rounded-2xl p-8 flex flex-col relative group transition-colors`}>
                {module.popular && (
                  <div className="absolute top-6 right-6 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-foreground mb-6 pr-16">{module.title}</h3>
                <ul className="space-y-3 mb-10 flex-1">
                  {module.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-muted text-sm">
                      <div className="w-[4px] h-[4px] bg-[#00E5FF] rounded-full shrink-0" /> {feature}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border pt-6 mb-6">
                   <div className="flex items-baseline gap-1 mb-1">
                     <span className="text-3xl font-black text-foreground">₹{billingCycle === 'annual' ? module.priceAnnual : module.priceMonthly}</span>
                     <span className="text-[#00E5FF] font-bold text-sm">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                   </div>
                   <div className="text-[#00E5FF] text-xs font-bold">{billingCycle === 'annual' ? 'Annual Pack' : 'Monthly Pack'}</div>
                </div>
                <button 
                  onClick={() => toggleCartItem(module)}
                  className={`w-full py-3.5 border rounded-xl text-sm font-bold transition-all uppercase tracking-widest ${cart.find(c => c.id === module.id) ? 'bg-[#00E5FF] text-[#0A0F1C] border-[#00E5FF]' : 'bg-transparent border-border text-muted hover:bg-surface shadow-sm hover:text-foreground hover:border-border'}`}
                >
                  {cart.find(c => c.id === module.id) ? 'Added' : 'Add Module'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Annual Only Modules Section */}
        <section>
          <div className="mb-10 pb-4 border-b border-border">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-widest uppercase mb-3">
              Annual-Only Modules
            </h2>
            <p className="text-muted text-lg">These enterprise-grade modules are available exclusively on annual plans.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {annualOnlyModules.map((module, idx) => (
              <div key={idx} className={`bg-[#0F172A] border ${cart.find(c => c.id === module.id) ? 'border-[#00E5FF]' : 'border-border hover:border-[#00E5FF]/40 hover:shadow-[0_0_30px_rgba(0,229,255,0.05)]'} rounded-2xl p-8 flex flex-col relative group transition-all`}>
                <div className="absolute top-6 right-6 bg-[#B45309]/20 text-[#F59E0B] border border-[#B45309]/30 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  ANNUAL ONLY
                </div>
                <h3 className="text-xl font-bold text-foreground mb-6 pr-32">{module.title}</h3>
                <ul className="space-y-3 mb-10 flex-1">
                  {module.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-muted text-sm">
                      <div className="w-[4px] h-[4px] bg-[#00E5FF] rounded-full shrink-0" /> {feature}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border pt-6 mb-6">
                   <div className="flex items-baseline gap-1">
                     <span className="text-3xl font-black text-foreground">₹{module.priceAnnual}</span>
                     <span className="text-[#00E5FF] font-bold text-sm">/yr</span>
                   </div>
                </div>
                <button 
                  onClick={() => toggleCartItem(module)}
                  className={`w-full py-3.5 border rounded-xl text-sm font-bold transition-all uppercase tracking-widest ${cart.find(c => c.id === module.id) ? 'bg-[#00E5FF] text-[#0A0F1C] border-[#00E5FF]' : 'bg-transparent border-border text-muted hover:bg-surface shadow-sm hover:text-foreground hover:border-border'}`}
                >
                  {cart.find(c => c.id === module.id) ? 'Added' : 'Add Module'}
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Floating Checkout Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-[#0B1026]/80 to-transparent flex justify-center z-40 pointer-events-none">
          <div className="pointer-events-auto bg-[#0F172A] border border-border rounded-full px-6 py-4 flex items-center gap-6 shadow-2xl shadow-black/50 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00E5FF]/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-muted uppercase tracking-wider">{cart.length} Item{cart.length > 1 ? 's' : ''}</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-lg font-black text-foreground">₹{getCartTotal().toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-[#00E5FF] font-bold">+ 18% GST</div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setIsCheckoutOpen(true)}
              className="bg-gradient-to-r from-[#00E5FF] to-[#00F0B5] hover:from-[#00D0E0] hover:to-[#00D0A0] text-[#0A0F1C] px-8 py-3 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all transform hover:scale-105"
            >
              Checkout Now
            </button>
          </div>
        </div>
      )}

      {/* Checkout Wizard Modal */}
      {isCheckoutOpen && (
        <CheckoutWizard 
          cart={cart} 
          total={getCartTotal()} 
          onClose={() => setIsCheckoutOpen(false)} 
        />
      )}
    </div>
  );
}
