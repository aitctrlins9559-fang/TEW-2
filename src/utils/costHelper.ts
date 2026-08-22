import { StockPosition } from '../types';

export interface TransactionCostDetails {
  buyCommissionTWD: number;
  sellCommissionTWD: number;
  sellTaxTWD: number;
  totalCostTWD: number;
  netProfitTWD: number;
  netRoiPct: number;
}

/**
 * 計算台股/美股之預估交易成本 (手續費 + 證交稅)
 * @param stock 持股部位
 * @param usdTwdRate 匯率
 * @param discountRate 手續費折扣 (預設 0.28 即 28折)
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

  if (isUS) {
    // 美股多數海外券商免手續費與證交稅，或酌收微量規費
    return {
      buyCommissionTWD: 0,
      sellCommissionTWD: 0,
      sellTaxTWD: 0,
      totalCostTWD: 0,
      netProfitTWD: sellValueTWD - buyValueTWD,
      netRoiPct: buyValueTWD > 0 ? ((sellValueTWD - buyValueTWD) / buyValueTWD) * 100 : 0,
    };
  }

  // 台股算牌邏輯：
  // 1. 券商買入手續費: 買入金額 * 0.1425% * 折扣 (最低 20 元)
  const rawBuyCommission = buyValueTWD * 0.001425 * discountRate;
  const buyCommissionTWD = buyValueTWD > 0 ? Math.max(20, Math.round(rawBuyCommission)) : 0;

  // 2. 券商賣出手續費: 賣出金額 * 0.1425% * 折扣 (最低 20 元)
  const rawSellCommission = sellValueTWD * 0.001425 * discountRate;
  const sellCommissionTWD = sellValueTWD > 0 ? Math.max(20, Math.round(rawSellCommission)) : 0;

  // 3. 證券交易稅: 個股 0.3%, ETF (代號 00 開頭) 0.1%
  const isETF = stock.symbol.startsWith('00');
  const taxRate = isETF ? 0.001 : 0.003;
  const sellTaxTWD = Math.round(sellValueTWD * taxRate);

  const totalCostTWD = buyCommissionTWD + sellCommissionTWD + sellTaxTWD;
  const grossProfitTWD = sellValueTWD - buyValueTWD;
  const netProfitTWD = grossProfitTWD - totalCostTWD;
  const netRoiPct = buyValueTWD > 0 ? (netProfitTWD / buyValueTWD) * 100 : 0;

  return {
    buyCommissionTWD,
    sellCommissionTWD,
    sellTaxTWD,
    totalCostTWD,
    netProfitTWD,
    netRoiPct,
  };
}
