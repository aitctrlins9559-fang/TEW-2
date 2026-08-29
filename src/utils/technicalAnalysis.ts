// Technical Analysis Indicators & Utilities for Stock Charting

export interface CandleData {
  timestamp: number;
  dateStr: string;
  timeStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 1. Simple Moving Average (SMA)
export function calculateSMA(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    const startIdx = Math.max(0, i - period + 1);
    const slice = data.slice(startIdx, i + 1).filter((v): v is number => v !== null && !isNaN(v));
    if (slice.length === 0) {
      result.push(null);
    } else {
      const sum = slice.reduce((a, b) => a + b, 0);
      result.push(Number((sum / slice.length).toFixed(2)));
    }
  }
  return result;
}

// 2. Exponential Moving Average (EMA)
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let prevEma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (val === null || isNaN(val)) {
      result.push(prevEma);
      continue;
    }

    if (prevEma === null) {
      prevEma = val;
      result.push(Number(prevEma.toFixed(2)));
    } else {
      prevEma = (val - prevEma) * multiplier + prevEma;
      result.push(Number(prevEma.toFixed(2)));
    }
  }
  return result;
}

// 3. Bollinger Bands (20, 2) - Full Continuous Coverage from Bar 0
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
  bandwidth: (number | null)[];
} {
  const middle = calculateSMA(prices, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const bandwidth: (number | null)[] = [];

  for (let i = 0; i < prices.length; i++) {
    const midVal = middle[i];
    if (midVal === null) {
      upper.push(null);
      lower.push(null);
      bandwidth.push(null);
      continue;
    }

    const startIdx = Math.max(0, i - period + 1);
    const slice = prices.slice(startIdx, i + 1);
    const count = slice.length;
    
    let stdDev = 0;
    if (count > 1) {
      const variance =
        slice.reduce((acc, val) => acc + Math.pow(val - midVal, 2), 0) / count;
      stdDev = Math.sqrt(variance);
    } else {
      stdDev = midVal * 0.003;
    }

    const u = Number((midVal + stdDevMultiplier * stdDev).toFixed(2));
    const l = Number((midVal - stdDevMultiplier * stdDev).toFixed(2));
    upper.push(u);
    lower.push(l);
    bandwidth.push(midVal > 0 ? Number((((u - l) / midVal) * 100).toFixed(2)) : null);
  }

  return { upper, middle, lower, bandwidth };
}

// 4. Relative Strength Index (RSI 14)
export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const rsi: (number | null)[] = [];
  if (prices.length === 0) return [];
  if (prices.length === 1) return [50];

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      rsi.push(50);
      continue;
    }

    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    if (i <= period) {
      avgGain = (avgGain * (i - 1) + gain) / i;
      avgLoss = (avgLoss * (i - 1) + loss) / i;
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const currentRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    rsi.push(Number(Math.max(0, Math.min(100, currentRsi)).toFixed(1)));
  }

  return rsi;
}

// 5. Stochastic Oscillator (KD 9, 3, 3)
export function calculateKD(
  highs: number[],
  lows: number[],
  closes: number[],
  n: number = 9,
  m1: number = 3,
  m2: number = 3
): { k: (number | null)[]; d: (number | null)[] } {
  const kArr: (number | null)[] = [];
  const dArr: (number | null)[] = [];

  let lastK = 50;
  let lastD = 50;

  for (let i = 0; i < closes.length; i++) {
    const startIdx = Math.max(0, i - n + 1);
    const highSlice = highs.slice(startIdx, i + 1);
    const lowSlice = lows.slice(startIdx, i + 1);
    const maxHigh = Math.max(...highSlice);
    const minLow = Math.min(...lowSlice);
    const close = closes[i];

    const rsv = maxHigh === minLow ? 50 : ((close - minLow) / (maxHigh - minLow)) * 100;

    const currentK = (1 / m1) * rsv + ((m1 - 1) / m1) * lastK;
    const currentD = (1 / m2) * currentK + ((m2 - 1) / m2) * lastD;

    lastK = currentK;
    lastD = currentD;

    kArr.push(Number(currentK.toFixed(1)));
    dArr.push(Number(currentD.toFixed(1)));
  }

  return { k: kArr, d: dArr };
}

