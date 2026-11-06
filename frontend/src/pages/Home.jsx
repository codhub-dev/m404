import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dumbbell, ShieldCheck, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/ui/BottomNav';
import GlassCard from '../components/ui/GlassCard';

const APPS = [
  {
    slug: 'protein',
    name: 'Protein Tracker',
    description: 'Track your daily sachet usage',
    icon: Dumbbell,
    gradient: 'from-violet-500 to-blue-500',
    glow: 'shadow-violet-900/40',
    route: '/protein',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.name?.split(' ')[0] ?? '';

  const accessibleApps = user?.role === 'admin'
    ? APPS
    : APPS.filter((a) => user?.appAccess?.includes(a.slug));

  return (
    <div className="min-h-dvh pb-safe px-5 pt-6">
      {/* Top bar */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center text-sm font-black">
            M
          </div>
          <span className="text-lg font-black gradient-text tracking-tight">404</span>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="p-2.5 glass rounded-xl text-violet-400 hover:text-violet-300 transition-colors"
            >
              <ShieldCheck size={18} />
            </button>
          )}
          <button onClick={() => navigate('/profile')}>
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
              alt={user?.name}
              className="w-9 h-9 rounded-xl object-cover border border-white/10"
            />
          </button>
        </div>
      </motion.div>

      {/* Greeting */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <p className="text-white/40 text-sm font-medium">{getGreeting()},</p>
        <h1 className="text-3xl font-black text-white mt-0.5">{firstName} <span className="inline-block animate-[wave_2s_ease-in-out_1]">👋</span></h1>
      </motion.div>

      {/* Section title */}
      <motion.h2
        className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Your Apps
      </motion.h2>

      {/* App grid */}
      <motion.div
        className="grid grid-cols-1 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {accessibleApps.map((app) => (
          <motion.div key={app.slug} variants={item}>
            <AppCard app={app} onClick={() => navigate(app.route)} />
          </motion.div>
        ))}

        {accessibleApps.length === 0 && (
          <motion.div
            className="glass rounded-2xl p-8 text-center"
            variants={item}
          >
            <p className="text-white/40 text-sm">No apps available yet.</p>
            <p className="text-white/30 text-xs mt-1">Ask the admin for access.</p>
          </motion.div>
        )}
      </motion.div>

      {/* Admin: more apps coming soon card */}
      {user?.role === 'admin' && (
        <motion.div
          className="mt-4 glass rounded-2xl p-5 border-dashed border-white/10 flex items-center gap-4 opacity-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.4 }}
        >
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
            <Plus size={20} className="text-white/60" />
          </div>
          <div>
            <p className="font-semibold text-sm">More apps coming soon</p>
            <p className="text-white/40 text-xs">Add new apps to the platform</p>
          </div>
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
}

function AppCard({ app, onClick }) {
  const Icon = app.icon;
  return (
    <GlassCard
      onClick={onClick}
      className={`flex items-center gap-4 p-5 shadow-xl ${app.glow}`}
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
        <Icon size={26} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white">{app.name}</h3>
        <p className="text-white/50 text-sm mt-0.5 truncate">{app.description}</p>
      </div>
      <div className="text-white/30 flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </GlassCard>
  );
}
