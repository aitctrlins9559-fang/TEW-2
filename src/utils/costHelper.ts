import { StockPosition } from '../types';

export interface TransactionCostDetails {
  buyCommissionTWD: number;
  sellCommissionTWD: number;
  sellTaxTWD: number;
  totalCostTWD: number;
  grossProfitTWD: number;
  netProfitTWD: number;
  grossRoiPct: number;
  netRoiPct: number;
  taxRatePct: number;
  isETF: boolean;
  buyValueTWD: number;
  sellValueTWD: number;
}

export const DISCOUNT_OPTIONS = [
  { label: '2.8折 (常見線上券商)', value: 0.28 },
  { label: '6折 (傳統臨櫃券商)', value: 0.6 },
  { label: '5折 (一般電子下單)', value: 0.5 },
  { label: '3折 (大額VIP折扣)', value: 0.3 },
  { label: '1.425折 (極低手續費)', value: 0.1425 },
  { label: '無折扣 (10折原價)', value: 1.0 },
  { label: '免手續費 (0折)', value: 0.0 },
];

/**
 * 計算台股/美股之預估交易成本 (手續費 + 證交稅)
 * @param stock 持股部位
 * @param usdTwdRate 匯率
 * @param discountRate 手續費折扣 (預設 0.28 即 2.8折)
 */
export function calculateTransactionCost(
  stock: StockPosition,
  usdTwdRate: number,
  discountRate: number = 0.28
): TransactionCostDetails {
  const isUS = stock.market === 'us';
  const marketFx = isUS ? usdTwdRate : 1;
  const buyFx = isUS ? stock.buyRate || usdTwdRate : 1;

  const currentPrice = typeof stock.price === 'number' && stock.price > 0 ? stock.price : stock.cost;

  const buyValueTWD = stock.shares * stock.cost * buyFx;
  const sellValueTWD = stock.shares * currentPrice * marketFx;
  const grossProfitTWD = sellValueTWD - buyValueTWD;
  const grossRoiPct = buyValueTWD > 0 ? (grossProfitTWD / buyValueTWD) * 100 : 0;

  if (isUS) {
    // 美股多數海外券商免手續費與證交稅
    return {
      buyCommissionTWD: 0,
      sellCommissionTWD: 0,
      sellTaxTWD: 0,
      totalCostTWD: 0,
      grossProfitTWD,
      netProfitTWD: grossProfitTWD,
      grossRoiPct,
      netRoiPct: grossRoiPct,
      taxRatePct: 0,
      isETF: false,
      buyValueTWD,
      sellValueTWD,
    };
  }

  // 台股算牌邏輯：
  // 1. 券商買入手續費: 買入金額 * 0.1425% * 折扣 (每筆最低 20 元)
  let buyCommissionTWD = 0;
  if (Array.isArray(stock.transactions) && stock.transactions.length > 0) {
    buyCommissionTWD = stock.transactions.reduce((sum, tx) => {
      const txVal = tx.shares * tx.cost * (isUS ? tx.buyRate || usdTwdRate : 1);
      const rawComm = txVal * 0.001425 * discountRate;
      const comm = txVal > 0 ? Math.max(20, Math.round(rawComm)) : 0;
      return sum + comm;
    }, 0);
  } else {
    const rawBuyCommission = buyValueTWD * 0.001425 * discountRate;
    buyCommissionTWD = buyValueTWD > 0 ? Math.max(20, Math.round(rawBuyCommission)) : 0;
  }

  // 2. 券商賣出手續費: 賣出金額 * 0.1425% * 折扣 (最低 20 元)
  const rawSellCommission = sellValueTWD * 0.001425 * discountRate;
  const sellCommissionTWD = sellValueTWD > 0 ? Math.max(20, Math.round(rawSellCommission)) : 0;

  // 3. 證券交易稅: 個股 0.3%, ETF (代號 00 開頭) 0.1%
  const isETF = stock.symbol.startsWith('00');
  const taxRate = isETF ? 0.001 : 0.003;
  const sellTaxTWD = Math.round(sellValueTWD * taxRate);

  const totalCostTWD = buyCommissionTWD + sellCommissionTWD + sellTaxTWD;
  const netProfitTWD = grossProfitTWD - totalCostTWD;
  const netRoiPct = buyValueTWD > 0 ? (netProfitTWD / buyValueTWD) * 100 : 0;

  return {
    buyCommissionTWD,
    sellCommissionTWD,
    sellTaxTWD,
    totalCostTWD,
    grossProfitTWD,
    netProfitTWD,
    grossRoiPct,
    netRoiPct,
    taxRatePct: taxRate * 100,
    isETF,
    buyValueTWD,
    sellValueTWD,
  };
}

export interface PortfolioCostSummary {
  totalBuyCommissionTWD: number;
  totalSellCommissionTWD: number;
  totalSellTaxTWD: number;
  totalTransactionCostTWD: number;
  totalGrossProfitTWD: number;
  totalNetProfitTWD: number;
  totalBuyValueTWD: number;
  totalSellValueTWD: number;
  overallNetRoiPct: number;
}

export function calculatePortfolioCostSummary(
  portfolio: StockPosition[],
  usdTwdRate: number,
  discountRate: number = 0.28
): PortfolioCostSummary {
  let totalBuyCommissionTWD = 0;
  let totalSellCommissionTWD = 0;
  let totalSellTaxTWD = 0;
  let totalTransactionCostTWD = 0;
  let totalGrossProfitTWD = 0;
  let totalNetProfitTWD = 0;
  let totalBuyValueTWD = 0;
  let totalSellValueTWD = 0;

  portfolio.forEach((stock) => {
    const costDetails = calculateTransactionCost(stock, usdTwdRate, discountRate);
    totalBuyCommissionTWD += costDetails.buyCommissionTWD;
    totalSellCommissionTWD += costDetails.sellCommissionTWD;
    totalSellTaxTWD += costDetails.sellTaxTWD;
    totalTransactionCostTWD += costDetails.totalCostTWD;
    totalGrossProfitTWD += costDetails.grossProfitTWD;
    totalNetProfitTWD += costDetails.netProfitTWD;
    totalBuyValueTWD += costDetails.buyValueTWD;
    totalSellValueTWD += costDetails.sellValueTWD;
  });

  const overallNetRoiPct =
    totalBuyValueTWD > 0 ? (totalNetProfitTWD / totalBuyValueTWD) * 100 : 0;

  return {
    totalBuyCommissionTWD,
    totalSellCommissionTWD,
    totalSellTaxTWD,
    totalTransactionCostTWD,
    totalGrossProfitTWD,
    totalNetProfitTWD,
    totalBuyValueTWD,
    totalSellValueTWD,
    overallNetRoiPct,
  };
}

