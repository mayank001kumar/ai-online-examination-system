import { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { FaPlus, FaTrash, FaPlay, FaUsers, FaDownload, FaEnvelope } from 'react-icons/fa';

export default function ExamBuilder() {
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    duration: 30,
    passMarks: 33,
    questionIds: [],
    settings: {
      randomizeQuestions: true,
      randomizeOptions: true,
      allowResume: true,
      autoSubmit: true,
      adaptiveTesting: false,
      aiFeedback: true,
      proctoring: {
        webcam: true,
        faceDetection: true,
        tabSwitchDetection: true,
        enforceFullscreen: true,
        blockCopyPaste: true,
        maxViolations: 5,
      },
    },
  });

  const loadData = async () => {
    try {
      const [examsRes, qRes, sRes] = await Promise.all([
        api.get('/faculty/exams'),
        api.get('/faculty/questions'),
        api.get('/faculty/students'),
      ]);
      setExams(examsRes.data.exams);
      setQuestions(qRes.data.questions);
      setStudents(sRes.data.students);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleQuestion = (qid) => {
    setForm((f) => ({
      ...f,
      questionIds: f.questionIds.includes(qid)
        ? f.questionIds.filter((id) => id !== qid)
        : [...f.questionIds, qid],
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const totalMarks = questions
        .filter((q) => form.questionIds.includes(q._id))
        .reduce((s, q) => s + (q.marks || 1), 0);
      await api.post('/faculty/exams', { ...form, totalMarks });
      toast.success('Exam created!');
      setShowForm(false);
      setForm({ ...form, title: '', description: '', mode: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create exam');
    }
  };

  const publish = async (id) => {
    try {
      await api.post(`/faculty/exams/${id}/publish`);
      toast.success('Exam published');
      loadData();
    } catch (err) {
      toast.error('Failed to publish');
    }
  };

  const deleteExam = async (id) => {
    if (!window.confirm('Delete this exam?')) return;
    try {
      await api.delete(`/faculty/exams/${id}`);
      toast.success('Exam deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const viewResults = (id) => {
    setSelectedExam(id);
  };

  const exportResults = (id) => {
    window.open(`${import.meta.env.VITE_API_URL || '/api'}/faculty/exams/${id}/export-results?token=${localStorage.getItem('token')}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exam Management</h1>
          <p className="text-gray-500">{exams.length} exams</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <FaPlus /> Create Exam
        </button>
      </div>

      {showForm && (
        <div className="card mb-8">
          <div className="card-body">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create New Exam</h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Exam Title</label>
                  <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Duration (minutes)</label>
                  <input type="number" className="input" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Pass Marks (%)</label>
                  <input type="number" className="input" value={form.passMarks} onChange={(e) => setForm({ ...form, passMarks: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="label">Select Questions ({form.questionIds.length} selected)</label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
                  {questions.map((q) => (
                    <label key={q._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.questionIds.includes(q._id)}
                        onChange={() => toggleQuestion(q._id)}
                      />
                      <span className="text-sm truncate">{q.text}</span>
                      <span className="ml-auto text-xs text-gray-500">{q.topic} • {q.marks}m</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label font-semibold mb-2">Exam Settings</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ['randomizeQuestions', 'Randomize Questions'],
                    ['randomizeOptions', 'Randomize Options'],
                    ['allowResume', 'Allow Resume'],
                    ['autoSubmit', 'Auto Submit'],
                    ['adaptiveTesting', 'Adaptive Testing'],
                    ['aiFeedback', 'AI Feedback'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.settings[key]}
                        onChange={(e) => setForm({ ...form, settings: { ...form.settings, [key]: e.target.checked } })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label font-semibold mb-2">Proctoring</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ['webcam', 'Webcam Monitoring'],
                    ['faceDetection', 'Face Detection'],
                    ['tabSwitchDetection', 'Tab Switch Detection'],
                    ['enforceFullscreen', 'Enforce Fullscreen'],
                    ['blockCopyPaste', 'Block Copy/Paste'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.settings.proctoring[key]}
                        onChange={(e) => setForm({ ...form, settings: { ...form.settings, proctoring: { ...form.settings.proctoring, [key]: e.target.checked } } })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Create Exam</button>
                <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : exams.map((exam) => (
          <div key={exam._id} className="card">
            <div className="card-body">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{exam.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  exam.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {exam.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{exam.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300 mb-4">
                <span>{exam.questionIds?.length} questions</span>
                <span>{exam.duration} min</span>
                <span>{exam.totalMarks} marks</span>
                <span>Code: <strong>{exam.accessCode}</strong></span>
              </div>
              {exam.settings?.adaptiveTesting && (
                <span className="inline-block mb-3 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                  🤖 Adaptive
                </span>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {!exam.isPublished && (
                  <button onClick={() => publish(exam._id)} className="btn-primary text-sm flex items-center gap-1">
                    <FaPlay /> Publish
                  </button>
                )}
                <button onClick={() => viewResults(exam._id)} className="btn-outline text-sm">Results</button>
                <button onClick={() => exportResults(exam._id)} className="btn-outline text-sm flex items-center gap-1">
                  <FaDownload /> Export
                </button>
                <button onClick={() => deleteExam(exam._id)} className="btn-danger text-sm flex items-center gap-1">
                  <FaTrash /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
