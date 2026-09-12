import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FaGraduationCap } from 'react-icons/fa';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success('Welcome back!');
      navigate(`/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <div className="card-body">
          <div className="flex flex-col items-center mb-6">
            <FaGraduationCap className="text-primary-600 text-5xl mb-3" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Login</h1>
            <p className="text-gray-500 dark:text-gray-400">AI-Enabled Online Examination System</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div className="mt-4 flex justify-between text-sm">
            <Link to="/register" className="text-primary-600 hover:underline">Create account</Link>
            <Link to="/forgot-password" className="text-primary-600 hover:underline">Forgot password?</Link>
          </div>
          <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300">
            <p className="font-medium mb-1">Demo accounts:</p>
            <p>Student: student@exam.com / student123</p>
            <p>Faculty: faculty@exam.com / faculty123</p>
            <p>Admin: admin@exam.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
