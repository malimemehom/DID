import React, { useState } from 'react';
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
}

function App() {
  const [currentPage, setCurrentPage] = useState('search');
  const [collectedSources, setCollectedSources] = useState<Source[]>([]);

  const handleAddSources = (newSources: Source[]) => {
    setCollectedSources(prev => {
      const existingUrls = new Set(prev.map(s => s.url));
      const filtered = newSources.filter(s => !existingUrls.has(s.url));
      return [...prev, ...filtered];
    });
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#050505]">

        {/* SearchView 始终存在，只是隐藏/显示 */}
        <div style={{ display: currentPage === 'search' ? 'block' : 'none' }}>
          <SearchView
            onGoToDashboard={() => setCurrentPage('dashboard')}
            onAddSources={handleAddSources}
          />
        </div>

        {/* 工作台页面 */}
        {currentPage === 'dashboard' && (
          <DebateDashboard
            onBack={() => setCurrentPage('search')}
            sources={collectedSources}
          />
        )}

      </div>
    </AuthProvider>
  );
}

export default App;