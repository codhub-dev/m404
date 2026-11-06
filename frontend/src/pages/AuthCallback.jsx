import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    if (token) {
      localStorage.setItem('m404_token', token);
      window.location.replace('/home');
    } else {
      window.location.replace('/login?error=access_denied');
    }
  }, []);

  return null;
}
