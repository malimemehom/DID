import React, { useState } from 'react';
import SearchView from './components/SearchView';
import DebateDashboard from './components/DebateDashboard';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = useState('search');

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#050505]">
        {currentPage === 'search' ? (
          <SearchView onGoToDashboard={() => setCurrentPage('dashboard')} />
        ) : (
          <DebateDashboard onBack={() => setCurrentPage('search')} />
        )}
      </div>
    </AuthProvider>
  );
}

export default App;