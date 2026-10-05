/**
 * 端到端冒烟测试：验证三个页面都能正常渲染、交互生效、无控制台报错。
 * 运行：node tools/e2e-smoke.mjs   （需先启动 dev server 于 5199 端口）
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5199'
const errors = []
const results = []

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })

page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console] ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

async function step(name, fn) {
  try {
    await fn()
    results.push(`ok   ${name}`)
  } catch (e) {
    results.push(`FAIL ${name}: ${e.message}`)
    errors.push(`[step] ${name}: ${e.message}`)
  }
}

// ---------- 起卦页 ----------
await step('首页加载', async () => {
  const resp = await page.goto(BASE, { waitUntil: 'networkidle' })
  if (resp.status() !== 200) throw new Error(`HTTP ${resp.status()}`)
  await page.waitForSelector('h1')
})

await step('填写生辰并起卦', async () => {
  // 表单为：年/月/日（number）· 出生时辰（select，十二时辰区间）· 所问何事（text）
  const nums = page.locator('.form input[type="number"]')
  await nums.nth(0).fill('1990') // 年
  await nums.nth(1).fill('1') // 月
  await nums.nth(2).fill('1') // 日
  await page.locator('.form select').selectOption('5') // 巳时 09:00–11:00
  await page.getByRole('button', { name: '起卦解卦' }).click()
  await page.waitForSelector('text=四柱排盘', { timeout: 20000 })
})

await step('时辰下拉为十二个两小时区间', async () => {
  const opts = await page.locator('.form select option').allInnerTexts()
  if (opts.length !== 12) throw new Error(`区间数 ${opts.length}，应为 12`)
  const joined = opts.join('|')
  for (const want of ['23:00–01:00 子时', '09:00–11:00 巳时', '21:00–23:00 亥时']) {
    if (!joined.includes(want)) throw new Error(`缺少区间「${want}」`)
  }
  if (opts.some((o) => /^\d{2} 时$/.test(o.trim()))) throw new Error('仍存在单小时粒度的选项')
})

await step('四柱显示为 己巳 丙子 丙寅 癸巳（巳时）', async () => {
  // 干支分别渲染在 .p-gan / .p-zhi（天干后附十神小字），故按柱逐一比对
  const cols = await page.locator('.pillar').evaluateAll((els) =>
    els.map((e) => ({
      label: e.querySelector('.p-label')?.textContent?.trim() ?? '',
      gan: (e.querySelector('.p-gan')?.textContent ?? '').trim().charAt(0),
      zhi: (e.querySelector('.p-zhi')?.textContent ?? '').trim().charAt(0),
    })),
  )
  if (cols.length !== 4) throw new Error(`柱数 ${cols.length}`)
  const want = [
    ['年柱', '己', '巳'],
    ['月柱', '丙', '子'],
    ['日柱', '丙', '寅'],
    ['时柱', '癸', '巳'],
  ]
  cols.forEach((c, i) => {
    if (c.label !== want[i][0]) throw new Error(`第${i + 1}柱标签 ${c.label}`)
    if (c.gan !== want[i][1] || c.zhi !== want[i][2]) {
      throw new Error(`${c.label} 干支为 ${c.gan}${c.zhi}，应为 ${want[i][1]}${want[i][2]}`)
    }
  })
  const text = await page.locator('.panel', { hasText: '四柱排盘' }).first().innerText()
  if (!text.includes('日主')) throw new Error('缺少日主标注')
  // 时柱旁应显示时辰区间
  const timeCol = await page.locator('.pillar').nth(3).innerText()
  if (!timeCol.includes('09:00–11:00')) throw new Error(`时柱未显示时辰区间：${timeCol}`)
})

await step('大白话版渲染完整', async () => {
  const panel = page.locator('.plain-panel').first()
  const text = await panel.innerText()
  for (const kw of ['关键提醒', '眼下的处境', '该做的', '不该做的', '走向', '时间与耐心']) {
    if (!text.includes(kw)) throw new Error(`大白话缺少「${kw}」`)
  }
  // 一句话总结渲染在 .oneliner（无小标题），单独校验
  const oneliner = page.locator('.plain-panel .oneliner')
  if ((await oneliner.count()) !== 1) throw new Error('缺少一句话总结')
  const one = (await oneliner.innerText()).trim()
  if (one.length < 8) throw new Error(`一句话总结过短：${one}`)
  if ((await panel.locator('.plain-block.dos li').count()) < 1) throw new Error('「该做的」没有条目')
  if ((await panel.locator('.plain-block.donts li').count()) < 1) throw new Error('「不该做的」没有条目')
})

await step('每日之卦自动出结果且含当天日期', async () => {
  const panel = page.locator('.day-panel').first()
  const text = await panel.innerText()
  const today = new Date()
  const wantDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  if (!text.includes(wantDate)) throw new Error(`未显示当天日期 ${wantDate}`)
  for (const kw of ['日柱', '时柱', '一句话', '关键提醒', '走向']) {
    if (!text.includes(kw)) throw new Error(`每日之卦缺少「${kw}」`)
  }
  // 展开完整十一步
  await panel.locator('details summary').click()
  await page.waitForTimeout(250)
  const layers = await panel.locator('.layers .layer').count()
  if (layers !== 11) throw new Error(`每日之卦层次数 ${layers}`)
})

await step('卦象区出现本卦与动爻标记', async () => {
  const text = await page.locator('.panel', { hasText: '三、卦象' }).first().innerText()
  if (!text.includes('本卦')) throw new Error('缺少本卦')
  if (!text.includes('旅')) throw new Error(`本卦应为旅，实际：${text.slice(0, 80)}`)
  if (!text.includes('动')) throw new Error('缺少动爻标记')
})

await step('解卦十一层全部渲染', async () => {
  const panel = page.locator('.panel', { hasText: '四、解卦' }).first()
  const count = await panel.locator('.layer').count()
  if (count !== 11) throw new Error(`层次数 ${count}，应为 11`)
  // 展开全部，确认正文有内容
  await panel.locator('input[type="checkbox"]').check()
  const text = await panel.innerText()
  for (const kw of ['初筮告', '彖', '卦德', '大象', '卦主', '动爻', '当位', '判词', '之正', '避凶趋吉']) {
    if (!text.includes(kw)) throw new Error(`缺少「${kw}」`)
  }
})

await step('六爻明细表 6 行且含世应', async () => {
  const panel = page.locator('.panel', { hasText: '五、六爻明细' }).first()
  const rows = await panel.locator('tbody tr').count()
  if (rows !== 6) throw new Error(`行数 ${rows}`)
  const text = await panel.innerText()
  if (!text.includes('世')) throw new Error('缺少世爻')
  if (!text.includes('应')) throw new Error('缺少应爻')
})

await step('大衍筮法起卦可用', async () => {
  await page.getByRole('button', { name: /大衍筮法/ }).click()
  await page.waitForSelector('text=起卦依据')
})

// ---------- 卦典 ----------
await step('卦典页 64 卦', async () => {
  await page.goto(`${BASE}/gua`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.grid .card')
  const n = await page.locator('.grid .card').count()
  if (n !== 64) throw new Error(`卡片数 ${n}`)
})

await step('卦典筛选与详情', async () => {
  await page.locator('.pbtn', { hasText: '乾宫' }).click()
  const n = await page.locator('.grid .card').count()
  if (n !== 8) throw new Error(`乾宫应为 8 卦，实际 ${n}`)
  await page.locator('.pbtn', { hasText: '全部' }).click()
  await page.locator('.search').fill('潜龙')
  const hit = await page.locator('.grid .card').count()
  if (hit < 1) throw new Error('搜索「潜龙」无结果')
  await page.locator('.search').fill('')
  await page.locator('.grid .card').first().click()
  await page.waitForSelector('.detail')
  const detail = await page.locator('.detail').innerText()
  for (const kw of ['卦辞', '彖传', '大象传', '六爻爻辞与小象', '互卦', '错卦', '综卦']) {
    if (!detail.includes(kw)) throw new Error(`详情缺少「${kw}」`)
  }
})

// ---------- 方法页 ----------
await step('方法页渲染', async () => {
  await page.goto(`${BASE}/method`, { waitUntil: 'networkidle' })
  const text = await page.locator('.page').innerText()
  for (const kw of ['大衍筮法', '纳甲', '十一层', 'qingshano/yijing-data', '速查流程']) {
    if (!text.includes(kw)) throw new Error(`缺少「${kw}」`)
  }
})

// ---------- 404 兜底 ----------
await step('未知路径重定向首页', async () => {
  await page.goto(`${BASE}/not-exist`, { waitUntil: 'networkidle' })
  await page.waitForSelector('h1')
  const url = page.url()
  if (!url.endsWith('/')) throw new Error(`未重定向：${url}`)
})

await browser.close()

console.log(results.join('\n'))
const realErrors = errors.filter((e) => !e.includes('favicon'))
console.log(`\n使用步骤：${results.length}；失败步骤：${results.filter((r) => r.startsWith('FAIL')).length}`)
if (realErrors.length) {
  console.log('\n控制台/页面错误：')
  for (const e of realErrors) console.log('  ' + e)
} else {
  console.log('控制台无错误。')
}
process.exit(results.some((r) => r.startsWith('FAIL')) || realErrors.length ? 1 : 0)
