import { useState } from 'react';
import { Mail, Phone, Building } from 'lucide-react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="pt-24 pb-32 px-4 max-w-7xl mx-auto">
       <div className="grid md:grid-cols-2 gap-16">
          <div>
             <h1 className="text-5xl font-black text-foreground tracking-tight mb-6">Partner with CampuZcore</h1>
             <p className="text-xl text-muted mb-12 leading-relaxed">
               Ready to upgrade your institution's digital infrastructure? Drop us a line, and our integration specialists will craft a customized deployment plan.
             </p>

             <div className="space-y-6">
                <div className="flex items-center gap-4 text-muted">
                   <div className="p-3 bg-surface/50 rounded-xl"><Mail className="w-6 h-6 text-[var(--primary)]" /></div>
                   <div>
                     <p className="font-bold text-foreground">Email Us</p>
                     <p className="text-sm">partnerships@campuzcore.com</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 text-muted">
                   <div className="p-3 bg-surface/50 rounded-xl"><Phone className="w-6 h-6 text-[#10B981]" /></div>
                   <div>
                     <p className="font-bold text-foreground">Call Sales</p>
                     <p className="text-sm">+91-98765-43210</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 text-muted">
                   <div className="p-3 bg-surface/50 rounded-xl"><Building className="w-6 h-6 text-[#8B5CF6]" /></div>
                   <div>
                     <p className="font-bold text-foreground">HQ</p>
                     <p className="text-sm">Tech Park, Bangalore, India</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-background border border-border p-8 rounded-3xl backdrop-blur-sm">
             <h3 className="text-2xl font-bold text-foreground mb-6">Request Integration Demo</h3>
             
             {submitted ? (
                <div className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 p-6 rounded-2xl flex flex-col items-center text-center">
                   <p className="text-lg font-bold mb-2">Request Transmitted!</p>
                   <p className="text-sm text-[#E2E8F0]">Our deployment team will contact you within 24 hours.</p>
                </div>
             ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                   <div>
                      <label className="block text-xs font-bold text-muted uppercase mb-2">Institution Name</label>
                      <input required className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] transition-colors" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-muted uppercase mb-2">Your Name</label>
                        <input required className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] transition-colors" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-muted uppercase mb-2">Role</label>
                        <input required className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] transition-colors" placeholder="e.g. Chancellor" />
                     </div>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-muted uppercase mb-2">Work Email</label>
                      <input required type="email" className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] transition-colors" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-muted uppercase mb-2">Expected Student Volume</label>
                      <select className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] transition-colors">
                        <option>Under 1,000</option>
                        <option>1,000 - 5,000</option>
                        <option>5,000 - 20,000</option>
                        <option>20,000+</option>
                      </select>
                   </div>
                   <button type="submit" className="w-full bg-[#2563EB] hover:bg-[var(--primary)] text-foreground font-bold py-4 rounded-xl shadow-lg transition-all mt-4">
                     Submit Request
                   </button>
                </form>
             )}
          </div>
       </div>
    </div>
  );
}
