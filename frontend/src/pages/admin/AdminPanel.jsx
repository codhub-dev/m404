import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, UserCheck, UserX, Dumbbell, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import Modal from '../../components/ui/Modal';
import BottomNav from '../../components/ui/BottomNav';
import { Skeleton } from '../../components/ui/Loader';
import toast from 'react-hot-toast';

const ALL_APPS = [{ slug: 'protein', label: 'Protein Tracker', icon: Dumbbell }];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', appAccess: ['protein'] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  async function addUser() {
    if (!form.email.trim()) return toast.error('Email is required');
    setSaving(true);
    try {
      const { data } = await api.post('/users', form);
      setUsers((u) => [...u, data]);
      setShowAdd(false);
      setForm({ email: '', name: '', appAccess: ['protein'] });
      toast.success('User added');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add user');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user) {
    try {
      const { data } = await api.put(`/users/${user._id}`, { isActive: !user.isActive });
      setUsers((u) => u.map((x) => (x._id === user._id ? data : x)));
      toast.success(data.isActive ? 'User activated' : 'User deactivated');
    } catch {
      toast.error('Failed to update');
    }
  }

  async function deleteUser(user) {
    if (!confirm(`Remove ${user.name}?`)) return;
    try {
      await api.delete(`/users/${user._id}`);
      setUsers((u) => u.filter((x) => x._id !== user._id));
      toast.success('User removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove');
    }
  }

  function toggleAccess(slug) {
    setForm((f) => ({
      ...f,
      appAccess: f.appAccess.includes(slug)
        ? f.appAccess.filter((s) => s !== slug)
        : [...f.appAccess, slug],
    }));
  }

  return (
    <div className="min-h-dvh pb-safe px-5 pt-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="p-2 glass rounded-xl text-white/60">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <p className="text-white/40 text-xs">Manage flat members</p>
          </div>
        </div>
        <GlassButton size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={15} />
          Add User
        </GlassButton>
      </motion.div>

      {/* User list */}
      <div className="flex flex-col gap-3">
        {loading
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)
          : users.map((user, i) => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <UserRow user={user} onToggle={toggleActive} onDelete={deleteUser} />
              </motion.div>
            ))
        }
      </div>

      {/* Add user modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Flatmate">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-white/50 font-medium mb-1.5 block">Google Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="flatmate@gmail.com"
              className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500 border border-white/10 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 font-medium mb-1.5 block">Display Name (optional)</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Their name"
              className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500 border border-white/10 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 font-medium mb-2 block">App Access</label>
            <div className="flex flex-wrap gap-2">
              {ALL_APPS.map(({ slug, label, icon: Icon }) => (
                <button
                  key={slug}
                  onClick={() => toggleAccess(slug)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    form.appAccess.includes(slug)
                      ? 'gradient-bg text-white shadow-lg shadow-violet-900/30'
                      : 'glass text-white/50'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <GlassButton size="lg" className="w-full mt-1" onClick={addUser} loading={saving}>
            Add to m404
          </GlassButton>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
}

function UserRow({ user, onToggle, onDelete }) {
  return (
    <GlassCard animate={false} className="flex items-center gap-3 py-3">
      <img
        src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
        alt={user.name}
        className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-white/10"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm truncate">{user.name}</span>
          {user.role === 'admin' && (
            <span className="text-[10px] gradient-bg rounded-full px-1.5 py-0.5 font-bold flex-shrink-0">
              Admin
            </span>
          )}
          {!user.isActive && (
            <span className="text-[10px] bg-red-500/20 text-red-400 rounded-full px-1.5 py-0.5 flex-shrink-0">
              Inactive
            </span>
          )}
        </div>
        <p className="text-white/40 text-xs truncate">{user.email}</p>
      </div>
      {user.role !== 'admin' && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggle(user)}
            className={`p-2 rounded-xl transition-colors ${
              user.isActive ? 'text-green-400 hover:bg-green-500/10' : 'text-white/30 hover:bg-white/5'
            }`}
          >
            {user.isActive ? <UserCheck size={16} /> : <UserX size={16} />}
          </button>
          <button
            onClick={() => onDelete(user)}
            className="p-2 rounded-xl text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </GlassCard>
  );
}
