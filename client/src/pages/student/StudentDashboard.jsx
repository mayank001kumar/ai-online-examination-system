import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FaClock, FaPlay, FaCheckCircle, FaQrcode } from 'react-icons/fa';

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadExams = async () => {
    try {
      const res = await api.get('/student/exams');
      setExams(res.data.exams);
    } catch (err) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const joinByCode = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/student/exams/join', { accessCode: joinCode });
      navigate(`/exam/${res.data.exam._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    }
  };

  const startExam = (examId) => {
    navigate(`/exam/${examId}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome, {user?.name} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Your available exams</p>
        </div>
        <form onSubmit={joinByCode} className="flex gap-2">
          <input
            className="input w-40"
            placeholder="Exam code / QR"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button type="submit" className="btn-outline flex items-center gap-2">
            <FaQrcode /> Join
          </button>
        </form>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading exams...</p>
      ) : exams.length === 0 ? (
        <div className="card">
          <div className="card-body text-center text-gray-500">
            No exams assigned to you yet.
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => {
            const attempt = exam.attempt;
            const isCompleted = attempt && attempt.status !== 'in-progress';
            return (
              <div key={exam._id} className="card flex flex-col">
                <div className="card-body flex flex-col flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{exam.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{exam.description}</p>
                  <div className="flex items-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-1"><FaClock /> {exam.duration} min</span>
                    <span>{exam.totalMarks} marks</span>
                  </div>
                  {exam.settings?.adaptiveTesting && (
                    <span className="mt-2 inline-block px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                      🤖 Adaptive
                    </span>
                  )}
                  <div className="mt-auto pt-4">
                    {isCompleted ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <FaCheckCircle />
                        <span>Completed: {Math.round(attempt.percentage)}%</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => startExam(exam._id)}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                        disabled={!exam.isOpen}
                      >
                        <FaPlay />
                        {attempt?.status === 'in-progress' ? 'Resume Exam' : 'Start Exam'}
                      </button>
                    )}
                    {!exam.isOpen && (
                      <p className="text-xs text-red-500 mt-1">Exam is not currently open</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
