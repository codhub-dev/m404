import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function GlassButton({ children, className, variant = 'primary', size = 'md', loading = false, ...props }) {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };
  const variants = {
    primary: 'gradient-bg text-white shadow-lg shadow-violet-900/30',
    ghost: 'glass glass-hover text-white/80',
    danger: 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30',
  };
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={cn(
        'rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
        sizes[size],
        variants[variant],
        className
      )}
      disabled={loading}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </motion.button>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
