# Holo Cards · 全息卡手机展示页

纯静态单页（HTML + CSS + 原生 JS，无框架、无构建），只有一个功能：**竖屏单列展示 38 张全息卡**。

## 效果
- 空闲时每张卡缓慢游移扫光 + 轻微倾斜（相位错开，不同步闪）
- 触摸/鼠标按住：扫光与倾斜跟随指针，松手回到游移
- `prefers-reduced-motion`：完全静止
- 视口外卡片跳过动画（IntersectionObserver），懒加载图片

## 文件
```
index.html        38 张卡静态 DOM（data-rarity 等属性与图纸库运行态一致）
css/style.css     页面布局 + 视差默认变量
css/cards*.css    全息效果（源自 pattern-library，未改动）
js/main.js        视差驱动（rAF + lerp）
patterns/         p01–p38.webp 卡面
img/              共享纹理（glitter/grain/cosmos 等）
```

## 本地预览
任意静态服务器即可，例如 `npx serve .` 或 `python3 -m http.server 8080`。
