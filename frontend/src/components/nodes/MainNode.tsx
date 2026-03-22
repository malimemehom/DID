import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import ReactMarkdown from 'react-markdown';
import '../../styles/flow.css';

interface MainNodeData {
  label: string;
  content: string;
  images?: string[];
  sources?: Array<{
    title: string;
    url: string;
    thumbnail?: string;
  }>;
  onAskFollowUp?: () => void;
  onDeleteNode?: () => void;
}

const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PHBhdGggZD0iTTggMTRzMS41IDIgNCAyIDQtMiA0LTIiLz48bGluZSB4MT0iOSIgeTE9IjkiIHgyPSI5LjAxIiB5Mj0iOSIvPjxsaW5lIHgxPSIxNSIgeTE9IjkiIHgyPSIxNS4wMSIgeTI9IjkiLz48L3N2Zz4='; // fallback icon
  }
};

const MainNode = ({ data }: NodeProps<MainNodeData>) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className={`relative bg-[#1a1a1a] rounded-2xl border border-black shadow-lg flex flex-col group transition-all duration-300 ${isExpanded ? 'h-fit max-h-[550px]' : 'min-h-fit'}`}>
      <Handle type="target" position={Position.Left} className="w-2 h-2" />

      {/* Delete Button */}
      {data.onDeleteNode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onDeleteNode!();
          }}
          className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-black/40 text-white/40 hover:text-red-400 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200"
          title="Delete Node"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}



      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1a1a1a] flex flex-col items-start justify-start">

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left p-4 text-white hover:bg-white/10 transition-colors font-bold flex justify-start items-center gap-3 z-10 sticky top-0 bg-[#1a1a1a] border-none"
        >
          <span className="text-2xl">
            {(() => {
              if (data.content === 'Loading...') return data.label || '概述内容';
              // 抽出正文最前面（第一个 #### 之前）的内容当作标题
              const parts = data.content.split(/(?=####\s)/);
              if (parts.length > 0 && !parts[0].trim().startsWith('####')) {
                const plainText = parts[0].replace(/[\s\n*#\->]/g, '').trim();
                // 如果这段不仅包含符号，就有字，就作为最上方标题展示
                if (plainText) {
                  return parts[0].trim();
                }
              }
              return data.label || '概述内容';
            })()}
          </span>
          <span className="text-white/50 text-xl">{isExpanded ? '▼' : '▶'}</span>
        </button>

        {/* 下面是原本的内容区域 */}
        {isExpanded && (
          <div className={`w-full flex-1 flex flex-col ${data.content === 'Loading...' ? 'items-center justify-center' : 'items-start justify-start'}`}>
            {data.content === 'Loading...' ? (
              <div className="flex flex-col items-center justify-center space-y-8 p-6">
                <div className="relative">
                  <svg className="w-24 h-24 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  <svg className="w-24 h-24 absolute top-0 left-0 animate-reverse-spin" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.5">
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                    <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse"></div>
                  </div>
                </div>

                <div className="space-y-3 text-center">
                  <div className="font-mystical text-lg text-white/70 tracking-[0.2em] animate-pulse">
                    SEEKING WISDOM
                  </div>
                  <div className="text-sm text-white/40 tracking-wider">
                    Traversing the depths of knowledge...
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 px-8 py-2 overflow-y-auto w-full">


                <div className="grid grid-rows-2 grid-flow-col justify-start gap-x-24 gap-y-2 prose prose-invert prose-sm max-w-none break-words">

                  {data.content
                    .split(/(?=####\s)/)
                    .filter((text: string) => text.trim() !== '')
                    .map((text: string, idx: number) => {
                      const trimmedText = text.trim();
                      if (trimmedText.startsWith('####')) {
                        // 如果是以 #### 开头的纸条，就把它拆成名字和内容，装进鼻屎小盒子里
                        const lines = trimmedText.split('\n');
                        const title = lines[0].replace(/####\s*/, '').trim();
                        const content = lines.slice(1).join('\n').trim();
                        // 防止后端生成空的 #### 或者无标题内容产生多余的按键
                        if (!title && !content) return null;
                        return <CollapsibleSection key={`collab-${idx}`} title={title} content={content} sources={data.sources} />;
                      }

                      // 如果是长文且没有 #### 标题，我们使用 "概述" 作为标题呈现，防止内容整体丢失
                      if (!trimmedText) return null;
                      return <CollapsibleSection key={`collab-${idx}`} title="概述" content={trimmedText} sources={data.sources} />;
                    })}

                </div>
                {data.sources && data.sources.length > 0 && (
                  <SimpleCollapsible title="Sources">
                    {data.sources.map((source, index) => (
                      <a
                        key={index}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800 transition-colors group break-all"
                      >
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-800 rounded overflow-hidden">
                          <img
                            src={getFaviconUrl(source.url)}
                            alt=""
                            className="w-4 h-4 group-hover:scale-110 transition-transform"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-300 group-hover:text-white flex-1 break-words">
                          {source.title}
                        </span>
                      </a>
                    ))}
                  </SimpleCollapsible>
                )}

              </div>
            )}
            {/* Ask Follow Up button */}
            {data.onAskFollowUp && data.content !== 'Loading...' && (
              <div className="flex-none border-t border-white/5 px-6 py-3 w-full">
                <button
                  onClick={(e) => { e.stopPropagation(); data.onAskFollowUp!(); }}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors duration-200 group"
                >
                  <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Ask Follow Up
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
};

// 这是一个普通的 React 组件，放在 MainNode.tsx 里面
const CollapsibleSection = ({ title, content, sources }: { title: string, content: string, sources?: MainNodeData['sources'] }) => {
  // 默认收起 (false) 还是展开 (true)，看你自己的需求，这里写默认收起
  const [isOpen, setIsOpen] = React.useState(false);

  // 处理来源链接：将 （来源：xxx） 转换为 Markdown 链接格式，打上特殊标记 "source-link" 或 "source-nolink"
  const processedContent = React.useMemo(() => {
    if (!content) return '';
    return content.replace(/[\(（]\s*来源\s*[:：]\s*([^）\)]+?)\s*[\)）]/g, (match, sourcesText) => {
      // 把多个来源拆开（用、或,分隔）
      const sourceNames = sourcesText.split(/[、,，]/).map((s: string) =>
        s.trim().replace(/[\[\]【】]/g, '')
      );

      const buttons = sourceNames.map((cleanName: string) => {
        if (!cleanName) return '';
        // 模糊匹配：只要有20个字符重叠就算匹配
        const source = sources?.find((s: any) => {
          const title = s.title || '';
          return title.includes(cleanName.substring(0, 15)) ||
            cleanName.includes(title.substring(0, 15));
        });
        if (source?.url) {
          const safeUrl = encodeURI(source.url).replace(/\(/g, '%28').replace(/\)/g, '%29');
          return `[📎 ${ cleanName }](${ safeUrl } "source-link")`;
        }
        return `[📎 ${ cleanName }](#nolink "source-nolink")`;
      }).filter(Boolean).join(' ');

      return buttons || match;
    });
  }, [content, sources]);

  return (
    <>
      {/* 📦 这是平时看到的小盒子：彻底去掉了背景块和边框，也不要任何 p-4 海绵垫了，就让它们紧贴着 */}
      <div className="mb-2">

        {/* ✨ 用一个 flex 袋子，让标题和按钮在同一行并排站好，中间隔开一点点距离（gap-3） */}
        <div className="flex items-center gap-3">

          {/* H1 标题大字，改成了和最上面一样的大小（text-base 或者 text-lg） */}
          <h1 className="text-base font-bold text-white">{title}</h1>

          {/* 🔍 蓝色的三角形打开按键 */}
          <button
            onClick={() => setIsOpen(true)}
            className="text-[12px] text-blue-400 hover:text-blue-300 transition-colors bg-transparent border-none outline-none flex items-center justify-center cursor-pointer"
            title="点击展开内容"
          >
            ▶
          </button>

        </div>
      </div>



      {/* ⛺ 只有开关打开时，才弹出全屏大帐篷 */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          {/* 大帐篷里的主角：一个在屏幕中央的大卡片 */}
          <div className="relative w-[90vw] h-[90vh] bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl flex flex-col">

            {/* ❌ 顶部的打叉按钮区 */}
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/50 hover:text-red-500 text-3xl font-bold p-2"
              >
                ×
              </button>
            </div>

            {/* 📄 你的全部内容（支持鼠标滚轮滚动） */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="prose prose-invert prose-lg max-w-none">
                <ReactMarkdown
                  components={{
                    a: ({ node, ...props }) => {
                      // 渲染找到链接的来源按钮
                      if (props.title === "source-link") {
                        return (
                          <a href={props.href} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 border border-blue-500/30 transition-all cursor-pointer no-underline">
                            {props.children}
                          </a>
                        );
                      }
                      // 渲染未找到链接的来源样式
                      if (props.title === "source-nolink") {
                        return (
                          <span className="text-blue-300/60 text-xs mx-1">
                            {props.children}
                          </span>
                        );
                      }
                      // 渲染普通的 Markdown 链接
                      return (
                        <a href={props.href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {props.children}
                        </a>
                      );
                    }
                  }}
                >
                  {processedContent}
                </ReactMarkdown>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

// 这是一个普通的 React 组件，放在 MainNode.tsx 里面，用作原地折叠
const SimpleCollapsible = ({ title, children }: { title: string, children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={`mt-6 border-t border-gray-700 pt-4 ${isOpen ? 'mb-4' : ''}`}>
      {/* 标题和展开按钮 */}
      <div
        className={`flex items-center gap-2 cursor-pointer group ${isOpen ? 'mb-3' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-[12px] text-gray-400 group-hover:text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          ▶
        </span>
        <h3 className="text-sm font-semibold text-gray-400 group-hover:text-gray-300">{title}</h3>
      </div>

      {/* 折叠的内容区域 */}
      {isOpen && (
        <div className="grid grid-cols-1 gap-3">
          {children}
        </div>
      )}
    </div>
  );
};

export default memo(MainNode); 