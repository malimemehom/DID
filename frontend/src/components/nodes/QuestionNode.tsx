import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import '../../styles/flow.css';

interface QuestionNodeData {
  label: string;
  isCustom?: boolean;
  onDeleteNode?: () => void;
  theme?: 'light' | 'dark';
}

const QuestionNode = ({ data }: NodeProps<QuestionNodeData>) => {
  const isDark = data.theme === 'dark';
  return (
    <div
      className={`relative rounded-[28px] p-5 text-sm text-left shadow-lg cursor-pointer transition-all duration-300 group border ${
        data.isCustom
          ? isDark
            ? 'bg-amber-400/10 text-stone-100 border-amber-500/30'
            : 'soft-panel-strong text-slate-800 border-cyan-200/80'
          : isDark
            ? 'bg-[linear-gradient(160deg,rgba(20,27,40,0.96),rgba(43,52,68,0.9))] text-slate-100 border-slate-700 hover:border-amber-400/50 shadow-[0_24px_48px_rgba(2,6,23,0.3)]'
            : 'bg-[linear-gradient(160deg,rgba(251,247,239,0.92),rgba(216,226,236,0.9))] text-slate-700 border-white/70 hover:border-amber-300/80 shadow-[0_24px_48px_rgba(71,85,105,0.12)]'
      }`}
      style={{
        width: 300,
        height: 100,
      }}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2 opacity-0" />

      <div className="w-full h-full flex flex-col items-start justify-center pr-6">
        <span className={`line-clamp-3 text-[15px] font-medium leading-6 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
          {data.label}
        </span>
      </div>

      {data.onDeleteNode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onDeleteNode?.();
          }}
          className={`absolute top-3 right-3 p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 ${isDark ? 'bg-slate-900/80 text-slate-400 hover:text-rose-300 hover:bg-slate-900' : 'bg-white/70 text-slate-400 hover:text-rose-500 hover:bg-white'}`}
          title="Delete Node"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <Handle type="source" position={Position.Right} className="w-2 h-2 opacity-0" />
    </div>
  );
};

export default memo(QuestionNode);
