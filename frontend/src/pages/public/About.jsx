export default function About() {
  return (
    <div className="pt-24 pb-32 px-4 max-w-4xl mx-auto">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-[var(--primary)]/10 border border-[#22D3EE]/30 mb-8 shadow-[0_0_40px_rgba(34,211,238,0.2)]">
          <span className="text-4xl font-bold text-[var(--primary)]">Z</span>
        </div>
        <h1 className="text-5xl font-black text-foreground tracking-tight mb-6">Our Vision</h1>
        <p className="text-xl text-muted leading-relaxed">
          CampuZcore was engineered with one singular focus: to modernize Indian Higher Education by replacing fragmented legacy tools with a unified, intelligent, and highly scalable cloud architecture. 
        </p>
      </div>

      <div className="prose prose-invert prose-lg mx-auto text-muted">
        <h2 className="text-foreground">The Fragmentation Problem</h2>
        <p>
          For decades, universities have relied on siloed modules—one for admissions, one for academics, one for finance—that never communicate. Data lies dormant. User experience suffers. Growth is stifled.
        </p>

        <h2 className="text-foreground">Our Solution</h2>
        <p>
           Built on modern infrastructure utilizing isolated PostgreSQL multitenancy and React-driven interfaces, CampuZcore operates as a centralized operating system. Every module is deeply interconnected, governed by an overarching analytics engine that surfaces insights directly to the chancellor's dashboard.
        </p>

        <div className="mt-12 p-8 bg-background border border-border rounded-3xl">
          <p className="text-[#E2E8F0] italic font-medium">"We don't build software. We engineer operational velocity for academic institutions."</p>
          <div className="mt-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-[#2563EB]" />
             <div>
               <div className="text-foreground font-bold text-sm">CampuZcore Architecture Team</div>
               <div className="text-muted text-xs">Platform Core</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
