/* ═══════════════════════════════════════════
   全息视差（纯展示，无任何点击行为）：
   - 空闲：每张卡缓慢游移扫光 + 轻微倾斜，错相位避免整体同步闪
   - 触摸/鼠标按住：扫光与倾斜跟随指针，松手回到游移
   - prefers-reduced-motion：完全静止，卡面只显示基础全息
   ═══════════════════════════════════════════ */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const ROT_MAX = 12 // 触摸时最大倾斜角（deg）

  const cards = Array.from(document.querySelectorAll('.card')).map((card, i) => ({
    card,
    rot: card.querySelector('.card__rotator'),
    phase: i * 0.72, // 每张错开相位，扫光不同步
    touching: false,
    inView: false,
    tx: 0.5,
    ty: 0.5,
    rx: 0,
    ry: 0,
  }))

  // 指针跟随：mouse 与 touch 统一走 pointer 事件；滚动手势由浏览器接管，不拦截
  for (const s of cards) {
    s.rot.addEventListener('pointermove', (e) => {
      if (!s.inView) return
      s.touching = true
      s.card.classList.add('interacting')
      const r = s.rot.getBoundingClientRect()
      s.tx = (e.clientX - r.left) / r.width
      s.ty = (e.clientY - r.top) / r.height
    })
    const settle = () => {
      s.touching = false
      s.card.classList.remove('interacting')
    }
    s.rot.addEventListener('pointerleave', settle)
    s.rot.addEventListener('pointerup', settle)
    s.rot.addEventListener('pointercancel', settle)
  }

  // 只动画视口内的卡：38 张全息层（filter/mix-blend-mode）同时刷会有压力
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const s = cards.find((c) => c.card === e.target)
          if (s) s.inView = e.isIntersecting
        }
      },
      { rootMargin: '120px' },
    )
    for (const s of cards) io.observe(s.card)
  } else {
    for (const s of cards) s.inView = true
  }

  const apply = (s, t) => {
    let px = s.tx
    let py = s.ty
    if (!s.touching && !reduce) {
      // 空闲游移：缓慢正弦扫描
      px = 0.5 + 0.3 * Math.sin(t * 0.0006 + s.phase)
      py = 0.5 + 0.26 * Math.cos(t * 0.0008 + s.phase * 1.3)
    } else if (reduce && !s.touching) {
      px = 0.5
      py = 0.5
    }
    const dx = px - 0.5
    const dy = py - 0.5
    const dist = Math.min(1, Math.hypot(dx, dy) * 2)
    const amt = s.touching ? 1 : 0.4 // 触摸满幅，空闲轻微

    s.card.style.setProperty('--pointer-x', `${(px * 100).toFixed(2)}%`)
    s.card.style.setProperty('--pointer-y', `${(py * 100).toFixed(2)}%`)
    s.card.style.setProperty('--background-x', `${(px * 100).toFixed(2)}%`)
    s.card.style.setProperty('--background-y', `${(py * 100).toFixed(2)}%`)
    s.card.style.setProperty('--pointer-from-center', dist.toFixed(3))
    s.card.style.setProperty('--pointer-from-left', px.toFixed(3))
    s.card.style.setProperty('--pointer-from-top', py.toFixed(3))

    // 平滑过渡到目标角度（简单 lerp，近似原版 svelte spring 手感）
    s.rx += (dx * 2 * ROT_MAX * amt - s.rx) * 0.12
    s.ry += (-dy * 2 * ROT_MAX * amt - s.ry) * 0.12
    s.card.style.setProperty('--rotate-x', `${s.rx.toFixed(2)}deg`)
    s.card.style.setProperty('--rotate-y', `${s.ry.toFixed(2)}deg`)
    s.card.style.setProperty('--card-opacity', (0.5 + dist * 0.4).toFixed(2))
  }

  let raf = 0
  const tick = (t) => {
    for (const s of cards) {
      if (s.inView || s.touching) apply(s, t)
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
})()
