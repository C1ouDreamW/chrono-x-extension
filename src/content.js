/* Chrono X — X.com enhancement, operates entirely inside the browser. */
(() => {
  'use strict';
  if (globalThis.__chronoXContentLoaded) return;
  globalThis.__chronoXContentLoaded = true;

  const CX = globalThis.ChronoX;
  const storage = chrome.storage.local;
  const KEYS = ['chronoXSettings', 'chronoXManual', 'chronoXDetected'];
  let settings = {...CX.DEFAULTS};
  let manual = {};
  let detected = {};
  let revision = 0;
  let frameScheduled = false;
  let activeEditor = null;
  let seenLocation = '';
  const unresolvedLocations = new Map();

  function effectiveLocalZone() {
    if (settings.localZone && settings.localZone !== 'auto' && CX.isValidZone(settings.localZone)) return settings.localZone;
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return CX.isValidZone(browserZone) ? browserZone : 'UTC';
  }

  function timezoneFor(handle) {
    const userEntry = manual[handle];
    if (userEntry && CX.isValidZone(userEntry.timeZone)) {
      return {...userEntry, source:'manual'};
    }
    const inferred = detected[handle];
    if (settings.autoDetect && inferred && CX.isValidZone(inferred.timeZone)) {
      return {...inferred, source:'profile'};
    }
    return null;
  }

  function authorFromPost(article, time) {
    const anchor = time.closest('a[href*="/status/"]');
    const fromTime = anchor?.getAttribute('href')?.match(/^\/(\w{1,15})\/status\/\d+/i);
    if (fromTime) return CX.cleanHandle(fromTime[1]);
    const nameArea = article.querySelector('[data-testid="User-Name"]');
    for (const link of nameArea?.querySelectorAll('a[href]') || []) {
      const result = link.getAttribute('href')?.match(/^\/(\w{1,15})\/?(?:\?.*)?$/i);
      if (result) return CX.cleanHandle(result[1]);
    }
    return null;
  }

  function postTimestamp(article) {
    return article.querySelector('a[href*="/status/"] time[datetime]') || article.querySelector('time[datetime]');
  }

  function makeEl(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function clockIcon() {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '1.8');
    icon.setAttribute('stroke-linecap', 'round');
    icon.setAttribute('stroke-linejoin', 'round');
    icon.innerHTML = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
    return icon;
  }

  function localBadge(timestamp) {
    const badge = makeEl('span','cx-badge cx-badge--local');
    badge.title = `你的本地时间 · ${effectiveLocalZone()}`;
    badge.append(clockIcon(), makeEl('span','cx-badge-label', '我的时间'), makeEl('strong','cx-badge-time', CX.formatDate(timestamp, effectiveLocalZone(), settings.hour12)));
    return badge;
  }

  function authorBadge(timestamp, handle) {
    const info = timezoneFor(handle);
    if (!info && !settings.showUnknown) return null;
    const chip = makeEl('button','cx-badge cx-badge--author' + (!info ? ' cx-badge--unknown' : ''));
    chip.type = 'button';
    chip.title = info
      ? `@${handle} 的时区：${info.timeZone}\n来源：${info.source === 'manual' ? '你手动设定' : `账号公开位置：${info.label || '未知'}`}\n点击可修改`
      : `尚未读取到 @${handle} 的具体城市或时区。可点击后输入城市、手动选择时区，或打开资料页尝试识别。`;
    chip.setAttribute('aria-label', info ? `修改 @${handle} 的作者时区` : `设置 @${handle} 的作者时区`);
    chip.append(makeEl('span','cx-badge-pin',info ? '↗' : '?'));
    if (info) {
      chip.append(makeEl('span','cx-badge-label','作者当地'), makeEl('strong','cx-badge-time', CX.formatDate(timestamp, info.timeZone, settings.hour12)));
      if (info.source === 'profile') chip.append(makeEl('span','cx-badge-inferred', '推测'));
    } else {
      chip.append(makeEl('span','cx-badge-label','作者时区待确认'), makeEl('span','cx-badge-set','设置 ↗'));
    }
    chip.addEventListener('click', e => { e.stopPropagation(); openEditor(handle); });
    return chip;
  }

  function insertionTarget(article, time) {
    const reply = article.querySelector('[data-testid="reply"]');
    const group = reply?.closest('[role="group"]') || article.querySelector('[role="group"]');
    // X action bars have a containing layout wrapper; insert alongside them.
    if (group && group.parentElement && article.contains(group)) {
      return {parent:group.parentElement, before:group};
    }
    const anchor = time.closest('a');
    const sibling = anchor?.parentElement?.parentElement;
    if (sibling && article.contains(sibling)) {
      return {parent:sibling.parentElement, before:sibling.nextSibling};
    }
    return {parent:article, before:null};
  }

  function renderPost(article) {
    if (!settings.enabled || (!settings.showLocal && !settings.showAuthor)) {
      article.querySelectorAll(':scope .cx-timebar').forEach(el=>el.remove());
      delete article.dataset.cxRenderKey;
      return;
    }
    const time = postTimestamp(article);
    if (!time) return;
    const timestamp = new Date(time.getAttribute('datetime'));
    if (Number.isNaN(timestamp.valueOf())) return;
    const handle = authorFromPost(article, time);
    const key = [timestamp.toISOString(),handle || '',revision].join('|');
    if (article.dataset.cxRenderKey === key && article.querySelector('.cx-timebar')) return;
    article.querySelectorAll('.cx-timebar').forEach(el=>el.remove());

    const row = makeEl('div','cx-timebar' + (settings.compact ? ' cx-timebar--compact' : ''));
    row.setAttribute('aria-label','Chrono X · 帖子时间');
    if (settings.showLocal) row.append(localBadge(timestamp));
    if (settings.showAuthor && handle) {
      const badge = authorBadge(timestamp, handle);
      if (badge) row.append(badge);
    }
    if (!row.childElementCount) return;
    const {parent,before} = insertionTarget(article, time);
    if (!parent) return;
    parent.insertBefore(row,before);
    article.dataset.cxRenderKey = key;
  }

  function detectPublicLocations() {
    if (!settings.autoDetect) return;
    // Profile page: X exposes the user-entered location when present.
    const path = location.pathname.match(/^\/([a-z0-9_]{1,15})\/?$/i);
    if (path) {
      const h = CX.cleanHandle(path[1]);
      const locationEl = document.querySelector('[data-testid="UserLocation"]');
      if (h && locationEl && !locationEl.closest('[data-testid="HoverCard"]')) rememberLocation(h, locationEl.textContent || '');
    }
    // A hover card is a second safe source: no scraping, API, or extra requests.
    for (const card of document.querySelectorAll('[data-testid="HoverCard"]')) {
      const locationEl = card.querySelector('[data-testid="UserLocation"]');
      if (!locationEl) continue;
      const profile = [...card.querySelectorAll('a[href]')].map(a => a.getAttribute('href')?.match(/^\/([a-z0-9_]{1,15})\/?$/i)).find(Boolean);
      if (profile) rememberLocation(CX.cleanHandle(profile[1]),locationEl.textContent || '');
    }
  }

  function rememberLocation(handle,text) {
    if (!handle || typeof text !== 'string') return;
    const place = text.trim();
    const entry = CX.inferZone(place);
    if (!entry) {
      unresolvedLocations.set(handle, place);
      return;
    }
    unresolvedLocations.delete(handle);
    const signature = `${handle}|${place}|${entry.timeZone}`;
    if (seenLocation === signature && detected[handle]?.timeZone === entry.timeZone) return;
    seenLocation = signature;
    if (detected[handle]?.timeZone === entry.timeZone && detected[handle]?.label === place) return;
    detected[handle] = {...entry, savedAt:Date.now()};
    pruneDetected();
    storage.set({chronoXDetected:detected}).catch(()=>{});
    revision++;
    scheduleScan();
  }

  function pruneDetected() {
    const entries = Object.entries(detected);
    if (entries.length <= 300) return;
    entries.sort((a,b)=>(b[1]?.savedAt||0)-(a[1]?.savedAt||0));
    detected = Object.fromEntries(entries.slice(0,300));
  }

  function scan() {
    frameScheduled = false;
    detectPublicLocations();
    for (const article of document.querySelectorAll('article[data-testid="tweet"]')) renderPost(article);
    if (!settings.enabled) document.querySelectorAll('.cx-timebar').forEach(el=>el.remove());
  }

  function scheduleScan() {
    if (frameScheduled) return;
    frameScheduled = true;
    requestAnimationFrame(scan);
  }

  function addOption(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  function closeEditor() {
    if (activeEditor) { activeEditor.remove(); activeEditor = null; }
  }

  function openEditor(handle) {
    closeEditor();
    const existing = manual[handle] || detected[handle];
    const backdrop = makeEl('div','cx-editor-backdrop');
    const card = makeEl('section','cx-editor');
    card.setAttribute('role','dialog');
    card.setAttribute('aria-modal','true');
    card.setAttribute('aria-label',`设置 @${handle} 的时区`);
    const header = makeEl('div','cx-editor-header');
    const headerInfo = makeEl('div','cx-editor-heading');
    headerInfo.append(makeEl('div','cx-editor-eyebrow','CHRONO X  /  TIMEZONE'), makeEl('h2','',`@${handle}`), makeEl('p','', '为这个作者选择时区，所有帖子会自动更新。设置仅保存在本地。'));
    const dismiss = makeEl('button','cx-editor-x','×');
    dismiss.type = 'button'; dismiss.setAttribute('aria-label','关闭'); dismiss.addEventListener('click', closeEditor);
    header.append(headerInfo,dismiss);

    const hint = makeEl('div','cx-editor-hint');
    const existingPlace = unresolvedLocations.get(handle);
    const onProfile = location.pathname.toLowerCase() === `/${handle}`;
    const hintTitle = makeEl('div','cx-editor-hint-title', existingPlace ? '已找到位置，但无法确定时区' : '未读取到可确定时区的公开城市');
    const hintBody = makeEl('p','', existingPlace
      ? `公开位置「${existingPlace.slice(0,100)}」不能唯一对应时区。请提供更具体的城市。`
      : onProfile
        ? '该资料页没有可读取的具体城市，或位置无法识别。单凭国家（例如美国）无法确定作者时区。'
        : '当前时间线没有提供作者的城市。可打开作者主页查看公开位置，或直接输入城市。');
    hint.append(hintTitle,hintBody);
    const profileButton = makeEl('button','cx-editor-profile','查看作者主页 ↗');
    profileButton.type = 'button';
    profileButton.addEventListener('click', () => window.open(`/${encodeURIComponent(handle)}`, '_blank', 'noopener,noreferrer'));
    hint.append(profileButton);

    const placeLabel = makeEl('label','cx-editor-fieldlabel','知道作者在哪座城市？');
    const place = makeEl('input','cx-editor-input');
    place.id = 'cx-author-place';
    placeLabel.htmlFor = place.id;
    place.placeholder = '输入城市，如 San Francisco / 巴黎 / 东京';
    place.autocomplete = 'off';
    place.spellcheck = false;
    const placeResult = makeEl('div','cx-editor-place-result','输入城市后自动匹配时区');

    const label = makeEl('label','cx-editor-fieldlabel','或选择常用城市与时区');
    const select = makeEl('select','cx-editor-select');
    select.id = 'cx-author-zone'; label.htmlFor = select.id;
    addOption(select,'','请选择时区…');
    for (const zone of CX.ZONES) addOption(select,zone.value,zone.label);
    const customLabel = makeEl('label','cx-editor-fieldlabel','或者直接输入时区 ID');
    const custom = makeEl('input','cx-editor-input');
    custom.placeholder = '例如：America/New_York';
    custom.spellcheck = false;
    custom.autocomplete = 'off';
    customLabel.htmlFor = custom.id = 'cx-zone-custom';
    if (existing?.timeZone) {
      if ([...select.options].some(o=>o.value === existing.timeZone)) select.value = existing.timeZone;
      else custom.value = existing.timeZone;
    }
    const error = makeEl('div','cx-editor-error');
    function updatePlaceResult() {
      const value = place.value.trim();
      const match = value && CX.inferZone(value);
      placeResult.textContent = !value ? '输入城市后自动匹配时区' : match
        ? `✓ 已匹配 ${match.timeZone} · 将标记为手动提供` : '未能确定时区，请输入更具体的城市或从列表选择';
      placeResult.classList.toggle('cx-editor-place-result--ok',Boolean(match));
      return match;
    }
    place.addEventListener('input',()=>{
      if (place.value.trim()) {select.value='';custom.value='';}
      error.textContent='';
      updatePlaceResult();
    });
    select.addEventListener('change',()=>{place.value='';custom.value='';error.textContent='';updatePlaceResult();});
    custom.addEventListener('input',()=>{if(custom.value.trim()) {place.value='';select.value='';}error.textContent='';updatePlaceResult();});
    const foot = makeEl('div','cx-editor-actions');
    const clear = makeEl('button','cx-editor-clear','清除手动设置');
    clear.type='button'; clear.disabled = !manual[handle];
    clear.addEventListener('click',async()=>{
      delete manual[handle];
      try {await storage.set({chronoXManual:manual}); revision++; closeEditor(); scheduleScan();}
      catch (_) {error.textContent='清除失败，请重试';}
    });
    const save = makeEl('button','cx-editor-save','保存时区');
    save.type='button';
    save.addEventListener('click',async()=>{
      const inferredPlace = place.value.trim() ? CX.inferZone(place.value.trim()) : null;
      const zone = custom.value.trim() || select.value || inferredPlace?.timeZone;
      if (!CX.isValidZone(zone)) {error.textContent='请提供明确的城市，选择常用时区，或输入有效的 IANA 时区';return;}
      manual[handle] = {timeZone:zone, label:inferredPlace ? `手动提供城市：${place.value.trim().slice(0,100)}` : '手动指定', savedAt:Date.now()};
      try { await storage.set({chronoXManual:manual}); revision++; closeEditor(); scheduleScan(); }
      catch (_) {error.textContent='保存失败，请重试';}
    });
    foot.append(clear,save);
    card.append(header,hint,placeLabel,place,placeResult,label,select,customLabel,custom,error,foot);
    backdrop.append(card);
    backdrop.addEventListener('click', e=>{if (e.target === backdrop) closeEditor();});
    backdrop.addEventListener('keydown', e=>{if(e.key==='Escape')closeEditor();});
    document.body.append(backdrop);
    activeEditor = backdrop;
    select.focus();
  }

  async function loadSettings() {
    try {
      const data = await storage.get(KEYS);
      settings = {...CX.DEFAULTS,...(data.chronoXSettings||{})};
      manual = data.chronoXManual && typeof data.chronoXManual==='object' ? data.chronoXManual : {};
      detected = data.chronoXDetected && typeof data.chronoXDetected==='object' ? data.chronoXDetected : {};
      revision++;
      scheduleScan();
    } catch (err) {
      // Failure to read storage must not break accurate local time display.
      console.warn('[Chrono X] 无法读取已保存设置',err);
      revision++;
      scheduleScan();
    }
  }

  chrome.storage.onChanged.addListener((changes,area)=>{
    if (area !== 'local') return;
    if (changes.chronoXSettings) settings = {...CX.DEFAULTS,...(changes.chronoXSettings.newValue||{})};
    if (changes.chronoXManual) manual = changes.chronoXManual.newValue||{};
    if (changes.chronoXDetected) detected = changes.chronoXDetected.newValue||{};
    if (KEYS.some(k=>changes[k])) {revision++;scheduleScan();}
  });

  const observer = new MutationObserver(mutations=>{
    if (mutations.every(m=>[...m.addedNodes].every(n=>n.nodeType===1 && (n.classList?.contains('cx-timebar') || n.classList?.contains('cx-editor-backdrop'))) && [...m.removedNodes].every(n=>n.nodeType===1 && (n.classList?.contains('cx-timebar') || n.classList?.contains('cx-editor-backdrop'))))) return;
    scheduleScan();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  loadSettings();
})();
