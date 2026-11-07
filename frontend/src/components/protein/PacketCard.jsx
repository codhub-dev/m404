import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ChevronDown, ChevronUp, X, Plus } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import GlassButton from '../ui/GlassButton';
import Modal from '../ui/Modal';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function PacketCard({ packetData, onRefresh }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ totalSachets: '', cost: '', currency: '£', note: '' });
  const [closeCost, setCloseCost] = useState('');

  const hasPacket = !!packetData?.packet;
  const { packet, totalUsed = 0, remaining = 0, daysRunning = 1, avgPerDay = 0, usage = [] } = packetData || {};
  const pct = hasPacket ? Math.min(100, (totalUsed / packet.totalSachets) * 100) : 0;
  const isAlmostEmpty = remaining <= Math.ceil(packet?.totalSachets * 0.1);

  async function handleOpen() {
    if (!form.totalSachets || Number(form.totalSachets) < 1) {
      toast.error('Enter number of sachets');
      return;
    }
    setLoading(true);
    try {
      await api.post('/packet/open', {
        totalSachets: Number(form.totalSachets),
        cost: form.cost ? Number(form.cost) : undefined,
        currency: form.currency,
        note: form.note,
      });
      toast.success('New packet opened!');
      setOpenModal(false);
      setForm({ totalSachets: '', cost: '', currency: '£', note: '' });
      onRefresh();
    } catch {
      toast.error('Failed to open packet');
    } finally {
      setLoading(false);
    }
  }

  async function handleClose() {
    setLoading(true);
    try {
      await api.post(`/packet/close/${packet._id}`, {
        cost: closeCost ? Number(closeCost) : undefined,
      });
      toast.success('Packet closed');
      setCloseModal(false);
      setCloseCost('');
      onRefresh();
    } catch {
      toast.error('Failed to close packet');
    } finally {
      setLoading(false);
    }
  }

  if (!hasPacket) {
    return (
      <>
        <motion.button
          onClick={() => setOpenModal(true)}
          whileTap={{ scale: 0.97 }}
          className="w-full glass rounded-2xl p-4 flex items-center gap-3 text-left mb-4 border border-dashed border-white/20 hover:border-violet-500/40 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
            <Package size={18} />
          </div>
          <div>
            <p className="font-semibold text-sm text-white">Open a new packet</p>
            <p className="text-white/40 text-xs">Track usage and split costs</p>
          </div>
          <Plus size={16} className="ml-auto text-white/30" />
        </motion.button>

        <OpenPacketModal
          open={openModal}
          onClose={() => setOpenModal(false)}
          form={form}
          setForm={setForm}
          onSubmit={handleOpen}
          loading={loading}
        />
      </>
    );
  }

  return (
    <>
      <motion.div
        className={`rounded-2xl mb-4 overflow-hidden ${isAlmostEmpty ? 'border border-amber-500/40' : 'border border-white/[0.08]'}`}
        style={{ background: 'rgba(255,255,255,0.04)' }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Main row */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isAlmostEmpty ? 'bg-amber-500/20' : 'gradient-bg'}`}>
            <Package size={16} className={isAlmostEmpty ? 'text-amber-400' : 'text-white'} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {remaining} <span className="text-white/50 font-normal">/ {packet.totalSachets} left</span>
              </span>
              {isAlmostEmpty && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">almost empty</span>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isAlmostEmpty ? 'bg-amber-400' : 'gradient-bg'}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
          <div className="text-white/30 flex-shrink-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-white/[0.06]">
                {/* Stats row */}
                <div className="flex gap-3 mt-3 mb-4">
                  <Stat label="Used" value={`${totalUsed}`} unit="sachets" />
                  <Stat label="Running" value={`${daysRunning}`} unit={daysRunning === 1 ? 'day' : 'days'} />
                  <Stat label="Avg/day" value={avgPerDay} unit="sachets" />
                  {packet.cost && <Stat label="Cost" value={`${packet.currency}${packet.cost}`} unit={`${packet.currency}${(packet.cost / packet.totalSachets).toFixed(2)}/sachet`} />}
                </div>

                {/* Usage breakdown */}
                {usage.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-4">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Usage breakdown</p>
                    {usage.map((u) => (
                      <div key={u.user._id} className="flex items-center gap-2">
                        <img
                          src={u.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.user.name}`}
                          alt={u.user.name}
                          className="w-6 h-6 rounded-lg object-cover flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-xs text-white/70 flex-1 truncate">{u.user.name}</span>
                        <span className="text-xs text-white/50">{u.sachets} sachets</span>
                        <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full gradient-bg rounded-full" style={{ width: `${u.pct}%` }} />
                        </div>
                        <span className="text-xs text-white/40 w-7 text-right">{u.pct}%</span>
                        {u.amountOwed && (
                          <span className="text-xs font-semibold text-violet-400 w-10 text-right">{packet.currency}{u.amountOwed}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setOpenModal(true)}
                    className="flex-1 glass rounded-xl py-2 text-xs font-semibold text-white/50 hover:text-white transition-colors"
                  >
                    New packet
                  </button>
                  <button
                    onClick={() => { setCloseCost(packet.cost ? String(packet.cost) : ''); setCloseModal(true); }}
                    className="flex-1 glass rounded-xl py-2 text-xs font-semibold text-amber-400/70 hover:text-amber-400 transition-colors"
                  >
                    Close packet
                  </button>
                </div>

                <p className="text-white/20 text-[10px] mt-2 text-center">
                  Opened {formatDistanceToNow(new Date(packet.openedAt), { addSuffix: true })} by {packet.openedBy?.name}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <OpenPacketModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        form={form}
        setForm={setForm}
        onSubmit={handleOpen}
        loading={loading}
      />

      {/* Close packet modal */}
      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Close Packet">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/60">
            This marks the packet as finished. Final usage will be saved.
          </p>
          <div>
            <label className="text-xs text-white/50 font-medium mb-1.5 block">
              Update cost (optional) — for final split calculation
            </label>
            <div className="flex items-center glass rounded-xl border border-white/10 overflow-hidden">
              <span className="px-3 text-white/40 text-sm">{packet.currency}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={closeCost}
                onChange={(e) => setCloseCost(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent py-3 pr-4 text-sm text-white outline-none"
              />
            </div>
          </div>
          <GlassButton onClick={handleClose} loading={loading} className="w-full">
            Close packet
          </GlassButton>
        </div>
      </Modal>
    </>
  );
}

function OpenPacketModal({ open, onClose, form, setForm, onSubmit, loading }) {
  const currencies = ['£', '€', '$', '₹', '₩'];
  return (
    <Modal open={open} onClose={onClose} title="Open New Packet">
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-white/50 font-medium mb-1.5 block">Number of sachets in packet *</label>
          <input
            type="number"
            min="1"
            value={form.totalSachets}
            onChange={(e) => setForm((f) => ({ ...f, totalSachets: e.target.value }))}
            placeholder="e.g. 30"
            className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/10"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 font-medium mb-1.5 block">Cost (optional)</label>
          <div className="flex gap-2">
            <div className="flex glass rounded-xl border border-white/10 overflow-hidden">
              {currencies.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, currency: c }))}
                  className={`px-2.5 py-2 text-sm transition-colors ${form.currency === c ? 'gradient-bg text-white' : 'text-white/40'}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              placeholder="0.00"
              className="flex-1 glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/10"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-white/50 font-medium mb-1.5 block">Note (optional)</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="e.g. Chocolate flavour, Lidl"
            className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/10"
          />
        </div>
        <GlassButton onClick={onSubmit} loading={loading} className="w-full">
          <Package size={15} />
          Open packet
        </GlassButton>
      </div>
    </Modal>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div className="flex-1 glass rounded-xl p-2.5 text-center">
      <p className="text-white/40 text-[10px] font-medium mb-0.5">{label}</p>
      <p className="text-white font-bold text-sm leading-tight">{value}</p>
      <p className="text-white/30 text-[10px] leading-tight">{unit}</p>
    </div>
  );
}
