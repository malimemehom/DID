import React, { useState } from 'react';

interface Source {
  title: string;
  url: string;
  uri: string;
  author: string;
  image: string;
  snippet?: string;
  content?: string;
}

interface DebateDashboardProps {
  onBack: () => void;
  sources: Source[];
}

const DebateDashboard: React.FC<DebateDashboardProps> = ({ onBack, sources }) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'arguments' | 'summary'>('sources');

  const truncateSnippet = (text: string | undefined, maxLength: number = 60): string | null => {
    if (!text || text.trim() === '') return null;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

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
      <div className="flex-1 px-6 py-4">
        {/* 资料索引 */}
        {activeTab === 'sources' && (
          <div>
            {sources.length === 0 ? (
              <div className="text-white/40 text-sm mt-8 text-center">
                暂无资料，请先在主页搜索一个辩题
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
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
          <div className="text-white/40 text-sm mt-8 text-center">
            论点整理功能即将上线
          </div>
        )}

        {/* AI 摘要 */}
        {activeTab === 'summary' && (
          <div className="text-white/40 text-sm mt-8 text-center">
            AI 摘要功能即将上线
          </div>
        )}
      </div>
    </div>
  );
};

export default DebateDashboard;