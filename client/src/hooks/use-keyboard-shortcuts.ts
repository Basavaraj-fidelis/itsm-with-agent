
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger shortcuts when not typing in input fields
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (event.target as HTMLElement).tagName
      );
      
      if (isInputActive) return;

      // Check for Ctrl/Cmd + key combinations
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            // Open command palette or search
            console.log('Search shortcut triggered');
            break;
          case '1':
            event.preventDefault();
            navigate('/dashboard');
            break;
          case '2':
            event.preventDefault();
            navigate('/tickets');
            break;
          case '3':
            event.preventDefault();
            navigate('/knowledge');
            break;
          case '4':
            event.preventDefault();
            navigate('/users');
            break;
          case '5':
            event.preventDefault();
            navigate('/reports');
            break;
          case 'n':
            event.preventDefault();
            // Navigate to new ticket creation
            navigate('/tickets?new=true');
            break;
        }
      }

      // Global shortcuts without modifiers
      switch (event.key) {
        case 'Escape':
          // Close modals, clear selections, etc.
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && activeElement.blur) {
            activeElement.blur();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return {
    shortcuts: [
      { key: 'Ctrl+1', description: 'Go to Dashboard' },
      { key: 'Ctrl+2', description: 'Go to Tickets' },
      { key: 'Ctrl+3', description: 'Go to Knowledge Base' },
      { key: 'Ctrl+4', description: 'Go to Users' },
      { key: 'Ctrl+5', description: 'Go to Reports' },
      { key: 'Ctrl+N', description: 'New Ticket' },
      { key: 'Ctrl+K', description: 'Search' },
      { key: 'Esc', description: 'Close/Clear' },
    ]
  };
}
