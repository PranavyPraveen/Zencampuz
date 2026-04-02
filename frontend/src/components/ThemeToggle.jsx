import { useTheme } from '../theme/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-10 h-10 rounded-full bg-foreground/5 hover:bg-white/10 transition-colors border border-border"
      aria-label="Toggle Theme"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      <div className={`absolute transition-all duration-300 transform ${theme === 'dark' ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 -rotate-90'}`}>
        <Moon className="w-5 h-5 text-zen-secondary" />
      </div>
      <div className={`absolute transition-all duration-300 transform ${theme === 'light' ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 rotate-90'}`}>
        <Sun className="w-5 h-5 text-amber-400" />
      </div>
    </button>
  );
};
