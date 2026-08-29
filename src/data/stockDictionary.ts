import { MarketType } from '../types';

export interface StockDictItem {
  symbol: string;
  name: string;
  market: MarketType;
}

export const BUILTIN_STOCK_DICTIONARY: StockDictItem[] = [
  // === 台灣熱門指數股票型基金 (ETF) ===
  { symbol: '0050', name: '元大台灣50', market: 'tse' },
  { symbol: '0056', name: '元大高股息', market: 'tse' },
  { symbol: '00878', name: '國泰永續高股息', market: 'tse' },
  { symbol: '00919', name: '群益台灣精選高息', market: 'tse' },
  { symbol: '00929', name: '復華台灣科技優息', market: 'tse' },
  { symbol: '00940', name: '元大台灣價值高息', market: 'tse' },
  { symbol: '006208', name: '富邦台50', market: 'tse' },
  { symbol: '00713', name: '元大台灣高息低波', market: 'tse' },
  { symbol: '00939', name: '統一台灣高息動能', market: 'tse' },
  { symbol: '00941', name: '中信上游半導體', market: 'tse' },
  { symbol: '00923', name: '群益台ESG低碳50', market: 'tse' },
  { symbol: '00891', name: '中信關鍵半導體', market: 'tse' },
  { symbol: '00881', name: '國泰台灣5G+', market: 'tse' },
  { symbol: '00900', name: '富邦特選高股息30', market: 'tse' },
  { symbol: '00915', name: '凱基優選高股息30', market: 'tse' },
  { symbol: '00918', name: '大華優利高股息30', market: 'tse' },
  { symbol: '00934', name: '中信成長高股息', market: 'tse' },
  { symbol: '00936', name: '台新永續高息中小', market: 'tse' },
  { symbol: '00944', name: '野村趨勢動能高息', market: 'tse' },
  { symbol: '00946', name: '群益科技高息成長', market: 'tse' },
  { symbol: '00692', name: '富邦公司治理', market: 'tse' },
  { symbol: '00850', name: '元大臺灣ESG永續', market: 'tse' },
  { symbol: '0052', name: '富邦科技', market: 'tse' },
  { symbol: '00830', name: '國泰費城半導體', market: 'tse' },
  { symbol: '00662', name: '富邦NASDAQ', market: 'tse' },
  { symbol: '00646', name: '元大S&P500', market: 'tse' },
  { symbol: '00757', name: '統一FANG+', market: 'tse' },
  { symbol: '00632R', name: '元大台灣50反1', market: 'tse' },
  { symbol: '00631L', name: '元大台灣50正2', market: 'tse' },
  { symbol: '00679B', name: '元大美債20年', market: 'tse' },
  { symbol: '00687B', name: '國泰20年美債', market: 'tse' },
  { symbol: '00937B', name: '群益ESG投等債20+', market: 'otc' },
  { symbol: '00720B', name: '元大投資級公司債', market: 'tse' },
  { symbol: '00772B', name: '中信高評級公司債', market: 'tse' },
  { symbol: '00773B', name: '中信優先金融債', market: 'tse' },
  { symbol: '00751B', name: '元大AAA至A公司債', market: 'tse' },
  { symbol: '00933B', name: '國泰10Y+金融債', market: 'tse' },
  { symbol: '00948B', name: '中信優息投資級債', market: 'tse' },

  // === 台股權值股 / 晶圓製造 / 半導體封測 (上市 TSE) ===
  { symbol: '2330', name: '台積電', market: 'tse' },
  { symbol: '2303', name: '聯電', market: 'tse' },
  { symbol: '3711', name: '日月光投控', market: 'tse' },
  { symbol: '6770', name: '力積電', market: 'tse' },
  { symbol: '2344', name: '華邦電', market: 'tse' },
  { symbol: '2408', name: '南亞科', market: 'tse' },
  { symbol: '2337', name: '旺宏', market: 'tse' },
  { symbol: '6239', name: '力成', market: 'tse' },
  { symbol: '8150', name: '南茂', market: 'tse' },
  { symbol: '2449', name: '京元電子', market: 'tse' },
  { symbol: '3264', name: '欣銓', market: 'otc' },
  { symbol: '6515', name: '穎崴', market: 'tse' },
  { symbol: '6223', name: '旺矽', market: 'otc' },
  { symbol: '3374', name: '精材', market: 'otc' },
  { symbol: '5347', name: '世界', market: 'otc' },
  { symbol: '6488', name: '環球晶', market: 'otc' },
  { symbol: '5483', name: '中美晶', market: 'otc' },
  { symbol: '3532', name: '台勝科', market: 'tse' },
  { symbol: '3707', name: '漢磊', market: 'otc' },
  { symbol: '3016', name: '嘉晶', market: 'otc' },
  { symbol: '3105', name: '穩懋', market: 'otc' },
  { symbol: '2455', name: '全新', market: 'tse' },
  { symbol: '8086', name: '宏捷科', market: 'otc' },

  // === IC 設計 / 矽智財 (IP) ===
  { symbol: '2454', name: '聯發科', market: 'tse' },
  { symbol: '2379', name: '瑞昱', market: 'tse' },
  { symbol: '3034', name: '聯詠', market: 'tse' },
  { symbol: '3035', name: '智原', market: 'tse' },
  { symbol: '3443', name: '創意', market: 'tse' },
  { symbol: '3661', name: '世芯-KY', market: 'tse' },
  { symbol: '3529', name: '力旺', market: 'otc' },
  { symbol: '5274', name: '信驊', market: 'otc' },
  { symbol: '5269', name: '祥碩', market: 'tse' },
  { symbol: '4966', name: '譜瑞-KY', market: 'otc' },
  { symbol: '6415', name: '矽力*-KY', market: 'tse' },
  { symbol: '6643', name: 'M31', market: 'otc' },
  { symbol: '6531', name: '愛普*', market: 'otc' },
  { symbol: '8054', name: '安國', market: 'otc' },
  { symbol: '2388', name: '威盛', market: 'tse' },
  { symbol: '2458', name: '義隆', market: 'tse' },
  { symbol: '4919', name: '新唐', market: 'tse' },
  { symbol: '3227', name: '原相', market: 'otc' },
  { symbol: '6202', name: '盛群', market: 'tse' },
  { symbol: '3545', name: '敦泰', market: 'tse' },
  { symbol: '8299', name: '群聯', market: 'otc' },
  { symbol: '3260', name: '威剛', market: 'otc' },
  { symbol: '2451', name: '創見', market: 'tse' },
  { symbol: '4967', name: '十銓', market: 'tse' },
  { symbol: '8271', name: '宇瞻', market: 'tse' },
  { symbol: '6462', name: '神盾', market: 'otc' },
  { symbol: '8016', name: '矽創', market: 'tse' },
  { symbol: '3014', name: '聯陽', market: 'tse' },

  // === AI 伺服器 / 電腦代工 / 品牌電腦 ===
  { symbol: '2317', name: '鴻海', market: 'tse' },
  { symbol: '2382', name: '廣達', market: 'tse' },
  { symbol: '3231', name: '緯創', market: 'tse' },
  { symbol: '6669', name: '緯穎', market: 'tse' },
  { symbol: '2356', name: '英業達', market: 'tse' },
  { symbol: '2324', name: '仁寶', market: 'tse' },
  { symbol: '4938', name: '和碩', market: 'tse' },
  { symbol: '2376', name: '技嘉', market: 'tse' },
  { symbol: '2377', name: '微星', market: 'tse' },
  { symbol: '2357', name: '華碩', market: 'tse' },
  { symbol: '2353', name: '宏碁', market: 'tse' },
  { symbol: '3706', name: '神達', market: 'tse' },
  { symbol: '2352', name: '佳世達', market: 'tse' },
  { symbol: '3515', name: '華擎', market: 'tse' },
  { symbol: '2425', name: '承啟', market: 'tse' },
  { symbol: '6150', name: '撼訊', market: 'otc' },
  { symbol: '2465', name: '麗臺', market: 'tse' },
  { symbol: '2399', name: '映泰', market: 'tse' },

  // === 機殼 / 散熱模組 / 電源 ===
  { symbol: '8210', name: '勤誠', market: 'tse' },
  { symbol: '3013', name: '晟銘電', market: 'tse' },
  { symbol: '3693', name: '營邦', market: 'otc' },
  { symbol: '6117', name: '迎廣', market: 'tse' },
  { symbol: '3017', name: '奇鋐', market: 'tse' },
  { symbol: '3324', name: '雙鴻', market: 'tse' },
  { symbol: '3653', name: '健策', market: 'tse' },
  { symbol: '6230', name: '超眾', market: 'tse' },
  { symbol: '3483', name: '力致', market: 'otc' },
  { symbol: '3338', name: '泰碩', market: 'tse' },
  { symbol: '2308', name: '台達電', market: 'tse' },
  { symbol: '2301', name: '光寶科', market: 'tse' },
  { symbol: '6412', name: '群電', market: 'tse' },
  { symbol: '6282', name: '康舒', market: 'tse' },
  { symbol: '3078', name: '僑威', market: 'otc' },
  { symbol: '3015', name: '全漢', market: 'tse' },

  // === 連接器 / 滑軌 / 被動元件 ===
  { symbol: '3533', name: '嘉澤', market: 'tse' },
  { symbol: '2059', name: '川湖', market: 'tse' },
  { symbol: '3665', name: '貿聯-KY', market: 'tse' },
  { symbol: '3023', name: '信邦', market: 'tse' },
  { symbol: '3526', name: '凡甲', market: 'otc' },
  { symbol: '6290', name: '良維', market: 'otc' },
  { symbol: '6279', name: '胡連', market: 'otc' },
  { symbol: '3003', name: '健和興', market: 'tse' },
  { symbol: '2328', name: '廣宇', market: 'tse' },
  { symbol: '2392', name: '正崴', market: 'tse' },
  { symbol: '6197', name: '佳必琪', market: 'tse' },
  { symbol: '3217', name: '優群', market: 'otc' },
  { symbol: '2327', name: '國巨', market: 'tse' },
  { symbol: '2492', name: '華新科', market: 'tse' },
  { symbol: '3026', name: '禾伸堂', market: 'tse' },
  { symbol: '2478', name: '大毅', market: 'tse' },
  { symbol: '2456', name: '奇力新', market: 'tse' },
  { symbol: '6173', name: '信昌電', market: 'otc' },

  // === PCB / 載板 / 銅箔基板 (CCL) ===
  { symbol: '3037', name: '欣興', market: 'tse' },
  { symbol: '3189', name: '景碩', market: 'tse' },
  { symbol: '8046', name: '南電', market: 'tse' },
  { symbol: '2383', name: '台光電', market: 'tse' },
  { symbol: '6274', name: '台燿', market: 'otc' },
  { symbol: '6213', name: '聯茂', market: 'tse' },
  { symbol: '2368', name: '金像電', market: 'tse' },
  { symbol: '2313', name: '華通', market: 'tse' },
  { symbol: '3044', name: '健鼎', market: 'tse' },
  { symbol: '3715', name: '定穎投控', market: 'tse' },
  { symbol: '2367', name: '燿華', market: 'tse' },
  { symbol: '2355', name: '敬鵬', market: 'tse' },
  { symbol: '4958', name: '臻鼎-KY', market: 'tse' },
  { symbol: '8358', name: '金居', market: 'otc' },
  { symbol: '1815', name: '富喬', market: 'otc' },

  // === 半導體設備 / 廠務工程 / 自動化機器人 ===
  { symbol: '3131', name: '弘塑', market: 'otc' },
  { symbol: '3583', name: '辛耘', market: 'otc' },
  { symbol: '6187', name: '萬潤', market: 'otc' },
  { symbol: '5443', name: '均豪', market: 'otc' },
  { symbol: '6640', name: '均華', market: 'otc' },
  { symbol: '2467', name: '志聖', market: 'tse' },
  { symbol: '3680', name: '家登', market: 'otc' },
  { symbol: '1560', name: '中砂', market: 'tse' },
  { symbol: '8028', name: '昇陽半導體', market: 'tse' },
  { symbol: '2404', name: '漢唐', market: 'tse' },
  { symbol: '6691', name: '洋基工程', market: 'tse' },
  { symbol: '2488', name: '漢平', market: 'tse' },
  { symbol: '6139', name: '亞翔', market: 'tse' },
  { symbol: '5536', name: '聖暉*', market: 'otc' },
  { symbol: '6196', name: '帆宣', market: 'tse' },
  { symbol: '6698', name: '亮宇生技', market: 'otc' },
  { symbol: '6944', name: '兆聯實業', market: 'tse' },
  { symbol: '5434', name: '崇越', market: 'otc' },
  { symbol: '1717', name: '長興', market: 'tse' },
  { symbol: '8070', name: '長華*', market: 'tse' },
  { symbol: '2359', name: '所羅門', market: 'tse' },
  { symbol: '6215', name: '和椿', market: 'tse' },
  { symbol: '8374', name: '羅昇', market: 'tse' },
  { symbol: '4562', name: '穎漢', market: 'tse' },
  { symbol: '8114', name: '振樺電', market: 'tse' },
  { symbol: '8234', name: '新漢', market: 'otc' },
  { symbol: '6125', name: '廣運', market: 'otc' },
  { symbol: '4576', name: '大銀微系統', market: 'tse' },
  { symbol: '2049', name: '上銀', market: 'tse' },
  { symbol: '1590', name: '亞德客-KY', market: 'tse' },
  { symbol: '4572', name: '駐龍', market: 'tse' },
  { symbol: '4571', name: '鈞興-KY', market: 'tse' },
  { symbol: '4583', name: '台灣精銳', market: 'tse' },
  { symbol: '3450', name: '聯鈞', market: 'tse' },
  { symbol: '3081', name: '聯亞', market: 'otc' },
  { symbol: '6442', name: '光聖', market: 'tse' },
  { symbol: '4979', name: '華星光', market: 'otc' },
  { symbol: '3234', name: '光環', market: 'otc' },
  { symbol: '3163', name: '波若威', market: 'otc' },
  { symbol: '3363', name: '上詮', market: 'otc' },
  { symbol: '4977', name: '眾達-KY', market: 'tse' },
  { symbol: '6451', name: '訊芯-KY', market: 'tse' },

  // === 光學鏡頭 / 面板 / 電子紙 ===
  { symbol: '3008', name: '大立光', market: 'tse' },
  { symbol: '3406', name: '玉晶光', market: 'tse' },
  { symbol: '3019', name: '亞光', market: 'tse' },
  { symbol: '6209', name: '今國光', market: 'tse' },
  { symbol: '3362', name: '先進光', market: 'otc' },
  { symbol: '3504', name: '揚明光', market: 'tse' },
  { symbol: '2409', name: '友達', market: 'tse' },
  { symbol: '3481', name: '群創', market: 'tse' },
  { symbol: '6116', name: '彩晶', market: 'tse' },
  { symbol: '8069', name: '元太', market: 'otc' },

  // === 網通設備 / 通信網路 ===
  { symbol: '2345', name: '智邦', market: 'tse' },
  { symbol: '3596', name: '智易', market: 'tse' },
  { symbol: '5388', name: '中磊', market: 'tse' },
  { symbol: '6285', name: '啟碁', market: 'tse' },
  { symbol: '3380', name: '明泰', market: 'tse' },
  { symbol: '2332', name: '友訊', market: 'tse' },
  { symbol: '3027', name: '盛達', market: 'tse' },
  { symbol: '2412', name: '中華電', market: 'tse' },
  { symbol: '3045', name: '台灣大', market: 'tse' },
  { symbol: '4904', name: '遠傳', market: 'tse' },

  // === 重電 / 綠能 / 機電 / 電線電纜 ===
  { symbol: '1519', name: '華城', market: 'tse' },
  { symbol: '1503', name: '士電', market: 'tse' },
  { symbol: '1513', name: '中興電', market: 'tse' },
  { symbol: '1514', name: '亞力', market: 'tse' },
  { symbol: '1504', name: '東元', market: 'tse' },
  { symbol: '2371', name: '大同', market: 'tse' },
  { symbol: '6806', name: '森崴能源', market: 'tse' },
  { symbol: '6873', name: '泓德能源', market: 'tse' },
  { symbol: '6869', name: '雲豹能源', market: 'tse' },
  { symbol: '9958', name: '世紀鋼', market: 'tse' },
  { symbol: '1605', name: '華新', market: 'tse' },
  { symbol: '1609', name: '大亞', market: 'tse' },
  { symbol: '1618', name: '合機', market: 'tse' },
  { symbol: '1612', name: '宏泰', market: 'tse' },
  { symbol: '1611', name: '中電', market: 'tse' },
  { symbol: '1608', name: '華榮', market: 'tse' },
  { symbol: '6443', name: '元晶', market: 'tse' },
  { symbol: '3576', name: '聯合再生', market: 'tse' },
  { symbol: '6477', name: '安集', market: 'tse' },

  // === 航運 / 航空 / 觀光餐飲 ===
  { symbol: '2603', name: '長榮', market: 'tse' },
  { symbol: '2609', name: '陽明', market: 'tse' },
  { symbol: '2615', name: '萬海', market: 'tse' },
  { symbol: '2618', name: '長榮航', market: 'tse' },
  { symbol: '2610', name: '華航', market: 'tse' },
  { symbol: '2646', name: '星宇航空', market: 'tse' },
  { symbol: '6757', name: '台灣虎航', market: 'tse' },
  { symbol: '2605', name: '新興', market: 'tse' },
  { symbol: '2606', name: '裕民', market: 'tse' },
  { symbol: '2637', name: '慧洋-KY', market: 'tse' },
  { symbol: '2617', name: '台航', market: 'tse' },
  { symbol: '5608', name: '四維航', market: 'otc' },
  { symbol: '2607', name: '榮運', market: 'tse' },
  { symbol: '5609', name: '中菲行', market: 'otc' },
  { symbol: '2636', name: '台驊投控', market: 'tse' },
  { symbol: '2707', name: '晶華', market: 'tse' },
  { symbol: '2731', name: '雄獅', market: 'tse' },
  { symbol: '2727', name: '王品', market: 'tse' },
  { symbol: '2732', name: '六角', market: 'otc' },
  { symbol: '2753', name: '八方雲集', market: 'tse' },
  { symbol: '2729', name: '瓦城', market: 'otc' },
  { symbol: '2754', name: '亞洲藏壽司', market: 'otc' },
  { symbol: '2755', name: '揚秦', market: 'otc' },

  // === 鋼鐵 / 水泥 / 塑化 / 汽車傳統產業 ===
  { symbol: '2002', name: '中鋼', market: 'tse' },
  { symbol: '2014', name: '中鴻', market: 'tse' },
  { symbol: '2006', name: '東和鋼鐵', market: 'tse' },
  { symbol: '2015', name: '豐興', market: 'tse' },
  { symbol: '2027', name: '大成鋼', market: 'tse' },
  { symbol: '2031', name: '新光鋼', market: 'tse' },
  { symbol: '2009', name: '第一銅', market: 'tse' },
  { symbol: '1101', name: '台泥', market: 'tse' },
  { symbol: '1102', name: '亞泥', market: 'tse' },
  { symbol: '1301', name: '台塑', market: 'tse' },
  { symbol: '1303', name: '南亞', market: 'tse' },
  { symbol: '1326', name: '台化', market: 'tse' },
  { symbol: '6505', name: '台塑化', market: 'tse' },
  { symbol: '1304', name: '台聚', market: 'tse' },
  { symbol: '1308', name: '亞聚', market: 'tse' },
  { symbol: '1312', name: '國喬', market: 'tse' },
  { symbol: '1314', name: '中石化', market: 'tse' },
  { symbol: '4763', name: '材料-KY', market: 'tse' },
  { symbol: '2207', name: '和泰車', market: 'tse' },
  { symbol: '2201', name: '裕隆', market: 'tse' },
  { symbol: '2204', name: '中華', market: 'tse' },
  { symbol: '2206', name: '三陽工業', market: 'tse' },
  { symbol: '1319', name: '東陽', market: 'tse' },
  { symbol: '1522', name: '堤維西', market: 'tse' },
  { symbol: '6605', name: '帝寶', market: 'tse' },
  { symbol: '1524', name: '耿鼎', market: 'tse' },
  { symbol: '1216', name: '統一', market: 'tse' },
  { symbol: '2912', name: '統一超', market: 'tse' },
  { symbol: '5903', name: '全家', market: 'otc' },
  { symbol: '8454', name: '富邦媒', market: 'otc' },
  { symbol: '9904', name: '寶成', market: 'tse' },
  { symbol: '9910', name: '豐泰', market: 'tse' },
  { symbol: '1476', name: '儒鴻', market: 'tse' },
  { symbol: '1477', name: '聚陽', market: 'tse' },
  { symbol: '9921', name: '巨大', market: 'tse' },
  { symbol: '9914', name: '美利達', market: 'tse' },

  // === 生技醫療 / 製藥 ===
  { symbol: '6472', name: '保瑞', market: 'tse' },
  { symbol: '1795', name: '美時', market: 'tse' },
  { symbol: '6446', name: '藥華藥', market: 'tse' },
  { symbol: '4743', name: '合一', market: 'otc' },
  { symbol: '4128', name: '中天', market: 'otc' },
  { symbol: '4726', name: '永昕', market: 'otc' },
  { symbol: '4162', name: '智擎', market: 'otc' },
  { symbol: '1760', name: '寶齡富錦', market: 'tse' },
  { symbol: '6589', name: '台康生技', market: 'otc' },
  { symbol: '6491', name: '晶碩', market: 'tse' },
  { symbol: '1565', name: '精華', market: 'otc' },
  { symbol: '6782', name: '視陽', market: 'tse' },
  { symbol: '6469', name: '大樹', market: 'otc' },
  { symbol: '1707', name: '葡萄王', market: 'tse' },

  // === 金融保險 (金控 / 銀行 / 證券) ===
  { symbol: '2881', name: '富邦金', market: 'tse' },
  { symbol: '2882', name: '國泰金', market: 'tse' },
  { symbol: '2891', name: '中信金', market: 'tse' },
  { symbol: '2886', name: '兆豐金', market: 'tse' },
  { symbol: '2884', name: '玉山金', market: 'tse' },
  { symbol: '2892', name: '第一金', market: 'tse' },
  { symbol: '2880', name: '華南金', market: 'tse' },
  { symbol: '2885', name: '元大金', market: 'tse' },
  { symbol: '2883', name: '凱基金', market: 'tse' },
  { symbol: '2887', name: '台新金', market: 'tse' },
  { symbol: '5880', name: '合庫金', market: 'tse' },
  { symbol: '2890', name: '永豐金', market: 'tse' },
  { symbol: '2888', name: '新光金', market: 'tse' },
  { symbol: '5876', name: '上海商銀', market: 'tse' },
  { symbol: '2801', name: '彰銀', market: 'tse' },
  { symbol: '2834', name: '臺企銀', market: 'tse' },
  { symbol: '2812', name: '台中銀', market: 'tse' },
  { symbol: '2838', name: '聯邦銀', market: 'tse' },
  { symbol: '2845', name: '遠東銀', market: 'tse' },
  { symbol: '2809', name: '京城銀', market: 'tse' },
  { symbol: '2897', name: '王道銀行', market: 'tse' },
  { symbol: '5871', name: '中租-KY', market: 'tse' },
  { symbol: '6005', name: '群益證', market: 'tse' },
  { symbol: '2855', name: '統一證', market: 'tse' },
  { symbol: '2816', name: '旺旺保', market: 'tse' },
  { symbol: '2850', name: '新產', market: 'tse' },

  // === 美股巨頭 / 半導體 / 熱門科技股 / 知名標的 (繁體中文名稱) ===
  { symbol: 'NVDA', name: 'NVIDIA 輝達', market: 'us' },
  { symbol: 'TSM', name: '台積電 ADR', market: 'us' },
  { symbol: 'AAPL', name: 'Apple 蘋果', market: 'us' },
  { symbol: 'MSFT', name: 'Microsoft 微軟', market: 'us' },
  { symbol: 'GOOGL', name: 'Alphabet 谷歌', market: 'us' },
  { symbol: 'GOOG', name: 'Alphabet 谷歌 (Class C)', market: 'us' },
  { symbol: 'AMZN', name: 'Amazon 亞馬遜', market: 'us' },
  { symbol: 'META', name: 'Meta 臉書', market: 'us' },
  { symbol: 'TSLA', name: 'Tesla 特斯拉', market: 'us' },
  { symbol: 'AMD', name: 'AMD 超微半導體', market: 'us' },
  { symbol: 'AVGO', name: 'Broadcom 博通', market: 'us' },
  { symbol: 'PLTR', name: 'Palantir 帕蘭提爾', market: 'us' },
  { symbol: 'SMCI', name: '超微電腦 Supermicro', market: 'us' },
  { symbol: 'INTC', name: 'Intel 英特爾', market: 'us' },
  { symbol: 'ARM', name: 'Arm 安謀控股', market: 'us' },
  { symbol: 'QCOM', name: 'Qualcomm 高通', market: 'us' },
  { symbol: 'TXN', name: '德州儀器 TI', market: 'us' },
  { symbol: 'MU', name: 'Micron 美光', market: 'us' },
  { symbol: 'AMAT', name: '應用材料 Applied Materials', market: 'us' },
  { symbol: 'LRCX', name: '科林研發 Lam Research', market: 'us' },
  { symbol: 'ASML', name: '艾司摩爾 ASML', market: 'us' },
  { symbol: 'KLAC', name: '科磊 KLA', market: 'us' },
  { symbol: 'MRVL', name: '邁威爾 Marvell', market: 'us' },
  { symbol: 'ADI', name: '亞德諾半導體 ADI', market: 'us' },
  { symbol: 'CRWD', name: 'CrowdStrike', market: 'us' },
  { symbol: 'PANW', name: 'Palo Alto 派拓網路', market: 'us' },
  { symbol: 'FTNT', name: 'Fortinet 飛塔資訊', market: 'us' },
  { symbol: 'NOW', name: 'ServiceNow', market: 'us' },
  { symbol: 'SNOW', name: 'Snowflake', market: 'us' },
  { symbol: 'DDOG', name: 'Datadog', market: 'us' },
  { symbol: 'NET', name: 'Cloudflare', market: 'us' },
  { symbol: 'COIN', name: 'Coinbase 加密交易所', market: 'us' },
  { symbol: 'MSTR', name: 'MicroStrategy 微策略', market: 'us' },
  { symbol: 'LLY', name: 'Eli Lilly 禮來製藥', market: 'us' },
  { symbol: 'NVO', name: 'Novo Nordisk 諾和諾德', market: 'us' },
  { symbol: 'JNJ', name: 'Johnson & Johnson 強生', market: 'us' },
  { symbol: 'PFE', name: 'Pfizer 輝瑞', market: 'us' },
  { symbol: 'ABBV', name: 'AbbVie 艾伯維', market: 'us' },
  { symbol: 'MRK', name: 'Merck 默克', market: 'us' },
  { symbol: 'UNH', name: 'UnitedHealth 聯合健康', market: 'us' },
  { symbol: 'ISRG', name: 'Intuitive 直覺外科 (達文西)', market: 'us' },
  { symbol: 'COST', name: 'Costco 好市多', market: 'us' },
  { symbol: 'WMT', name: 'Walmart 沃爾瑪', market: 'us' },
  { symbol: 'TGT', name: 'Target 塔吉特', market: 'us' },
  { symbol: 'HD', name: 'Home Depot 家得寶', market: 'us' },
  { symbol: 'NKE', name: 'Nike 耐吉', market: 'us' },
  { symbol: 'SBUX', name: 'Starbucks 星巴克', market: 'us' },
  { symbol: 'MCD', name: "McDonald's 麥當勞", market: 'us' },
  { symbol: 'KO', name: 'Coca-Cola 可口可樂', market: 'us' },
  { symbol: 'PEP', name: 'PepsiCo 百事可樂', market: 'us' },
  { symbol: 'PG', name: 'Procter & Gamble 寶僑', market: 'us' },
  { symbol: 'DIS', name: 'Disney 迪士尼', market: 'us' },
  { symbol: 'NFLX', name: 'Netflix 網飛', market: 'us' },
  { symbol: 'CRM', name: 'Salesforce 賽富時', market: 'us' },
  { symbol: 'ORCL', name: 'Oracle 甲骨文', market: 'us' },
  { symbol: 'IBM', name: 'IBM 國際商業機器', market: 'us' },
  { symbol: 'UBER', name: 'Uber 優步', market: 'us' },
  { symbol: 'ABNB', name: 'Airbnb 愛彼迎', market: 'us' },
  { symbol: 'BKNG', name: 'Booking Holdings', market: 'us' },
  { symbol: 'JPM', name: 'JPMorgan 摩根大通', market: 'us' },
  { symbol: 'BAC', name: 'Bank of America 美國銀行', market: 'us' },
  { symbol: 'WFC', name: 'Wells Fargo 富國銀行', market: 'us' },
  { symbol: 'C', name: 'Citigroup 花旗集團', market: 'us' },
  { symbol: 'MS', name: 'Morgan Stanley 摩根士丹利', market: 'us' },
  { symbol: 'GS', name: 'Goldman Sachs 高盛', market: 'us' },
  { symbol: 'BLK', name: 'BlackRock 貝萊德', market: 'us' },
  { symbol: 'V', name: 'Visa 維薩', market: 'us' },
  { symbol: 'MA', name: 'Mastercard 萬事達卡', market: 'us' },
  { symbol: 'AXP', name: 'American Express 美國運通', market: 'us' },
  { symbol: 'PYPL', name: 'PayPal 貝寶', market: 'us' },
  { symbol: 'SQ', name: 'Block (Square)', market: 'us' },
  { symbol: 'BRK.B', name: '波克夏·海瑟威 Berkshire B', market: 'us' },
  { symbol: 'BRK.A', name: '波克夏·海瑟威 Berkshire A', market: 'us' },
  { symbol: 'XOM', name: 'ExxonMobil 埃克森美孚', market: 'us' },
  { symbol: 'CVX', name: 'Chevron 雪佛龍', market: 'us' },
  { symbol: 'CAT', name: 'Caterpillar 卡特彼勒', market: 'us' },
  { symbol: 'BA', name: 'Boeing 波音', market: 'us' },
  { symbol: 'GE', name: 'GE 奇異航太', market: 'us' },
  { symbol: 'LMT', name: 'Lockheed Martin 洛克希德馬丁', market: 'us' },

  // === 美股主流指數與槓桿 ETF ===
  { symbol: 'SPY', name: 'SPDR 標普500 ETF', market: 'us' },
  { symbol: 'VOO', name: 'Vanguard 標普500 ETF', market: 'us' },
  { symbol: 'IVV', name: 'iShares 標普500 ETF', market: 'us' },
  { symbol: 'QQQ', name: 'Invesco 納斯達克100 ETF', market: 'us' },
  { symbol: 'QQQM', name: 'Invesco 納斯達克100 迷你ETF', market: 'us' },
  { symbol: 'VTI', name: 'Vanguard 全美市場 ETF', market: 'us' },
  { symbol: 'VT', name: 'Vanguard 全球股票 ETF', market: 'us' },
  { symbol: 'SOXX', name: 'iShares 費城半導體 ETF', market: 'us' },
  { symbol: 'SMH', name: 'VanEck 半導體 ETF', market: 'us' },
  { symbol: 'IWM', name: 'iShares 羅素2000 小型股 ETF', market: 'us' },
  { symbol: 'DIA', name: 'SPDR 道瓊工業指數 ETF', market: 'us' },
  { symbol: 'XLK', name: '科技類股精選 SPDR ETF', market: 'us' },
  { symbol: 'XLF', name: '金融類股精選 SPDR ETF', market: 'us' },
  { symbol: 'XLE', name: '能源類股精選 SPDR ETF', market: 'us' },
  { symbol: 'XLV', name: '生醫保健精選 SPDR ETF', market: 'us' },
  { symbol: 'TQQQ', name: 'ProShares 3倍做多納指 ETF', market: 'us' },
  { symbol: 'SQQQ', name: 'ProShares 3倍做空納指 ETF', market: 'us' },
  { symbol: 'SOXL', name: 'Direxion 3倍做多半導體 ETF', market: 'us' },
  { symbol: 'SOXS', name: 'Direxion 3倍做空半導體 ETF', market: 'us' },
  { symbol: 'NVDL', name: 'GraniteShares 2倍做多輝達 ETF', market: 'us' },
  { symbol: 'TSLL', name: 'Direxion 2倍做多特斯拉 ETF', market: 'us' },
  { symbol: 'CONY', name: 'YieldMax Coinbase 期權高息 ETF', market: 'us' },
  { symbol: 'TSLY', name: 'YieldMax 特斯拉期權高息 ETF', market: 'us' },
  { symbol: 'JEPI', name: 'JPMorgan 股票溢價收益 ETF', market: 'us' },
  { symbol: 'JEPQ', name: 'JPMorgan 納斯達克股票溢價 ETF', market: 'us' },
  { symbol: 'TLT', name: 'iShares 20年期以上美國公債 ETF', market: 'us' },
  { symbol: 'IEF', name: 'iShares 7-10年期美國公債 ETF', market: 'us' },
  { symbol: 'SHY', name: 'iShares 1-3年期美國公債 ETF', market: 'us' },
  { symbol: 'BND', name: 'Vanguard 總體債券市場 ETF', market: 'us' },
  { symbol: 'AGG', name: 'iShares 核心美國總體債券 ETF', market: 'us' },
  { symbol: 'GLD', name: 'SPDR 黃金 ETF', market: 'us' },
  { symbol: 'SLV', name: 'iShares 白銀 ETF', market: 'us' },
  { symbol: 'USO', name: 'United States 原油基金 ETF', market: 'us' },
  { symbol: 'IBIT', name: 'iShares 比特幣現貨 ETF', market: 'us' },
  { symbol: 'FBTC', name: 'Fidelity 比特幣現貨 ETF', market: 'us' },
];

