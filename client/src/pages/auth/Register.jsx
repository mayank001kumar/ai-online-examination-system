import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await register(form.name, form.email, form.password, form.role);
      toast.success(res.message || 'Registered! Please verify your email.');
      navigate('/verify-otp', { state: { email: form.email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <div className="card-body">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">Create Account</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                name="name"
                className="input"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                name="email"
                className="input"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                name="password"
                className="input"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="label">Register as</label>
              <select name="role" className="input" value={form.role} onChange={handleChange}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Register'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm">
            Already have an account? <Link to="/login" className="text-primary-600 hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
