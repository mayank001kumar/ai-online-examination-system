import { useEffect, useRef } from 'react';
import api from '../api/client';

// Custom hook for exam proctoring security features
export default function useProctoring({ attemptId, examId, settings, onFlagged }) {
  const violationsRef = useRef(0);
  const maxViolations = settings?.proctoring?.maxViolations || 5;

  const report = async (event, detail) => {
    violationsRef.current += 1;
    try {
      await api.post(`/student/attempts/${attemptId}/proctoring`, {
        event,
        detail,
      });
    } catch {}
    // Also log at user level
    try {
      await api.post('/proctoring/event', {
        examId,
        event,
        detail,
        metadata: { attemptId },
      });
    } catch {}
    if (violationsRef.current >= maxViolations && onFlagged) {
      onFlagged();
    }
  };

  useEffect(() => {
    if (!attemptId) return;

    // Tab switch detection
    const handleVisibility = () => {
      if (document.hidden) {
        report('TAB_SWITCH', 'Student switched tabs');
      }
    };

    // Copy-paste blocking
    const blockCopy = (e) => {
      e.preventDefault();
      report('COPY_PASTE', 'Copy/paste attempted');
    };
    const blockContext = (e) => e.preventDefault();

    // Fullscreen enforcement
    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        report('FULLSCREEN_EXIT', 'Student exited fullscreen');
        if (settings?.proctoring?.enforceFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      }
    };

    // Prevent right-click/copy
    document.addEventListener('copy', blockCopy);
    document.addEventListener('paste', blockCopy);
    document.addEventListener('cut', blockCopy);
    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreen);

    // Block keyboard shortcuts
    const blockKeys = (e) => {
      const blocked = e.ctrlKey && ['c', 'v', 'x', 'a', 'p', 's'].includes(e.key.toLowerCase());
      if (blocked) {
        e.preventDefault();
        report('COPY_PASTE', 'Keyboard shortcut blocked');
      }
    };
    document.addEventListener('keydown', blockKeys);

    return () => {
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('paste', blockCopy);
      document.removeEventListener('cut', blockCopy);
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreen);
      document.removeEventListener('keydown', blockKeys);
    };
  }, [attemptId]);

  return { report };
}
