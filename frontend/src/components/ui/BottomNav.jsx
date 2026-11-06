import { NavLink } from 'react-router-dom';
import { Home, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const { user } = useAuth();

  const items = user?.role === 'admin'
    ? [...navItems, { to: '/admin', icon: ShieldCheck, label: 'Admin' }]
    : navItems;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 glass border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200',
                isActive ? 'text-white' : 'text-white/40')
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn('relative p-1.5 rounded-xl transition-all', isActive && 'gradient-bg shadow-lg shadow-violet-900/40')}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-xl gradient-bg opacity-30"
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
