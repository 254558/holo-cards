import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// 与桌面 pokemon-cards-css-main 同栈：Vite + Svelte 3 的纯静态 SPA。
// css/img/patterns 都在 public/ 原样拷贝，卡牌效果 CSS 由 index.html 的 <link> 引用。
export default defineConfig({
  plugins: [svelte()],
})
