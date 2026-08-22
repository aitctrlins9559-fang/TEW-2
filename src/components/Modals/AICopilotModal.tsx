import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Shield,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  X,
  Loader2,
  Copy,
  Check,
  MessageSquare,
  Send,
  FileText,
  User,
  Bot,
  Key,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AIAnalysisResult, StockPosition, MarketIndex } from '../../types';
import { playClickSound } from '../../utils/audio';
import { apiRunAIChat } from '../../utils/apiClient';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

interface AICopilotModalProps {
  isOpen: boolean;
  isLoading: boolean;
  analysis: AIAnalysisResult | null;
  error: string | null;
  portfolio: StockPosition[];
  totalValue: number;
  totalProfit: number;
  totalROI: number;
  indices: MarketIndex[];
  onClose: () => void;
  onReanalyze: () => void;
}

export const AICopilotModal: React.FC<AICopilotModalProps> = ({
  isOpen,
  isLoading,
  analysis,
  error,
  portfolio,
  totalValue,
  totalProfit,
  totalROI,
  indices,
  onClose,
  onReanalyze,
}) => {
  const [activeTab, setActiveTab] = useState<'report' | 'chat'>('report');
  const [copied, setCopied] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: '您好！我是您的 Gemini AI 戰情操盤顧問。我可以針對您目前的持股組合、台美股個股走勢、避險防禦策略或股息再投資進行即時分析解答。請問今天想了解什麼呢？\n\n💡 提示：在外行動裝置若無綁定 API 金鑰，系統預設已具備完整風控建議；您亦可點擊上方「🔑 API 設定」貼上免費 Google Gemini API Key 啟用無限次高智能即時對答！',
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Custom Google Gemini API Key State for Free Users & Mobile Users
  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [showApiKeyConfig, setShowApiKeyConfig] = useState<boolean>(false);
  const [keySaved, setKeySaved] = useState<boolean>(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  const handleSaveApiKey = (key: string) => {
    const trimmed = key.trim();
    setCustomApiKey(trimmed);
    if (trimmed) {
      localStorage.setItem('gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  if (!isOpen) return null;

  const getRiskBadgeColor = (rating?: string) => {
    switch (rating) {
      case '低風險':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case '中等風險':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case '高風險':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case '極高風險':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  const handleCopyReport = () => {
    if (!analysis) return;
    const text = `【Gemini AI 資產戰情報告】\n時間：${analysis.timestamp}\n風控評級：${
      analysis.riskRating
    }\n總評：${analysis.summary}\n配置講評：${analysis.allocationComment}\n操盤建議：${
      analysis.actionAdvice
    }`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMsg).trim();
    if (!text || isSending) return;

    playClickSound();
    const userMsgObj: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsgObj]);
    if (!textToSend) setInputMsg('');
    setIsSending(true);

    try {
      const reply = await apiRunAIChat(
        {
          message: text,
          history: chatMessages.map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }],
          })),
          portfolio,
          totalValue,
          totalProfit,
          totalROI,
          indices,
        },
        customApiKey
      );

      const aiMsgObj: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: reply || '收到您的問題，但服務端回應稍有延遲，請稍微重試。',
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, aiMsgObj]);
    } catch {
      const aiMsgObj: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: '⚠️ 連線逾時。若您頻繁查詢，可點擊上方 API Key 設定貼上個人免費 Gemini API Key，即可享有不間斷答覆。',
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, aiMsgObj]);
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    '💡 分析我持股中風險最高的標的',
    '🚀 台積電與美股科技股下週操作建議',
    '🛡️ 若大盤拉回，我的組合防禦力如何？',
    '💰 如何最佳化未來的股息與現金流配置？',
  ];

  return (
    <div
      onClick={() => {
        playClickSound();
        onClose();
      }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-[2rem] sm:rounded-3xl p-5 md:p-8 w-full max-w-2xl shadow-[0_12px_40px_rgb(0,0,0,0.08)] space-y-4 max-h-[88vh] sm:max-h-[88vh] overflow-y-auto border border-slate-100 animate-in slide-in-from-bottom duration-300 flex flex-col text-slate-900"
      >
        {/* Mobile Pull/Dismiss Indicator */}
        <div className="flex flex-col items-center gap-1 sm:hidden pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
          <span className="text-[10px] text-slate-400">點擊上方空白處可快速關閉</span>
        </div>

        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 border border-purple-100">
              <Sparkles className="w-6 h-6 text-purple-600 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                AI 戰情操盤顧問 (Gemini Copilot)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                全盤持股診斷 ｜ 即時一對一對問諮詢
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition btn-interact shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shrink-0">
          <button
            onClick={() => {
              playClickSound();
              setActiveTab('report');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'report'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" /> 📊 全盤戰情報告
          </button>

          <button
            onClick={() => {
              playClickSound();
              setActiveTab('chat');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> 💬 即時問答諮詢
            {chatMessages.length > 1 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>
        </div>

        {/* Tab 1: Diagnostic Report */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            {/* Loading state */}
            {isLoading && (
              <div className="py-12 sm:py-16 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                <div className="text-slate-800 text-sm font-bold tracking-wide animate-pulse text-center">
                  Gemini AI 正在分析你的資產組合與市場指標...
                </div>
                <p className="text-xs text-slate-500 text-center">計算台美股集中度、產業分佈與短中線風險點</p>
              </div>
            )}

            {/* Error state */}
            {!isLoading && error && (
              <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl text-rose-800 text-sm space-y-3">
                <div className="flex items-center gap-2 font-bold text-rose-700">
                  <AlertTriangle className="w-5 h-5" /> 分析產生失敗
                </div>
                <p className="text-xs leading-relaxed">{error}</p>
                <button
                  onClick={onReanalyze}
                  className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-xs transition"
                >
                  重新重試
                </button>
              </div>
            )}

            {/* Content state */}
            {!isLoading && !error && analysis && (
              <div className="space-y-4 text-xs sm:text-sm">
                {/* Header Rating */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500 font-bold block">診斷分析時間</span>
                    <span className="text-xs font-mono text-slate-800 font-bold">{analysis.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-slate-700 font-bold">風控評級:</span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-xl border ${getRiskBadgeColor(
                        analysis.riskRating
                      )}`}
                    >
                      {analysis.riskRating}
                    </span>
                  </div>
                </div>

                {/* Overall Summary */}
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl space-y-1.5">
                  <div className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" /> 總評摘要
                  </div>
                  <p className="text-slate-800 text-xs sm:text-sm leading-relaxed font-medium">
                    {analysis.summary}
                  </p>
                </div>

                {/* Asset Allocation Comment */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1.5">
                  <div className="text-xs font-bold text-sky-700 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> 持股佈局與配置講評
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed">{analysis.allocationComment}</p>
                </div>

                {/* Grid: Opportunities & Warnings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-1.5">
                    <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" /> 潛力亮點與利多
                    </div>
                    <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                      {analysis.topOpportunities?.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl space-y-1.5">
                    <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" /> 風控提醒與觀測點
                    </div>
                    <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                      {analysis.riskWarnings?.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Advice */}
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-1.5">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-600" /> 操盤策略具體建議
                  </div>
                  <p className="text-amber-900 text-xs leading-relaxed font-medium">{analysis.actionAdvice}</p>
                </div>

                {/* Actions Row */}
                <div className="pt-2 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={onReanalyze}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 btn-interact"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> 重新診斷
                    </button>
                    <button
                      onClick={handleCopyReport}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 btn-interact"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? '已複製' : '複製報告'}
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveTab('chat')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition btn-interact flex items-center gap-1.5 shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> 對 AI 提出問題 ➔
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Interactive Real-time Q&A Chat */}
        {activeTab === 'chat' && (
          <div className="flex flex-col space-y-3 min-h-[360px] max-h-[500px]">
            {/* API Key Mode Header Bar (Mobile Friendly Free API Key Option) */}
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Key className="w-3.5 h-3.5 text-purple-600" />
                  <span className="font-semibold">連線模式:</span>
                  <span className={`font-mono text-[11px] px-2 py-0.5 rounded-full border ${
                    customApiKey ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    {customApiKey ? '已綁定自備 Google API Key (個人額度)' : '預設伺服器代理 / 智庫代理模式'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    playClickSound();
                    setShowApiKeyConfig(!showApiKeyConfig);
                  }}
                  className="text-[11px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-xl border border-purple-200 transition btn-interact"
                >
                  ⚙️ API Key 設定 {showApiKeyConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Expandable API Key Drawer */}
              {showApiKeyConfig && (
                <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-2.5 animate-in fade-in duration-200">
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    💡 在外行動裝置若遇伺服器網路壅塞或免費次數上限，可貼上個人免費 Google Gemini API 金鑰。金鑰僅儲存於您本地瀏覽器 (localStorage)。
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="貼上您的 Google Gemini API Key (AIzaSy...)"
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-600"
                    />
                    <button
                      onClick={() => handleSaveApiKey(customApiKey)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shrink-0 flex items-center gap-1"
                    >
                      {keySaved ? <Check className="w-3.5 h-3.5 text-white" /> : '儲存金鑰'}
                    </button>
                    {customApiKey && (
                      <button
                        onClick={() => handleSaveApiKey('')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-xl text-xs transition shrink-0 border border-slate-200"
                      >
                        重置
                      </button>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>還沒有 Gemini API Key？完全免費 1 秒申請：</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-800 font-bold underline flex items-center gap-1"
                    >
                      免費領取 Google API Key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-100 shrink-0">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp)}
                  disabled={isSending}
                  className="text-[11px] bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-xl transition hover:border-purple-300 text-left disabled:opacity-50 font-medium"
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Chat Messages Scroll Window */}
            <div className="flex-1 overflow-y-auto space-y-3 p-1 pr-2">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 items-start ${
                    msg.sender === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-purple-600 text-white shadow-xs'
                    }`}
                  >
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none font-medium'
                        : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none whitespace-pre-wrap'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className="text-[9px] opacity-60 block text-right mt-1 font-mono">
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex gap-2.5 items-center text-purple-700 text-xs py-2 animate-pulse font-bold">
                  <div className="w-7 h-7 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  </div>
                  <span>Gemini AI 思考與分析持股數據中...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2 pt-2 border-t border-slate-200 shrink-0"
            >
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="對持股有疑問？即時詢問 Gemini AI..."
                disabled={isSending}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-600 transition"
              />
              <button
                type="submit"
                disabled={!inputMsg.trim() || isSending}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 btn-interact shrink-0"
              >
                <Send className="w-3.5 h-3.5" /> 發送
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
