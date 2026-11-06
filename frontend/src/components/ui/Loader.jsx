import { motion } from 'framer-motion';

export function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0a0010]">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center text-2xl font-black shadow-lg shadow-violet-900/50">
          M
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-violet-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
  );
}
