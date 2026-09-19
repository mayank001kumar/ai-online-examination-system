import { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  FaDownload,
  FaCheckCircle,
  FaTimesCircle,
  FaRobot,
} from 'react-icons/fa';

export default function Results() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/student/results');
        setResults(res.data.attempts || []);
      } catch (err) {
        console.error('Failed to load results:', err);
        toast.error('Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const downloadCertificate = (attemptId) => {
    window.open(
      `${import.meta.env.VITE_API_URL || '/api'}/student/certificate/${attemptId}?token=${localStorage.getItem('token')}`,
      '_blank'
    );
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-400">
        Loading results...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        My Results
      </h1>

      {results.length === 0 ? (
        <div className="card">
          <div className="card-body text-center text-gray-500 dark:text-gray-400">
            You haven't taken any exams yet.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((r) => (
            <div key={r._id} className="card">
              <div className="card-body flex flex-col md:flex-row justify-between items-start gap-6">

                {/* Result information */}
                <div className="flex-1 w-full min-w-0">

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {r.exam?.title}
                  </h3>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Score: {r.score}/{r.totalMarks} •{' '}
                    {r.percentage?.toFixed(1)}%
                  </p>

                  {/* Status */}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span
                      className={
                        r.passed
                          ? 'text-green-600 flex items-center gap-1'
                          : 'text-red-600 flex items-center gap-1'
                      }
                    >
                      {r.passed ? <FaCheckCircle /> : <FaTimesCircle />}
                      {r.passed ? 'Passed' : 'Failed'}
                    </span>

                    <span className="text-gray-500 dark:text-gray-400">
                      Status: {r.status}
                    </span>
                  </div>

                  {/* AI Feedback */}
                  {r.aiFeedback && (
                    <div className="mt-4 w-full rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4">

                      <h4 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white mb-3">
                        <FaRobot className="text-blue-500" />
                        AI Feedback
                      </h4>

                      <div className="text-sm leading-6 text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                        {r.aiFeedback}
                      </div>

                    </div>
                  )}

                </div>

                {/* Percentage + Certificate */}
                <div className="flex flex-col items-center gap-3 shrink-0">

                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold ${r.passed
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}
                  >
                    {r.percentage?.toFixed(0)}%
                  </div>

                  {r.passed && (
                    <button
                      onClick={() => downloadCertificate(r._id)}
                      className="btn-outline text-xs flex items-center gap-1"
                    >
                      <FaDownload />
                      Certificate
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