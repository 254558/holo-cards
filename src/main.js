import App from './App.svelte'

/* iOS 26 Safari 竖屏 viewport-fit=cover 回归（WebKit bug #306465/#309743）：
   页面内容不再渲染到状态栏（灵动岛）与底部地址栏后面，上下露白条。
   仅 iPhone + Safari 26 加 .safari26（style.css 配套：absolute 背景 + 顶部滚动跑道），
   再滚到顶部出血偏移 → Safari 在工具栏后合成真实页面像素（点阵）而非纯色。
   其余平台（旧 iOS / Android / 桌面）不匹配，布局零影响。 */
const ua = navigator.userAgent
if (/(iPhone|iPod)/.test(ua) && /Version\/26\./.test(ua)) {
  document.documentElement.classList.add('safari26')
  const apply = () => {
    const top =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safari26-top')) || 62
    window.scrollTo(0, top)
    document.documentElement.scrollTop = top // 双保险（个别 webview 对 scrollTo 处理不一致）
  }
  requestAnimationFrame(() => requestAnimationFrame(apply))
  setTimeout(apply, 400) // rAF 兜底
}

const app = new App({
  target: document.getElementById('app'),
})

export default app
