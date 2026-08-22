import { MarketType } from '../types';

export interface MarketStatusInfo {
  tradingDateStr: string; // e.g. "8月11日"
  shortDateStr: string;   // e.g. "8/11"
  isMarketOpen: boolean;  // whether market is currently trading
  statusText: string;     // e.g. "8月11日 收盤價" or "8月11日 盤中即時"
}

export function getMarketStatusInfo(
  market: MarketType,
  symbol: string,
  lastTs?: number
): MarketStatusInfo {
  const now = new Date();
  
  // Get date object from last timestamp if available, otherwise current time
  const tradeDateObj = lastTs && lastTs > 0 ? new Date(lastTs * 1000) : now;
  const month = tradeDateObj.getMonth() + 1;
  const day = tradeDateObj.getDate();
  const tradingDateStr = `${month}月${day}日`;
  const shortDateStr = `${month}/${day}`;

  const isUS = market === 'us' || symbol.startsWith('^D') || symbol.startsWith('^G') || symbol.startsWith('^I') || symbol === 'TSLA' || symbol === 'NVDA' || symbol === 'AAPL';
  
  let isMarketOpen = false;

  try {
    if (isUS) {
      // US Market: Eastern Time (America/New_York)
      const nyDateStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
      const nyDate = new Date(nyDateStr);
      const dayOfWeek = nyDate.getDay(); // 0 = Sun, 6 = Sat
      const mins = nyDate.getHours() * 60 + nyDate.getMinutes();
      // Regular US trading hours: Mon-Fri 09:30 (570) to 16:00 (960)
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && mins >= 570 && mins < 960) {
        isMarketOpen = true;
      }
    } else {
      // Taiwan / Asian Market: Asia/Taipei Time
      const twDateStr = now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
      const twDate = new Date(twDateStr);
      const dayOfWeek = twDate.getDay();
      const mins = twDate.getHours() * 60 + twDate.getMinutes();
      // Taiwan trading hours: Mon-Fri 09:00 (540) to 13:30 (810)
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && mins >= 540 && mins < 810) {
        isMarketOpen = true;
      }
    }
  } catch {
    const dayOfWeek = now.getDay();
    isMarketOpen = dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  // If last timestamp is provided and > 45 mins old during market hours, mark as closed/after-hours
  if (isMarketOpen && lastTs && lastTs > 0) {
    const ageInMinutes = (now.getTime() - lastTs * 1000) / 60000;
    if (ageInMinutes > 45) {
      isMarketOpen = false;
    }
  }

  const statusText = isMarketOpen
    ? `盤中即時現價 (${tradingDateStr})`
    : `${tradingDateStr} 收盤價`;

  return {
    tradingDateStr,
    shortDateStr,
    isMarketOpen,
    statusText,
  };
}
