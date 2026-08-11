# Holo Cards · 全息卡牌堆

Svelte 单页应用（Vite 3 + Svelte 3 SPA，与桌面 pokemon-cards-css 同栈）：屏幕中央一堆全息卡牌，**点一下翻面查看，不喜欢右划划走**。

## 交互
- 背景：**故障终端**（CRT 数字网格，扫描线/位移抖动/鼠标波纹/载入淡入，移植自 [vue-bits FaultyTerminal](https://vue-bits.dev/backgrounds/faulty-terminal)，零依赖原生 WebGL；颜色 **#94a3b8**；`prefers-reduced-motion` 时渲染一帧静态网格）
- 屏幕中央一堆牌（顶层是真卡、背后 8 层卡背扇形），底部提示
- **点一下卡** → 翻到正面并**弹出**（pokemon-cards-css 点击动画移植：整卡弹簧放大到视口适配 ≤1.75× + 首次 360° 翻转 + 白边发光，约 1.5s 落定带过冲），显示"名称稀有度"（白框方框 + 乱序落定，同 pattens 标题旁效果；方框左右两边随名字长度自适应）
- **再点一下（正面）** → 弹簧弹回原位，保持正面；再点可再次弹出（无 360°）
- **按住右划** → 卡片跟手位移 + 微旋转 + 扫光跟随；松手超过卡宽 35% → 飞向右侧划走，下一张升到顶层并**自动翻到正面**（Fallout 卡牌式快速翻卡：0.275s 180° 翻转、中点 -10° Z 轴摆动，仅自动翻面用；手动点按仍是 360° 弹出）。**弹出放大状态下拖动只跟随高光扫光、卡片不随手指移动**——先点一下弹回原位，再右划划走
- **其他方向 / 短划** → 弹回原位
- 38 张划完自动洗牌重置，提示"看完了 · 已重新洗牌"
- 空闲时卡片缓慢游移扫光；`prefers-reduced-motion` 时全部静止、直接换卡

## 文件
```
index.html            Vite 入口：CSS link（全部 24 个效果文件）+ #app + /src/main.js
vite.config.js        仅 svelte() 插件（同桌面项目）
public/css/           style.css（牌堆布局 + 扇形 + 翻卡/飞走/弹回动画 + 滑动变量）+ cards*.css（全息效果，源自 pattern-library，未改动）
public/img/           共享纹理（卡背 card-back.webp 等）
public/patterns/      p01–p38.webp 卡面
src/main.js           挂载 App 到 #app
src/App.svelte        页面：故障终端背景 + 牌堆 + 38 张卡洗牌状态机 + 作者标签乱序
src/lib/components/Card.svelte          单卡：翻面 + 弹出 360° 弹簧（svelte/motion）+ 右划划走手势
src/lib/components/FaultyTerminal.svelte 故障终端背景（vue-bits FaultyTerminal 移植，零依赖 WebGL，颜色 #94a3b8）
src/lib/data/cards.js 38 张卡数据
src/lib/helpers/Math.js 从桌面项目拷贝（round/clamp/adjust）
```

## 本地预览
```bash
npm install   # svelte ^3.52 / vite ^3.2 / @sveltejs/vite-plugin-svelte ^1.1（同桌面）
npm run dev   # 开发服务器
npm run build # 构建到 dist/（public/ 原样拷入，CSS 相对路径不变）
```
