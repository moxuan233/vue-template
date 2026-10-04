import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5199'
const OUT = 'D:/1/vue-template/screenshots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 })

// 起卦页
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: true })

const nums = page.locator('.form input[type="number"]')
await nums.nth(0).fill('1990')
await nums.nth(1).fill('1')
await nums.nth(2).fill('1')
await nums.nth(3).fill('0')
await page.locator('.form select').selectOption('12')
await page.getByRole('button', { name: '起卦解卦' }).click()
await page.waitForSelector('.pillars', { timeout: 20000 })
await page.locator('.panel', { hasText: '四、解卦' }).first().locator('input[type="checkbox"]').check()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/02-result.png`, fullPage: true })

// 卦典
await page.goto(`${BASE}/gua`, { waitUntil: 'networkidle' })
await page.waitForSelector('.grid .card')
await page.screenshot({ path: `${OUT}/03-gua-list.png`, fullPage: false })
await page.locator('.grid .card').nth(2).click()
await page.waitForSelector('.detail')
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/04-gua-detail.png`, fullPage: true })

// 方法页
await page.goto(`${BASE}/method`, { waitUntil: 'networkidle' })
await page.screenshot({ path: `${OUT}/05-method.png`, fullPage: true })

// 移动端
const m = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 })
await m.goto(BASE, { waitUntil: 'networkidle' })
await m.locator('.form input[type="number"]').nth(0).fill('1990')
await m.locator('.form input[type="number"]').nth(1).fill('1')
await m.locator('.form input[type="number"]').nth(2).fill('1')
await m.locator('.form select').selectOption('12')
await m.getByRole('button', { name: '起卦解卦' }).click()
await m.waitForSelector('.pillars', { timeout: 20000 })
await m.screenshot({ path: `${OUT}/06-mobile.png`, fullPage: true })

await browser.close()
console.log('screenshots written to', OUT)
