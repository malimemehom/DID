import React, { useState, useRef, useEffect } from 'react';
import { HistorySession } from '../services/history';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
    sessions: HistorySession[];
    currentSessionId: string | null;
    onSelectSession: (session: HistorySession) => void;
    onNewSession: () => void;
    onDeleteSession: (e: React.MouseEvent, id: string) => void;
    onRenameSession: (id: string, newName: string) => void;
    onImportClick: () => void;
    onExportClick: () => void;
    onGoToDashboard?: () => void;
    showExport: boolean;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onLoginClick?: () => void;
    theme?: 'light' | 'dark';
}

export const Sidebar: React.FC<SidebarProps> = ({
    sessions,
    currentSessionId,
    onSelectSession,
    onNewSession,
    onDeleteSession,
    onRenameSession,
    onImportClick,
    onExportClick,
    onGoToDashboard,
    showExport,
    isOpen,
    setIsOpen,
    onLoginClick,
    theme = 'dark'
}) => {
    const isDark = theme === 'dark';
    const { user, logout } = useAuth();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingId]);

    const handleStartEdit = (e: React.MouseEvent, session: HistorySession) => {
        e.stopPropagation();
        setEditingId(session.id);
        setEditName(session.query || 'Untitled Journey');
    };

    const handleSaveEdit = (id: string) => {
        if (editName.trim()) {
            onRenameSession(id, editName.trim());
        }
        setEditingId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter') handleSaveEdit(id);
        if (e.key === 'Escape') setEditingId(null);
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar container */}
            <div
                    className={`fixed top-0 left-0 h-full border-r flex flex-col z-50 transition-transform duration-300 w-72 ${isDark ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] border-slate-700/80 text-slate-100' : 'soft-panel border-white/50'
                        } ${isOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full'
                    }`}
            >
                <div className="p-4 flex items-center justify-between gap-2 border-b border-slate-200/70">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white/70 rounded-xl transition-all hidden md:block"
                        title="Close Sidebar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    </button>
                    {onGoToDashboard && (
                        <button
                            onClick={onGoToDashboard}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white/70 rounded-xl transition-all"
                            title="Dashboard"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={onNewSession}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 text-white hover:brightness-105 transition-all duration-200 text-sm font-semibold shadow-[0_18px_40px_rgba(56,189,248,0.22)] whitespace-nowrap"
                    >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        New Journey
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 custom-scrollbar">
                    <div className="px-3 pb-2 pt-3 text-[10px] font-semibold text-slate-400 tracking-[0.24em] uppercase mb-1">
                        History
                    </div>
                    {sessions.length === 0 ? (
                        <div className="px-3 py-6 text-sm text-slate-400 text-center">
                            No previous journeys yet.
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => editingId !== session.id && onSelectSession(session)}
                                className={`w-full group flex items-center gap-3 px-3 py-3 rounded-2xl text-sm transition-all duration-200 border ${currentSessionId === session.id
                                    ? 'bg-white/80 text-slate-900 shadow-[0_18px_40px_rgba(148,163,184,0.15)] border-white/80'
                                    : 'text-slate-500 border-transparent hover:bg-white/65 hover:border-white/70 hover:text-slate-800 cursor-pointer'
                                    }`}
                            >
                                {editingId === session.id ? (
                                    <input
                                        ref={editInputRef}
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={() => handleSaveEdit(session.id)}
                                        onKeyDown={(e) => handleKeyDown(e, session.id)}
                                        className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-slate-800 w-full"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <>
                                        <div className="flex-1 truncate text-sm font-medium">
                                            {session.query || 'Untitled Journey'}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleStartEdit(e, session)}
                                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
                                                title="Rename session"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => onDeleteSession(e, session.id)}
                                                className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors text-slate-400 hover:text-rose-500"
                                                title="Delete session"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>

               {/* Bottom Actions */}
<div className="p-3 border-t border-slate-200/70 flex flex-col gap-1.5">
    <button
        onClick={onImportClick}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-white/70 text-slate-500 hover:text-slate-800 transition-all duration-200 text-sm font-medium"
    >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
        Import JSON
    </button>

    <button
        onClick={onExportClick}
        disabled={!showExport}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all duration-200 text-sm font-medium ${showExport
            ? 'hover:bg-white/70 text-slate-500 hover:text-slate-800'
            : 'text-slate-300 cursor-not-allowed hidden'
            }`}
    >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 8l5-5 5 5M12 3v12" />
        </svg>
        Export JSON
    </button>
</div>

                <div className="p-4 border-t border-slate-200/70 bg-white/30">
                    {user ? (
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-400 to-cyan-300 flex items-center justify-center text-white text-xs font-bold shadow-[0_12px_30px_rgba(56,189,248,0.28)]">
                                    {user.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-semibold text-slate-800 truncate">
                                        {user.username}
                                    </span>
                                    <span className="text-[11px] text-slate-500 truncate">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200"
                                title="Sign Out"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onLoginClick}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/70 border border-white/80 text-slate-700 hover:bg-white hover:text-slate-900 transition-all duration-200 text-sm font-semibold"
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default Sidebar;
