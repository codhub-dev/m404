import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function GlassCard({ children, className, onClick, animate = true, ...props }) {
  const base = 'glass rounded-2xl p-4';
  if (!animate) {
    return (
      <div className={cn(base, className)} onClick={onClick} {...props}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={cn(base, onClick && 'cursor-pointer glass-hover', className)}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