// 6. MACD (12, 26, 9)
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  dif: (number | null)[];
  dem: (number | null)[];
  osc: (number | null)[];
} {
  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  const dif: (number | null)[] = [];
  const difValid: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    const fast = emaFast[i];
    const slow = emaSlow[i];
    if (fast !== null && slow !== null) {
      const val = Number((fast - slow).toFixed(3));
      dif.push(val);
      difValid.push(val);
    } else {
      dif.push(0);
      difValid.push(0);
    }
  }

  const emaSignal = calculateEMA(difValid, signalPeriod);
  const dem: (number | null)[] = [];
  const osc: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    const d = dif[i] ?? 0;
    const s = emaSignal[i] ?? 0;
    dem.push(s);
    osc.push(Number(((d - s) * 2).toFixed(3)));
  }

  return { dif, dem, osc };
}

// 7. Support, Resistance & Pivot Levels
export function calculateSupportResistance(highs: number[], lows: number[], closes: number[]) {
  if (closes.length === 0) return { resistance: 0, support: 0, pivot: 0, maxRecent: 0, minRecent: 0 };

  const recentLookback = Math.min(30, closes.length);
  const recentHighs = highs.slice(-recentLookback);
  const recentLows = lows.slice(-recentLookback);
  const recentCloses = closes.slice(-recentLookback);

  const h = Math.max(...recentHighs);
  const l = Math.min(...recentLows);
  const c = recentCloses[recentCloses.length - 1];

  const pivot = Number(((h + l + c) / 3).toFixed(2));
  const r1 = Number((2 * pivot - l).toFixed(2));
  const s1 = Number((2 * pivot - h).toFixed(2));
  const r2 = Number((pivot + (h - l)).toFixed(2));
  const s2 = Number((pivot - (h - l)).toFixed(2));

  return {
    pivot,
    resistance: r1,
    resistance2: r2,
    support: s1,
    support2: s2,
    maxRecent: h,
    minRecent: l,
  };
}

// 8. Comprehensive Technical Diagnosis
export interface TechnicalDiagnosis {
  score: number; // 0-100 Bullish Score
  overallSignal: '強烈偏多' | '穩健偏多' | '區間震盪' | '偏弱整理' | '強烈偏空';
  signalColor: string;
  maTrend: string;
  maSignalType: 'bullish' | 'neutral' | 'bearish';
  kdSignal: string;
  kdSignalType: 'bullish' | 'neutral' | 'bearish';
  rsiSignal: string;
  rsiSignalType: 'bullish' | 'neutral' | 'bearish';
  macdSignal: string;
  macdSignalType: 'bullish' | 'neutral' | 'bearish';
  volumeSignal: string;
  keyAdvice: string;
}

