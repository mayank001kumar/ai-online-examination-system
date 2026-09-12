import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaSignOutAlt, FaGraduationCap } from 'react-icons/fa';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-xl">
          <FaGraduationCap /> AI Exam
        </Link>
        <div className="flex gap-3">
          <Link to="/login" className="btn-outline">Login</Link>
          <Link to="/register" className="btn-primary">Register</Link>
        </div>
      </nav>
    );
  }

  const links = {
    student: [
      { to: '/student', label: 'Dashboard' },
      { to: '/student/results', label: 'Results' },
    ],
    faculty: [
      { to: '/faculty', label: 'Dashboard' },
      { to: '/faculty/questions', label: 'Question Bank' },
      { to: '/faculty/exams', label: 'Exams' },
      { to: '/faculty/analytics', label: 'Analytics' },
    ],
    admin: [
      { to: '/faculty', label: 'Dashboard' },
      { to: '/faculty/questions', label: 'Question Bank' },
      { to: '/faculty/exams', label: 'Exams' },
      { to: '/faculty/analytics', label: 'Analytics' },
    ],
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex justify-between items-center sticky top-0 z-40">
      <Link to={`/${user.role}`} className="flex items-center gap-2 text-primary-600 font-bold text-xl">
        <FaGraduationCap /> AI Exam
      </Link>
      <div className="flex items-center gap-6">
        <div className="hidden md:flex gap-4">
          {(links[user.role] || []).map((l) => (
            <Link key={l.to} to={l.to} className="text-gray-600 dark:text-gray-300 hover:text-primary-600">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.name}</span>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-600" title="Logout">
            <FaSignOutAlt />
          </button>
        </div>
      </div>
    </nav>
  );
}
