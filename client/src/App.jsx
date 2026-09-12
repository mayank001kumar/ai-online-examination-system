import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOtp from './pages/auth/VerifyOtp';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import StudentDashboard from './pages/student/StudentDashboard';
import ExamPortal from './pages/student/ExamPortal';
import Results from './pages/student/Results';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import QuestionBank from './pages/faculty/QuestionBank';
import ExamBuilder from './pages/faculty/ExamBuilder';
import Analytics from './pages/faculty/Analytics';
import { useTheme } from './context/ThemeContext';
import { FaMoon, FaSun } from 'react-icons/fa';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}`} />;
  return children;
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="fixed bottom-5 right-5 z-50 p-3 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700"
      title="Toggle theme"
    >
      {dark ? <FaSun /> : <FaMoon />}
    </button>
  );
}

function RedirectHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <Navigate to={`/${user.role}`} />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<RedirectHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Student */}
        <Route
          path="/student"
          element={
            <ProtectedRoute roles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam/:examId"
          element={
            <ProtectedRoute roles={['student']}>
              <ExamPortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/results"
          element={
            <ProtectedRoute roles={['student']}>
              <Results />
            </ProtectedRoute>
          }
        />

        {/* Faculty */}
        <Route
          path="/faculty"
          element={
            <ProtectedRoute roles={['faculty', 'admin']}>
              <FacultyDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/questions"
          element={
            <ProtectedRoute roles={['faculty', 'admin']}>
              <QuestionBank />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/exams"
          element={
            <ProtectedRoute roles={['faculty', 'admin']}>
              <ExamBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/analytics"
          element={
            <ProtectedRoute roles={['faculty', 'admin']}>
              <Analytics />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <ThemeToggle />
    </>
  );
}
