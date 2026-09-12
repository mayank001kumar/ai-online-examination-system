import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { FaBook, FaFileAlt, FaUsers, FaChartLine } from 'react-icons/fa';

export default function FacultyDashboard() {
  const [stats, setStats] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data.stats);
      } catch {}
    };
    load();
  }, []);

  const cards = [
    { label: 'Questions', value: stats?.questions || 0, icon: FaBook, color: 'bg-blue-500', link: '/faculty/questions' },
    { label: 'Exams', value: stats?.exams || 0, icon: FaFileAlt, color: 'bg-green-500', link: '/faculty/exams' },
    { label: 'Students', value: stats?.students || 0, icon: FaUsers, color: 'bg-purple-500', link: '/faculty/exams' },
    { label: 'Avg Score', value: `${(stats?.avgScore || 0).toFixed(1)}%`, icon: FaChartLine, color: 'bg-amber-500', link: '/faculty/analytics' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Faculty Dashboard
      </h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((c) => (
          <Link key={c.label} to={c.link} className="card hover:shadow-lg transition-shadow">
            <div className="card-body">
              <div className={`w-12 h-12 rounded-lg ${c.color} flex items-center justify-center text-white mb-3`}>
                <c.icon size={24} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
              <p className="text-sm text-gray-500">{c.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-body">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/faculty/questions" className="btn-primary w-full text-center">Manage Question Bank</Link>
              <Link to="/faculty/exams" className="btn-outline w-full text-center">Create New Exam</Link>
              <Link to="/faculty/analytics" className="btn-outline w-full text-center">View Analytics</Link>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">System Overview</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Attempts</span>
                <span className="font-medium">{stats?.attempts || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pass Rate</span>
                <span className="font-medium text-green-600">{(stats?.passRate || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Flagged Attempts</span>
                <span className="font-medium text-red-600">{stats?.flagged || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Faculty Count</span>
                <span className="font-medium">{stats?.faculty || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
