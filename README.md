# Holo Cards · 全息卡牌堆

纯静态单页（HTML + CSS + 原生 JS，无框架、无构建）：屏幕中央一堆全息卡牌，**点一下翻面查看，不喜欢右划划走**。

## 交互
- 背景：**故障终端**（CRT 绿色数字网格，扫描线/位移抖动/鼠标波纹/载入淡入，移植自 [vue-bits FaultyTerminal](https://vue-bits.dev/backgrounds/faulty-terminal)，零依赖原生 WebGL；`prefers-reduced-motion` 时渲染一帧静态网格）
- 屏幕中央一堆牌（顶层是真卡、背后 8 层卡背扇形），底部提示
- **点一下卡** → 翻到正面并**弹出**（pokemon-cards-css 点击动画移植：整卡弹簧放大到视口适配 ≤1.75× + 首次 360° 翻转 + 白边发光，约 1.5s 落定带过冲），显示"作者 · 名称稀有度"（白框方框 + 乱序落定，同 pattens 标题旁效果）
- **再点一下（正面）** → 弹簧弹回原位，保持正面；再点可再次弹出（无 360°）
- **按住右划** → 卡片跟手位移 + 微旋转 + 扫光跟随；松手超过卡宽 35% → 飞向右侧划走，下一张升到顶层并**自动翻到正面**
- **其他方向 / 短划** → 弹回原位
- 38 张划完自动洗牌重置，提示"看完了 · 已重新洗牌"
- 空闲时卡片缓慢游移扫光；`prefers-reduced-motion` 时全部静止、直接换卡

## 文件
```
index.html            单屏 stage：中央牌堆（fan 层 + 顶层卡）+ 标签
css/style.css         牌堆布局 + 扇形 + 翻卡/飞走/弹回动画 + 滑动变量 + 背景层级
css/cards*.css        全息效果（源自 pattern-library，未改动）
js/main.js            38 张卡数据 + 洗牌状态机 + 点按/划走手势 + 视差驱动
js/faulty-terminal.js 故障终端背景（vue-bits FaultyTerminal 移植，零依赖 WebGL）
patterns/             p01–p38.webp 卡面
img/                  共享纹理（卡背 card-back.webp 等）
```

## 本地预览
任意静态服务器即可，例如 `npx serve .` 或 `python3 -m http.server 8080`。
