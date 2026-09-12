import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import useProctoring from '../../hooks/useProctoring';
import { FaBookmark, FaRegBookmark, FaCamera, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// Webcam face detection component (simplified - uses getUserMedia and reports to proctoring)
function WebcamMonitor({ attemptId, examId, enabled, settings }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { report } = useProctoring({ attemptId, examId, settings });
  const lastFaceTime = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        // Simple "face detected" simulation: interval that assumes face present
        // (Real implementation would use TensorFlow/face-api.js)
        const timer = setInterval(() => {
          if (document.hidden === false) {
            lastFaceTime.current = Date.now();
          } else {
            report('FACE_NOT_DETECTED', 'Face not detected (tab hidden)');
          }
        }, 10000);
        return () => clearInterval(timer);
      } catch (err) {
        report('FACE_NOT_DETECTED', 'Webcam access denied');
      }
    }
    start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <video
      ref={videoRef}
      muted
      playsInline
      className="w-32 h-24 rounded-lg border-2 border-primary-500 object-cover"
    />
  );
}

export default function ExamPortal() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [bookmarks, setBookmarks] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [camOn, setCamOn] = useState(false);
  const [questionTimes, setQuestionTimes] = useState({});
  const timerRef = useRef(null);
  const lastTickRef = useRef(Date.now());
  const savesInProgress = useRef(false);

  const { report } = useProctoring({
    attemptId: attempt?._id,
    examId,
    settings: exam?.settings,
    onFlagged: () => toast.error('Maximum violations reached! Exam will be submitted.'),
  });

  // Start / resume exam
  useEffect(() => {
    const start = async () => {
      try {
        const res = await api.get(`/student/exams/${examId}/start`);
        setExam(res.data.attempt?.exam || null);
        // We need exam settings - fetch exam separately
        setAttempt(res.data.attempt);
        setQuestions(res.data.questions);
        setTimeLeft(res.data.attempt.timeLeft || 0);

        // Rebuild answers from attempt
        const ansMap = {};
        const bmMap = {};
        const times = {};
        res.data.attempt.answers.forEach((a) => {
          if (a.questionId) {
            ansMap[a.questionId] =
              a.selectedIndex !== undefined ? a.selectedIndex : a.selectedOption || a.answerText || '';
            bmMap[a.questionId] = a.bookmarked;
            times[a.questionId] = a.timeSpent || 0;
          }
        });
        setAnswers(ansMap);
        setBookmarks(bmMap);
        setQuestionTimes(times);

        // Fetch exam details
        const examRes = await api.get(`/student/exams/${examId}/details`).catch(() => null);
        if (examRes?.data?.exam) setExam(examRes.data.exam);

        // Start camera if proctoring enabled
        if (res.data.attempt.exam?.settings?.proctoring?.webcam) {
          setCamOn(true);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to start exam');
        navigate('/student');
      } finally {
        setLoading(false);
      }
    };
    start();
  }, [examId]);

  // Timer
  useEffect(() => {
    if (!timeLeft || submitting || result) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [submitting, result]);

  const handleAutoSubmit = useCallback(async () => {
    if (!attempt || savesInProgress.current) return;
    savesInProgress.current = true;
    try {
      await api.post(`/student/attempts/${attempt._id}/auto-submit`, { mode: 'auto' });
      toast('Time expired. Exam auto-submitted!');
      navigate('/student/results');
    } catch (err) {
      toast.error('Auto-submit failed');
    }
  }, [attempt, navigate]);

  const saveAnswer = useCallback(
    async (questionId, value, selectedIndex) => {
      if (!attempt) return;
      const spent = Math.round((Date.now() - lastTickRef.current) / 1000) || 1;
      lastTickRef.current = Date.now();
      setQuestionTimes((qt) => ({ ...qt, [questionId]: (qt[questionId] || 0) + spent }));
      try {
        await api.post(`/student/attempts/${attempt._id}/answer`, {
          questionId,
          selectedIndex,
          selectedOption: value,
          timeSpent: spent,
          bookmarked: !!bookmarks[questionId],
        });
      } catch (err) {
        // silent - allow offline resume
      }
    },
    [attempt, bookmarks]
  );

  const toggleBookmark = (qid) => {
    setBookmarks((b) => {
      const updated = { ...b, [qid]: !b[qid] };
      // persist to server
      if (attempt) {
        api.post(`/student/attempts/${attempt._id}/progress`, {
          bookmarks: [{ questionId: qid, bookmarked: updated[qid] }],
        }).catch(() => {});
      }
      return updated;
    });
  };

  const selectAnswer = (qid, option, idx) => {
    setAnswers((a) => {
      const updated = { ...a, [qid]: option };
      saveAnswer(qid, option, idx);
      return updated;
    });
  };

  const savePosition = (idx) => {
    setCurrentIdx(idx);
    if (attempt) {
      api.post(`/student/attempts/${attempt._id}/progress`, {
        currentQuestion: idx,
        timeLeft,
      }).catch(() => {});
    }
  };

  // Autosave position every 30s (resume support)
  useEffect(() => {
    const interval = setInterval(() => {
      if (attempt && !submitting) {
        api.post(`/student/attempts/${attempt._id}/progress`, {
          currentQuestion: currentIdx,
          timeLeft,
        }).catch(() => {});
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [attempt, currentIdx, timeLeft, submitting]);

  const submitExam = async () => {
    if (!window.confirm('Are you sure you want to submit? You cannot change answers after submission.')) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/student/attempts/${attempt._id}/submit`, { mode: 'manual' });
      setResult(res.data.result);
      toast.success('Exam submitted successfully!');
      navigate('/student/results');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-lg text-gray-500">Loading exam...</p>
      </div>
    );
  }

  const q = questions[currentIdx];
  const answeredCount = questions.filter((que) => answers[que._id] !== undefined && answers[que._id] !== '').length;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="card mb-4">
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-red-600 font-bold text-2xl">
              <span className="bg-red-100 dark:bg-red-900 px-3 py-1 rounded-lg">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{exam?.title || 'Exam'}</h1>
              <p className="text-sm text-gray-500">
                Question {currentIdx + 1} of {questions.length} • {answeredCount} answered
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <WebcamMonitor
              attemptId={attempt?._id}
              examId={examId}
              enabled={camOn && exam?.settings?.proctoring?.webcam}
              settings={exam?.settings}
            />
            <button onClick={submitExam} disabled={submitting} className="btn-danger">
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        {/* Question area */}
        {q && (
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                  {q.topic} • {q.marks} marks • {q.difficulty}
                </span>
                <button
                  onClick={() => toggleBookmark(q._id)}
                  className="text-amber-500 hover:scale-110 transition-transform"
                  title="Bookmark"
                >
                  {bookmarks[q._id] ? <FaBookmark size={22} /> : <FaRegBookmark size={22} />}
                </button>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{q.text}</h2>

              {q.type === 'mcq' || q.type === 'true_false' ? (
                <div className="space-y-3">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectAnswer(q._id, opt, idx)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        answers[q._id] === opt
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                      }`}
                    >
                      <span className="inline-block w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-center leading-8 font-medium mr-3">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  className="input min-h-[160px]"
                  placeholder="Type your answer here..."
                  value={answers[q._id] || ''}
                  onChange={(e) => {
                    setAnswers((a) => ({ ...a, [q._id]: e.target.value }));
                    saveAnswer(q._id, e.target.value);
                  }}
                />
              )}

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => savePosition(Math.max(0, currentIdx - 1))}
                  disabled={currentIdx === 0}
                  className="btn-outline flex items-center gap-2"
                >
                  <FaChevronLeft /> Previous
                </button>
                <button
                  onClick={() => savePosition(Math.min(questions.length - 1, currentIdx + 1))}
                  disabled={currentIdx === questions.length - 1}
                  className="btn-primary flex items-center gap-2"
                >
                  Next <FaChevronRight />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question palette */}
        <div className="card h-fit lg:sticky lg:top-20">
          <div className="card-body">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Questions</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((que, idx) => (
                <button
                  key={que._id}
                  onClick={() => savePosition(idx)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors relative ${
                    idx === currentIdx
                      ? 'bg-primary-600 text-white'
                      : answers[que._id] !== undefined && answers[que._id] !== ''
                      ? 'bg-green-500 text-white'
                      : bookmarks[que._id]
                      ? 'bg-amber-400 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {idx + 1}
                  {bookmarks[que._id] && idx !== currentIdx && (
                    <span className="absolute -top-1 -right-1 text-amber-500 text-xs">★</span>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <p><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2" />Answered</p>
              <p><span className="inline-block w-3 h-3 bg-amber-400 rounded mr-2" />Bookmarked</p>
              <p><span className="inline-block w-3 h-3 bg-primary-600 rounded mr-2" />Current</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
