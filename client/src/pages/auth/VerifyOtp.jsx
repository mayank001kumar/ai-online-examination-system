import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp });
      toast.success('Email verified!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('OTP resent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <div className="card-body">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">Verify Email</h1>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-6">Enter the 6-digit OTP sent to your email</p>
          <form onSubmit={verify} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">OTP</label>
              <input
                className="input text-center text-2xl tracking-widest"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                placeholder="000000"
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
          <button onClick={resend} className="mt-4 w-full text-primary-600 hover:underline text-sm">
            Resend OTP
          </button>
        </div>
      </div>
    </div>
  );
}
