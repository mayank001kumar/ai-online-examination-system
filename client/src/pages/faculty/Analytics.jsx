import { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { FaTrophy, FaRobot } from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [topics, setTopics] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [distribution, setDistribution] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, trendRes, topicsRes, lbRes, distRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/trend?days=14'),
          api.get('/admin/topic-performance'),
          api.get('/admin/leaderboard'),
          api.get('/admin/difficulty-distribution'),
        ]);
        setStats(statsRes.data.stats);
        setTrend(trendRes.data.trend);
        setTopics(topicsRes.data.topics);
        setLeaderboard(lbRes.data.leaderboard);
        setDistribution(distRes.data.distribution);
      } catch (err) {
        toast.error('Failed to load analytics');
      }
    };
    load();
  }, []);

  const trendData = {
    labels: trend.map((t) => t.date.slice(5)),
    datasets: [
      {
        label: 'Attempts',
        data: trend.map((t) => t.attempts),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Avg Score',
        data: trend.map((t) => t.avgScore?.toFixed(1)),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  const topicData = {
    labels: topics.map((t) => t.topic),
    datasets: [
      {
        label: 'Accuracy (%)',
        data: topics.map((t) => t.accuracy?.toFixed(1)),
        backgroundColor: topics.map(() => 'rgba(59,130,246,0.8)'),
      },
    ],
  };

  const diffData = {
    labels: distribution.map((d) => d._id),
    datasets: [
      {
        data: distribution.map((d) => d.count),
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      },
    ],
  };

  const statCards = [
    { label: 'Total Attempts', value: stats?.attempts || 0, color: 'text-blue-600' },
    { label: 'Avg Score', value: `${(stats?.avgScore || 0).toFixed(1)}%`, color: 'text-green-600' },
    { label: 'Pass Rate', value: `${(stats?.passRate || 0).toFixed(1)}%`, color: 'text-purple-600' },
    { label: 'Flagged', value: stats?.flagged || 0, color: 'text-red-600' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-500">AI-driven insights and performance tracking</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="card">
            <div className="card-body text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Trend chart */}
        <div className="card">
          <div className="card-body">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Exam Activity Trend</h2>
            {trend.length > 0 ? (
              <Line
                data={trendData}
                options={{
                  responsive: true,
                  interaction: { mode: 'index', intersect: false },
                  scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Attempts' } },
                    y1: { position: 'right', beginAtZero: true, max: 100, title: { display: true, text: 'Score %' } },
                  },
                }}
              />
            ) : (
              <p className="text-gray-500">No trend data</p>
            )}
          </div>
        </div>

        {/* Topic performance */}
        <div className="card">
          <div className="card-body">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Topic-wise Accuracy</h2>
            {topics.length > 0 ? (
              <Bar
                data={topicData}
                options={{
                  responsive: true,
                  scales: { y: { beginAtZero: true, max: 100 } },
                }}
              />
            ) : (
              <p className="text-gray-500">No topic data</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Leaderboard */}
        <div className="card lg:col-span-2">
          <div className="card-body">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <FaTrophy className="text-amber-500" /> Class Leaderboard
            </h2>
            <div className="space-y-3">
              {leaderboard.length === 0 && <p className="text-gray-500">No data yet</p>}
              {leaderboard.map((row) => (
                <div key={row.rank} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    row.rank === 1 ? 'bg-amber-100 text-amber-700' :
                    row.rank === 2 ? 'bg-gray-200 text-gray-700' :
                    row.rank === 3 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {row.rank}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{row.student?.name}</p>
                    <p className="text-xs text-gray-500">{row.totalExams} exams • {row.passed} passed</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">{row.avgPercentage}%</p>
                    <p className="text-xs text-gray-500">Best: {row.bestScore}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Difficulty distribution */}
        <div className="card">
          <div className="card-body">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Question Difficulty</h2>
            {distribution.length > 0 ? (
              <Doughnut data={diffData} options={{ responsive: true }} />
            ) : (
              <p className="text-gray-500">No data</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="card border-purple-200 dark:border-purple-800">
        <div className="card-body">
          <h2 className="text-lg font-semibold mb-4 text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <FaRobot /> AI Insights
          </h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="font-medium mb-1">Strengths</p>
              <p className="text-gray-600 dark:text-gray-300">
                {topics.filter((t) => t.accuracy >= 60).map((t) => t.topic).join(', ') || 'Data analysis in progress'}
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="font-medium mb-1">Weakness Areas</p>
              <p className="text-gray-600 dark:text-gray-300">
                {topics.filter((t) => t.accuracy < 60).map((t) => t.topic).join(', ') || 'No weak areas detected'}
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="font-medium mb-1">Recommendations</p>
              <p className="text-gray-600 dark:text-gray-300">
                Focus on medium-difficulty questions and provide more practice in weak topics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