export function evaluateTechnicalDiagnosis(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  isRedUp: boolean
): TechnicalDiagnosis {
  if (closes.length < 5) {
    return {
      score: 50,
      overallSignal: '區間震盪',
      signalColor: '#64748b',
      maTrend: '數據收集中',
      maSignalType: 'neutral',
      kdSignal: '中性觀察',
      kdSignalType: 'neutral',
      rsiSignal: '50 均衡區',
      rsiSignalType: 'neutral',
      macdSignal: '中性',
      macdSignalType: 'neutral',
      volumeSignal: '量能平穩',
      keyAdvice: '建議觀察後續均線表態與量能變化。',
    };
  }

  const lastClose = closes[closes.length - 1];
  const ma5 = calculateSMA(closes, 5).filter((x): x is number => x !== null).pop() || lastClose;
  const ma10 = calculateSMA(closes, 10).filter((x): x is number => x !== null).pop() || lastClose;
  const ma20 = calculateSMA(closes, 20).filter((x): x is number => x !== null).pop() || lastClose;

  let score = 50;

  // 1. MA Trend Evaluation
  let maTrend = '均線糾結整理';
  let maSignalType: 'bullish' | 'neutral' | 'bearish' = 'neutral';
  if (lastClose >= ma5 && ma5 >= ma10 && ma10 >= ma20) {
    maTrend = '短中多頭排列 (站穩月線)';
    maSignalType = 'bullish';
    score += 18;
  } else if (lastClose <= ma5 && ma5 <= ma10 && ma10 <= ma20) {
    maTrend = '空頭排列 (受制於月線)';
    maSignalType = 'bearish';
    score -= 18;
  } else if (lastClose >= ma5 && lastClose >= ma20) {
    maTrend = '偏多強勢震盪';
    maSignalType = 'bullish';
    score += 10;
  } else if (lastClose < ma20) {
    maTrend = '跌破月線轉弱';
    maSignalType = 'bearish';
    score -= 10;
  }

  // 2. KD Evaluation
  const kd = calculateKD(highs, lows, closes);
  const validK = kd.k.filter((x): x is number => x !== null);
  const validD = kd.d.filter((x): x is number => x !== null);
  let kdSignal = 'KD 區間整理 (無顯著交叉)';
  let kdSignalType: 'bullish' | 'neutral' | 'bearish' = 'neutral';

  if (validK.length >= 2 && validD.length >= 2) {
    const kNow = validK[validK.length - 1];
    const dNow = validD[validD.length - 1];
    const kPrev = validK[validK.length - 2];
    const dPrev = validD[validD.length - 2];

    if (kPrev <= dPrev && kNow > dNow && kNow < 50) {
      kdSignal = `KD 低檔黃金交叉 (K:${kNow} D:${dNow})`;
      kdSignalType = 'bullish';
      score += 16;
    } else if (kPrev >= dPrev && kNow < dNow && kNow > 70) {
      kdSignal = `KD 高檔死亡交叉 (K:${kNow} D:${dNow})`;
      kdSignalType = 'bearish';
      score -= 16;
    } else if (kNow >= 80) {
      kdSignal = `KD 進入超買鈍化區 (K:${kNow})`;
      kdSignalType = 'bullish';
      score += 8;
    } else if (kNow <= 20) {
      kdSignal = `KD 處於超賣低檔區 (K:${kNow})`;
      kdSignalType = 'bearish';
      score -= 8;
    } else if (kNow > dNow) {
      kdSignal = `KD 多方向上發散 (K:${kNow} > D:${dNow})`;
      kdSignalType = 'bullish';
      score += 8;
    } else {
      kdSignal = `KD 空方壓制整理 (K:${kNow} < D:${dNow})`;
      kdSignalType = 'bearish';
      score -= 8;
    }
  }

  // 3. RSI Evaluation
  const rsi = calculateRSI(closes, 14);
  const validRsi = rsi.filter((x): x is number => x !== null);
  const lastRsi = validRsi.length > 0 ? validRsi[validRsi.length - 1] : 50;
  let rsiSignal = `RSI(14): ${lastRsi} (常態震盪)`;
  let rsiSignalType: 'bullish' | 'neutral' | 'bearish' = 'neutral';

  if (lastRsi >= 70) {
    rsiSignal = `RSI(14): ${lastRsi} (強勢超買區)`;
    rsiSignalType = 'bullish';
    score += 8;
  } else if (lastRsi <= 30) {
    rsiSignal = `RSI(14): ${lastRsi} (弱勢超賣區)`;
    rsiSignalType = 'bearish';
    score -= 8;
  } else if (lastRsi >= 55) {
    rsiSignal = `RSI(14): ${lastRsi} (偏多強勢區)`;
    rsiSignalType = 'bullish';
    score += 6;
  } else {
    rsiSignal = `RSI(14): ${lastRsi} (偏弱防守區)`;
    rsiSignalType = 'bearish';
    score -= 6;
  }

  // 4. MACD Evaluation
  const macd = calculateMACD(closes);
  const validOsc = macd.osc.filter((x): x is number => x !== null);
  let macdSignal = 'MACD 零軸附近觀望';
  let macdSignalType: 'bullish' | 'neutral' | 'bearish' = 'neutral';

  if (validOsc.length >= 2) {
    const oscNow = validOsc[validOsc.length - 1];
    const oscPrev = validOsc[validOsc.length - 2];
    if (oscNow > 0 && oscNow >= oscPrev) {
      macdSignal = 'MACD 多方紅柱持續放大';
      macdSignalType = 'bullish';
      score += 10;
    } else if (oscNow > 0 && oscNow < oscPrev) {
      macdSignal = 'MACD 多方紅柱收斂轉折';
      macdSignalType = 'neutral';
      score += 3;
    } else if (oscNow < 0 && oscNow <= oscPrev) {
      macdSignal = 'MACD 空方綠柱持續放大';
      macdSignalType = 'bearish';
      score -= 10;
    } else {
      macdSignal = 'MACD 空方綠柱收斂回溫';
      macdSignalType = 'neutral';
      score -= 3;
    }
  }

  // 5. Volume Evaluation
  let volumeSignal = '量能中性平穩';
  if (volumes.length >= 5) {
    const lastVol = volumes[volumes.length - 1];
    const avgVol = volumes.slice(-6, -1).reduce((a, b) => a + b, 0) / 5;
    if (lastVol > avgVol * 1.5) {
      volumeSignal = '爆量交投熱絡 (>5日均量1.5倍)';
      if (lastClose >= (closes[closes.length - 2] || lastClose)) {
        score += 8;
      } else {
        score -= 8;
      }
    } else if (lastVol < avgVol * 0.6) {
      volumeSignal = '量縮觀望整理 (<5日均量0.6倍)';
    }
  }

  score = Math.max(5, Math.min(95, score));

  let overallSignal: '強烈偏多' | '穩健偏多' | '區間震盪' | '偏弱整理' | '強烈偏空' = '區間震盪';
  let signalColor = '#64748b';

  const upColor = isRedUp ? '#e11d48' : '#059669';
  const downColor = isRedUp ? '#059669' : '#e11d48';

  if (score >= 75) {
    overallSignal = '強烈偏多';
    signalColor = upColor;
  } else if (score >= 60) {
    overallSignal = '穩健偏多';
    signalColor = isRedUp ? '#f43f5e' : '#10b981';
  } else if (score <= 25) {
    overallSignal = '強烈偏空';
    signalColor = downColor;
  } else if (score <= 40) {
    overallSignal = '偏弱整理';
    signalColor = isRedUp ? '#10b981' : '#f43f5e';
  } else {
    overallSignal = '區間震盪';
    signalColor = '#eab308';
  }

  let keyAdvice = '多空力道均衡，建議沿支撐壓力區間操作。';
  if (score >= 70) {
    keyAdvice = '均線多頭且指標發散，拉回守均線偏多布局。';
  } else if (score <= 30) {
    keyAdvice = '均線下彎受壓，建議嚴設停損或耐心等待打底訊號。';
  }

  return {
    score,
    overallSignal,
    signalColor,
    maTrend,
    maSignalType,
    kdSignal,
    kdSignalType,
    rsiSignal,
    rsiSignalType,
    macdSignal,
    macdSignalType,
    volumeSignal,
    keyAdvice,
  };
}

