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
    onLoginClick
}) => {
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
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar container */}
            <div
                className={`fixed top-0 left-0 h-full cyber-glass border-r border-white/5 flex flex-col z-50 transition-transform duration-300 w-64 ${isOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full'
                    }`}
            >
                <div className="p-4 flex items-center justify-between gap-2 border-b border-white/5">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-all hidden md:block"
                        title="Close Sidebar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    </button>
                    {onGoToDashboard && (
                        <button
                            onClick={onGoToDashboard}
                            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-all"
                            title="Dashboard"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={onNewSession}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#ffffff]/90 text-black hover:bg-white transition-all duration-200 text-sm font-medium shadow-[0_0_15px_rgba(255,255,255,0.1)] whitespace-nowrap"
                    >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        New Journey
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 custom-scrollbar">
                    <div className="px-3 pb-2 pt-2 text-[10px] font-semibold text-white/30 tracking-widest uppercase mb-1">
                        History
                    </div>
                    {sessions.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-white/20 text-center italic">
                            No previous journeys yet.
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => editingId !== session.id && onSelectSession(session)}
                                className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${currentSessionId === session.id
                                    ? 'bg-white/10 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] border border-white/10'
                                    : 'text-white/40 hover:bg-white/5 hover:text-white/80 cursor-pointer'
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
                                        className="flex-1 bg-transparent border-none focus:outline-none text-sm font-light text-white w-full"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <>
                                        <div className="flex-1 truncate text-sm font-light">
                                            {session.query || 'Untitled Journey'}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleStartEdit(e, session)}
                                                className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white"
                                                title="Rename session"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => onDeleteSession(e, session.id)}
                                                className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-red-400"
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
<div className="p-3 border-t border-[#222] flex flex-col gap-1">
    <button
        onClick={onImportClick}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[#111111] text-white/60 hover:text-white transition-all duration-200 text-sm font-light"
    >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
        Import JSON
    </button>

    <button
        onClick={onExportClick}
        disabled={!showExport}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-light ${showExport
            ? 'hover:bg-[#111111] text-white/60 hover:text-white'
            : 'text-white/20 cursor-not-allowed hidden'
            }`}
    >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 8l5-5 5 5M12 3v12" />
        </svg>
        Export JSON
    </button>
</div>

                <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                    {user ? (
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00f2ff] to-[#7000ff] flex items-center justify-center text-white text-xs font-bold shadow-[0_0_10px_rgba(0,242,255,0.3)]">
                                    {user.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-medium text-white/80 truncate">
                                        {user.username}
                                    </span>
                                    <span className="text-[10px] text-white/30 truncate">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200"
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
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 text-sm font-medium"
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
