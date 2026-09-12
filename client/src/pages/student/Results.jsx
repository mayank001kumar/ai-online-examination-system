import { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { FaDownload, FaTrophy, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

export default function Results() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/student/results');
        setResults(res.data.attempts);
      } catch (err) {
        toast.error('Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const downloadCertificate = (attemptId) => {
    window.open(`${import.meta.env.VITE_API_URL || '/api'}/student/certificate/${attemptId}?token=${localStorage.getItem('token')}`, '_blank');
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading results...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">My Results</h1>

      {results.length === 0 ? (
        <div className="card">
          <div className="card-body text-center text-gray-500">You haven't taken any exams yet.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((r) => (
            <div key={r._id} className="card">
              <div className="card-body flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{r.exam?.title}</h3>
                  <p className="text-sm text-gray-500">
                    Score: {r.score}/{r.totalMarks} • {r.percentage?.toFixed(1)}%
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className={r.passed ? 'text-green-600 flex items-center gap-1' : 'text-red-600 flex items-center gap-1'}>
                      {r.passed ? <FaCheckCircle /> : <FaTimesCircle />}
                      {r.passed ? 'Passed' : 'Failed'}
                    </span>
                    <span className="text-gray-500">Status: {r.status}</span>
                  </div>
                  {r.aiFeedback && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      🤖 <strong>AI Feedback:</strong> {r.aiFeedback}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold ${
                    r.passed ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {r.percentage?.toFixed(0)}%
                  </div>
                  {r.passed && (
                    <button
                      onClick={() => downloadCertificate(r._id)}
                      className="btn-outline text-xs flex items-center gap-1"
                    >
                      <FaDownload /> Certificate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
