import React, { useState, useEffect } from 'react';
import { generateDebateSummary } from '../services/api';

interface Source {
  title: string;
  url: string;
  uri: string;
  author: string;
  image: string;
  snippet?: string;
  content?: string;
}

interface Argument {
  id: string;
  content: string;
  note?: string;
}

interface DebateDashboardData {
  proArguments: Argument[];
  conArguments: Argument[];
  summary: string | null;
}

interface DebateDashboardProps {
  onBack: () => void;
  sources: Source[];
  snippet?: string;
  sessionId: string | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const STORAGE_KEY_PREFIX = 'debateDashboard_';

const getStorageKey = (sessionId: string | null): string => {
  return sessionId ? `${STORAGE_KEY_PREFIX}${sessionId}` : `${STORAGE_KEY_PREFIX}temp`;
};

const saveDebateData = (sessionId: string | null, data: DebateDashboardData) => {
  try {
    localStorage.setItem(getStorageKey(sessionId), JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save debate data:', error);
  }
};

const loadDebateData = (sessionId: string | null): DebateDashboardData | null => {
  try {
    const data = localStorage.getItem(getStorageKey(sessionId));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load debate data:', error);
    return null;
  }
};

const DebateDashboard: React.FC<DebateDashboardProps> = ({ onBack, sources, sessionId, theme, onToggleTheme }) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'sources' | 'arguments' | 'summary'>('sources');
  const [proArguments, setProArguments] = useState<Argument[]>([]);
  const [conArguments, setConArguments] = useState<Argument[]>([]);
  const [proInputValue, setProInputValue] = useState('');
  const [conInputValue, setConInputValue] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const sessionIdRef = React.useRef<string | null>('__uninitialized__');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (sessionIdRef.current !== sessionId) {
      setIsLoaded(false);
      sessionIdRef.current = sessionId;
      const savedData = loadDebateData(sessionId);
      if (savedData) {
        setProArguments(savedData.proArguments || []);
        setConArguments(savedData.conArguments || []);
        setSummary(savedData.summary || null);
      } else {
        setProArguments([]);
        setConArguments([]);
        setSummary(null);
      }
      setIsLoaded(true);
    }
  }, [sessionId]);

  useEffect(() => {
    if (isLoaded) {
      saveDebateData(sessionId, { proArguments, conArguments, summary });
    }
  }, [proArguments, conArguments, summary, sessionId, isLoaded]);

  const addArgument = (side: 'pro' | 'con', content: string) => {
    if (!content.trim()) return;
    const newArgument: Argument = {
      id: Date.now().toString(),
      content: content.trim(),
      note: '',
    };

    if (side === 'pro') {
      setProArguments([...proArguments, newArgument]);
      setProInputValue('');
    } else {
      setConArguments([...conArguments, newArgument]);
      setConInputValue('');
    }
  };

  const deleteArgument = (side: 'pro' | 'con', id: string) => {
    if (side === 'pro') {
      setProArguments(proArguments.filter(arg => arg.id !== id));
    } else {
      setConArguments(conArguments.filter(arg => arg.id !== id));
    }
  };

  const updateArgumentNote = (side: 'pro' | 'con', id: string, note: string) => {
    if (side === 'pro') {
      setProArguments(proArguments.map(arg => arg.id === id ? { ...arg, note } : arg));
    } else {
      setConArguments(conArguments.map(arg => arg.id === id ? { ...arg, note } : arg));
    }
  };

  const generateSummary = async () => {
    if (sources.length === 0) {
      setSummaryError('请先搜索至少一条资料');
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);
    setSummary(null);

    try {
      const result = await generateDebateSummary({
        sources: sources.map(s => ({
          title: s.title,
          snippet: s.snippet || s.content,
        })),
        proArguments,
        conArguments,
      });
      setSummary(result.summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      setSummaryError('生成摘要失败，请稍后重试');
    } finally {
      setSummaryLoading(false);
    }
  };

  const shellClass = isDark
    ? 'bg-[linear-gradient(180deg,#0b1120_0%,#111827_54%,#0f172a_100%)] text-slate-100'
    : 'bg-[linear-gradient(180deg,#ece5d8_0%,#d8e1ea_58%,#f6f1e8_100%)] text-slate-900';
  const panelClass = isDark
    ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(30,41,59,0.92))] border border-slate-700/80 shadow-[0_28px_80px_rgba(2,6,23,0.35)]'
    : 'bg-[linear-gradient(180deg,rgba(245,238,226,0.94),rgba(214,224,234,0.92))] border border-white/80 shadow-[0_28px_80px_rgba(71,85,105,0.18)]';
  const subPanelClass = isDark
    ? 'bg-slate-900/65 border border-slate-700/70'
    : 'bg-white/65 border border-white/80';
  const inputClass = isDark
    ? 'bg-slate-950/70 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-amber-400'
    : 'bg-white/85 border-white/90 text-slate-800 placeholder:text-slate-400 focus:border-amber-300';

  const tabs = [
    { key: 'sources', label: '资料视图' },
    { key: 'arguments', label: '论点整理' },
    { key: 'summary', label: 'AI 摘要' },
  ] as const;

  const ArgumentItem: React.FC<{ argument: Argument; side: 'pro' | 'con' }> = ({ argument, side }) => (
    <div className={`rounded-[24px] p-4 ${subPanelClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className={`text-sm leading-6 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>{argument.content}</p>
          {argument.note && (
            <div className={`mt-3 rounded-2xl p-3 text-xs leading-5 ${isDark ? 'bg-slate-950/70 text-slate-300 border border-slate-800' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
              备注：{argument.note}
            </div>
          )}
        </div>
        <button
          onClick={() => deleteArgument(side, argument.id)}
          className={`text-sm transition-colors ${isDark ? 'text-slate-500 hover:text-rose-300' : 'text-slate-400 hover:text-rose-500'}`}
          title="删除论点"
        >
          ✕
        </button>
      </div>

      {editingNoteId === argument.id ? (
        <div className="mt-3">
          <input
            type="text"
            value={argument.note || ''}
            onChange={(e) => updateArgumentNote(side, argument.id, e.target.value)}
            placeholder="输入备注..."
            className={`w-full rounded-2xl border px-3 py-2 text-xs focus:outline-none ${inputClass}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditingNoteId(null);
              }
            }}
            onBlur={() => setEditingNoteId(null)}
          />
        </div>
      ) : (
        <button
          onClick={() => setEditingNoteId(argument.id)}
          className={`mt-3 text-xs transition-colors ${isDark ? 'text-amber-300 hover:text-amber-200' : 'text-amber-700 hover:text-amber-800'}`}
        >
          {argument.note ? '编辑备注' : '添加备注'}
        </button>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col ${shellClass}`}>
      <div className={`mx-5 mt-5 rounded-[30px] px-6 py-5 ${panelClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${isDark ? 'bg-slate-900/70 text-slate-300 hover:text-white' : 'bg-white/70 text-slate-600 hover:text-slate-900'}`}
            >
              返回探索页
            </button>
            <div>
              <h1 className={`text-xl font-semibold ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>辩论工作台</h1>
              <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm`}>{sources.length} 条资料已进入工作台</p>
            </div>
          </div>

          <button
            onClick={onToggleTheme}
            className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase ${isDark ? 'bg-slate-900/70 text-amber-300 border border-slate-700' : 'bg-white/70 text-amber-700 border border-white/80'}`}
          >
            {isDark ? '日间模式' : '夜间模式'}
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm transition-all ${
                activeTab === tab.key
                  ? isDark
                    ? 'bg-amber-400/15 border border-amber-400/30 text-amber-200'
                    : 'bg-amber-50 border border-amber-200 text-amber-700'
                  : isDark
                    ? 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:text-slate-100'
                    : 'bg-white/60 border border-white/80 text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 pb-6 pt-5 overflow-y-auto">
        {activeTab === 'sources' && (
          <div className={`max-w-6xl mx-auto rounded-[30px] p-6 ${panelClass}`}>
            {sources.length === 0 ? (
              <div className={`text-center py-20 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                暂无资料，请先回到主页面发起搜索。
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sources.map((source, index) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`rounded-[24px] p-5 transition-all duration-200 ${subPanelClass} ${isDark ? 'hover:border-amber-400/35' : 'hover:border-amber-200'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold leading-6 ${isDark ? 'text-stone-100' : 'text-slate-800'}`}>{source.title || '无标题'}</p>
                        <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{source.snippet || source.content || '暂无摘要'}</p>
                        <p className={`mt-3 text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{source.url}</p>
                      </div>
                      <span className={`${isDark ? 'text-amber-300' : 'text-amber-700'} text-sm`}>↗</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'arguments' && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-5">
            {[
              { key: 'pro', title: '正方论点', value: proInputValue, setValue: setProInputValue, items: proArguments, accent: isDark ? 'text-amber-300' : 'text-amber-700' },
              { key: 'con', title: '反方论点', value: conInputValue, setValue: setConInputValue, items: conArguments, accent: isDark ? 'text-sky-300' : 'text-sky-700' },
            ].map(section => (
              <div key={section.key} className={`rounded-[30px] p-6 ${panelClass}`}>
                <div className="flex items-center justify-between gap-4">
                  <h2 className={`text-lg font-semibold ${section.accent}`}>{section.title}</h2>
                  <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{section.items.length} 条</span>
                </div>

                <div className="mt-5 flex gap-3">
                  <input
                    type="text"
                    value={section.value}
                    onChange={(e) => section.setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addArgument(section.key as 'pro' | 'con', section.value);
                      }
                    }}
                    placeholder={`输入${section.title}...`}
                    className={`flex-1 rounded-[22px] border px-4 py-3 text-sm focus:outline-none ${inputClass}`}
                  />
                  <button
                    onClick={() => addArgument(section.key as 'pro' | 'con', section.value)}
                    className="rounded-[22px] bg-gradient-to-r from-amber-500 via-orange-400 to-sky-500 px-5 py-3 text-sm font-semibold text-white hover:brightness-105"
                  >
                    添加
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {section.items.length === 0 ? (
                    <div className={`rounded-[24px] p-8 text-center ${subPanelClass} ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>暂无论点</div>
                  ) : (
                    section.items.map(argument => (
                      <ArgumentItem key={argument.id} argument={argument} side={section.key as 'pro' | 'con'} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className={`max-w-5xl mx-auto rounded-[30px] p-6 ${panelClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>AI 辩论摘要</h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>根据资料与正反论点生成更方便审阅的提纲。</p>
              </div>
              <button
                onClick={generateSummary}
                disabled={summaryLoading}
                className={`rounded-[22px] px-5 py-3 text-sm font-semibold text-white ${summaryLoading ? 'bg-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 via-orange-400 to-sky-500 hover:brightness-105'}`}
              >
                {summaryLoading ? '生成中...' : '生成辩论提纲'}
              </button>
            </div>

            {summaryError && (
              <div className={`mt-5 rounded-[24px] p-4 text-sm ${isDark ? 'bg-rose-950/40 border border-rose-700/40 text-rose-200' : 'bg-rose-50 border border-rose-200 text-rose-600'}`}>
                {summaryError}
              </div>
            )}

            {summary && (
              <div className={`mt-6 rounded-[26px] p-6 ${subPanelClass}`}>
                <div className={`prose max-w-none ${isDark ? 'prose-invert' : 'prose-slate'}`}>
                  {summary.split('\n').map((line, idx) => {
                    if (line.startsWith('# ')) return <h1 key={idx}>{line.substring(2)}</h1>;
                    if (line.startsWith('## ')) return <h2 key={idx}>{line.substring(3)}</h2>;
                    if (line.startsWith('### ')) return <h3 key={idx}>{line.substring(4)}</h3>;
                    if (line.startsWith('- ') || line.startsWith('• ')) return <li key={idx}>{line.substring(2)}</li>;
                    if (line === '') return <div key={idx} className="h-2" />;
                    return <p key={idx}>{line}</p>;
                  })}
                </div>
              </div>
            )}

            {!summary && !summaryLoading && !summaryError && (
              <div className={`mt-10 rounded-[24px] p-10 text-center ${subPanelClass} ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                点击“生成辩论提纲”开始整理内容。
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebateDashboard;
