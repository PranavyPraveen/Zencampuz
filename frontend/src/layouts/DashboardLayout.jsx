import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../auth/AuthContext';

const DashboardLayout = () => {
  const { user } = useAuth();

  // Pull tenant branding colors: primary color tints the background
  const primaryColor = user?.tenant?.primary_color || '#22D3EE';
  const secondaryColor = user?.tenant?.secondary_color || 'var(--bg-surface)';

  // Derive a very dark tint of the primary color for the background
  // We use inline CSS variables so all child components can reference them
  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        backgroundColor: 'var(--bg-main)',
        '--primary': primaryColor,
        '--secondary': secondaryColor,
        // Subtle gradient overlay using tenant's primary color
        backgroundImage: `
          radial-gradient(ellipse at top left, ${primaryColor}08 0%, transparent 55%),
          radial-gradient(ellipse at bottom right, ${secondaryColor}06 0%, transparent 55%)
        `,
      }}
    >
      <Header />
      <div className="flex pt-16 h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 overflow-y-auto p-8 relative">
          {/* Subtle grid pattern using tenant accent */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.025]"
            style={{
              backgroundImage: `radial-gradient(${primaryColor} 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />
          {/* Top edge glow */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}40, transparent)` }}
          />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
