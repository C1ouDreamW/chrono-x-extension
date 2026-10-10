"""Visual smoke tests on a simulated X DOM; requires local Chromium and playwright."""
from pathlib import Path
import asyncio
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
PREVIEW=Path('/mnt/data')

MOCK = r"""
window.__storage = { chronoXManual: {example:{timeZone:'America/New_York',label:'手动指定',savedAt:Date.now()}}, chronoXSettings:{enabled:true,showLocal:true,showAuthor:true,autoDetect:true,showUnknown:true,compact:false,hour12:false,localZone:'Asia/Shanghai'}};
window.__listeners=[];
window.chrome = Object.assign(window.chrome || {}, {storage:{ local:{
  async get(keys){const out={};for(const k of keys){out[k]=window.__storage[k];}return out;},
  async set(obj){for(const [key,val] of Object.entries(obj)){window.__storage[key]=val;}for (const cb of window.__listeners){const c={};for(const [key,val] of Object.entries(obj)){c[key]={newValue:val}}cb(c,'local');}}
},onChanged:{addListener(cb){window.__listeners.push(cb);}}}});
"""

TWEET = '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>*{box-sizing:border-box}body{margin:0;background:#000;color:#e7e9ea;font-family:Arial,"Noto Sans SC",sans-serif;font-size:15px}.feed{width:620px;margin:60px auto;border-left:1px solid #333;border-right:1px solid #333}article{border-bottom:1px solid #333;padding:18px 19px}a{color:#777;text-decoration:none}.uname{font-weight:700;color:#fff}.text{margin:18px 0;line-height:1.65}.card{background:#080808;border:1px solid #252525;border-radius:16px;padding:12px;margin:12px 0;}.actions{display:flex;justify-content:space-between;color:#777;font-size:12px;border-top:1px solid #171717;padding-top:12px;}time{font-size:13px;color:#999}.sublabel{color:#999;font-size:12px}main>h2{margin-left:20px;font-size:22px}</style></head><body><main class="feed"><h2>为你推荐</h2>
<article data-testid="tweet"><div data-testid="User-Name"><a href="/example"><span class="uname">Example User</span> <span class="sublabel">@example</span></a> · <a href="/example/status/18800001"><time datetime="2026-10-10T13:30:00Z">10 月 10 日</time></a></div><div class="text">AI is changing the way we build software.<br>Even time looks different from another side of the world. 🌏</div><div class="card">The future is happening everywhere — at the same time.</div><div role="group" class="actions"><button data-testid="reply">评论</button><span>转发</span><span>喜欢</span><span>分享</span></div></article>
<article data-testid="tweet"><div data-testid="User-Name"><a href="/unknown"><span class="uname">Traveling Creator</span> <span class="sublabel">@unknown</span></a> · <a href="/unknown/status/18800002"><time datetime="2026-10-10T07:12:00Z">10 月 10 日</time></a></div><div class="text">Good morning from somewhere in the world ☀️</div><div role="group" class="actions"><button data-testid="reply">评论</button><span>转发</span><span>喜欢</span><span>分享</span></div></article></main></body></html>'''

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--allow-file-access-from-files'])
  page=await browser.new_page(viewport={'width':850,'height':760},device_scale_factor=1)
  await page.add_init_script(MOCK)
  await page.set_content(TWEET)
  await page.evaluate(MOCK)
  page.on("console", lambda msg: print("PAGE CONSOLE",msg.type,msg.text))
  page.on("pageerror", lambda exc: print("PAGE ERROR",exc))
  await page.add_style_tag(path=str(ROOT/'src/content.css'))
  await page.add_script_tag(path=str(ROOT/'shared/timezones.js'))
  await page.add_script_tag(path=str(ROOT/'src/content.js'))
  await page.wait_for_selector('.cx-timebar')
  n=await page.locator('.cx-timebar').count()
  local=await page.locator('.cx-badge--local').first.inner_text()
  author=await page.locator('.cx-badge--author').first.inner_text()
  unknown=await page.locator('.cx-badge--unknown').count()
  assert n==2, f'tweet cards: {n}'
  assert '21:30' in local,local
  assert '09:30' in author,author
  assert unknown==1,unknown
  await page.screenshot(path=str(PREVIEW/'chrono-x-feed-preview.png'),full_page=True)
  await page.locator('.cx-badge--unknown').click()
  assert await page.locator('.cx-editor').count()==1
  assert await page.locator('.cx-editor-hint-title').inner_text()=='未读取到可确定时区的公开城市'
  await page.locator('#cx-author-place').fill('San Francisco, California')
  assert 'America/Los_Angeles' in await page.locator('.cx-editor-place-result').inner_text()
  await page.locator('.cx-editor-save').click()
  await page.wait_for_function("document.querySelectorAll('.cx-badge--unknown').length === 0")
  author2=await page.locator('article').nth(1).locator('.cx-badge--author').inner_text()
  assert '00:12' in author2,author2
  await page.evaluate("window.__storage.chronoXSettings={...window.__storage.chronoXSettings,enabled:false};for(const cb of window.__listeners)cb({chronoXSettings:{newValue:window.__storage.chronoXSettings}},'local')")
  await page.wait_for_function("document.querySelectorAll('.cx-timebar').length === 0")
  await page.evaluate('''document.body.insertAdjacentHTML('beforeend', '<div data-testid="HoverCard"><a href="/newyorker">User</a><div data-testid="UserLocation">New York, NY</div></div>')''')
  await page.wait_for_function("window.__storage.chronoXDetected?.newyorker?.timeZone === 'America/New_York'")
  # A multi-zone country alone must not produce a precise author timezone.
  await page.evaluate('''document.body.insertAdjacentHTML('beforeend', '<div data-testid="HoverCard"><a href="/multizone">User</a><div data-testid="UserLocation">United States</div></div>')''')
  await page.wait_for_timeout(200)
  assert await page.evaluate("window.__storage.chronoXDetected?.multizone === undefined")
  print('Content script smoke test PASSED (timezones, city input, unknown, editor, disable, hovercard detection, multi-zone country)')

  popup=await browser.new_page(viewport={'width':400,'height':1000},device_scale_factor=1)
  await popup.add_init_script(MOCK)
  await popup.set_content((ROOT/'popup/popup.html').read_text(encoding='utf-8').replace('<script src="../shared/timezones.js"></script>','').replace('<script src="popup.js"></script>','').replace('<link rel="stylesheet" href="popup.css">',''))
  await popup.evaluate(MOCK)
  await popup.add_style_tag(path=str(ROOT/'popup/popup.css'))
  await popup.add_script_tag(path=str(ROOT/'shared/timezones.js'))
  await popup.add_script_tag(path=str(ROOT/'popup/popup.js'))
  await popup.wait_for_selector('.hero-clock:not(:empty)')
  await popup.wait_for_function("document.querySelector('#myClock').textContent !== '--:--'")
  assert await popup.locator('#statusText').inner_text()=='已启用'
  assert await popup.locator('.profile-item').count()==1
  await popup.screenshot(path=str(PREVIEW/'chrono-x-popup-preview.png'),full_page=True)
  print('Popup smoke test PASSED (settings read, cards, saved profiles)')
  print('Preview:',PREVIEW/'chrono-x-popup-preview.png')
  await browser.close()

asyncio.run(main())
