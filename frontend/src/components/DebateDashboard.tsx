import React, { useState } from 'react';

interface DebateDashboardProps {
  onBack: () => void;
}

const DebateDashboard: React.FC<DebateDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'arguments' | 'summary'>('sources');

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
          <div className="text-white/40 text-sm mt-8 text-center">
            暂无资料，请先在主页搜索一个辩题
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