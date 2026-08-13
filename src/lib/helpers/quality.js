/* 设备分级：模块加载时算一次静态档位（QUALITY），并起一个运行期帧率探测——
   延迟 2s 后起测，此后每 30s 重测一轮，连续 2 轮卡顿才升档 veryLowEnd
   （只升不降；偶发卡顿不会永久丢纹理，真卡顿的机器约 1 分钟内确认升档）。

   静态判定（存在性守卫，缺失按高端处理；iPhone/桌面 Safari 缺 deviceMemory/
   connection 时按高端，核数仍参与）：
   - prefers-reduced-motion → 直接 veryLowEnd（用户要最简）
   - navigator.deviceMemory < 4 → lowEnd；<= 2 → veryLowEnd
   - navigator.hardwareConcurrency <= 4 → lowEnd；<= 2 → veryLowEnd
   - connection.effectiveType ∈ {slow-2g, 2g} → lowEnd 且 veryLowEnd

   档位：
   - veryLowEnd（特别卡）：全息纹理全关——卡面 shine/glare 不渲染（.no-fx）、
     背景不开 WebGL（纯色）、空闲扫光关、预加载窗口 1 张；
     交互（翻面/划走/弹出）全是纯 transform，保留
   - lowEnd（一般低端）：背景降分辨率（dpr 1.25）、空闲扫光关、预加载窗口 2 张
   - 默认（高端）：全效（dpr 2、空闲扫光、预加载窗口 4） */
import { writable } from 'svelte/store'

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const mem = navigator.deviceMemory || 0
const cores = navigator.hardwareConcurrency || 0
const et = navigator.connection && navigator.connection.effectiveType
const weakNet = et === 'slow-2g' || et === '2g'

const veryLowEnd =
  reduce ||
  weakNet ||
  (mem > 0 && mem <= 2) ||
  (cores > 0 && cores <= 2)
const lowEnd =
  veryLowEnd ||
  (mem > 0 && mem < 4) ||
  (cores > 0 && cores <= 4)

export const QUALITY = {
  lowEnd,
  veryLowEnd,
  /* 背景（FaultyTerminal）渲染分辨率上限：低端 1.25，片元着色器像素数约降 60% */
  bgDprCap: lowEnd ? 1.25 : 2,
  /* 空闲游移扫光：低端关闭（CSS 变量静止 → 合成器不再每帧重算全息图层） */
  idleShimmer: !lowEnd,
  /* 提前预加载卡数（当前卡之后的窗口） */
  preloadWindow: veryLowEnd ? 1 : lowEnd ? 2 : 4,
}

/* 运行期档位（可能被帧率探测升档；veryLowEnd 只升不降）。
   组件用它做响应式降级（Card 的 .no-fx、FaultyTerminal 停帧/移除画布） */
export const quality = writable(QUALITY)

/* 帧率探测：延迟 2s 起测（避开首屏图片解码/着色器编译的瞬时占用），每轮测 2.5s，
   帧间隔 >40ms（<25fps）占比 ≥35% 记为卡顿轮；此后每 30s 重测一轮，
   连续 2 轮卡顿才升 veryLowEnd——打开瞬间的偶发卡顿（系统忙/后台解码）不会永久丢纹理，
   真卡顿的机器约 1 分钟内确认升档。升档后永久保持（效果忽隐忽现比一直朴素更难受），不再重测 */
const BAD_FRACTION = 0.35  // 卡顿帧占比阈值
const SLOW_MS = 40         // 帧间隔超过视为卡顿
const PROBE_MS = 2500      // 每轮测量时长
const RETRY_MS = 30000     // 重测间隔
const BAD_ROUNDS = 2       // 连续卡顿轮数达到即升档

if (typeof requestAnimationFrame === 'function' && !veryLowEnd) {
  let badRounds = 0

  const probe = () => {
    // 页面不可见时 rAF 停帧，测不出真实帧率，稍后重试
    if (document.hidden) {
      setTimeout(probe, RETRY_MS)
      return
    }
    let frames = 0
    let slow = 0
    let last = performance.now()
    let end = last + PROBE_MS
    const step = (t) => {
      // 中途被挂起（切走/休眠）会有超大间隔，本轮作废从当前帧重来
      if (t - last > 1000) {
        last = t
        frames = 0
        slow = 0
        end = t + PROBE_MS
        requestAnimationFrame(step)
        return
      }
      frames++
      if (t - last > SLOW_MS) slow++
      last = t
      if (t < end && frames < 200) {
        requestAnimationFrame(step)
      } else {
        badRounds = frames > 0 && slow / frames >= BAD_FRACTION ? badRounds + 1 : 0
        if (badRounds >= BAD_ROUNDS) {
          // 连续多轮都卡才是真卡顿；升档后永久保持，不再重测
          quality.update((q) => ({ ...q, veryLowEnd: true, lowEnd: true }))
        } else {
          setTimeout(probe, RETRY_MS)
        }
      }
    }
    requestAnimationFrame(step)
  }

  setTimeout(probe, 2000)
}
