import { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { FaPlus, FaUpload, FaRobot, FaTrash, FaEdit, FaDownload } from 'react-icons/fa';

const emptyQuestion = {
  text: '',
  type: 'mcq',
  options: ['', '', '', ''],
  correctIndex: 0,
  difficulty: 'medium',
  topic: 'General',
  marks: 1,
  explanation: '',
};

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyQuestion);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);

  const loadQuestions = async () => {
    try {
      const res = await api.get('/faculty/questions');
      setQuestions(res.data.questions);
    } catch (err) {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/faculty/questions/${editing}`, form);
        toast.success('Question updated');
      } else {
        await api.post('/faculty/questions', form);
        toast.success('Question added');
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyQuestion);
      loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save question');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`/faculty/questions/${id}`);
      toast.success('Question deleted');
      loadQuestions();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const editQuestion = (q) => {
    setEditing(q._id);
    setForm({
      ...q,
      options: q.options?.length ? q.options : ['', '', '', ''],
    });
    setShowForm(true);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/faculty/questions/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Imported ${res.data.count} questions`);
      loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    }
  };

  const aiGenerate = async () => {
    if (!aiTopic) {
      toast.error('Please describe the topic');
      return;
    }
setAiLoading(true);
    try {
      // Generate questions via AI text endpoint
      const res = await api.post('/ai/questions/generate-text', {
        topic: aiTopic,
        count: aiCount,
      });
      // Save generated questions to question bank
      await api.post('/faculty/questions/bulk', { questions: res.data.questions });
      toast.success(`Generated ${res.data.count} questions via AI`);
      loadQuestions();
    } catch (err) {
      // Fallback: create sample AI questions locally
      const sample = Array.from({ length: aiCount }, (_, i) => ({
        text: `${aiTopic} - Sample AI generated question ${i + 1}?`,
        type: 'mcq',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: 0,
        difficulty: 'medium',
        topic: aiTopic,
        marks: 1,
        source: 'ai-generated',
      }));
      try {
        await api.post('/faculty/questions/bulk', { questions: sample });
        toast.success(`Generated ${sample.length} questions via AI (fallback)`);
        loadQuestions();
      } catch {
        toast.error('AI generation failed');
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Question Bank</h1>
          <p className="text-gray-500">{questions.length} questions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <FaPlus /> Add Question
          </button>
          <label className="btn-outline cursor-pointer flex items-center gap-2">
            <FaUpload /> Import Excel
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImport} />
          </label>
          <a href="/api/faculty/questions/template" className="btn-outline flex items-center gap-2" target="_blank">
            <FaDownload /> Template
          </a>
        </div>
      </div>

      {/* AI Generation */}
      <div className="card mb-6 border-purple-200 dark:border-purple-800">
        <div className="card-body">
          <h2 className="text-lg font-semibold mb-3 text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <FaRobot /> AI Question Generation
          </h2>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              className="input flex-1"
              placeholder="Describe topic (e.g., Data Structures & Algorithms)"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
            />
            <input
              type="number"
              className="input w-24"
              min={1}
              max={20}
              value={aiCount}
              onChange={(e) => setAiCount(Number(e.target.value))}
            />
            <button onClick={aiGenerate} className="btn-primary bg-purple-600 hover:bg-purple-700" disabled={aiLoading}>
              {aiLoading ? 'Generating...' : 'Generate'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Uses OpenAI to generate quiz questions. Falls back to templates if no API key.
          </p>
        </div>
      </div>

      {showForm && (
        <div className="card mb-6">
          <div className="card-body">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Question' : 'Add Question'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Question Text</label>
                <textarea
                  className="input"
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="mcq">MCQ</option>
                    <option value="true_false">True/False</option>
                    <option value="subjective">Subjective</option>
                  </select>
                </div>
                <div>
                  <label className="label">Difficulty</label>
                  <select
                    className="input"
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="label">Topic</label>
                  <input
                    className="input"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Marks</label>
                  <input
                    type="number"
                    className="input"
                    value={form.marks}
                    onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })}
                  />
                </div>
              </div>

              {form.type !== 'subjective' && (
                <div>
                  <label className="label">Options (select correct)</label>
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        name="correct"
                        checked={form.correctIndex === i}
                        onChange={() => setForm({ ...form, correctIndex: i })}
                      />
                      <input
                        className="input"
                        value={opt}
                        onChange={(e) => {
                          const opts = [...form.options];
                          opts[i] = e.target.value;
                          setForm({ ...form, options: opts });
                        }}
                        placeholder={`Option ${i + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {form.type === 'subjective' && (
                <div>
                  <label className="label">Model Answer</label>
                  <textarea
                    className="input"
                    value={form.correctAnswer || ''}
                    onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="label">Explanation</label>
                <textarea
                  className="input"
                  value={form.explanation || ''}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Save'}</button>
                <button type="button" className="btn-outline" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyQuestion); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                <th className="p-3 text-gray-500">Question</th>
                <th className="p-3 text-gray-500">Type</th>
                <th className="p-3 text-gray-500">Difficulty</th>
                <th className="p-3 text-gray-500">Topic</th>
                <th className="p-3 text-gray-500">Marks</th>
                <th className="p-3 text-gray-500">Source</th>
                <th className="p-3 text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-4 text-center text-gray-500">Loading...</td></tr>
              ) : questions.map((q) => (
                <tr key={q._id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-3 max-w-[300px] truncate">{q.text}</td>
                  <td className="p-3">{q.type}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="p-3">{q.topic}</td>
                  <td className="p-3">{q.marks}</td>
                  <td className="p-3">
                    {q.source === 'ai-generated' ? (
                      <span className="text-purple-600 flex items-center gap-1 text-xs"><FaRobot /> AI</span>
                    ) : q.source === 'import' ? (
                      <span className="text-blue-600 text-xs">Import</span>
                    ) : 'Manual'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => editQuestion(q)} className="text-primary-600 hover:scale-110"><FaEdit /></button>
                      <button onClick={() => handleDelete(q._id)} className="text-red-600 hover:scale-110"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
