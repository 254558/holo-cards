/* 设备分级：模块加载时算一次，供各组件做自适应降级。
   目标——高端机保持全效；低端机只降"感知不到"的部分（背景分辨率、
   空闲游移扫光、预加载窗口），全息交互特效完整保留，观感尽量一致。

   判定依据（全部做存在性守卫，缺失时按高端处理）：
   - prefers-reduced-motion：用户主动要省 → 直接低端档
   - navigator.deviceMemory（Chrome/Edge）：< 4GB 视为低端
   - navigator.hardwareConcurrency：≤ 4 核视为低端
   - navigator.connection.effectiveType（Chromium 移动端）：slow-2g/2g 视为低端
   iPhone/桌面 Safari 缺失 deviceMemory/connection 时自动按高端处理。 */
const lowEnd = (() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  const mem = navigator.deviceMemory || 0
  if (mem > 0 && mem < 4) return true
  const cores = navigator.hardwareConcurrency || 0
  if (cores > 0 && cores <= 4) return true
  const et = navigator.connection && navigator.connection.effectiveType
  if (et === 'slow-2g' || et === '2g') return true
  return false
})()

export const QUALITY = {
  lowEnd,
  /* 背景（FaultyTerminal）渲染分辨率上限：低端 1.25，片元着色器像素数约降 60% */
  bgDprCap: lowEnd ? 1.25 : 2,
  /* 空闲游移扫光：低端关闭（CSS 变量静止 → 合成器不再每帧重算全息图层） */
  idleShimmer: !lowEnd,
  /* 提前预加载卡数（当前卡之后的窗口） */
  preloadWindow: lowEnd ? 2 : 4,
}
