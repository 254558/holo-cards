# Holo Cards · 全息卡抽卡页

纯静态单页（HTML + CSS + 原生 JS，无框架、无构建），只有一个功能：**从 38 张全息卡的牌堆里，点一下随机抽一张推荐**。

## 交互
- 屏幕中央一张全息卡 + 底部牌堆（5 层卡背扇形叠放）
- 点牌堆或点卡片本体 → 随机抽一张（Fisher-Yates 洗牌、**不放回**），卡背翻出卡面，显示"今日推荐 · 名称稀有度"与剩余张数
- 38 张抽完自动重新洗牌，卡片翻回背面提示"全部抽完"
- 按住拖动卡片 → 倾斜视角、扫光跟随手指；快速点按（位移 <10px、<400ms）→ 抽卡
- 空闲时卡片缓慢游移扫光；`prefers-reduced-motion` 时全部静止、直接换卡

## 文件
```
index.html        单屏 stage：一张展示卡 + 牌堆按钮
css/style.css     单屏布局 + 牌堆扇形 + 抽卡动画
css/cards*.css    全息效果（源自 pattern-library，未改动）
js/main.js        38 张卡数据 + 洗牌抽卡 + 手势区分 + 视差驱动
patterns/         p01–p38.webp 卡面
img/              共享纹理（卡背 card-back.webp 等）
```

## 本地预览
任意静态服务器即可，例如 `npx serve .` 或 `python3 -m http.server 8080`。
