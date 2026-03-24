import React, { memo } from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import ReactMarkdown from 'react-markdown';
import '../../styles/flow.css';

interface MainNodeData {
  label: string;
  content: string;
  theme?: 'light' | 'dark';
  followUpQuestions?: string[];
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
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PHBhdGggZD0iTTggMTRzMS41IDIgNCAyIDQtMiA0LTIiLz48bGluZSB4MT0iOSIgeTE9IjkiIHgyPSI5LjAxIiB5Mj0iOSIvPjxsaW5lIHgxPSIxNSIgeTE9IjkiIHgyPSIxNS4wMSIgeTI9IjkiLz48L3N2Zz4=';
  }
};

const normalizeSections = (content: string) => {
  return content
    .split(/(?=####\s)/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((section, index) => {
      if (section.startsWith('####')) {
        const lines = section.split('\n');
        return {
          id: `section-${index}`,
          title: lines[0].replace(/####\s*/, '').trim() || '延伸信息',
          content: lines.slice(1).join('\n').trim(),
        };
      }

      return {
        id: `section-${index}`,
        title: index === 0 ? '背景与结论' : `延伸信息 ${index + 1}`,
        content: section,
      };
    });
};

const MainNode = ({ data }: NodeProps<MainNodeData>) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const sections = React.useMemo(() => normalizeSections(data.content || ''), [data.content]);
  const isDark = data.theme === 'dark';

  return (
    <div
      className={`relative rounded-[32px] border flex flex-col group transition-all duration-300 ${
        isExpanded ? 'h-fit max-h-[560px]' : 'min-h-fit'
      } ${
        isDark
          ? 'bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(30,41,59,0.94))] border-slate-700/80 text-slate-100 shadow-[0_28px_80px_rgba(2,6,23,0.4)]'
          : 'soft-panel-strong border-white/80 text-slate-800 shadow-[0_28px_80px_rgba(148,163,184,0.22)]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-sky-300 !border-0" />

      {data.onDeleteNode && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            data.onDeleteNode?.();
          }}
          className={`nodrag nopan absolute top-4 right-4 z-50 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 ${
            isDark
              ? 'bg-slate-900/80 text-slate-400 hover:text-rose-300 hover:bg-slate-900'
              : 'bg-white/75 text-slate-400 hover:text-rose-500 hover:bg-white'
          }`}
          title="Delete Node"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`nodrag nopan w-full text-left px-6 py-5 transition-colors font-semibold flex items-center gap-3 z-10 sticky top-0 border-none backdrop-blur-xl rounded-t-[32px] ${
            isDark
              ? 'text-stone-100 hover:bg-slate-800/60 bg-[rgba(15,23,42,0.72)]'
              : 'text-slate-800 hover:bg-white/35 bg-[rgba(255,255,255,0.72)]'
          }`}
        >
          <span className="text-[22px] leading-8">{data.label || 'Knowledge Card'}</span>
          <span className={`text-xl ${isDark ? 'text-amber-300' : 'text-slate-400'}`}>{isExpanded ? '▼' : '▶'}</span>
        </button>

        {isExpanded && (
          <div className={`w-full flex-1 flex flex-col ${data.content === 'Loading...' ? 'items-center justify-center' : 'items-start justify-start'}`}>
            {data.content === 'Loading...' ? (
              <div className="flex flex-col items-center justify-center space-y-6 p-8">
                <div className="relative h-24 w-24">
                  <div className="absolute inset-0 rounded-full border border-sky-200 soft-pulse" />
                  <div className="absolute inset-4 rounded-full border border-cyan-300/80 soft-drift" />
                  <div className="absolute inset-[34px] rounded-full bg-gradient-to-br from-sky-400 to-cyan-300" />
                </div>
                <div className="space-y-2 text-center">
                  <div className="text-lg font-semibold tracking-[0.16em] text-sky-700">PROCESSING</div>
                  <div className="text-sm text-slate-500 tracking-wide">Organizing signals and building context...</div>
                </div>
              </div>
            ) : (
              <div className="flex-1 px-8 py-2 overflow-y-auto w-full custom-scrollbar space-y-4">
                <div className="grid grid-cols-1 gap-4 max-w-none break-words">
                  {sections.map((section) => (
                    <CollapsibleSection
                      key={section.id}
                      title={section.title}
                      content={section.content}
                      sources={data.sources}
                      theme={data.theme}
                    />
                  ))}
                </div>

                {data.sources && data.sources.length > 0 && (
                  <SourcePanel sources={data.sources} theme={data.theme} />
                )}
              </div>
            )}

            {data.onAskFollowUp && data.content !== 'Loading...' && (
              <div className={`flex-none border-t px-6 py-3 w-full ${isDark ? 'border-slate-700/70' : 'border-slate-200/70'}`}>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    data.onAskFollowUp?.();
                  }}
                  className={`nodrag nopan flex items-center gap-2 text-xs font-medium transition-colors duration-200 ${isDark ? 'text-slate-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
                  </svg>
                  添加追问
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-sky-300 !border-0" />
    </div>
  );
};

const CollapsibleSection = ({
  title,
  content,
  sources,
  theme,
}: {
  title: string;
  content: string;
  sources?: MainNodeData['sources'];
  theme?: MainNodeData['theme'];
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const isDark = theme === 'dark';

  const processedContent = React.useMemo(() => {
    if (!content) return '';

    return content.replace(/[(（]\s*[^:：]*[:：]\s*([^)）]+?)\s*[)）]/g, (_match, sourceText) => {
      const sourceNames = sourceText.split(/[、,，]/).map((name: string) => name.trim().replace(/[[\]【】]/g, ''));
      const links = sourceNames
        .map((cleanName: string) => {
          if (!cleanName) return '';

          const source = sources?.find((item) => {
            const titleText = item.title || '';
            return titleText.includes(cleanName.substring(0, 15)) || cleanName.includes(titleText.substring(0, 15));
          });

          if (source?.url) {
            const safeUrl = encodeURI(source.url).replace(/\(/g, '%28').replace(/\)/g, '%29');
            return `[来源：${cleanName}](${safeUrl} "source-link")`;
          }

          return `[来源：${cleanName}](#nolink "source-nolink")`;
        })
        .filter(Boolean)
        .join(' ');

      return links || sourceText;
    });
  }, [content, sources]);

  return (
    <>
      <div className={`rounded-[24px] border px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ${isDark ? 'border-slate-700/70 bg-slate-900/45' : 'border-white/70 bg-white/45'}`}>
        <div className="flex items-center gap-3">
          <h3 className={`text-base font-semibold ${isDark ? 'text-stone-100' : 'text-slate-800'}`}>{title}</h3>
          <button
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(true);
            }}
            className={`nodrag nopan text-[12px] transition-colors bg-transparent border-none outline-none flex items-center justify-center cursor-pointer ${isDark ? 'text-amber-300 hover:text-amber-200' : 'text-sky-600 hover:text-sky-500'}`}
            title="Expand section"
          >
            ▶
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/35 backdrop-blur-md">
          <div className={`relative w-[90vw] h-[90vh] rounded-[32px] shadow-2xl flex flex-col border ${isDark ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] border-slate-700/80' : 'soft-panel-strong border-white/85'}`}>
            <div className={`flex justify-between items-center p-5 border-b ${isDark ? 'border-slate-700/80' : 'border-slate-200/70'}`}>
              <h2 className={`text-2xl font-semibold ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>{title}</h2>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setIsOpen(false);
                }}
                className={`nodrag nopan ${isDark ? 'text-slate-400 hover:text-rose-300' : 'text-slate-400 hover:text-rose-500'} text-3xl font-bold p-2`}
              >
                ×
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              <div className={`prose prose-lg max-w-none ${isDark ? 'prose-invert' : 'prose-slate'}`}>
                <ReactMarkdown
                  components={{
                    a: ({ ...props }) => {
                      if (props.title === 'source-link') {
                        return (
                          <a
                            href={props.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className={`nodrag nopan inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-full text-xs transition-all cursor-pointer no-underline ${
                              isDark
                                ? 'bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 border border-amber-300/25'
                                : 'bg-sky-100 text-sky-700 hover:bg-sky-200 border border-sky-200'
                            }`}
                          >
                            {props.children}
                          </a>
                        );
                      }

                      if (props.title === 'source-nolink') {
                        return <span className={`${isDark ? 'text-amber-200/70' : 'text-sky-500/70'} text-xs mx-1`}>{props.children}</span>;
                      }

                      return (
                        <a
                          href={props.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className={`nodrag nopan ${isDark ? 'text-amber-200' : 'text-sky-600'} hover:underline`}
                        >
                          {props.children}
                        </a>
                      );
                    },
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

const SourcePanel = ({
  sources,
  theme,
}: {
  sources: NonNullable<MainNodeData['sources']>;
  theme?: MainNodeData['theme'];
}) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const isDark = theme === 'dark';
  const validSources = React.useMemo(
    () =>
      sources.filter((source, index, array) => {
        if (!source?.url || !source?.title) return false;
        return array.findIndex((item) => item.url === source.url) === index;
      }),
    [sources]
  );

  return (
    <div className={`nodrag nopan rounded-[24px] border px-5 py-4 ${isDark ? 'border-slate-700/70 bg-slate-900/45' : 'border-white/70 bg-white/45'}`}>
      <button
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="nodrag nopan w-full flex items-center justify-between text-left"
      >
        <div>
          <div className={`text-sm font-semibold ${isDark ? 'text-stone-100' : 'text-slate-800'}`}>资料来源</div>
          <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{validSources.length} 条可查看资料</div>
        </div>
        <span className={`text-sm ${isDark ? 'text-amber-300' : 'text-sky-600'}`}>{isOpen ? '收起' : '展开'}</span>
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 gap-3 mt-4">
          {validSources.map((source, index) => (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className={`nodrag nopan flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                isDark ? 'bg-slate-950/45 hover:bg-slate-900/80 border border-slate-700/60' : 'bg-white/70 hover:bg-white border border-white/80'
              }`}
            >
              <div className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <img
                  src={getFaviconUrl(source.url)}
                  alt=""
                  className="w-4 h-4"
                  onError={(event) => {
                    const img = event.target as HTMLImageElement;
                    img.style.display = 'none';
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium truncate ${isDark ? 'text-stone-100' : 'text-slate-800'}`}>{source.title}</div>
                <div className={`text-xs truncate mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{source.url}</div>
              </div>
            </a>
          ))}
          {validSources.length === 0 && (
            <div className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-slate-700/60 bg-slate-950/35 text-slate-400' : 'border-white/80 bg-white/70 text-slate-500'}`}>
              暂无可用资料链接
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(MainNode);
