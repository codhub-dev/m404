import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Calendar, Clock, ChevronRight, History, Users, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import GlassButton from '../../components/ui/GlassButton';
import Modal from '../../components/ui/Modal';
import BottomNav from '../../components/ui/BottomNav';
import { Skeleton } from '../../components/ui/Loader';
import PacketCard from '../../components/protein/PacketCard';
import toast from 'react-hot-toast';

export default function ProteinTracker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [packetData, setPacketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logModal, setLogModal] = useState(false);
  const [logging, setLogging] = useState(false);
  const [form, setForm] = useState({ sachets: 1, date: format(new Date(), 'yyyy-MM-dd'), note: '', splitWith: [] });
  const [packetHistory, setPacketHistory] = useState([]);
  const [historyModal, setHistoryModal] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [packetScoped, setPacketScoped] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [lbRes, pkRes] = await Promise.allSettled([
      api.get('/protein/leaderboard'),
      api.get('/packet/current'),
    ]);
    if (lbRes.status === 'fulfilled') {
      setLeaderboard(lbRes.value.data.leaderboard);
      setPacketScoped(lbRes.value.data.packetScoped);
    }
    if (pkRes.status === 'fulfilled') setPacketData(pkRes.value.data);
    setLoading(false);
  }

  async function openPacketHistory() {
    try {
      const { data } = await api.get('/packet/history');
      setPacketHistory(data.packets);
      setHistoryModal(true);
    } catch {
      toast.error('Failed to load history');
    }
  }

  async function handleReactivate(packetId) {
    setReactivating(true);
    try {
      await api.post(`/packet/reactivate/${packetId}`);
      toast.success('Switched — logs will now count against this packet');
      setHistoryModal(false);
      await fetchAll();
    } catch {
      toast.error('Failed to switch');
    } finally {
      setReactivating(false);
    }
  }

  async function logSachets(sachetCount = 1, date = null, note = '', splitWithUserIds = []) {
    setLogging(true);
    try {
      await api.post('/protein/log', {
        sachets: sachetCount,
        date: date || format(new Date(), 'yyyy-MM-dd'),
        note,
        splitWithUserIds,
      });
      const total = splitWithUserIds.length + 1;
      const per = Math.round((sachetCount / total) * 100) / 100;
      const msg = total > 1
        ? `+${per} sachet each (${total} people)`
        : `+${sachetCount} sachet${sachetCount !== 1 ? 's' : ''} logged!`;
      toast.success(msg);
      await fetchAll();
      setLogModal(false);
      setForm({ sachets: 1, date: format(new Date(), 'yyyy-MM-dd'), note: '', splitWith: [] });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to log');
    } finally {
      setLogging(false);
    }
  }

  const myEntry = leaderboard.find((e) => e.user._id === user?._id);
  const maxTotal = Math.max(...leaderboard.map((e) => e.total), 1);
  const otherUsers = leaderboard.filter((e) => e.user._id !== user?._id);
  const hasActivePacket = !!packetData?.packet && packetData.remaining > 0;

  return (
    <div className="min-h-dvh pb-safe px-4 pt-6">
      {/* Header */}
      <motion.div
        className="mb-5 flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-black gradient-text">Protein Tracker</h1>
          <p className="text-white/40 text-sm">{format(new Date(), 'MMMM yyyy')}</p>
        </div>
        <button
          onClick={openPacketHistory}
          className="p-2.5 glass rounded-xl text-white/50 hover:text-white transition-colors"
        >
          <History size={18} />
        </button>
      </motion.div>

      {/* Packet card */}
      {!loading && (
        <PacketCard packetData={packetData} onRefresh={fetchAll} onOpenHistory={openPacketHistory} isAdmin={user?.role === 'admin'} />
      )}

      {/* My stats card */}
      {myEntry && (
        <motion.div
          className="rounded-2xl p-5 mb-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.25) 0%, rgba(59,130,246,0.15) 100%)', border: '1px solid rgba(139,92,246,0.3)' }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-violet-600/20 blur-2xl pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
                alt={user?.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-violet-500/40 flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-white/50 text-xs font-medium">{packetScoped ? 'This packet' : 'This month'}</p>
                <div className="flex items-end gap-1.5">
                  <motion.span
                    key={myEntry.total}
                    className="text-5xl font-black gradient-text leading-none"
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                  >
                    {myEntry.total % 1 === 0 ? myEntry.total : myEntry.total.toFixed(1)}
                  </motion.span>
                  <span className="text-white/40 text-sm pb-1">sachets</span>
                </div>
                {myEntry.lastLog && (
                  <p className="text-white/30 text-xs mt-0.5">
                    last {formatDistanceToNow(new Date(myEntry.lastLog), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <motion.button
                onClick={() => logSachets(1)}
                disabled={logging || !hasActivePacket}
                whileTap={{ scale: 0.9 }}
                className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white shadow-lg shadow-violet-900/50 disabled:opacity-30 active:opacity-80"
              >
                <Plus size={26} strokeWidth={2.5} />
              </motion.button>
              <button
                onClick={() => setLogModal(true)}
                disabled={!hasActivePacket}
                className="w-14 h-8 rounded-xl glass flex items-center justify-center text-white/50 text-xs font-semibold hover:text-white transition-colors disabled:opacity-30"
              >
                custom
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick log */}
      <motion.div
        className="flex gap-3 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <motion.button
          onClick={() => logSachets(1, format(subDays(new Date(), 1), 'yyyy-MM-dd'))}
          disabled={logging || !hasActivePacket}
          whileTap={{ scale: 0.96 }}
          className="flex-1 glass rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30"
        >
          <Clock size={15} />
          Yesterday
        </motion.button>
        <motion.button
          onClick={() => setLogModal(true)}
          disabled={logging || !hasActivePacket}
          whileTap={{ scale: 0.96 }}
          className="flex-1 glass rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30"
        >
          <Calendar size={15} />
          Pick date / split
        </motion.button>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-3 px-1">
          {packetScoped ? 'Packet Leaderboard' : 'Monthly Leaderboard'}
        </p>

        <div className="flex flex-col gap-2.5">
          {loading
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px]" />)
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

      {/* Custom log + split modal */}
      <LogModal
        open={logModal}
        onClose={() => { setLogModal(false); setForm({ sachets: 1, date: format(new Date(), 'yyyy-MM-dd'), note: '', splitWith: [] }); }}
        form={form}
        setForm={setForm}
        otherUsers={otherUsers}
        onSubmit={() => logSachets(form.sachets, form.date, form.note, form.splitWith)}
        loading={logging}
      />

      {/* Packet history modal */}
      <PacketHistoryModal
        open={historyModal}
        onClose={() => setHistoryModal(false)}
        packets={packetHistory}
        onReactivate={handleReactivate}
        loading={reactivating}
      />

      <BottomNav />
    </div>
  );
}

function LogModal({ open, onClose, form, setForm, otherUsers, onSubmit, loading }) {
  const total = 1 + form.splitWith.length;
  const perPerson = Math.round((form.sachets / total) * 100) / 100;

  function toggleSplit(uid) {
    setForm((f) => ({
      ...f,
      splitWith: f.splitWith.includes(uid)
        ? f.splitWith.filter((id) => id !== uid)
        : [...f.splitWith, uid],
    }));
  }

  function adjustSachets(delta) {
    setForm((f) => {
      const next = Math.round((f.sachets + delta) * 10) / 10;
      return { ...f, sachets: Math.max(0.5, Math.min(10, next)) };
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Protein">
      <div className="flex flex-col gap-4">
        {/* Sachet counter */}
        <div>
          <label className="text-xs text-white/50 font-medium mb-3 block">Sachets used in total</label>
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col gap-1.5">
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => adjustSachets(-1)}
                className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white/70 text-lg font-bold">−1</motion.button>
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => adjustSachets(-0.5)}
                className="w-10 h-8 glass rounded-xl flex items-center justify-center text-white/40 text-xs">−½</motion.button>
            </div>
            <motion.span
              key={form.sachets}
              className="text-5xl font-black w-20 text-center gradient-text"
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              {form.sachets % 1 === 0 ? form.sachets : form.sachets.toFixed(1)}
            </motion.span>
            <div className="flex flex-col gap-1.5">
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => adjustSachets(1)}
                className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-violet-900/40">+1</motion.button>
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => adjustSachets(0.5)}
                className="w-10 h-8 glass rounded-xl flex items-center justify-center text-white/40 text-xs">+½</motion.button>
            </div>
          </div>
        </div>

        {/* Split with */}
        {otherUsers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users size={13} className="text-white/40" />
              <label className="text-xs text-white/50 font-medium">Split with</label>
            </div>
            <div className="flex flex-col gap-1.5">
              {otherUsers.map(({ user }) => {
                const selected = form.splitWith.includes(user._id);
                return (
                  <button
                    key={user._id}
                    onClick={() => toggleSplit(user._id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                      selected ? 'bg-violet-500/20 border border-violet-500/40' : 'glass border border-transparent'
                    }`}
                  >
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                      alt={user.name}
                      className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-sm text-white/80 flex-1">{user.name}</span>
                    {selected && <span className="text-xs text-violet-400 font-semibold">✓</span>}
                  </button>
                );
              })}
            </div>
            {form.splitWith.length > 0 && (
              <p className="text-xs text-white/40 mt-2 text-center">
                {form.sachets % 1 === 0 ? form.sachets : form.sachets.toFixed(1)} sachets ÷ {total} people = <span className="text-violet-400 font-semibold">{perPerson}</span> each
              </p>
            )}
          </div>
        )}

        {/* Date */}
        <div>
          <label className="text-xs text-white/50 font-medium mb-1.5 block">Date</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setForm((f) => ({ ...f, date: format(new Date(), 'yyyy-MM-dd') }))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                form.date === format(new Date(), 'yyyy-MM-dd') ? 'gradient-bg text-white' : 'glass text-white/50'
              }`}
            >Today</button>
            <button
              onClick={() => setForm((f) => ({ ...f, date: format(subDays(new Date(), 1), 'yyyy-MM-dd') }))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                form.date === format(subDays(new Date(), 1), 'yyyy-MM-dd') ? 'gradient-bg text-white' : 'glass text-white/50'
              }`}
            >Yesterday</button>
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

        <GlassButton size="lg" className="w-full" onClick={onSubmit} loading={loading}>
          <Plus size={16} />
          {form.splitWith.length > 0
            ? `Log ${perPerson} sachet each (${total} people)`
            : `Log ${form.sachets % 1 === 0 ? form.sachets : form.sachets.toFixed(1)} sachet${form.sachets !== 1 ? 's' : ''}`}
        </GlassButton>
      </div>
    </Modal>
  );
}

function PacketHistoryModal({ open, onClose, packets, onReactivate, loading }) {
  if (!packets.length) {
    return (
      <Modal open={open} onClose={onClose} title="Past Packets">
        <p className="text-sm text-white/40 text-center py-4">No closed packets yet.</p>
      </Modal>
    );
  }
  return (
    <Modal open={open} onClose={onClose} title="Past Packets">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-white/40 mb-1">Switching to a packet closes the current one and resumes tracking against it.</p>
        {packets.map((p) => (
          <div key={p._id} className="glass rounded-xl p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                {p.name ? p.name : `${p.totalSachets} sachets`}
                {p.name ? <span className="text-white/40 font-normal"> · {p.totalSachets} sachets</span> : null}
                {p.cost ? <span className="text-white/40 font-normal"> · ₹{p.cost}</span> : null}
              </p>
              <p className="text-xs text-white/30 mt-0.5">
                {format(new Date(p.openedAt), 'dd MMM yyyy')} — {p.closedAt ? format(new Date(p.closedAt), 'dd MMM yyyy') : 'open'}
              </p>
              {p.note && <p className="text-xs text-white/30 truncate">{p.note}</p>}
            </div>
            <button
              onClick={() => onReactivate(p._id)}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 glass rounded-xl text-xs font-semibold text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <RotateCcw size={11} />
              Switch
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function LeaderboardRow({ entry, rank, maxTotal, isMe }) {
  const navigate = useNavigate();
  const pct = maxTotal > 0 ? (entry.total / maxTotal) * 100 : 0;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <motion.div
      className={`relative rounded-2xl overflow-hidden cursor-pointer ${isMe ? 'border border-violet-500/40' : 'border border-white/[0.08]'}`}
      style={{ background: isMe ? 'rgba(109,40,217,0.12)' : 'rgba(255,255,255,0.04)' }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={() => navigate(`/protein/history?uid=${entry.user._id}&name=${encodeURIComponent(entry.user.name)}`)}
    >
      <motion.div
        className="absolute inset-0 origin-left"
        style={{ background: isMe ? 'rgba(109,40,217,0.15)' : 'rgba(255,255,255,0.03)' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: pct / 100 }}
        transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
      />

      <div className="relative flex items-center gap-3 px-4 py-3.5">
        <div className="w-8 text-center flex-shrink-0">
          {rank <= 3
            ? <span className="text-2xl">{medals[rank - 1]}</span>
            : <span className="text-white/25 text-sm font-bold">{rank}</span>}
        </div>

        <img
          src={entry.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${entry.user.name}`}
          alt={entry.user.name}
          className="w-10 h-10 rounded-xl object-cover border border-white/10 flex-shrink-0"
          referrerPolicy="no-referrer"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold text-sm truncate ${isMe ? 'text-white' : 'text-white/90'}`}>
              {entry.user.name}
            </span>
            {isMe && (
              <span className="text-[10px] font-bold text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded-full">you</span>
            )}
          </div>
          {entry.lastLog
            ? <p className="text-white/30 text-xs mt-0.5">last: {format(new Date(entry.lastLog), 'dd MMM')}</p>
            : <p className="text-white/20 text-xs mt-0.5">no logs yet</p>}
        </div>

        <div className="text-right flex-shrink-0 flex items-center gap-1.5">
          <div>
            <span className={`text-2xl font-black ${isMe ? 'gradient-text' : 'text-white'}`}>
              {entry.total % 1 === 0 ? entry.total : entry.total.toFixed(1)}
            </span>
            <p className="text-white/30 text-[11px] leading-none mt-0.5">sachets</p>
          </div>
          <ChevronRight size={14} className="text-white/20 flex-shrink-0" />
        </div>
      </div>
    </motion.div>
  );
}
