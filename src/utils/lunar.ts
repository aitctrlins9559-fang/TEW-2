import { Lunar } from 'lunar-javascript';
import { getTaiwanDateString } from './format';

export interface LunarInfo {
  lunarText: string;
  ganZhiText: string;
  yiList: string;
  jiList: string;
  chong: string;
  sha: string;
  cai: string;
  dateStr: string;
  tradingMindset: string;
}

// 簡體中文轉繁體中文對照與轉換函式
const S2T_MAP: Record<string, string> = {
  冲: '衝',
  煞: '煞',
  财: '財',
  喜: '喜',
  福: '福',
  阳: '陽',
  阴: '陰',
  东: '東',
  西: '西',
  南: '南',
  北: '北',
  开: '開',
  市: '市',
  纳: '納',
  财神: '財神',
  动: '動',
  土: '土',
  修: '修',
  造: '造',
  扫: '掃',
  舍: '捨',
  发: '髮',
  会: '會',
  亲: '親',
  进: '進',
  盖: '蓋',
  屋: '屋',
  筑: '築',
  堤: '堤',
  补: '補',
  垣: '牆',
  词: '詞',
  讼: '訟',
  争: '爭',
  执: '執',
  针: '針',
  灸: '灸',
  种: '種',
  畜: '畜',
  坏: '壞',
  余: '餘',
  事: '事',
  勿: '勿',
  取: '取',
  挂: '掛',
  匾: '匾',
  门: '門',
  车: '車',
  器: '器',
  齐: '齊',
  醮: '醮',
  庙: '廟',
  灶: '灶',
  启: '啟',
  攒: '攢',
  采: '採',
  订: '訂',
  盟: '盟',
  约: '約',
  积: '積',
  万: '萬',
  胜: '勝',
  胜率: '勝率',
  买: '買',
  卖: '賣',
  盘: '盤',
  仓: '倉',
  亏: '虧',
  损: '損',
  风: '風',
  控: '控',
};

function toTraditional(text: string): string {
  if (!text) return '';
  let result = text;
  // 處理常見簡體詞彙
  const phrases: [RegExp, string][] = [
    [/冲/g, '衝'],
    [/财神/g, '財神'],
    [/开市/g, '開市'],
    [/纳财/g, '納財'],
    [/动土/g, '動土'],
    [/修造/g, '修造'],
    [/扫舍/g, '掃捨'],
    [/理发/g, '理髮'],
    [/会亲友/g, '會親友'],
    [/进人口/g, '進人口'],
    [/盖屋/g, '蓋屋'],
    [/筑堤/g, '築堤'],
    [/补垣/g, '補牆'],
    [/词讼/g, '詞訟'],
    [/争执/g, '爭執'],
    [/针灸/g, '針灸'],
    [/栽种/g, '栽種'],
    [/纳畜/g, '納畜'],
    [/坏垣/g, '壞牆'],
    [/余事勿取/g, '餘事勿取'],
    [/挂匾/g, '掛匾'],
    [/安门/g, '安門'],
    [/造车器/g, '造車器'],
    [/齐醮/g, '齊醮'],
    [/斋醮/g, '齋醮'],
    [/造庙/g, '造廟'],
    [/启攒/g, '啟攢'],
    [/纳采/g, '納採'],
    [/订盟/g, '訂盟'],
    [/正南/g, '正南'],
    [/正北/g, '正北'],
    [/正东/g, '正東'],
    [/正西/g, '正西'],
    [/东南/g, '東南'],
    [/东北/g, '東北'],
    [/西南/g, '西南'],
    [/西北/g, '西北'],
    [/属鼠/g, '屬鼠'],
    [/属牛/g, '屬牛'],
    [/属虎/g, '屬虎'],
    [/属兔/g, '屬兔'],
    [/属龙/g, '屬龍'],
    [/属蛇/g, '屬蛇'],
    [/属马/g, '屬馬'],
    [/属羊/g, '屬羊'],
    [/属猴/g, '屬猴'],
    [/属鸡/g, '屬雞'],
    [/属狗/g, '屬狗'],
    [/属猪/g, '屬豬'],
  ];

  for (const [pattern, repl] of phrases) {
    result = result.replace(pattern, repl);
  }

  // 單字備用轉換
  return result
    .split('')
    .map((ch) => S2T_MAP[ch] || ch)
    .join('');
}

