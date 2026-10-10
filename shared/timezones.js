/* Chrono X shared timezone helpers. No dependencies, no network requests. */
(function (root) {
  'use strict';

  const ZONES = [
    ['Asia/Shanghai','中国 · 北京 / 上海'],
    ['Asia/Hong_Kong','中国 · 香港'],
    ['Asia/Taipei','中国 · 台北'],
    ['Asia/Tokyo','日本 · 东京'],
    ['Asia/Seoul','韩国 · 首尔'],
    ['Asia/Singapore','新加坡'],
    ['Asia/Kuala_Lumpur','马来西亚 · 吉隆坡'],
    ['Asia/Bangkok','泰国 · 曼谷'],
    ['Asia/Ho_Chi_Minh','越南 · 胡志明市'],
    ['Asia/Jakarta','印度尼西亚 · 雅加达'],
    ['Asia/Makassar','印度尼西亚 · 巴厘岛'],
    ['Asia/Manila','菲律宾 · 马尼拉'],
    ['Asia/Kolkata','印度 · 新德里 / 孟买'],
    ['Asia/Kathmandu','尼泊尔 · 加德满都'],
    ['Asia/Karachi','巴基斯坦 · 卡拉奇'],
    ['Asia/Dhaka','孟加拉国 · 达卡'],
    ['Asia/Dubai','阿联酋 · 迪拜'],
    ['Asia/Riyadh','沙特阿拉伯 · 利雅得'],
    ['Asia/Tehran','伊朗 · 德黑兰'],
    ['Asia/Jerusalem','以色列 · 耶路撒冷'],
    ['Europe/London','英国 · 伦敦'],
    ['Europe/Dublin','爱尔兰 · 都柏林'],
    ['Europe/Paris','法国 · 巴黎'],
    ['Europe/Berlin','德国 · 柏林'],
    ['Europe/Madrid','西班牙 · 马德里'],
    ['Europe/Rome','意大利 · 罗马'],
    ['Europe/Amsterdam','荷兰 · 阿姆斯特丹'],
    ['Europe/Zurich','瑞士 · 苏黎世'],
    ['Europe/Stockholm','瑞典 · 斯德哥尔摩'],
    ['Europe/Warsaw','波兰 · 华沙'],
    ['Europe/Athens','希腊 · 雅典'],
    ['Europe/Helsinki','芬兰 · 赫尔辛基'],
    ['Europe/Istanbul','土耳其 · 伊斯坦布尔'],
    ['Europe/Moscow','俄罗斯 · 莫斯科'],
    ['Europe/Kyiv','乌克兰 · 基辅'],
    ['Africa/Cairo','埃及 · 开罗'],
    ['Africa/Johannesburg','南非 · 约翰内斯堡'],
    ['Africa/Lagos','尼日利亚 · 拉各斯'],
    ['Africa/Nairobi','肯尼亚 · 内罗毕'],
    ['America/New_York','美国 · 纽约 / 华盛顿'],
    ['America/Chicago','美国 · 芝加哥'],
    ['America/Denver','美国 · 丹佛'],
    ['America/Phoenix','美国 · 凤凰城'],
    ['America/Los_Angeles','美国 · 洛杉矶 / 旧金山'],
    ['America/Anchorage','美国 · 安克雷奇'],
    ['Pacific/Honolulu','美国 · 夏威夷'],
    ['America/Toronto','加拿大 · 多伦多'],
    ['America/Vancouver','加拿大 · 温哥华'],
    ['America/Mexico_City','墨西哥 · 墨西哥城'],
    ['America/Bogota','哥伦比亚 · 波哥大'],
    ['America/Lima','秘鲁 · 利马'],
    ['America/Sao_Paulo','巴西 · 圣保罗'],
    ['America/Argentina/Buenos_Aires','阿根廷 · 布宜诺斯艾利斯'],
    ['America/Santiago','智利 · 圣地亚哥'],
    ['Australia/Sydney','澳大利亚 · 悉尼'],
    ['Australia/Melbourne','澳大利亚 · 墨尔本'],
    ['Australia/Brisbane','澳大利亚 · 布里斯班'],
    ['Australia/Perth','澳大利亚 · 珀斯'],
    ['Pacific/Auckland','新西兰 · 奥克兰'],
    ['Pacific/Fiji','斐济'],
    ['UTC','协调世界时 · UTC']
  ];

  // Only unambiguous cities and single-timezone countries. No inference from
  // generic “US”, “Canada”, “Australia” or other multi-zone locations.
  const LOCATION_RULES = [
    ['Asia/Shanghai','上海','北京','深圳','广州','杭州','成都','重庆','武汉','南京','西安','济南','苏州','青岛','shanghai','beijing','shenzhen','guangzhou','hangzhou','chengdu','chongqing','wuhan','nanjing','suzhou','qingdao','china','中国','中国大陆','prc','🇨🇳'],
    ['Asia/Hong_Kong','香港','hong kong','🇭🇰'],
    ['Asia/Taipei','台北','臺北','taipei','taiwan','台湾','臺灣','🇹🇼'],
    ['Asia/Tokyo','东京','東京','大阪','京都','日本','tokyo','osaka','kyoto','japan','🇯🇵'],
    ['Asia/Seoul','首尔','首爾','韩国','南韩','seoul','south korea','republic of korea','🇰🇷'],
    ['Asia/Singapore','新加坡','singapore','🇸🇬'],
    ['Asia/Kuala_Lumpur','吉隆坡','kuala lumpur','malaysia','马来西亚','🇲🇾'],
    ['Asia/Bangkok','曼谷','泰国','bangkok','thailand','🇹🇭'],
    ['Asia/Ho_Chi_Minh','胡志明市','河内','越南','ho chi minh','hanoi','vietnam','🇻🇳'],
    ['Asia/Jakarta','雅加达','jakarta'],
    ['Asia/Makassar','巴厘岛','bali','denpasar'],
    ['Asia/Manila','马尼拉','菲律宾','manila','philippines','🇵🇭'],
    ['Asia/Kolkata','新德里','孟买','印度','delhi','mumbai','bangalore','bengaluru','kolkata','india','🇮🇳'],
    ['Asia/Kathmandu','加德满都','尼泊尔','kathmandu','nepal','🇳🇵'],
    ['Asia/Karachi','卡拉奇','拉合尔','巴基斯坦','karachi','lahore','pakistan','🇵🇰'],
    ['Asia/Dhaka','达卡','孟加拉国','dhaka','bangladesh','🇧🇩'],
    ['Asia/Dubai','迪拜','阿联酋','dubai','abu dhabi','united arab emirates','🇦🇪'],
    ['Asia/Riyadh','利雅得','沙特','riyadh','saudi arabia','🇸🇦'],
    ['Asia/Tehran','德黑兰','伊朗','tehran','iran','🇮🇷'],
    ['Asia/Jerusalem','耶路撒冷','特拉维夫','israel','jerusalem','tel aviv','🇮🇱'],
    ['Europe/London','伦敦','曼彻斯特','英国','london','manchester','united kingdom','england','scotland','britain','🇬🇧'],
    ['Europe/Dublin','都柏林','爱尔兰','dublin','ireland','🇮🇪'],
    ['Europe/Paris','巴黎','法国','paris','france','🇫🇷'],
    ['Europe/Berlin','柏林','慕尼黑','德国','berlin','munich','germany','deutschland','🇩🇪'],
    ['Europe/Madrid','马德里','巴塞罗那','madrid','barcelona'],
    ['Europe/Rome','罗马','米兰','意大利','rome','milan','italy','🇮🇹'],
    ['Europe/Amsterdam','阿姆斯特丹','荷兰','amsterdam','netherlands','🇳🇱'],
    ['Europe/Zurich','苏黎世','瑞士','zurich','switzerland','🇨🇭'],
    ['Europe/Stockholm','斯德哥尔摩','瑞典','stockholm','sweden','🇸🇪'],
    ['Europe/Warsaw','华沙','波兰','warsaw','poland','🇵🇱'],
    ['Europe/Athens','雅典','希腊','athens','greece','🇬🇷'],
    ['Europe/Helsinki','赫尔辛基','芬兰','helsinki','finland','🇫🇮'],
    ['Europe/Istanbul','伊斯坦布尔','土耳其','istanbul','turkey','türkiye','🇹🇷'],
    ['Europe/Moscow','莫斯科','moscow'],
    ['Europe/Kyiv','基辅','kyiv','kiev'],
    ['Africa/Cairo','开罗','埃及','cairo','egypt','🇪🇬'],
    ['Africa/Johannesburg','约翰内斯堡','开普敦','南非','johannesburg','cape town','south africa','🇿🇦'],
    ['Africa/Lagos','拉各斯','lagos'],
    ['Africa/Nairobi','内罗毕','肯尼亚','nairobi','kenya','🇰🇪'],
    ['America/New_York','纽约','华盛顿特区','波士顿','迈阿密','new york','nyc','washington dc','washington d.c.','boston','miami','brooklyn','manhattan'],
    ['America/Chicago','芝加哥','达拉斯','休斯顿','chicago','dallas','houston','austin'],
    ['America/Denver','丹佛','盐湖城','denver','salt lake city'],
    ['America/Phoenix','凤凰城','phoenix','arizona'],
    ['America/Los_Angeles','洛杉矶','旧金山','西雅图','硅谷','los angeles','san francisco','seattle','silicon valley','san diego','california'],
    ['America/Anchorage','安克雷奇','anchorage','alaska'],
    ['Pacific/Honolulu','檀香山','夏威夷','honolulu','hawaii'],
    ['America/Toronto','多伦多','渥太华','蒙特利尔','toronto','ottawa','montreal'],
    ['America/Vancouver','温哥华','vancouver'],
    ['America/Mexico_City','墨西哥城','mexico city'],
    ['America/Bogota','波哥大','哥伦比亚','bogota','colombia','🇨🇴'],
    ['America/Lima','利马','秘鲁','lima','peru','🇵🇪'],
    ['America/Sao_Paulo','圣保罗','里约热内卢','são paulo','sao paulo','rio de janeiro'],
    ['America/Argentina/Buenos_Aires','布宜诺斯艾利斯','阿根廷','buenos aires','argentina','🇦🇷'],
    ['America/Santiago','圣地亚哥','santiago chile','santiago, chile'],
    ['Australia/Sydney','悉尼','sydney'],
    ['Australia/Melbourne','墨尔本','melbourne'],
    ['Australia/Brisbane','布里斯班','brisbane','queensland'],
    ['Australia/Perth','珀斯','perth','western australia'],
    ['Pacific/Auckland','奥克兰','惠灵顿','新西兰','auckland','wellington','new zealand','🇳🇿'],
    ['Pacific/Fiji','斐济','fiji','🇫🇯']
  ];

  const zoneAliases = new Map(ZONES.map(([zone,label]) => [zone, label]));
  const zoneList = Array.from(zoneAliases, ([value,label]) => ({value,label}));

  function isValidZone(tz) {
    if (typeof tz !== 'string' || !tz || tz.length > 90) return false;
    try { new Intl.DateTimeFormat('en-US', {timeZone: tz}); return true; }
    catch (_) { return false; }
  }

  function formatDate(date, tz, hour12 = false) {
    if (!(date instanceof Date) || Number.isNaN(date.valueOf())) return '';
    if (!isValidZone(tz)) return '';
    const opts = {timeZone:tz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'};
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', opts).formatToParts(date).map(p => [p.type,p.value]));
    let hour = Number(parts.hour);
    let suffix = '';
    if (hour12) { suffix = hour < 12 ? ' 上午' : ' 下午'; hour = hour % 12 || 12; }
    return `${parts.year}/${parts.month}/${parts.day} ${String(hour).padStart(2,'0')}:${parts.minute}${suffix}`;
  }

  function hasToken(text, token) {
    if (/^[\x00-\x7f]+$/.test(token) && /[a-z]/.test(token)) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z])${escaped}(?=$|[^a-z])`, 'i').test(text);
    }
    return text.includes(token);
  }

  function inferZone(location) {
    if (typeof location !== 'string') return null;
    const normalized = location.trim().toLowerCase().normalize('NFKC');
    if (!normalized || normalized.length > 250) return null;
    // Explicit user-declared IANA timezone overrides geographic keyword matching.
    const explicit = normalized.match(/(?:[a-z_]+)\/(?:[a-z_]+(?:\/[a-z_]+)?)/i);
    if (explicit && isValidZone(explicit[0])) return {timeZone: explicit[0], label: location.trim()};
    for (const [timeZone, ...tokens] of LOCATION_RULES) {
      if (tokens.some(t => hasToken(normalized, t.toLowerCase().normalize('NFKC')))) {
        return {timeZone, label: location.trim()};
      }
    }
    return null;
  }

  function cleanHandle(value) {
    if (typeof value !== 'string') return null;
    const h = value.trim().replace(/^@/, '');
    return /^[a-z\d_]{1,15}$/i.test(h) ? h.toLowerCase() : null;
  }

  const DEFAULTS = Object.freeze({
    enabled: true, showLocal: true, showAuthor: true,
    autoDetect: true, showUnknown: true, compact: false,
    hour12: false, localZone: 'auto'
  });

  root.ChronoX = Object.freeze({ZONES:zoneList, DEFAULTS, isValidZone, formatDate, inferZone, cleanHandle});
})(globalThis);
