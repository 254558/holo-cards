/* ═══════════════════════════════════════════
   全息卡 · 翻卡页
   - 中央牌堆：顶层卡卡背朝上，点一下翻到正面（丰富翻卡动画）
   - 右划（超过卡宽 35%）= 不喜欢划走，下一张升到顶层；其他方向/短划弹回
   - 翻开后保持正面，只能右划换下一张；38 张划完自动洗牌重置
   - 空闲游移扫光 + 触摸/鼠标拖动时扫光跟随指针
   - prefers-reduced-motion：无动画直接切换
   ═══════════════════════════════════════════ */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const ROT_MAX = 12 // 触摸时最大倾斜角（deg）
  const SWIPE_RATIO = 0.35 // 右划超过卡宽 35% 才划走

  /* ── 38 张卡数据：属性与图纸库运行态一致（由原 index.html 逐卡解析）── */
  const CARDS = [
    { r: 'rare rainbow alt', n: '01', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Rainbow Alt', img: 'patterns/p01.webp' },
    { r: 'radiant rare', n: '02', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Radiant', img: 'patterns/p02.webp' },
    { r: 'common reverse holo', n: '03', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Reverse Holo', img: 'patterns/p03.webp' },
    { r: 'rare secret', n: '160', s: 'swsh12pt5', st: 'Basic', su: 'pokémon', tg: false, label: 'Pikachu Promo', img: 'patterns/p04.webp' },
    { r: 'rare holo cosmos', n: '05', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Cosmos', img: 'patterns/p05.webp' },
    { r: 'rare holo v', n: 'tg02', s: '', st: 'Basic', su: 'pokémon', tg: true, label: 'TG V', img: 'patterns/p06.webp' },
    { r: 'rare secret', n: 'tg04', s: '', st: 'Basic', su: 'pokémon', tg: true, label: 'TG Gold', img: 'patterns/p07.webp' },
    { r: 'rare shiny v', n: 'sv02', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Shiny V', img: 'patterns/p08.webp' },
    { r: 'rare holo', n: '09', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Regular Holo', img: 'patterns/p09.webp' },
    { r: 'common', n: '10', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Plain', img: 'patterns/p10.webp' },
    { r: 'rare shiny vmax', n: 'sv03', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Shiny VMAX', img: 'patterns/p11.webp' },
    { r: 'rare ultra', n: '12', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Ultra Full Art', img: 'patterns/p12.webp' },
    { r: 'amazing rare', n: '13', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Amazing Rare', img: 'patterns/p13.webp' },
    { r: 'rare secret', n: '14', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Gold Secret', img: 'patterns/p14.webp' },
    { r: 'rare ultra', n: '15', s: '', st: 'Supporter', su: 'pokémon', tg: false, label: 'Trainer Full Art', img: 'patterns/p15.webp' },
    { r: 'rare holo vmax', n: '16', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'VMAX', img: 'patterns/p16.webp' },
    { r: 'rare holo vmax', n: 'tg03', s: '', st: 'Basic', su: 'pokémon', tg: true, label: 'TG VMAX', img: 'patterns/p17.webp' },
    { r: 'rare rainbow', n: '18', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Rainbow', img: 'patterns/p18.webp' },
    { r: 'rare holo vstar', n: '19', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'VSTAR', img: 'patterns/p19.webp' },
    { r: 'rare holo v', n: '20', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Sunpillar V', img: 'patterns/p20.webp' },
    { r: 'rare holo', n: 'tg01', s: '', st: 'Basic', su: 'pokémon', tg: true, label: 'TG Holo', img: 'patterns/p21.webp' },
    { r: 'rare shiny', n: 'sv01', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Shiny', img: 'patterns/p22.webp' },
    { r: 'rare secret', n: '160', s: 'swsh12pt5', st: 'Basic', su: 'pokémon', tg: false, label: 'Pikachu Promo', img: 'patterns/p23.webp' },
    { r: 'rare holo vstar', n: '24', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'VSTAR', img: 'patterns/p24.webp' },
    { r: 'rare holo cosmos', n: '25', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Cosmos', img: 'patterns/p25.webp' },
    { r: 'rare secret', n: '26', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Gold Secret', img: 'patterns/p26.webp' },
    { r: 'rare holo vmax', n: 'tg03', s: '', st: 'Basic', su: 'pokémon', tg: true, label: 'TG VMAX', img: 'patterns/p27.webp' },
    { r: 'amazing rare', n: '28', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Amazing Rare', img: 'patterns/p28.webp' },
    { r: 'rare holo cosmos', n: '29', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Cosmos', img: 'patterns/p29.webp' },
    { r: 'rare holo vstar', n: '30', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'VSTAR', img: 'patterns/p30.webp' },
    { r: 'rare holo vstar', n: '31', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'VSTAR', img: 'patterns/p31.webp' },
    { r: 'rare ultra', n: '32', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Ultra Full Art', img: 'patterns/p32.webp' },
    { r: 'rare secret', n: '160', s: 'swsh12pt5', st: 'Basic', su: 'pokémon', tg: false, label: 'Pikachu Promo', img: 'patterns/p33.webp' },
    { r: 'rare ultra', n: '34', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Ultra Full Art', img: 'patterns/p34.webp' },
    { r: 'rare holo', n: '35', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Regular Holo', img: 'patterns/p35.webp' },
    { r: 'rare rainbow alt', n: '36', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Rainbow Alt', img: 'patterns/p36.webp' },
    { r: 'common', n: '37', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Plain', img: 'patterns/p37.webp' },
    { r: 'amazing rare', n: '38', s: '', st: 'Basic', su: 'pokémon', tg: false, label: 'Amazing Rare', img: 'patterns/p38.webp' },
  ]

  /* ── DOM ── */
  const card = document.getElementById('stage-card')
  const wrap = document.getElementById('card-wrap')
  const stack = document.getElementById('stack')
  const rot = card.querySelector('.card__rotator')
  const frontImg = card.querySelector('.card__front img')
  const labelEl = document.getElementById('draw-label')
  const countEl = document.getElementById('deck-count')

  const imgNum = (c) => (c.img.match(/p(\d+)/) || [1])[1]

  /* ── 牌堆：Fisher-Yates 洗牌；cursor = 已划走张数，顶层卡 = order[cursor] ── */
  let order = []
  let cursor = 0
  const shuffle = () => {
    order = CARDS.map((_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    cursor = 0
  }
  shuffle()

  let cur = null
  const setCard = (c) => {
    cur = c
    card.dataset.rarity = c.r
    card.dataset.number = c.n
    card.dataset.set = c.s
    card.dataset.subtypes = c.st
    card.dataset.supertype = c.su
    card.dataset.trainerGallery = String(c.tg)
    frontImg.src = c.img
    rot.setAttribute('aria-label', `全息卡 · ${c.label} (p${imgNum(c)})`)
  }

  // 初始顶层卡 = 洗牌后第一张（卡背朝上，翻面后看到它）
  setCard(CARDS[order[0]])

  let faceUp = false
  let busy = false

  /* 划走后：下一张（order[cursor]）升到顶层，卡背朝上 */
  const showNext = () => {
    const c = CARDS[order[cursor]]
    setCard(c)
    faceUp = false
    card.classList.add('loading')
    card.classList.remove('flipping')
    countEl.textContent = `剩余 ${order.length - cursor}`
    // 牌堆抖一下 + 新卡升起
    stack.classList.remove('pop')
    void stack.offsetWidth
    stack.classList.add('pop')
    wrap.classList.remove('rising')
    void wrap.offsetWidth
    wrap.classList.add('rising')
  }

  /* 点一下翻面：卡背 → 正面（丰富翻卡动画）；翻正后再点保持正面 */
  const flip = () => {
    if (busy || faceUp) return
    faceUp = true
    busy = true
    card.classList.remove('loading')
    card.classList.add('flipping')
    wrap.classList.add('flipping')
    labelEl.innerHTML = `今日推荐 · <strong>${cur.label}</strong>`
    setTimeout(() => {
      card.classList.remove('flipping')
      wrap.classList.remove('flipping')
      busy = false
    }, reduce ? 0 : 720)
  }

  /* 右划过阈值：飞向右侧 → 下一张（划完则洗牌重置） */
  const dismiss = () => {
    if (busy) return
    busy = true
    card.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.1, 0.4, 1.25), opacity 0.4s ease'
    card.style.setProperty('--swipe-x', '130vw')
    card.style.setProperty('--swipe-rot', '14deg')
    card.style.opacity = '0'
    setTimeout(() => {
      card.style.transition = ''
      cursor += 1 // 当前顶层这张已划走
      if (cursor >= order.length) {
        // 全部划完：洗牌重置，新洗后的第一张升到顶层（卡背朝上）
        shuffle()
        setCard(CARDS[order[0]])
        labelEl.textContent = '看完了 · 已重新洗牌'
        countEl.textContent = `剩余 ${order.length}`
        faceUp = false
        card.classList.add('loading')
        card.classList.remove('flipping')
        stack.classList.remove('pop')
        void stack.offsetWidth
        stack.classList.add('pop')
      } else {
        showNext()
      }
      card.style.setProperty('--swipe-x', '0px')
      card.style.setProperty('--swipe-rot', '0deg')
      card.style.opacity = '1'
      busy = false
    }, reduce ? 0 : 480)
  }

  /* ── 手势：点按 = 翻面；拖动 = 划卡预览（右划超阈值划走，否则弹回） ── */
  let downX = 0
  let downY = 0
  let pressed = false // 是否处于按下状态（防止悬停误触发拖动）
  let dragging = false
  let dragX = 0

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

  rot.addEventListener('pointerdown', (e) => {
    if (busy) return
    pressed = true
    downX = e.clientX
    downY = e.clientY
    dragging = false
    dragX = 0
    try { rot.setPointerCapture(e.pointerId) } catch (_) { /* 极老浏览器 */ }
  })

  rot.addEventListener('pointermove', (e) => {
    // 全息扫光跟随指针（鼠标悬停也跟随，空闲游移暂停）
    const r = rot.getBoundingClientRect()
    s.touching = true
    card.classList.add('interacting')
    s.tx = (e.clientX - r.left) / r.width
    s.ty = (e.clientY - r.top) / r.height
    // 滑动跟手：仅按下状态，位移 ≥10px 进入拖动预览（位移 + 旋转）
    if (!pressed || busy) return
    const dx = e.clientX - downX
    if (Math.abs(dx) + Math.abs(e.clientY - downY) >= 10) {
      dragging = true
      dragX = dx
      card.style.setProperty('--swipe-x', `${dx}px`)
      card.style.setProperty('--swipe-rot', `${clamp(dx * 0.14, -18, 18)}deg`)
    }
  })

  const settle = () => {
    s.touching = false
    card.classList.remove('interacting')
  }

  const release = (tapped) => {
    settle()
    if (tapped) {
      flip() // 静止按下即抬起 → 翻面（不设时限：慢速点按也算点按）
      return
    }
    if (!dragging) return
    const w = card.getBoundingClientRect().width
    if (dragX > w * SWIPE_RATIO) {
      dismiss() // 右划过阈值 → 划走
    } else {
      // 其他方向 / 未过阈值 → 弹回原位
      card.classList.add('spring')
      card.style.setProperty('--swipe-x', '0px')
      card.style.setProperty('--swipe-rot', '0deg')
      setTimeout(() => card.classList.remove('spring'), 380)
    }
  }

  rot.addEventListener('pointerup', () => {
    if (busy) return
    pressed = false
    release(!dragging)
  })
  rot.addEventListener('pointercancel', () => {
    if (busy) return
    pressed = false
    release(false)
  })
  rot.addEventListener('pointerleave', () => {
    if (!pressed) settle() // 悬停离开：恢复空闲游移（按下时被 capture 抑制，不会误触发）
  })

  /* ── 视差（单张顶层卡）：空闲游移扫光 + 拖动时扫光跟随指针 ── */
  const s = { touching: false, tx: 0.5, ty: 0.5, rx: 0, ry: 0 }

  const apply = (t) => {
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

    card.style.setProperty('--pointer-x', `${(px * 100).toFixed(2)}%`)
    card.style.setProperty('--pointer-y', `${(py * 100).toFixed(2)}%`)
    card.style.setProperty('--background-x', `${(px * 100).toFixed(2)}%`)
    card.style.setProperty('--background-y', `${(py * 100).toFixed(2)}%`)
    card.style.setProperty('--pointer-from-center', dist.toFixed(3))
    card.style.setProperty('--pointer-from-left', px.toFixed(3))
    card.style.setProperty('--pointer-from-top', py.toFixed(3))

    // 平滑过渡到目标角度（简单 lerp，近似原版 svelte spring 手感）
    s.rx += (dx * 2 * ROT_MAX * amt - s.rx) * 0.12
    s.ry += (-dy * 2 * ROT_MAX * amt - s.ry) * 0.12
    card.style.setProperty('--rotate-x', `${s.rx.toFixed(2)}deg`)
    card.style.setProperty('--rotate-y', `${s.ry.toFixed(2)}deg`)
    card.style.setProperty('--card-opacity', (0.5 + dist * 0.4).toFixed(2))
  }

  const tick = (t) => {
    apply(t)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})()