const TRADING_MINDSETS = [
  '順勢而為，嚴守風控；急拉不追，拉回找買點。',
  '多頭急跌買點現，空頭反彈賣點明確；紀律勝過預測，風控定成敗。',
  '行情在絕望中誕生，在半信半疑中成長，在憧憬中成熟，在樂觀中毀滅。',
  '勝率是表象，盈虧比才是王道；寧可錯過行情，絕不拿本金冒險。',
  '順勢操作莫逆風，留得資金隨時在；分批建倉防波動，止損果斷保平安。',
  '不賺最後一根甘蔗，獲利入袋才是真；市場永不缺機會，只缺冷靜的頭腦。',
  '漲時重勢、跌時重質；熱門標的看動能，績優龍頭護資產。',
];

const TRADING_YI_ITEMS = [
  '金流輪動',
  '紀律分批',
  '嚴守止損',
  '獲利入袋',
  '順勢操作',
  '逢低佈局',
  '檢視權重',
];

const TRADING_JI_ITEMS = [
  '盲目追高',
  '情緒加碼',
  '頻繁換股',
  '槓桿失控',
  '聽信明牌',
  '過度交易',
  '恐慌砍倉',
];

export function getLunarCalendarInfo(): LunarInfo {
  try {
    const d = new Date();
    const lunar = Lunar.fromDate(d);

    const yearGanZhi = `${lunar.getYearInGanZhi()}年(${toTraditional(lunar.getYearShengXiao())})`;
    const monthGanZhi = `${lunar.getMonthInGanZhi()}月`;
    const dayGanZhi = `${lunar.getDayInGanZhi()}日`;
    const lunarMonthDay = `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;

    const rawYi = lunar.getDayYi().slice(0, 4).map(toTraditional);
    const rawJi = lunar.getDayJi().slice(0, 4).map(toTraditional);

    // 隨機揀選 1~2 個操盤宜忌，融合農曆與股市戰情
    const dayIndex = d.getDate() % TRADING_YI_ITEMS.length;
    const tradingYi = TRADING_YI_ITEMS[dayIndex];
    const tradingJi = TRADING_JI_ITEMS[dayIndex];

    const yiList = [...rawYi, tradingYi].filter(Boolean).join('、');
    const jiList = [...rawJi, tradingJi].filter(Boolean).join('、');

    const chong = toTraditional(lunar.getDayChongDesc());
    const sha = toTraditional(lunar.getDaySha());
    const cai = toTraditional(lunar.getDayPositionCaiDesc());

    const mindset = TRADING_MINDSETS[d.getDate() % TRADING_MINDSETS.length];

    return {
      lunarText: `農曆 ${lunarMonthDay}`,
      ganZhiText: `${yearGanZhi} ${monthGanZhi} ${dayGanZhi}`,
      yiList: yiList || '金流輪動、紀律建倉',
      jiList: jiList || '盲目追高、情緒加碼',
      chong,
      sha,
      cai,
      dateStr: getTaiwanDateString(),
      tradingMindset: mindset,
    };
  } catch {
    return {
      lunarText: '農曆計算中',
      ganZhiText: '乙巳年(蛇)',
      yiList: '祭祀、祈福、金流輪動、順勢操作',
      jiList: '詞訟、爭執、盲目追高、情緒加碼',
      chong: '衝豬',
      sha: '東',
      cai: '正財東南',
      dateStr: getTaiwanDateString(),
      tradingMindset: '順勢而為，嚴守風控；急拉不追，拉回找買點。',
    };
  }
}

