import { Link, Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="relative flex items-center justify-center w-10 h-10">
                <div className="absolute inset-0 border border-[#2563EB]/40 rounded-full animate-[spin_10s_linear_infinite]" style={{ borderStyle: 'dotted', borderWidth: '2px' }}></div>
                <div className="absolute inset-1 border border-[#00E5FF]/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                <span className="text-2xl font-black text-[#2563EB] italic ml-1">Z</span>
              </div>
              <span className="text-xl font-medium tracking-tight text-foreground">campu<span className="text-[#2563EB] font-black italic">Z</span>core</span>
            </Link>

            {/* Main Links */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-sm font-medium text-muted hover:text-[#00E5FF] transition-colors">Home</Link>
              <Link to="/features" className="text-sm font-medium text-muted hover:text-[#00E5FF] transition-colors">Features</Link>
              <Link to="/pricing" className="text-sm font-medium text-muted hover:text-[#00E5FF] transition-colors">Pricing</Link>
              <Link to="/about" className="text-sm font-medium text-muted hover:text-[#00E5FF] transition-colors">About Us</Link>
              <Link to="/contact" className="text-sm font-medium text-muted hover:text-[#00E5FF] transition-colors">Partner with Us</Link>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-4">
              <Link 
                to="/login" 
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-foreground text-sm font-bold px-7 py-2.5 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] transition-all transform hover:-translate-y-0.5"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pt-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-16 relative overflow-hidden">
        {/* Footer Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#2563EB]/5 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-12">
          
          <div className="md:col-span-5">
            <div className="flex items-center gap-2 mb-6">
              <div className="relative flex items-center justify-center w-8 h-8">
                <div className="absolute inset-0 border border-[#2563EB]/40 rounded-full" style={{ borderStyle: 'dotted', borderWidth: '2px' }}></div>
                <span className="text-xl font-black text-[#2563EB] italic ml-0.5">Z</span>
              </div>
              <span className="text-xl font-medium tracking-tight text-foreground">campu<span className="text-[#2563EB] font-black italic">Z</span>core</span>
            </div>
            <p className="text-muted text-sm leading-relaxed max-w-sm">
              The Intelligent Campus Operating System engineered for Indian Higher Education. Designed for scale, security, and seamless academic orchestration.
            </p>
            <div className="mt-6 flex space-x-4">
              {/* Social placeholders */}
              <div className="w-8 h-8 rounded-full bg-surface hover:bg-[#2563EB] transition-colors cursor-pointer flex items-center justify-center text-foreground text-xs">X</div>
              <div className="w-8 h-8 rounded-full bg-surface hover:bg-[#2563EB] transition-colors cursor-pointer flex items-center justify-center text-foreground text-xs">in</div>
              <div className="w-8 h-8 rounded-full bg-surface hover:bg-[#2563EB] transition-colors cursor-pointer flex items-center justify-center text-foreground text-xs">fb</div>
            </div>
          </div>
          
          <div className="md:col-span-2 md:col-start-7">
            <h4 className="font-bold text-foreground mb-5 uppercase text-xs tracking-wider">Product</h4>
            <ul className="space-y-3 text-sm text-muted">
              <li><Link to="/features" className="hover:text-[#00E5FF] transition-colors">Core Modules</Link></li>
              <li><Link to="/pricing" className="hover:text-[#00E5FF] transition-colors">Pricing</Link></li>
              <li><Link to="/login" className="hover:text-[#00E5FF] transition-colors">Tenant Portal</Link></li>
              <li><Link to="/changelog" className="hover:text-[#00E5FF] transition-colors">Changelog</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-2">
            <h4 className="font-bold text-foreground mb-5 uppercase text-xs tracking-wider">Company</h4>
            <ul className="space-y-3 text-sm text-muted">
              <li><Link to="/about" className="hover:text-[#00E5FF] transition-colors">Our Vision</Link></li>
              <li><Link to="/contact" className="hover:text-[#00E5FF] transition-colors">Contact Sales</Link></li>
              <li><Link to="/careers" className="hover:text-[#00E5FF] transition-colors">Careers</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-bold text-foreground mb-5 uppercase text-xs tracking-wider">Legal</h4>
            <ul className="space-y-3 text-sm text-muted">
              <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Data Processing Addendum</a></li>
            </ul>
          </div>

        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between">
          <p className="text-muted text-xs">© 2026 CampuZcore. All rights reserved.</p>
          <div className="flex items-center gap-1 mt-4 md:mt-0 text-muted text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></div>
            All systems operational
          </div>
        </div>
      </footer>
    </div>
  );
}
