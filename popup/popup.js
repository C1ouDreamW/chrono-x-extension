(() => {
  'use strict';
  const CX = globalThis.ChronoX;
  const $ = id => document.getElementById(id);
  let settings = {...CX.DEFAULTS};
  let manual = {};
  let toastTimeout;
  const settingFields = ['enabled','showLocal','showAuthor','autoDetect','showUnknown','hour12','compact','localZone'];

  function showToast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(()=>el.classList.remove('visible'),1900);
  }

  function localTimeZone() {
    if (settings.localZone !== 'auto' && CX.isValidZone(settings.localZone)) return settings.localZone;
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }

  function timeOnly(zone) {
    return new Intl.DateTimeFormat('en-GB', {hour:'2-digit', minute:'2-digit', hour12:settings.hour12, timeZone:zone}).format(new Date());
  }

  function renderPreview() {
    const tz = localTimeZone();
    $('myClock').textContent = timeOnly(tz);
    $('exampleClock').textContent = timeOnly('America/New_York');
    $('myPlace').textContent = tz;
    $('status').classList.toggle('is-on',settings.enabled);
    $('status').classList.toggle('is-off',!settings.enabled);
    $('statusText').textContent = settings.enabled ? '已启用':'已暂停';
  }

  function addZoneOptions(select, includeAuto = false) {
    const fragment = document.createDocumentFragment();
    const seen = new Set();
    for (const {value,label} of CX.ZONES) {
      if (seen.has(value)) continue;
      seen.add(value);
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      fragment.append(opt);
    }
    select.append(fragment);
  }

  function renderManualList() {
    const container = $('manualList');
    container.replaceChildren();
    const entries = Object.entries(manual).filter(([,v])=>v && CX.isValidZone(v.timeZone)).sort((a,b)=>a[0].localeCompare(b[0]));
    $('manualCount').textContent = `${entries.length} 个手动配置`;
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-profiles';
      empty.textContent = '暂无配置，也可以在帖子中点击设置';
      container.append(empty);
      return;
    }
    for (const [handle, value] of entries) {
      const row = document.createElement('div'); row.className='profile-item';
      const avatar = document.createElement('div'); avatar.className='profile-avatar'; avatar.textContent=handle[0].toUpperCase();
      const detail = document.createElement('div'); detail.className='profile-detail';
      const who = document.createElement('strong'); who.textContent='@'+handle;
      const zone = document.createElement('small'); zone.textContent=value.timeZone;
      detail.append(who,zone);
      const remove = document.createElement('button'); remove.type='button';remove.className='profile-remove';remove.textContent='×';remove.title=`删除 @${handle}`;remove.setAttribute('aria-label',`删除 @${handle}`);
      remove.addEventListener('click',async()=>{
        delete manual[handle];
        try {await chrome.storage.local.set({chronoXManual:manual});renderManualList();showToast('已删除作者时区');}
        catch (_){showToast('删除失败，请重试');}
      });
      row.append(avatar,detail,remove);container.append(row);
    }
  }

  async function saveSettings() {
    settings = Object.fromEntries(settingFields.map(id=>[id, id==='localZone' ? $(id).value : $(id).checked]));
    try {await chrome.storage.local.set({chronoXSettings:settings});renderPreview();}
    catch (_){showToast('保存设置失败');}
  }

  async function saveManual() {
    const handle = CX.cleanHandle($('handleInput').value);
    const timeZone = $('authorZone').value;
    $('formError').textContent = '';
    if (!handle) {$('formError').textContent='请输入有效的 X 用户名（最长 15 位）';return;}
    if (!CX.isValidZone(timeZone)) {$('formError').textContent='请先选择一个时区';return;}
    manual[handle] = {timeZone,label:'手动指定',savedAt:Date.now()};
    try {
      await chrome.storage.local.set({chronoXManual:manual});
      $('handleInput').value='';$('authorZone').value='';renderManualList();showToast(`@${handle} 已保存`);
    } catch (_) {$('formError').textContent='保存失败，请重试';}
  }

  async function init() {
    addZoneOptions($('localZone'));
    addZoneOptions($('authorZone'));
    try {
      const state = await chrome.storage.local.get(['chronoXSettings','chronoXManual']);
      settings = {...CX.DEFAULTS,...state.chronoXSettings};
      manual = state.chronoXManual && typeof state.chronoXManual==='object' ? state.chronoXManual:{};
    } catch (_) {showToast('未能读取设置，使用默认值');}
    for (const id of settingFields) {
      $(id)[id === 'localZone' ? 'value' : 'checked'] = settings[id];
      $(id).addEventListener('change',saveSettings);
    }
    // Display a stored custom IANA zone even if it is not in the curated list.
    if ($('localZone').value !== settings.localZone && CX.isValidZone(settings.localZone)) {
      const custom = document.createElement('option');custom.value=settings.localZone;custom.textContent=settings.localZone;
      $('localZone').append(custom);$('localZone').value=settings.localZone;
    }
    $('saveProfile').addEventListener('click',saveManual);
    $('handleInput').addEventListener('keydown',e=>{if(e.key==='Enter')saveManual();});
    $('authorZone').addEventListener('keydown',e=>{if(e.key==='Enter')saveManual();});
    renderPreview();renderManualList();
    setInterval(renderPreview,15000);
  }
  init();
})();
