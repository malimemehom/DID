import React, { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatFrameProps {
  title: string;
  side: 'left' | 'right';
  topic: string;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

const ChatFrame: React.FC<ChatFrameProps> = ({ side, topic, onClose, theme = 'dark' }) => {
  const storageKey = `chatframe_${side}_${topic}`;
  const isDark = theme === 'dark';

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_messages`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userStance, setUserStance] = useState<'affirmative' | 'negative' | null>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_stance`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(`${storageKey}_messages`, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}_stance`, JSON.stringify(userStance));
  }, [userStance, storageKey]);

  const aiStance = userStance === 'affirmative' ? 'negative' : 'affirmative';
  const stanceText = aiStance === 'affirmative' ? '正方' : '反方';
  const panelTitle = side === 'left' ? '左侧 质询' : '右侧 答询';
  const shortTitle = side === 'left' ? '质询' : '答询';

  const systemPrompt = side === 'left'
    ? `你是一位辩论专家，现在代表【${stanceText}】立场，针对主题：“${topic}”进行辩论。
       你的任务是：接受用户的盘问。
       你的行为准则：
       1. 只能回答和自证，不能反问用户。
       2. 必须坚定维护【${stanceText}】立场。
       3. 面对质疑时，通过逻辑和证据回应。
       4. 语气专业、严谨并带有辩论感。
       5. 回答精准简洁，只输出核心内容。`
    : `你是一位辩论专家，现在代表【${stanceText}】立场，针对主题：“${topic}”进行辩论。
       你的任务是：盘问用户（用户代表对立立场）。
       你的行为准则：
       1. 通过追问、质疑和归谬挑战用户立场。
       2. 不必回答用户反问，可以继续推进盘问。
       3. 必须坚定维护【${stanceText}】立场。
       4. 语气敏锐、有压迫感，但保持专业。
       5. 输出精准简洁，避免无关内容。`;

  const accent = side === 'left'
    ? {
        title: isDark ? 'text-amber-300' : 'text-amber-700',
        chip: isDark ? 'border-amber-500/30 bg-amber-400/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700',
        bubble: isDark ? 'border-amber-500/20 bg-amber-400/10 text-stone-100' : 'border-amber-100 bg-amber-50 text-slate-700',
      }
    : {
        title: isDark ? 'text-sky-300' : 'text-sky-700',
        chip: isDark ? 'border-sky-500/30 bg-sky-400/10 text-sky-200' : 'border-sky-200 bg-sky-50 text-sky-700',
        bubble: isDark ? 'border-sky-500/20 bg-sky-400/10 text-slate-100' : 'border-sky-100 bg-sky-50 text-slate-700',
      };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, userStance]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAI([...messages, userMessage], systemPrompt);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.content }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: '抱歉，发生了错误，请稍后再试。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`fixed top-20 bottom-10 w-[22rem] rounded-[28px] flex flex-col z-40 transition-all duration-300 border shadow-[0_32px_80px_rgba(15,23,42,0.28)] ${
        side === 'left' ? 'left-4' : 'right-4'
      } ${isDark
        ? 'bg-[linear-gradient(180deg,rgba(17,24,39,0.94),rgba(30,41,59,0.92))] border-slate-700/80 text-slate-100'
        : 'bg-[linear-gradient(180deg,rgba(245,238,226,0.94),rgba(214,224,234,0.92))] border-white/80 text-slate-800'
      }`}
    >
      <div className={`p-4 border-b flex justify-between items-center rounded-t-[28px] backdrop-blur-xl ${isDark ? 'border-slate-700/80 bg-slate-900/30' : 'border-white/80 bg-white/35'}`}>
        <div className="flex flex-col">
          <h3 className={`text-sm font-semibold tracking-[0.18em] uppercase ${accent.title}`}>
            {panelTitle}
          </h3>
          {userStance && (
            <span className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              AI立场:
              <span className={`ml-1 inline-flex rounded-full border px-2 py-0.5 font-medium ${accent.chip}`}>
                {stanceText}
              </span>
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className={`rounded-xl p-2 transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-400 hover:bg-white hover:text-slate-800'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!userStance ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="space-y-2">
              <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>请选择您的立场</p>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{shortTitle} AI 会自动选择对立立场与你辩论</p>
            </div>
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={() => setUserStance('affirmative')}
                className={`w-full py-3 rounded-2xl border text-sm transition-all duration-300 ${isDark ? 'bg-slate-900/60 border-slate-700 text-slate-200 hover:border-amber-400/60 hover:text-amber-200' : 'bg-white/70 border-white/85 text-slate-700 hover:border-amber-200 hover:text-amber-700'}`}
              >
                我是 <span className="font-semibold">正方</span>
              </button>
              <button
                onClick={() => setUserStance('negative')}
                className={`w-full py-3 rounded-2xl border text-sm transition-all duration-300 ${isDark ? 'bg-slate-900/60 border-slate-700 text-slate-200 hover:border-sky-400/60 hover:text-sky-200' : 'bg-white/70 border-white/85 text-slate-700 hover:border-sky-200 hover:text-sky-700'}`}
              >
                我是 <span className="font-semibold">反方</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className={`h-full flex flex-col items-center justify-center text-sm italic space-y-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <p>{shortTitle} 已就绪，代表 {stanceText} 开始工作</p>
                  <p className="text-[11px] opacity-70">
                    {side === 'left' ? '你可以开始向它发起质询' : '它会开始回应并自证'}
                  </p>
                </div>
              )}
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed border ${
                      msg.role === 'user'
                        ? isDark
                          ? 'bg-slate-100 text-slate-900 border-slate-200 rounded-tr-none'
                          : 'bg-slate-700 text-white border-slate-600 rounded-tr-none'
                        : `${accent.bubble} rounded-tl-none`
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className={`p-3 rounded-2xl rounded-tl-none border ${accent.bubble}`}>
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce opacity-70" />
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.2s] opacity-70" />
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.4s] opacity-70" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={`p-4 border-t rounded-b-[28px] ${isDark ? 'border-slate-700/80 bg-slate-950/30' : 'border-white/80 bg-white/30'}`}>
              <div className="relative">
                <textarea
                  className={`w-full border rounded-[22px] px-4 py-3 pr-12 text-sm focus:outline-none transition-all resize-none shadow-[0_12px_30px_rgba(15,23,42,0.12)] ${
                    isDark
                      ? 'bg-slate-950/75 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-amber-400'
                      : 'bg-white/80 border-white/90 text-slate-800 placeholder:text-slate-400 focus:border-amber-300'
                  }`}
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={side === 'left' ? '向质询 AI 发起问题…' : '向答询 AI 继续追问…'}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`absolute right-2 bottom-2 p-2 rounded-xl disabled:opacity-30 transition-colors ${isDark ? 'text-slate-400 hover:text-amber-300 hover:bg-slate-900' : 'text-slate-500 hover:text-slate-800 hover:bg-white'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatFrame;
