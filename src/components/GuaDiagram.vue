<script setup lang="ts">
/**
 * 卦象图：自下而上六爻，本卦在左、变卦在右。
 * 显示爻题、爻辞首句、动爻标记、世应标记与纳甲六亲（本卦侧）。
 */
import type { YaoReading } from '@/logic/reader'
import type { HexagramShape } from '@/data/hexagrams'

const props = defineProps<{
  ben: HexagramShape
  bian: HexagramShape | null
  yaos: YaoReading[]
  /** 变卦对应的宫信息（用于右栏世应） */
  bianShi?: number
  bianYing?: number
  /** 是否显示纳甲六亲栏（本卦） */
  showNajia?: boolean
}>()

/** 取爻辞首句，避免图内文字过长 */
function firstClause(s: string) {
  if (!s) return ''
  const m = s.split(/[。；]/)[0]
  return m.length > 14 ? m.slice(0, 14) + '…' : m
}
</script>

<template>
  <div class="gua-wrap">
    <div class="gua-col">
      <div class="gua-head">
        <span class="gua-tag">本卦</span>
        <span class="gua-name">{{ ben.meta.name }}</span>
        <span class="gua-sub">{{ ben.upper.name }}上{{ ben.lower.name }}下 · 第 {{ ben.meta.number }} 卦</span>
      </div>
      <div class="yao-list">
        <!-- 自上而下渲染：上爻在顶 -->
        <div
          v-for="i in [5, 4, 3, 2, 1, 0]"
          :key="i"
          class="yao"
          :class="{ moving: yaos[i]?.moving, shi: yaos[i]?.shi, ying: yaos[i]?.ying }"
        >
          <span class="yao-title">{{ yaos[i]?.title || '—' }}</span>
          <span class="yao-bar">
            <template v-if="yaos[i]?.yin">
              <i class="seg"></i><i class="gap"></i><i class="seg"></i>
            </template>
            <template v-else>
              <i class="seg full"></i>
            </template>
          </span>
          <span class="yao-marks">
            <em v-if="yaos[i]?.moving" class="mk mk-move">动</em>
            <em v-if="yaos[i]?.shi" class="mk mk-shi">世</em>
            <em v-if="yaos[i]?.ying" class="mk mk-ying">应</em>
          </span>
          <span class="yao-text">{{ firstClause(yaos[i]?.text || '') }}</span>
          <span v-if="showNajia" class="yao-najia">
            {{ yaos[i]?.naZhi }}<em>{{ yaos[i]?.liuQin }}</em>
          </span>
        </div>
      </div>
    </div>

    <div v-if="bian" class="gua-arrow" aria-hidden="true">
      <span>动</span>
      <span class="arrow">→</span>
      <span>之</span>
    </div>

    <div v-if="bian" class="gua-col">
      <div class="gua-head">
        <span class="gua-tag alt">变卦（之卦）</span>
        <span class="gua-name">{{ bian.meta.name }}</span>
        <span class="gua-sub">{{ bian.upper.name }}上{{ bian.lower.name }}下 · 第 {{ bian.meta.number }} 卦</span>
      </div>
      <div class="yao-list">
        <div
          v-for="i in [5, 4, 3, 2, 1, 0]"
          :key="i"
          class="yao"
          :class="{ shi: bianShi === i, ying: bianYing === i }"
        >
          <span class="yao-title">{{ i === 5 ? '上' : i === 0 ? '初' : ['', '二', '三', '四', '五'][i] }}{{ bian.lines[i] ? '九' : '六' }}</span>
          <span class="yao-bar">
            <template v-if="bian.lines[i] === 0">
              <i class="seg"></i><i class="gap"></i><i class="seg"></i>
            </template>
            <template v-else>
              <i class="seg full"></i>
            </template>
          </span>
          <span class="yao-marks">
            <em v-if="bianShi === i" class="mk mk-shi">世</em>
            <em v-if="bianYing === i" class="mk mk-ying">应</em>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gua-wrap {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.gua-col {
  flex: 1 1 260px;
  min-width: 240px;
}
.gua-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}
.gua-tag {
  font-size: 0.72rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: var(--gu-primary-soft);
  color: var(--gu-primary);
  border: 1px solid var(--gu-primary-line);
}
.gua-tag.alt {
  background: color-mix(in srgb, var(--gu-accent) 12%, transparent);
  color: var(--gu-accent);
  border-color: color-mix(in srgb, var(--gu-accent) 35%, transparent);
}
.gua-name {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.gua-sub {
  font-size: 0.78rem;
  color: var(--gu-text-mute);
}
.yao-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.7rem;
  border: 1px solid var(--gu-line);
  border-radius: 10px;
  background: var(--gu-surface-2);
}
.yao {
  display: grid;
  grid-template-columns: 2.4rem 4.5rem auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.22rem 0.35rem;
  border-radius: 6px;
}
.yao.moving {
  background: color-mix(in srgb, var(--gu-accent) 12%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gu-accent) 45%, transparent);
}
.yao-title {
  font-size: 0.8rem;
  color: var(--gu-text-mute);
  text-align: right;
}
.yao-bar {
  display: flex;
  align-items: center;
  gap: 0;
  height: 0.85rem;
}
.seg {
  height: 0.62rem;
  width: 1.7rem;
  background: var(--gu-yao);
  border-radius: 2px;
}
.seg.full {
  width: 3.7rem;
}
.gap {
  width: 0.35rem;
}
.yao-marks {
  display: inline-flex;
  gap: 0.2rem;
}
.mk {
  font-style: normal;
  font-size: 0.68rem;
  line-height: 1;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
}
.mk-move {
  background: var(--gu-accent);
  color: #fff;
}
.mk-shi {
  background: var(--gu-primary-soft);
  color: var(--gu-primary);
  border: 1px solid var(--gu-primary-line);
}
.mk-ying {
  background: var(--gu-surface-3);
  color: var(--gu-text-mute);
  border: 1px solid var(--gu-line);
}
.yao-text {
  font-size: 0.84rem;
  color: var(--gu-text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.yao-najia {
  font-size: 0.74rem;
  color: var(--gu-text-mute);
  white-space: nowrap;
}
.yao-najia em {
  font-style: normal;
  margin-left: 0.2rem;
  color: var(--gu-primary);
}
.gua-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  color: var(--gu-text-mute);
  font-size: 0.8rem;
  padding-top: 3.5rem;
}
.arrow {
  font-size: 1.3rem;
  color: var(--gu-accent);
}
@media (max-width: 720px) {
  .yao {
    grid-template-columns: 2.2rem 4.2rem auto 1fr;
  }
  .yao-najia {
    display: none;
  }
}
</style>
