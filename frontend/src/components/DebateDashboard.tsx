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
}

const STORAGE_KEY_PREFIX = 'debateDashboard_';

const getStorageKey = (sources: Source[]): string => {
  // 使用sources数组生成唯一的存储key
  const sourcesHash = sources.map(s => s.url).join('|');
  return `${STORAGE_KEY_PREFIX}${sourcesHash}`;
};

const saveDebateData = (sources: Source[], data: DebateDashboardData) => {
  try {
    const key = getStorageKey(sources);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save debate data:', error);
  }
};

const loadDebateData = (sources: Source[]): DebateDashboardData | null => {
  try {
    const key = getStorageKey(sources);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load debate data:', error);
    return null;
  }
};

const DebateDashboard: React.FC<DebateDashboardProps> = ({ onBack, sources }) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'arguments' | 'summary'>('sources');
  
  // 论点整理相关状态
  const [proArguments, setProArguments] = useState<Argument[]>([]);
  const [conArguments, setConArguments] = useState<Argument[]>([]);
  const [proInputValue, setProInputValue] = useState('');
  const [conInputValue, setConInputValue] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // AI 摘要相关状态
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // 用 useRef 追踪 sources 哈希是否改变
  const sourcesHashRef = React.useRef<string>('');

  // 组件记载并响应sources的改变恢复数据
  useEffect(() => {
    const currentHash = getStorageKey(sources);
    
    // 如果 sources 发生真实改变（URL数组不同）
    if (sourcesHashRef.current !== currentHash) {
      sourcesHashRef.current = currentHash;
      const savedData = loadDebateData(sources);
      if (savedData) {
        setProArguments(savedData.proArguments);
        setConArguments(savedData.conArguments);
        setSummary(savedData.summary);
      } else {
        // 新的sources，清空旧数据
        setProArguments([]);
        setConArguments([]);
        setSummary(null);
      }
    }
  }, [sources]); // 当sources改变时检查并运行

  // 每当论点或摘要改变时保存到localStorage
  useEffect(() => {
    if (sources.length > 0) {
      saveDebateData(sources, {
        proArguments,
        conArguments,
        summary
      });
    }
  }, [proArguments, conArguments, summary, sources]);

  const truncateSnippet = (text: string | undefined, maxLength: number = 60): string | null => {
    if (!text || text.trim() === '') return null;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // 论点整理相关函数
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

  // AI 摘要相关函数
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

  // 论点行组件
  const ArgumentItem: React.FC<{ argument: Argument; side: 'pro' | 'con' }> = ({ argument, side }) => (
    <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#333] hover:border-[#444] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm text-white/80">{argument.content}</p>
          {argument.note && (
            <div className="mt-2 p-2 bg-[#0a0a0a] rounded border border-[#222] text-xs text-white/60">
              📝 {argument.note}
            </div>
          )}
        </div>
        <button
          onClick={() => deleteArgument(side, argument.id)}
          className="text-white/40 hover:text-red-400 transition-colors flex-shrink-0 text-sm"
          title="删除论点"
        >
          ✕
        </button>
      </div>
      
      {editingNoteId === argument.id ? (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={argument.note || ''}
            onChange={(e) => updateArgumentNote(side, argument.id, e.target.value)}
            placeholder="输入备注..."
            className="flex-1 px-2 py-1 bg-[#0a0a0a] border border-[#333] rounded text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/40"
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
          className="mt-2 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          {argument.note ? '编辑备注' : '添加备注'}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#222]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm"
        >
          ← 返回
        </button>
        <h1 className="text-lg font-semibold text-white">辩论工作台</h1>
        <span className="text-white/20 text-sm">{sources.length} 条资料</span>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-1 px-6 pt-4">
        {[
          { key: 'sources', label: '📚 资料索引' },
          { key: 'arguments', label: '📝 论点整理' },
          { key: 'summary', label: '🤖 AI 摘要' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-[#1a1a1a] text-white border border-[#333]'
                : 'text-white/40 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        {/* 资料索引 */}
        {activeTab === 'sources' && (
          <div>
            {sources.length === 0 ? (
              <div className="text-white/40 text-sm mt-8 text-center">
                暂无资料，请先在主页搜索一个辩题
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-2 max-w-4xl">
                {sources.map((source, index) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#333] hover:border-white/20 transition-all duration-200 group/source"
                  >
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm text-white/80 group-hover/source:text-white truncate font-medium">
                        {source.title || '无标题'}
                      </p>
                      {truncateSnippet(source.snippet || source.content) && (
                        <p className="text-xs text-white/50 truncate mt-1.5 italic">
                          {truncateSnippet(source.snippet || source.content)}
                        </p>
                      )}
                      <p className="text-xs text-white/30 truncate mt-1">
                        {source.url}
                      </p>
                    </div>
                    <span className="text-white/20 group-hover/source:text-white/60 text-xs mt-0.5">↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 论点整理 */}
        {activeTab === 'arguments' && (
          <div className="max-w-6xl mx-auto">
            {sources.length === 0 && (
              <div className="text-white/40 text-sm mt-8 text-center mb-8">
                💡 提示：请先在"资料索引"查看搜索结果，然后开始整理论点
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-6">
              {/* 正方论点 */}
              <div className="flex flex-col">
                <div className="mb-4 pb-3 border-b border-[#333]">
                  <h2 className="text-base font-semibold text-white mb-3">正方论点 ✓</h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={proInputValue}
                      onChange={(e) => setProInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addArgument('pro', proInputValue);
                        }
                      }}
                      placeholder="输入正方论点..."
                      className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors"
                    />
                    <button
                      onClick={() => addArgument('pro', proInputValue)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
                    >
                      添加
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {proArguments.length === 0 ? (
                    <div className="text-white/30 text-xs text-center py-8">
                      暂无论点
                    </div>
                  ) : (
                    proArguments.map(arg => (
                      <ArgumentItem key={arg.id} argument={arg} side="pro" />
                    ))
                  )}
                </div>
              </div>

              {/* 反方论点 */}
              <div className="flex flex-col">
                <div className="mb-4 pb-3 border-b border-[#333]">
                  <h2 className="text-base font-semibold text-white mb-3">反方论点 ✗</h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={conInputValue}
                      onChange={(e) => setConInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addArgument('con', conInputValue);
                        }
                      }}
                      placeholder="输入反方论点..."
                      className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors"
                    />
                    <button
                      onClick={() => addArgument('con', conInputValue)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
                    >
                      添加
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {conArguments.length === 0 ? (
                    <div className="text-white/30 text-xs text-center py-8">
                      暂无论点
                    </div>
                  ) : (
                    conArguments.map(arg => (
                      <ArgumentItem key={arg.id} argument={arg} side="con" />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI 摘要 */}
        {activeTab === 'summary' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <button
                onClick={generateSummary}
                disabled={summaryLoading}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  summaryLoading
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {summaryLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    生成中...
                  </span>
                ) : (
                  '✨ 生成辩论提纲'
                )}
              </button>
            </div>

            {summaryError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-6">
                ⚠️ {summaryError}
              </div>
            )}

            {summary && (
              <div className="p-4 rounded-lg bg-[#1a1a1a] border border-[#333]">
                <div 
                  className="prose prose-invert max-w-none text-sm text-white/80 leading-relaxed"
                  style={{
                    color: 'inherit',
                  }}
                >
                  {/* 简单的 markdown 渲染 */}
                  {summary.split('\n').map((line, idx) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={idx} className="text-xl font-bold text-white mt-4 mb-2">{line.substring(2)}</h1>;
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={idx} className="text-lg font-semibold text-white mt-3 mb-2">{line.substring(3)}</h2>;
                    }
                    if (line.startsWith('### ')) {
                      return <h3 key={idx} className="text-base font-semibold text-white/90 mt-2 mb-1">{line.substring(4)}</h3>;
                    }
                    if (line.startsWith('- ') || line.startsWith('• ')) {
                      return <li key={idx} className="ml-4 mt-1">{line.substring(2)}</li>;
                    }
                    if (line === '') {
                      return <div key={idx} className="h-2"></div>;
                    }
                    return <p key={idx} className="mt-1">{line}</p>;
                  })}
                </div>
              </div>
            )}

            {!summary && !summaryLoading && !summaryError && (
              <div className="text-white/40 text-sm text-center py-12">
                点击「生成辩论提纲」按钮开始生成 AI 摘要
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebateDashboard;