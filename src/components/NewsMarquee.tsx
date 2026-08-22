import React from 'react';
import { Radio, ExternalLink } from 'lucide-react';
import { NewsItem } from '../types';

interface NewsMarqueeProps {
  news: NewsItem[];
  lastNewsTime: string;
}

export const NewsMarquee: React.FC<NewsMarqueeProps> = ({ news, lastNewsTime }) => {
  const displayNews = news.length > 0 ? [...news, ...news] : [];

  return (
    <div className="glass-card p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5 bg-white">
      <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
          <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
          <span>財經快訊頭條</span>
          <span className="text-[10px] text-slate-400 font-mono ml-1">{lastNewsTime}</span>
        </div>
        <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> 點擊看外電
        </span>
      </div>

      <div className="overflow-hidden whitespace-nowrap relative bg-slate-50 py-2.5 px-3 rounded-xl border border-slate-200/60">
        <div className="inline-flex gap-8 animate-marquee text-xs text-slate-800 font-medium">
          {displayNews.length > 0 ? (
            displayNews.map((n, idx) => (
              <a
                key={idx}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-600 transition inline-flex items-center gap-2 group"
              >
                <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-100">
                  頭條
                </span>
                <span className="group-hover:underline">{n.title}</span>
                <span className="text-slate-300 mx-2">•</span>
              </a>
            ))
          ) : (
            <span className="text-slate-400">即時財經快訊連線中...</span>
          )}
        </div>
      </div>
    </div>
  );
};
