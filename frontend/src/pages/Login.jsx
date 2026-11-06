import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';

export default function Login() {
  const [params] = useSearchParams();
  const error = params.get('error');

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

      <motion.div
        className="w-full max-w-sm flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Logo */}
        <motion.div
          className="flex flex-col items-center gap-3"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-20 h-20 rounded-3xl gradient-bg flex items-center justify-center shadow-2xl shadow-violet-900/50">
            <span className="text-4xl font-black tracking-tighter">M</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black gradient-text tracking-tight">404</h1>
            <p className="text-white/40 text-sm mt-1">Your flat's command center</p>
          </div>
        </motion.div>

        {/* Card */}
        <div className="w-full glass rounded-3xl p-6 flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-lg font-bold text-white">Welcome back</h2>
            <p className="text-white/50 text-sm mt-1">Sign in to access the flat apps</p>
          </div>

          {error && (
            <motion.div
              className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              Access denied — you haven't been added yet. Ask the admin.
            </motion.div>
          )}

          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full bg-white rounded-2xl py-3.5 text-gray-800 font-semibold text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-lg shadow-black/20"
          >
            <GoogleIcon />
            Continue with Google
          </a>

          <p className="text-white/30 text-xs text-center">
            Only invited flatmates can access this app
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
