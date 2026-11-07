import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Trash2, Pencil, Check, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../../utils/api';
import GlassCard from '../../components/ui/GlassCard';
import BottomNav from '../../components/ui/BottomNav';
import { Skeleton } from '../../components/ui/Loader';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function MyLogs() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: me } = useAuth();

  const uid = searchParams.get('uid');
  const name = searchParams.get('name');
  const isOwn = !uid || uid === me?._id;
  const displayName = isOwn ? 'My Logs' : `${name || 'User'}'s Logs`;

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activePacketId, setActivePacketId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editSachets, setEditSachets] = useState(1);

  useEffect(() => {
    async function init() {
      try {
        const { data } = await api.get('/packet/current');
        setActivePacketId(data.packet?._id || null);
      } catch {}
    }
    init();
  }, []);

  useEffect(() => {
    if (activePacketId !== null || !loading) fetchLogs();
  }, [uid, activePacketId]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = activePacketId ? `?packetId=${activePacketId}` : '';
      const endpoint = isOwn ? `/protein/my-logs${params}` : `/protein/user/${uid}/logs${params}`;
      const { data } = await api.get(endpoint);
      setLogs(data.logs);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  async function deleteLog(id, isSplit) {
    const msg = isSplit
      ? 'This was a split entry — deleting it will remove it for everyone involved. Continue?'
      : 'Delete this entry?';
    if (!confirm(msg)) return;
    try {
      const { data } = await api.delete(`/protein/log/${id}`);
      if (data.wasSplit) {
        toast.success(`Split entry removed for all ${data.deletedCount} participants`);
      } else {
        toast.success('Entry deleted');
      }
      fetchLogs();
    } catch {
      toast.error('Failed to delete');
    }
  }

  async function saveEdit(id) {
    try {
      const { data } = await api.patch(`/protein/log/${id}`, { sachets: editSachets });
      setLogs((l) => l.map((x) => (x._id === id ? data : x)));
      setEditingId(null);
      toast.success('Updated');
    } catch {
      toast.error('Failed to update');
    }
  }

  return (
    <div className="min-h-dvh pb-safe px-5 pt-6">
      <motion.div
        className="flex items-center gap-3 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={() => navigate('/protein')} className="p-2 glass rounded-xl text-white/60">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold">{displayName}</h1>
          <p className="text-white/40 text-xs">{total} {activePacketId ? 'entries this packet' : 'total entries'}</p>
        </div>
      </motion.div>

      <div className="flex flex-col gap-2">
        {loading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)
          : logs.length === 0
            ? (
              <motion.div
                className="glass rounded-2xl p-10 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-white/40 text-sm">No logs yet</p>
              </motion.div>
            )
            : logs.map((log, i) => (
                <motion.div
                  key={log._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <LogRow
                    log={log}
                    isOwn={isOwn}
                    editing={editingId === log._id}
                    editSachets={editSachets}
                    onEdit={() => { setEditingId(log._id); setEditSachets(log.sachets); }}
                    onSaveEdit={() => saveEdit(log._id)}
                    onCancelEdit={() => setEditingId(null)}
                    onChangeSachets={setEditSachets}
                    onDelete={() => deleteLog(log._id, !!log.splitGroupId)}
                  />
                </motion.div>
              ))
        }
      </div>

      <BottomNav />
    </div>
  );
}

function LogRow({ log, isOwn, editing, editSachets, onEdit, onSaveEdit, onCancelEdit, onChangeSachets, onDelete }) {
  return (
    <GlassCard animate={false} className="flex items-center gap-3 py-3">
      <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-lg font-black flex-shrink-0">
        {editing ? (
          <input
            type="number"
            min={1}
            max={99}
            value={editSachets}
            onChange={(e) => onChangeSachets(Number(e.target.value))}
            className="w-8 bg-transparent text-center text-white text-sm font-bold outline-none"
          />
        ) : log.sachets}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-sm">{format(new Date(log.date), 'dd MMM yyyy')}</span>
          {log.isBackdated && (
            <span className="text-[10px] text-amber-400/70 font-medium">backdated</span>
          )}
          {log.splitGroupId && (
            <span className="text-[10px] text-violet-400/80 font-medium bg-violet-500/10 px-1.5 py-0.5 rounded-full">split</span>
          )}
        </div>
        <p className="text-white/40 text-xs">
          {log.note || `${log.sachets} sachet${log.sachets > 1 ? 's' : ''}`}
          {' · '}
          {formatDistanceToNow(new Date(log.loggedAt), { addSuffix: true })}
        </p>
      </div>
      {isOwn && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {editing ? (
            <>
              <button onClick={onSaveEdit} className="p-2 rounded-xl text-green-400 hover:bg-green-500/10">
                <Check size={15} />
              </button>
              <button onClick={onCancelEdit} className="p-2 rounded-xl text-white/40 hover:bg-white/5">
                <X size={15} />
              </button>
            </>
          ) : (
            <>
              <button onClick={onEdit} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-colors">
                <Pencil size={14} />
              </button>
              <button onClick={onDelete} className="p-2 rounded-xl text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      )}
    </GlassCard>
  );
}
