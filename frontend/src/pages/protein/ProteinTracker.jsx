import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Calendar, Clock, ChevronRight, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, subDays, startOfDay } from 'date-fns';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import Modal from '../../components/ui/Modal';
import BottomNav from '../../components/ui/BottomNav';
import { Skeleton } from '../../components/ui/Loader';
import toast from 'react-hot-toast';

export default function ProteinTracker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logModal, setLogModal] = useState(false);
  const [logging, setLogging] = useState(false);
  const [form, setForm] = useState({ sachets: 1, date: format(new Date(), 'yyyy-MM-dd'), note: '' });

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    try {
      const { data } = await api.get('/protein/leaderboard');
      setLeaderboard(data.leaderboard);
    } finally {
      setLoading(false);
    }
  }

  async function logSachets(sachetCount = 1, date = null, note = '') {
    setLogging(true);
    try {
      await api.post('/protein/log', {
        sachets: sachetCount,
        date: date || format(new Date(), 'yyyy-MM-dd'),
        note,
      });
      toast.success(`+${sachetCount} sachet${sachetCount > 1 ? 's' : ''} logged!`);
      await fetchLeaderboard();
      setLogModal(false);
      setForm({ sachets: 1, date: format(new Date(), 'yyyy-MM-dd'), note: '' });
    } catch (err) {
      toast.error('Failed to log');
    } finally {
      setLogging(false);
    }
  }

  const myEntry = leaderboard.find((e) => e.user._id === user?._id);
  const maxTotal = Math.max(...leaderboard.map((e) => e.total), 1);

  return (
    <div className="min-h-dvh pb-safe px-5 pt-6">
      {/* Header */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black gradient-text">Protein Tracker</h1>
            <p className="text-white/40 text-sm">{format(new Date(), 'MMMM yyyy')}</p>
          </div>
          <button
            onClick={() => navigate('/protein/history')}
            className="p-2.5 glass rounded-xl text-white/60 hover:text-white transition-colors"
          >
            <History size={18} />
          </button>
        </div>
      </motion.div>

      {/* My quick stats */}
      {myEntry && (
        <motion.div
          className="glass rounded-2xl p-5 mb-5 relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="absolute inset-0 gradient-bg opacity-5 pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-white/50 text-xs font-medium">Your total this month</p>
              <motion.div
                className="text-5xl font-black gradient-text mt-1 leading-none"
                key={myEntry.total}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                {myEntry.total}
              </motion.div>
              <p className="text-white/40 text-xs mt-1">
                {myEntry.total === 1 ? 'sachet' : 'sachets'}
                {myEntry.lastLog && ` · last ${formatDistanceToNow(new Date(myEntry.lastLog), { addSuffix: true })}`}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <motion.button
                onClick={() => logSachets(1)}
                disabled={logging}
                whileTap={{ scale: 0.92 }}
                className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white shadow-lg shadow-violet-900/40 disabled:opacity-50"
              >
                <Plus size={24} strokeWidth={2.5} />
              </motion.button>
              <button
                onClick={() => setLogModal(true)}
                className="w-14 h-8 rounded-xl glass flex items-center justify-center text-white/60 text-xs font-medium hover:text-white transition-colors"
              >
                custom
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick log buttons */}
      <motion.div
        className="flex gap-3 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <motion.button
          onClick={() => logSachets(1, format(subDays(new Date(), 1), 'yyyy-MM-dd'))}
          disabled={logging}
          whileTap={{ scale: 0.95 }}
          className="flex-1 glass rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
        >
          <Clock size={14} />
          Yesterday
        </motion.button>
        <motion.button
          onClick={() => setLogModal(true)}
          disabled={logging}
          whileTap={{ scale: 0.95 }}
          className="flex-1 glass rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
        >
          <Calendar size={14} />
          Pick date
        </motion.button>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          Monthly Leaderboard
        </h2>

        <div className="flex flex-col gap-2">
          {loading
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)
            : leaderboard.map((entry, i) => (
                <LeaderboardRow
                  key={entry.user._id}
                  entry={entry}
                  rank={i + 1}
                  maxTotal={maxTotal}
                  isMe={entry.user._id === user?._id}
                />
              ))
          }
        </div>
      </motion.div>

      {/* Custom log modal */}
      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Protein">
        <div className="flex flex-col gap-4">
          {/* Sachet counter */}
          <div>
            <label className="text-xs text-white/50 font-medium mb-3 block">Sachets</label>
            <div className="flex items-center justify-center gap-6">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setForm((f) => ({ ...f, sachets: Math.max(1, f.sachets - 1) }))}
                className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white/70 hover:text-white"
              >
                <Minus size={20} />
              </motion.button>
              <motion.span
                key={form.sachets}
                className="text-5xl font-black w-16 text-center gradient-text"
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                {form.sachets}
              </motion.span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setForm((f) => ({ ...f, sachets: Math.min(10, f.sachets + 1) }))}
                className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center text-white shadow-lg shadow-violet-900/40"
              >
                <Plus size={20} />
              </motion.button>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-white/50 font-medium mb-1.5 block">Date</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setForm((f) => ({ ...f, date: format(new Date(), 'yyyy-MM-dd') }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  form.date === format(new Date(), 'yyyy-MM-dd')
                    ? 'gradient-bg text-white'
                    : 'glass text-white/50'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setForm((f) => ({ ...f, date: format(subDays(new Date(), 1), 'yyyy-MM-dd') }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  form.date === format(subDays(new Date(), 1), 'yyyy-MM-dd')
                    ? 'gradient-bg text-white'
                    : 'glass text-white/50'
                }`}
              >
                Yesterday
              </button>
            </div>
            <input
              type="date"
              value={form.date}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full glass rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/10 [color-scheme:dark]"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-white/50 font-medium mb-1.5 block">Note (optional)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Post-workout"
              className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/10"
            />
          </div>

          <GlassButton size="lg" className="w-full" onClick={() => logSachets(form.sachets, form.date, form.note)} loading={logging}>
            <Plus size={16} />
            Log {form.sachets} sachet{form.sachets > 1 ? 's' : ''}
          </GlassButton>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
}

function LeaderboardRow({ entry, rank, maxTotal, isMe }) {
  const navigate = useNavigate();
  const pct = maxTotal > 0 ? (entry.total / maxTotal) * 100 : 0;
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <motion.div
      className={`glass rounded-2xl p-3.5 relative overflow-hidden cursor-pointer ${isMe ? 'border-violet-500/30' : ''}`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={() => navigate(`/protein/history?uid=${entry.user._id}&name=${encodeURIComponent(entry.user.name)}`)}
    >
      {/* Progress bar background */}
      <motion.div
        className="absolute inset-0 gradient-bg opacity-[0.06] origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: pct / 100 }}
        transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
        style={{ transformOrigin: 'left' }}
      />
      <div className="relative flex items-center gap-3">
        <span className="text-xl w-7 text-center flex-shrink-0">
          {rank <= 3 ? medals[rank - 1] : <span className="text-white/30 text-sm font-bold">{rank}</span>}
        </span>
        <img
          src={entry.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${entry.user.name}`}
          alt={entry.user.name}
          className="w-9 h-9 rounded-xl object-cover border border-white/10 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate">{entry.user.name}</span>
            {isMe && <span className="text-[10px] text-violet-400 font-bold">you</span>}
          </div>
          {entry.lastLog && (
            <p className="text-white/30 text-xs">
              last: {format(new Date(entry.lastLog), 'dd MMM')}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`text-xl font-black ${isMe ? 'gradient-text' : 'text-white'}`}>
            {entry.total}
          </span>
          <p className="text-white/30 text-xs">{entry.total === 1 ? 'sachet' : 'sachets'}</p>
        </div>
      </div>
    </motion.div>
  );
}
