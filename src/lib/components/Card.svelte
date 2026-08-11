<!-- 全息卡组件 —— 桌面 pokemon-cards-css 的 Card.svelte 基础上改写：
     - 保留：translater>rotator 结构、svelte/motion spring 驱动 CSS 变量、
       popover/retreat（首次 360° 翻转 + 视口适配 ≤1.75×）、.active 白边发光
     - 改动：img 用本地 /patterns/pNN.webp；点击改为"翻面+弹出"状态机；
       新增右划划走手势（--swipe-x/--swipe-rot，超卡宽 35% 飞走并派发 dismiss）；
       保留空闲 sine 游移扫光（原 holo main.js 视差逻辑）
     - 每张卡用 {#key} 重建实例 → 天然卡背朝上 + 每张首次 360°
     - prefers-reduced-motion：只翻面不弹出、无动画切换 -->
<script>
  import { spring } from 'svelte/motion'
  import { createEventDispatcher, onMount } from 'svelte'
  import { clamp } from '../helpers/Math.js'

  export let card = null          // { r,n,s,st,su,tg,label,img }
  export let autoFlip = false     // 划走后新卡升起：自动翻到正面

  const dispatch = createEventDispatcher()
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const ROT_MAX = 12              // 触摸时最大倾斜角（deg）
  const SWIPE_RATIO = 0.35        // 右划超过卡宽 35% 才划走

  let thisCard
  let active = false      // .active class → base.css 白边发光
  let interacting = false
  let faceUp = false
  let popped = false
  let firstPop = true     // 每张卡首次弹出才转 360°（同原版每卡各转一次）
  let loading = true

  /* svelte/motion spring（同桌面 popover 手感：慢速带过冲，约 1.5s 落定） */
  const springPopoverSettings = { stiffness: 0.033, damping: 0.45 }
  let springRotateDelta = spring({ x: 0, y: 0 }, springPopoverSettings)
  let springScale = spring(1, springPopoverSettings)
  // spring 当前值镜像（rAF 循环里直接读取，避免依赖 $ 自动订阅上下文）
  const pop = { scale: 1, rx: 0, ry: 0 }

  /* ── 手势/滑动状态 ── */
  let downX = 0
  let downY = 0
  let pressed = false
  let dragging = false
  let dragX = 0
  let swiping = false     // 飞走过渡未结束，锁交互

  /* ── 视差状态（原 holo main.js）：空闲游移扫光 + 拖动时跟随指针 ── */
  const s = { touching: false, tx: 0.5, ty: 0.5, rx: 0, ry: 0 }
  let rafId = null
  let flipTimer = null
  let springScaleSub, springRotateSub

  /* 点一下翻面：移除 loading → 卡背瞬切（翻转交给外层 360° 旋转）+ 卡面淡入 */
  const flip = () => {
    if (faceUp) return
    faceUp = true
    loading = false
    dispatch('flip', card && card.label)
  }

  /* 弹出（pokemon-cards-css popover）：弹簧放大 + 首次 360° 翻转 + 发光 */
  const popover = () => {
    const rect = thisCard.getBoundingClientRect()
    const scaleW = (window.innerWidth / rect.width) * 0.9
    const scaleH = (window.innerHeight / rect.height) * 0.9
    springScale.set(Math.min(scaleW, scaleH, 1.75))
    if (firstPop) {
      springRotateDelta.set({ x: 360, y: 0 })
      firstPop = false
    }
    active = true
    popped = true
  }

  /* 弹回：弹簧反向（360° 反绕回去 + 缩小），保持正面 */
  const retreat = () => {
    springScale.set(1, { soft: true })
    springRotateDelta.set({ x: 0, y: 0 }, { soft: true })
    active = false
    popped = false
  }

  /* 点一下：卡背朝上 → 翻面+弹出；已弹出 → 弹回；正面未弹出 → 再弹（无 360°） */
  const onTap = () => {
    if (swiping) return
    if (popped) { retreat(); return }
    if (!faceUp) flip()
    if (reduce) return   // 动效减弱：只翻面不弹出
    popover()
  }

  /* ── 手势：点按 = 翻面/弹出/弹回；拖动 = 划卡预览（右划超阈值划走，否则弹回） ── */
  const onPointerDown = (e) => {
    if (swiping) return
    pressed = true
    downX = e.clientX
    downY = e.clientY
    dragging = false
    dragX = 0
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (_) { /* 极老浏览器 */ }
  }

  const onPointerMove = (e) => {
    // 全息扫光跟随指针（鼠标悬停也跟随，空闲游移暂停）
    const r = e.currentTarget.getBoundingClientRect()
    s.touching = true
    interacting = true
    s.tx = (e.clientX - r.left) / r.width
    s.ty = (e.clientY - r.top) / r.height
    // 滑动跟手：仅按下状态，位移 ≥10px 进入拖动预览（位移 + 旋转）
    if (!pressed || swiping) return
    const dx = e.clientX - downX
    if (Math.abs(dx) + Math.abs(e.clientY - downY) >= 10) {
      dragging = true
      dragX = dx
      thisCard.style.setProperty('--swipe-x', `${dx}px`)
      thisCard.style.setProperty('--swipe-rot', `${clamp(dx * 0.14, -18, 18)}deg`)
    }
  }

  const settle = () => {
    s.touching = false
    interacting = false
  }

  const release = (tapped) => {
    settle()
    if (tapped) {
      onTap()
      return
    }
    if (!dragging) return
    // 用未缩放的卡宽做阈值：弹出放大后拖动距离门槛不跟着变大
    const w = thisCard.parentElement.getBoundingClientRect().width
    if (dragX > w * SWIPE_RATIO) {
      dismiss() // 右划过阈值 → 划走
    } else {
      // 其他方向 / 未过阈值 → 弹回原位
      thisCard.classList.add('spring')
      thisCard.style.setProperty('--swipe-x', '0px')
      thisCard.style.setProperty('--swipe-rot', '0deg')
      setTimeout(() => thisCard.classList.remove('spring'), 380)
    }
  }

  const onPointerUp = () => {
    if (!pressed) return
    pressed = false
    release(!dragging)
  }

  const onPointerCancel = () => {
    if (!pressed) return
    pressed = false
    dragging = false
    settle()
  }

  const onPointerLeave = () => {
    if (!pressed) settle() // 悬停离开：恢复空闲游移（按下时被 capture 抑制，不会误触发）
  }

  /* 右划过阈值：飞向右侧，通知 App 升下一张 */
  const dismiss = () => {
    if (swiping) return
    swiping = true
    thisCard.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.1, 0.4, 1.25), opacity 0.4s ease'
    thisCard.style.setProperty('--swipe-x', '130vw')
    thisCard.style.setProperty('--swipe-rot', '14deg')
    thisCard.style.opacity = '0'
    dispatch('dismiss')
  }

  /* ── 每帧：视差游移扫光 + 把 spring 值写进 CSS 变量（popover）── */
  const tick = (t) => {
    rafId = requestAnimationFrame(tick)
    let px = s.tx
    let py = s.ty
    if (!s.touching && !reduce) {
      // 空闲游移：缓慢正弦扫描
      px = 0.5 + 0.3 * Math.sin(t * 0.0006 + 0)
      py = 0.5 + 0.26 * Math.cos(t * 0.0008 + 0)
    } else if (reduce && !s.touching) {
      px = 0.5
      py = 0.5
    }
    const dx = px - 0.5
    const dy = py - 0.5
    const dist = Math.min(1, Math.hypot(dx, dy) * 2)
    const amt = s.touching ? 1 : 0.4 // 触摸满幅，空闲轻微

    thisCard.style.setProperty('--pointer-x', `${(px * 100).toFixed(2)}%`)
    thisCard.style.setProperty('--pointer-y', `${(py * 100).toFixed(2)}%`)
    thisCard.style.setProperty('--background-x', `${(px * 100).toFixed(2)}%`)
    thisCard.style.setProperty('--background-y', `${(py * 100).toFixed(2)}%`)
    thisCard.style.setProperty('--pointer-from-center', dist.toFixed(3))
    thisCard.style.setProperty('--pointer-from-left', px.toFixed(3))
    thisCard.style.setProperty('--pointer-from-top', py.toFixed(3))

    // 平滑过渡到目标角度（lerp）+ 弹出旋转叠加（svelte/motion spring）
    s.rx += (dx * 2 * ROT_MAX * amt - s.rx) * 0.12
    s.ry += (-dy * 2 * ROT_MAX * amt - s.ry) * 0.12
    thisCard.style.setProperty('--rotate-x', `${(s.rx + pop.rx).toFixed(2)}deg`)
    thisCard.style.setProperty('--rotate-y', `${(s.ry + pop.ry).toFixed(2)}deg`)
    thisCard.style.setProperty('--card-scale', pop.scale.toFixed(4))
    thisCard.style.setProperty('--card-opacity', (0.5 + dist * 0.4).toFixed(2))
  }

  onMount(() => {
    // spring 值镜像
    springScaleSub = springScale.subscribe((v) => { pop.scale = v })
    springRotateSub = springRotateDelta.subscribe((v) => { pop.rx = v.x; pop.ry = v.y })
    rafId = requestAnimationFrame(tick)
    // 划走后新卡升起：等升起动画接完再自动翻面（节奏连贯）
    if (autoFlip) {
      flipTimer = setTimeout(flip, reduce ? 0 : 380)
    }
    return () => {
      cancelAnimationFrame(rafId)
      if (flipTimer !== null) clearTimeout(flipTimer)
      if (springScaleSub) springScaleSub()
      if (springRotateSub) springRotateSub()
    }
  })
</script>

<div
  class="card pattern interactive"
  class:active
  class:interacting
  class:loading
  data-rarity={card && card.r}
  data-number={card && card.n}
  data-set={card && card.s}
  data-subtypes={card && card.st}
  data-supertype={card && card.su}
  data-trainer-gallery={String(card && card.tg)}
  bind:this={thisCard}
>
  <div class="card__translater">
    <div
      class="card__rotator"
      aria-label={`全息卡 · ${card ? card.label : ''} · 点一下翻面`}
      on:pointerdown={onPointerDown}
      on:pointermove={onPointerMove}
      on:pointerup={onPointerUp}
      on:pointercancel={onPointerCancel}
      on:pointerleave={onPointerLeave}
    >
      <img class="card__back" src="/img/card-back.webp" alt="" width="660" height="921" />
      <div class="card__front">
        <img src={card && card.img} alt="" decoding="async" width="660" height="921" />
        <div class="card__shine"></div>
        <div class="card__glare"></div>
      </div>
    </div>
  </div>
</div>