// 9. Simulated 5-Tier Level-2 Order Book (五檔即時盤口)
export interface OrderBookTier {
  price: number;
  volume: number;
  pct: number;
}

export interface OrderBookData {
  bids: OrderBookTier[]; // 委買 5 檔
  asks: OrderBookTier[]; // 委賣 5 檔
  totalBidVol: number;
  totalAskVol: number;
  bidRatio: number;
  askRatio: number;
  outerDrivePct: number; // 外盤主動買成交比重
  innerDrivePct: number; // 內盤主動賣成交比重
}

export function generateOrderBook(currentPrice: number, prevClose: number, isUS: boolean): OrderBookData {
  const p = currentPrice > 0 ? currentPrice : 100;
  const tickStep = p > 500 ? 1 : p > 100 ? 0.5 : p > 50 ? 0.1 : 0.05;

  const bids: OrderBookTier[] = [];
  const asks: OrderBookTier[] = [];

  let totalBid = 0;
  let totalAsk = 0;

  // Base multiplier based on symbol
  const seed = Math.floor(p * 100) % 7;

  for (let i = 1; i <= 5; i++) {
    const askP = Number((p + i * tickStep).toFixed(2));
    const bidP = Number((Math.max(0.01, p - (i - 1) * tickStep)).toFixed(2));

    const askVol = Math.floor((30 + i * 15 + ((seed * i * 17) % 40)) * (isUS ? 10 : 1));
    const bidVol = Math.floor((25 + (6 - i) * 18 + ((seed * i * 23) % 45)) * (isUS ? 10 : 1));

    totalAsk += askVol;
    totalBid += bidVol;

    asks.push({ price: askP, volume: askVol, pct: 0 });
    bids.push({ price: bidP, volume: bidVol, pct: 0 });
  }

  // Calculate percentages
  const maxVol = Math.max(...bids.map((b) => b.volume), ...asks.map((a) => a.volume), 1);
  bids.forEach((b) => (b.pct = Math.round((b.volume / maxVol) * 100)));
  asks.forEach((a) => (a.pct = Math.round((a.volume / maxVol) * 100)));

  const grandTotal = totalBid + totalAsk;
  const bidRatio = grandTotal > 0 ? Math.round((totalBid / grandTotal) * 100) : 50;
  const askRatio = 100 - bidRatio;

  const isUp = p >= prevClose;
  const outerDrivePct = isUp ? Math.min(78, 52 + (seed % 20)) : Math.max(25, 46 - (seed % 18));
  const innerDrivePct = 100 - outerDrivePct;

  return {
    bids,
    asks: asks.reverse(), // Highest ask at top, closest ask at bottom
    totalBidVol: totalBid,
    totalAskVol: totalAsk,
    bidRatio,
    askRatio,
    outerDrivePct,
    innerDrivePct,
  };
}
