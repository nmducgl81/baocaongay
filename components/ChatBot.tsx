import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, Loader2, MinusCircle } from 'lucide-react';
import { SalesRecord } from '../types';
import { createChatSession } from '../services/geminiService';

interface ChatBotProps {
  data: SalesRecord[];
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const ChatBot: React.FC<ChatBotProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'model', text: 'Xin chào! Tôi là trợ lý ảo hỗ trợ theo dõi doanh số. Bạn cần tôi giúp gì về số liệu hôm nay?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Store chat session instance
  const chatSessionRef = useRef<any>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Initialize chat when data changes or component mounts
  useEffect(() => {
    if (data.length > 0) {
      chatSessionRef.current = createChatSession(data);
    }
  }, [data]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      if (!chatSessionRef.current) {
         // Re-init if missing
         chatSessionRef.current = createChatSession(data);
      }

      if (chatSessionRef.current) {
        const result = await chatSessionRef.current.sendMessage({ message: userMsg.text });
        const botMsg: Message = { 
          id: (Date.now() + 1).toString(), 
          role: 'model', 
          text: result.text || "Xin lỗi, tôi không thể trả lời lúc này." 
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        setMessages(prev => [...prev, { id: 'err', role: 'model', text: 'Chưa kết nối được với API Key.' }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: 'err', role: 'model', text: 'Đã xảy ra lỗi kết nối.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white w-[350px] h-[500px] rounded-2xl shadow-2xl border border-gray-200 flex flex-col mb-4 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-full">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Trợ lý Kinh Doanh</h3>
                <p className="text-xs text-emerald-100 flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-1 inline-block animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                  <MinusCircle size={18} />
                </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-br-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm">
                   <Loader2 size={16} className="animate-spin text-emerald-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi về doanh số, KPI..."
              className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center group"
        >
          <MessageSquare size={28} className="group-hover:animate-bounce" />
          <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
            Chat với AI
          </span>
        </button>
      )}
    </div>
  );
};