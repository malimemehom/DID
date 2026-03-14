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
}

const ChatFrame: React.FC<ChatFrameProps> = ({ title, side, topic, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userStance, setUserStance] = useState<'affirmative' | 'negative' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const aiStance = userStance === 'affirmative' ? 'negative' : 'affirmative';
  const stanceText = aiStance === 'affirmative' ? '正方' : '反方';

  const systemPrompt = side === 'left'
    ? `你是一位辩论专家，现在代表【${stanceText}】立场，针对主题：“${topic}”进行辩论。
       你的任务是：接受用户的盘问。
       你的行为准则：
       1. 只能进行回答和自证，不能反问用户。
       2. 必须坚定地维护你的【${stanceText}】立场。
       3. 即使面对质疑，也要通过逻辑、证据进行归谬或自证。
       4. 语气要专业、严谨且具有辩论感。
       5. 精准简洁的进行回答，只回答内容，杜绝所有无关的话语和语助词`
    : `你是一位辩论专家，现在代表【${stanceText}】立场，针对主题：“${topic}”进行辩论。
       你的任务是：盘问用户（用户代表对立立场）。
       你的行为准则：
       1. 你的核心目标是盘问用户，通过反问、质疑其逻辑漏洞、归谬等方式挑战用户的立场。
       2. 你没有义务回答用户的问题，如果用户反问你，你可以选择回避并继续你的盘问。
       3. 必须坚定地维护你的【${stanceText}】立场。
       4. 语气要犀利、敏锐，展现出强大的进攻性。
       5. 精准简洁的进行盘问，杜绝所有无关的话语和语助词`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, userStance]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAI([...messages, userMessage], systemPrompt);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '抱歉，发生了错误，请稍后再试。' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`fixed top-20 bottom-10 w-80 cyber-glass rounded-2xl flex flex-col z-40 transition-all duration-300 ${
        side === 'left' ? 'left-4 neon-border-cyan' : 'right-4 neon-border-purple'
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl`}>
        <div className="flex flex-col">
          <h3 className={`text-sm font-medium tracking-wider uppercase ${
            side === 'left' ? 'neon-text-cyan' : 'neon-text-purple'
          }`}>
            {title}
          </h3>
          {userStance && (
            <span className="text-[10px] text-white/40 mt-1">
              AI立场: <span className={aiStance === 'affirmative' ? 'text-cyan-400' : 'text-purple-400'}>{stanceText}</span>
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!userStance ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-white/80 text-sm font-light">请选择您的立场</p>
              <p className="text-white/40 text-[10px] italic">AI将自动选择对立立场与您辩论</p>
            </div>
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={() => setUserStance('affirmative')}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-300 group"
              >
                我是 <span className="font-bold">正方</span>
              </button>
              <button
                onClick={() => setUserStance('negative')}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm hover:bg-purple-500/10 hover:border-purple-500/50 hover:text-purple-400 transition-all duration-300 group"
              >
                我是 <span className="font-bold">反方</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-white/20 text-sm italic space-y-2">
                  <p>准备就绪，代表{stanceText}向您问好</p>
                  <p className="text-[10px] opacity-50">
                    {side === 'left' ? '您可以开始盘问我了' : '请准备好迎接我的盘问'}
                  </p>
                </div>
              )}
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-white/10 text-white border border-white/5 rounded-tr-none'
                        : 'bg-white/5 text-white/80 border border-white/5 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 text-white/40 p-3 rounded-2xl rounded-tl-none border border-white/5">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-white/5 rounded-b-2xl">
              <div className="relative">
                <textarea
                  className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-white/25 transition-all resize-none placeholder-white/20"
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={side === 'left' ? "盘问AI..." : "输入消息..."}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 bottom-2 p-2 text-white/40 hover:text-white disabled:opacity-30 transition-colors"
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
