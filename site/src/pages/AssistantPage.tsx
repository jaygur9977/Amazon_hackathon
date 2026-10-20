import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquareCode, 
  Send, 
  Sparkles, 
  Cpu, 
  Film, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  RotateCw,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { ChatMessage, RAGCitation } from '../types';
import { FormattedAnswer } from '../components/assistant/FormattedAnswer';

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your AI Video Intelligence Assistant powered by multimodal neural reasoning models. I can answer questions about your analyzed doorbell and security clips, summarize events, review risk assessments, and cite exact evidence frames. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQueries = [
    'How many deliveries were detected?',
    'Which videos were marked as high risk?',
    'Show me the videos where someone was lingering.',
    'What happened in delivery-01.mp4?',
    'Summarize today\'s detected events.',
    'Which events have unusual activity?'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.askAssistant(userMessage.text, messages);

      const assistantMessage: ChatMessage = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: response.citations,
        model: response.model,
        grounded: response.grounded,
        notice: response.notice
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `Error connecting to AI service: ${err.message}. Please verify the backend server is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-5xl mx-auto space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between p-5 rounded-3xl bg-surface border-2 border-border shadow-subtle">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-900 shadow-subtle">
            <MessageSquareCode className="w-6 h-6 text-amber-900 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-primary flex items-center gap-2.5">
              <span>Grounded RAG Video Assistant</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                Verified Facts
              </span>
            </h2>
            <p className="text-sm text-secondary font-medium flex items-center gap-2 mt-0.5">
              <span>Reasoning Core:</span>
              <span className="font-mono text-primary font-bold">Multimodal AI Intelligence Engine</span>
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-secondary bg-slate-50 px-3.5 py-1.5 rounded-xl border border-border">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Strict Evidence Grounding</span>
        </div>
      </div>

      {/* Suggested Questions Pill Carousel */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 text-sm">
        <span className="text-xs font-extrabold text-secondary uppercase tracking-wider shrink-0 flex items-center gap-1.5 pl-1">
          <HelpCircle className="w-4 h-4 text-emerald-600" /> Prompts:
        </span>
        {suggestedQueries.map((query, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(query)}
            disabled={isLoading}
            className="shrink-0 px-4 py-2 rounded-2xl bg-surface border-2 border-border/80 text-primary text-sm font-semibold hover:border-emerald-500 hover:bg-emerald-50 transition-all shadow-subtle disabled:opacity-50 hover:scale-105 active:scale-95"
          >
            {query}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 bg-surface border-2 border-border/80 rounded-3xl p-6 sm:p-8 overflow-y-auto space-y-6 shadow-subtle">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-secondary px-2">
              <span className={msg.sender === 'user' ? 'text-emerald-900 font-extrabold flex items-center gap-1.5' : 'text-slate-900 font-extrabold'}>
                {msg.sender === 'user' ? 'You' : 'AegisVision AI Assistant'}
              </span>
              <span>•</span>
              <span className="font-mono text-slate-500">{msg.timestamp}</span>
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-3xl p-5 sm:p-6 rounded-3xl text-base leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-emerald-50 border-2 border-emerald-300 text-slate-950 rounded-tr-none shadow-subtle'
                  : 'bg-white border-2 border-slate-200 text-slate-900 rounded-tl-none shadow-subtle'
              }`}
            >
              {msg.sender === 'user' ? (
                <p className="whitespace-pre-wrap font-bold text-slate-950 text-base">{msg.text}</p>
              ) : (
                <FormattedAnswer text={msg.text} />
              )}

              {msg.notice && (
                <div className="mt-4 pt-3 border-t border-slate-200 text-xs font-semibold text-amber-800 flex items-center gap-2 font-sans bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{msg.notice}</span>
                </div>
              )}
            </div>

            {/* Source Citations Strip */}
            {msg.citations && msg.citations.length > 0 && (
              <div className="max-w-3xl w-full p-4 rounded-2xl bg-white border-2 border-emerald-200/80 shadow-subtle space-y-3 mt-1">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    <Film className="w-4 h-4 text-emerald-600" /> Grounding Citations ({msg.citations.length} clips)
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300">
                    Verified References
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {msg.citations.slice(0, 4).map((cit, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-sm hover:border-emerald-400 transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate" title={cit.file_name}>
                          {cit.file_name}
                        </p>
                        <p className="text-xs text-slate-600 capitalize font-medium">
                          {cit.event.replace(/_/g, ' ')}
                        </p>
                        <span
                          className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md ${
                            cit.risk === 'high' 
                              ? 'bg-red-100 text-red-900 border border-red-300' 
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          {cit.risk} risk
                        </span>
                      </div>

                      <Link
                        to={`/analysis/${encodeURIComponent(cit.clip_id)}`}
                        className="text-emerald-700 hover:text-emerald-900 hover:underline shrink-0 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                        title="View Full Analysis"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex flex-col items-start space-y-2">
            <div className="text-xs font-bold text-slate-500 px-2">AegisVision AI is analyzing records...</div>
            <div className="p-5 rounded-3xl bg-slate-50 border-2 border-slate-200 text-base flex items-center gap-3">
              <RotateCw className="w-5 h-5 animate-spin text-emerald-600" />
              <span className="text-slate-700 font-medium">Retrieving evidence frames and generating grounded response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-3 pt-1"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your video clips (e.g. 'Show me the high risk events' or 'What happened in delivery-01.mp4?')..."
          disabled={isLoading}
          className="flex-1 px-5 py-4 rounded-2xl bg-surface border-2 border-border text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-subtle transition-all"
        />

        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-base flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-subtle disabled:opacity-50 hover:scale-105 active:scale-95 shrink-0"
        >
          <span>Ask AI</span>
          <Send className="w-4 h-4 stroke-[2.5]" />
        </button>
      </form>
    </div>
  );
};
