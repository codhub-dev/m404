import { motion } from 'framer-motion';
import { LogOut, Dumbbell, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/ui/BottomNav';
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';
import { useState } from 'react';

const APP_LABELS = { protein: 'Protein Tracker' };

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-dvh pb-safe px-5 pt-6">
      <motion.div
        className="flex flex-col gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Avatar + info */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <div className="relative">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
              alt={user?.name}
              className="w-20 h-20 rounded-3xl object-cover border-2 border-white/10"
            />
            {user?.role === 'admin' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg gradient-bg flex items-center justify-center">
                <ShieldCheck size={12} />
              </div>
            )}
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">{user?.name}</h1>
            <p className="text-white/40 text-sm">{user?.email}</p>
            {user?.role === 'admin' && (
              <span className="inline-block mt-1.5 text-xs font-semibold gradient-bg rounded-full px-2.5 py-0.5">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* App access */}
        <GlassCard animate={false}>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">App Access</h3>
          <div className="flex flex-wrap gap-2">
            {(user?.role === 'admin' ? ['protein'] : user?.appAccess || []).map((slug) => (
              <span key={slug} className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-xl text-sm">
                <Dumbbell size={13} className="text-violet-400" />
                {APP_LABELS[slug] || slug}
              </span>
            ))}
            {!user?.appAccess?.length && user?.role !== 'admin' && (
              <p className="text-white/30 text-sm">No apps assigned</p>
            )}
          </div>
        </GlassCard>

        {/* Logout */}
        <GlassButton
          variant="danger"
          size="lg"
          className="w-full"
          onClick={handleLogout}
          loading={loggingOut}
        >
          <LogOut size={16} />
          Sign out
        </GlassButton>
      </motion.div>

      <BottomNav />
    </div>
  );
}