// 建立快速符號對照表
const SYMBOL_MAP = new Map<string, StockDictItem>();
BUILTIN_STOCK_DICTIONARY.forEach((item) => {
  SYMBOL_MAP.set(item.symbol.toUpperCase(), item);
});

/**
 * 依代號或名稱快速檢索台美股中文資訊
 */
export function lookupStockInfo(query: string): StockDictItem | undefined {
  const cleanQ = query.trim().toUpperCase().replace(/\.(TW|TWO)$/i, '');
  if (!cleanQ) return undefined;

  // 1. Direct Map Lookup (Exact Symbol Match)
  if (SYMBOL_MAP.has(cleanQ)) {
    return SYMBOL_MAP.get(cleanQ);
  }

  // 2. Exact Name Match
  const rawQ = query.trim();
  const exactName = BUILTIN_STOCK_DICTIONARY.find((item) => item.name === rawQ);
  if (exactName) return exactName;

  // 3. Name starts with query or contains query
  const nameMatch = BUILTIN_STOCK_DICTIONARY.find(
    (item) => item.name.includes(rawQ) || item.symbol.toUpperCase().startsWith(cleanQ)
  );
  if (nameMatch) return nameMatch;

  return undefined;
}

/**
 * 計算標的與搜尋詞的符合權重（按照輸入順序與前綴優先排序）
 */
