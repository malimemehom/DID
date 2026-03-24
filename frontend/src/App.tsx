import React, { useState, useCallback } from 'react';
import SearchView from './components/SearchView';
import DebateDashboard from './components/DebateDashboard';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

interface Source {
  title: string;
  url: string;
  uri: string;
  author: string;
  image: string;
  snippet?: string;
}

function App() {
  const [currentPage, setCurrentPage] = useState('search');
  const [collectedSources, setCollectedSources] = useState<Source[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const handleUpdateDebateInfo = useCallback((sources: Source[], sessionId: string | null) => {
    setCollectedSources(sources);
    setCurrentSessionId(sessionId);
  }, []);

  return (
    <AuthProvider>
      <div className={`min-h-screen ${theme === 'dark' ? 'theme-dark text-slate-100' : 'theme-light text-slate-900'}`}>

        {/* SearchView 始终存在，只是隐藏/显示 */}
        <div style={{ display: currentPage === 'search' ? 'block' : 'none' }}>
          <SearchView
            onGoToDashboard={() => setCurrentPage('dashboard')}
            onUpdateDebateInfo={handleUpdateDebateInfo}
            theme={theme}
            onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          />
        </div>

        {/* 工作台页面 */}
        {currentPage === 'dashboard' && (
          <DebateDashboard
            onBack={() => setCurrentPage('search')}
            sources={collectedSources}
            sessionId={currentSessionId}
            theme={theme}
            onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          />
        )}

      </div>
    </AuthProvider>
  );
}

export default App;
