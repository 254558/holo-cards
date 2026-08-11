/* ═══════════════════════════════════════════
   全息卡 · 抽卡页
   - 牌堆点一下随机抽一张（不放回，38 张抽完自动洗牌重置）
   - 抽出的卡：空闲游移扫光 + 触摸/鼠标拖动倾斜视角
   - 手势区分：快速点按（位移 <10px、<400ms）= 抽卡；按住拖动 = 倾斜
   - prefers-reduced-motion：无动画，卡面直接切换
   ═══════════════════════════════════════════ */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const ROT_MAX = 12 // 触摸时最大倾斜角（deg）

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
  const rot = card.querySelector('.card__rotator')
  const frontImg = card.querySelector('.card__front img')
  const labelEl = document.getElementById('draw-label')
  const deck = document.getElementById('deck')
  const deckCount = document.getElementById('deck-count')
  const imgNum = (c) => (c.img.match(/p(\d+)/) || [1])[1]

  /* ── 洗牌 + 抽卡：Fisher-Yates 打乱索引，游标不放回，抽完自动重置 ── */
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

  let busy = false
  const draw = () => {
    if (busy) return
    busy = true
    setTimeout(() => { busy = false }, 500) // 动画期间防连点

    if (cursor >= order.length) {
      // 全部抽完：洗牌重置，卡翻回背面
      shuffle()
      deckCount.textContent = `剩余 ${order.length}`
      labelEl.textContent = '全部抽完 · 已重新洗牌'
      card.classList.add('loading')
      rot.setAttribute('aria-label', '全息卡 · 牌堆已重置')
      return
    }

    const c = CARDS[order[cursor++]]

    // 换属性 + 换卡面
    card.dataset.rarity = c.r
    card.dataset.number = c.n
    card.dataset.set = c.s
    card.dataset.subtypes = c.st
    card.dataset.supertype = c.su
    card.dataset.trainerGallery = String(c.tg)
    frontImg.src = c.img
    rot.setAttribute('aria-label', `全息卡 · ${c.label} (p${imgNum(c)})`)

    // 卡背翻到正面（loading 态移除即触发 CSS 翻转）+ 整卡弹出
    card.classList.remove('loading')
    wrap.classList.remove('dealing')
    void wrap.offsetWidth // 重触发动画
    wrap.classList.add('dealing')

    // 牌堆"少一张"抖动 + 计数
    deck.classList.remove('pop')
    void deck.offsetWidth
    deck.classList.add('pop')
    deckCount.textContent = `剩余 ${order.length - cursor}`

    // 推荐标签
    labelEl.innerHTML = `今日推荐 · <strong>${c.label}</strong>`
  }
  deck.addEventListener('click', draw)

  /* ── 手势区分：按住拖动 = 倾斜；快速点按 = 抽卡 ── */
  let downX = 0
  let downY = 0
  let downT = 0
  let moved = false
  rot.addEventListener('pointerdown', (e) => {
    downX = e.clientX
    downY = e.clientY
    downT = Date.now()
    moved = false
  })
  rot.addEventListener('pointermove', (e) => {
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 10) moved = true
  })
  rot.addEventListener('pointerup', () => {
    if (!moved && Date.now() - downT < 400) draw() // 快速点按 → 抽卡
  })

  /* ── 视差（单张卡）：空闲游移扫光 + 触摸/鼠标拖动倾斜 ── */
  const s = { card, rot, phase: 0, touching: false, tx: 0.5, ty: 0.5, rx: 0, ry: 0 }

  rot.addEventListener('pointermove', (e) => {
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
  rot.addEventListener('pointerleave', settle)
  rot.addEventListener('pointerup', settle)
  rot.addEventListener('pointercancel', settle)

  const apply = (t) => {
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

  const tick = (t) => {
    apply(t)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})()