function calculateSearchScore(item: StockDictItem, q: string, upperQ: string): number {
  const sym = item.symbol.toUpperCase();
  const name = item.name;
  const nameLower = name.toLowerCase();
  const qLower = q.toLowerCase();

  // 1. 代號完全相符 (最高優先)
  if (sym === upperQ) return 1000;
  // 2. 中文名稱完全相符
  if (name === q || nameLower === qLower) return 950;

  // 3. 代號前綴相符（按照輸入字元順序由前向後比對，如輸入 23 優先匹配 23xx）
  if (sym.startsWith(upperQ)) {
    // 依長度微調，短代碼優先
    return 800 - (sym.length - upperQ.length) * 2;
  }

  // 4. 中文/英文名稱前綴相符
  if (name.startsWith(q) || nameLower.startsWith(qLower)) {
    return 700 - (name.length - q.length);
  }

  // 5. 中文/英文名稱包含關鍵字
  const nameIdx = name.indexOf(q);
  if (nameIdx !== -1) {
    return 600 - nameIdx * 10;
  }
  const nameLowerIdx = nameLower.indexOf(qLower);
  if (nameLowerIdx !== -1) {
    return 580 - nameLowerIdx * 10;
  }

  // 6. 代號中間包含關鍵字（非前綴，權重最低）
  const symIdx = sym.indexOf(upperQ);
  if (symIdx !== -1) {
    return 400 - symIdx * 10;
  }

  return 0;
}

/**
 * 智慧搜尋股票：
 * 1. 嚴格按照輸入字元順序（Prefix / Sequential Matching）優先排序。
 * 2. 絕不為無效代碼生成虛擬的「台股xxxx」或「美股xxxx」假標的，找不到即回傳空清單。
 */
export function searchLocalDictionary(query: string, maxLimit = 10): StockDictItem[] {
  const q = query.trim();
  if (!q) return [];
  const upperQ = q.toUpperCase().replace(/\.(TW|TWO)$/i, '');

  const scoredMatches: Array<{ item: StockDictItem; score: number }> = [];

  BUILTIN_STOCK_DICTIONARY.forEach((item) => {
    const score = calculateSearchScore(item, q, upperQ);
    if (score > 0) {
      scoredMatches.push({ item, score });
    }
  });

  // 排序：分數高者優先；同分者依代號自然順序排序（例如 2301, 2303, 2308, 2317, 2330...）
  scoredMatches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.item.symbol.localeCompare(b.item.symbol, undefined, { numeric: true });
  });

  return scoredMatches.slice(0, maxLimit).map((m) => m.item);
}
