<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">易</span>
        <span class="brand-text">
          <b>周易起卦解卦</b>
          <em>八字起卦 · 十一步解卦</em>
        </span>
      </RouterLink>
      <nav class="nav">
        <RouterLink to="/">起卦</RouterLink>
        <RouterLink to="/gua">卦典</RouterLink>
        <RouterLink to="/method">方法</RouterLink>
      </nav>
    </header>

    <main class="main">
      <RouterView />
    </main>

    <footer class="foot">
      <p>
        卦爻辞、彖传、大象传、小象传与八宫归属取自开源语料
        <a href="https://github.com/qingshano/yijing-data" target="_blank" rel="noreferrer">qingshano/yijing-data</a>
        （MIT License）；解卦方法与术语取材于《周易》原书。
        起卦映射、五行十神等属本项目自建，已在「方法」页逐条标注来源与边界。
      </p>
      <p class="dim">占筮为参考，人事为本。荀子云"善为《易》者不占"。</p>
    </footer>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 1.2rem;
  border-bottom: 1px solid var(--gu-line);
  background: color-mix(in srgb, var(--gu-surface) 88%, transparent);
  backdrop-filter: blur(8px);
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: inherit;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 9px;
  background: var(--gu-primary);
  color: #fff;
  font-size: 1.15rem;
  font-weight: 700;
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.brand-text b {
  font-size: 0.98rem;
  letter-spacing: 0.05em;
}
.brand-text em {
  font-style: normal;
  font-size: 0.72rem;
  color: var(--gu-text-mute);
}
.nav {
  display: flex;
  gap: 0.3rem;
}
.nav a {
  padding: 0.35rem 0.8rem;
  border-radius: 8px;
  text-decoration: none;
  color: var(--gu-text-soft);
  font-size: 0.9rem;
}
.nav a:hover {
  background: var(--gu-surface-2);
}
.nav a.router-link-exact-active {
  background: var(--gu-primary-soft);
  color: var(--gu-primary);
  font-weight: 600;
}
.main {
  flex: 1;
}
.foot {
  border-top: 1px solid var(--gu-line);
  padding: 1.1rem 1.2rem 2rem;
  font-size: 0.76rem;
  line-height: 1.8;
  color: var(--gu-text-mute);
  max-width: 1080px;
  margin: 0 auto;
  width: 100%;
}
.foot p {
  margin: 0.2rem 0;
}
.dim {
  opacity: 0.8;
}
@media (max-width: 620px) {
  .brand-text em {
    display: none;
  }
  .nav a {
    padding: 0.35rem 0.55rem;
    font-size: 0.85rem;
  }
}
</style>
