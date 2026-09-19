import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Zap, ChevronRight, CornerDownLeft, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  options?: string[];
  productAction?: {
    label: string;
    sku: string;
    path: string;
  };
}

export const ElectraAIChatModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'ai',
      text: 'Namaste! I am ElectraAI, your Indian electrical engineering assistant. How can I help with your project today?',
      timestamp: 'Just now',
      options: [
        'I need switches for my new house',
        'Calculate wire gauge for AC & Geyser',
        'Help me find 6-9 switch',
        'Estimate materials for 2BHK flat',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { addToCart, products } = useStore();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');

    // Simulate AI response logic
    setTimeout(() => {
      generateAiResponse(query.toLowerCase());
    }, 450);
  };

  const generateAiResponse = (q: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (q.includes('switch') && (q.includes('new house') || q.includes('need') || q.includes('brand'))) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: 'Sure! For a new residential build, modular switch plates are standard. Do you already have a preferred brand?',
          timestamp: time,
          options: ['Anchor by Panasonic', 'Legrand Arteor', 'Schneider Opale', 'GM Modular', 'Not sure - recommend best'],
        },
      ]);
    } else if (q.includes('anchor') || q.includes('penta') || q.includes('roma')) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: 'Excellent choice. In Anchor, we carry both Roma Classic (high-gloss modular) and Penta (durable standard piano switches). Which series do you prefer?',
          timestamp: time,
          options: ['Anchor Roma Classic 6-Module', 'Anchor Penta Standard 6A', 'Compare Both'],
          productAction: {
            label: 'View Anchor Roma 6M Plate (₹185)',
            sku: 'ANC-ROM-6M-PLT-WHT',
            path: '/customer/product/prod-anchor-roma-6m-plate',
          },
        },
      ]);
    } else if (q.includes('wire') || q.includes('gauge') || q.includes('ac') || q.includes('geyser')) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: 'Here is the Indian Standard (IS 694) copper wire sizing guideline for residential wiring:\n\n• 1.5 sq.mm: Lighting, fans, 6A standard sockets\n• 2.5 sq.mm: Power sockets, refrigerator, microwave (up to 16A)\n• 4.0 sq.mm: 1.5 Ton / 2.0 Ton AC, 25L Instant Geyser\n• 6.0 sq.mm: Main distribution line from meter board to DB\n\nWe recommend Polycab FlameX FR or Finolex FRLSH for fire safety.',
          timestamp: time,
          options: ['View Polycab 2.5 sq.mm Red', 'View Finolex 4.0 sq.mm Green', 'Upload Contractor Bill'],
          productAction: {
            label: 'Polycab 2.5 sq.mm FlameX (₹3,100)',
            sku: 'POL-WX-25-RED-90M',
            path: '/customer/product/prod-polycab-25-red',
          },
        },
      ]);
    } else if (q.includes('6-9') || q.includes('6-9 switch')) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: '"6-9 switch" is a common contractor shorthand in India referring either to a 6A switch or 6/9-module board! Let me open the smart clarification assistant for you.',
          timestamp: time,
          options: ['Open Clarification Assistant', 'Show Anchor Roma 6M Plate', 'Show 6A Switch Pack'],
          productAction: {
            label: 'Go to Search Clarification',
            sku: 'SEARCH-CLARIFY',
            path: '/customer/search?q=6-9+switch',
          },
        },
      ]);
    } else if (q.includes('2bhk') || q.includes('estimate') || q.includes('flat')) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: 'For a standard 2BHK flat (~1,100 sq.ft), a typical contractor estimate requires:\n• 4 Coils 1.5 sq.mm (Lighting)\n• 3 Coils 2.5 sq.mm (Power)\n• 1 Coil 4.0 sq.mm (AC & Geyser)\n• 12 Modular Switch Plates (6M & 8M)\n• 45 Modular Switches (6A)\n• 1x 8-Way SPN MCB Distribution Board\n\nWould you like to auto-fill this estimate for instant quotation?',
          timestamp: time,
          options: ['Upload My Contractor Estimate', 'Browse Recommended Bundle'],
          productAction: {
            label: 'Go to Upload Estimate',
            sku: 'ESTIMATE-UPLOAD',
            path: '/customer/estimate',
          },
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `Got it! I found related electrical products and nearby store inventory for "${q}". Would you like to view the catalog or upload your electrical contractor bill for automatic price locking?`,
          timestamp: time,
          options: ['Upload Contractor Bill', 'Search Catalog', 'Need Electrician Advice'],
        },
      ]);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-full shadow-2xl border border-amber-500/40 hover:border-amber-400 hover:scale-105 transition-all group"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30">
            <Zap className="w-4 h-4 fill-slate-950" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-950"></span>
          </div>
          <div className="text-left hidden xs:block">
            <span className="text-xs font-bold block text-white flex items-center gap-1">
              ElectraAI <Sparkles className="w-3 h-3 text-amber-400" />
            </span>
            <span className="text-[10px] text-slate-400">Ask Electrical Assistant</span>
          </div>
        </button>
      </div>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-6 z-50 w-full sm:w-[420px] sm:h-[580px] bg-white sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-slate-950 text-white border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                <Zap className="w-5 h-5 fill-slate-950" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-white">
                  ElectraAI Assistant
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-1.5 py-0.2 rounded border border-emerald-500/30">
                    Online
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Product & Sizing Specialist</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.text}

                  {/* Product action if available */}
                  {msg.productAction && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          navigate(msg.productAction!.path);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors w-full justify-center"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                        <span>{msg.productAction.label}</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Option Buttons */}
                {msg.options && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                    {msg.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(opt)}
                        className="px-2.5 py-1 rounded-full bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors text-[11px] font-medium shadow-2xs"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask about wire sizing, switch brands..."
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="p-2.5 bg-slate-950 text-amber-400 rounded-xl hover:bg-slate-900 disabled:opacity-40 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
