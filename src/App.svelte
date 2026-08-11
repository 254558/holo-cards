<!-- 全息卡 · 翻卡页（Svelte 版）
     页面 = 故障终端背景 + 中央牌堆（fan 装饰层 + 顶层真卡）+ 作者标签。
     牌堆状态机：38 张洗牌、右划划走换卡、划完自动洗牌重置。 -->
<script>
  import Card from './lib/components/Card.svelte'
  import FaultyTerminal from './lib/components/FaultyTerminal.svelte'
  import { CARDS } from './lib/data/cards.js'

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

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

  let cur = CARDS[order[0]]  // 初始顶层卡 = 洗牌后第一张（卡背朝上，翻面后看到它）
  let keyId = 0              // {#key} 强制重建 Card 实例 → 卡背朝上 + 每张首次 360°
  let autoFlip = false       // 划走后新卡升起：自动翻到正面
  let advancing = false      // 划走后等待飞走过渡的 480ms 内防重复推进
  let pop = false            // 牌堆"少一张"抖动
  let rising = false         // 新卡升起入场

  let labelEl

  /* 划走后：下一张（order[cursor]）升到顶层，卡背朝上并自动翻面 */
  const onDismiss = () => {
    if (advancing) return
    advancing = true
    // 等待旧卡飞走（0.45s 过渡）后再升下一张，节奏连贯
    setTimeout(() => {
      advancing = false
      cursor += 1
      if (cursor >= order.length) {
        // 全部划完：洗牌重置，新洗后的第一张升到顶层（卡背朝上，不自动翻）
        shuffle()
        setLabel('看完了 · 已重新洗牌')
        cur = CARDS[order[0]]
        autoFlip = false
      } else {
        cur = CARDS[order[cursor]]
        autoFlip = true
      }
      keyId += 1
      animateNewCard()
    }, reduce ? 0 : 480)
  }

  /* 牌堆抖一下 + 新卡升起（每次换卡重触发 CSS 动画） */
  const animateNewCard = () => {
    pop = false
    rising = false
    requestAnimationFrame(() => {
      pop = true
      rising = true
    })
  }

  /* 作者名字方框：同 pattens 标题旁 shuffle-code —— 整串乱序 N 步后落定（35ms/步）。
     "作者"两字在方框外且永远固定：结构只建一次、复用（不清空重建），
     方框宽度恒定（CSS min-width），所以左侧文字位置绝不移动，只有框内文字乱序动 */
  const CHAR_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const ensureAuthor = () => {
    const existing = labelEl.querySelector('.author-box')
    if (existing) return existing
    labelEl.innerHTML = ''
    labelEl.appendChild(document.createTextNode('作者 · '))
    const box = document.createElement('span')
    box.className = 'author-box'
    labelEl.appendChild(box)
    return box
  }
  const shuffleTo = (box, finalText) => {
    if (reduce) { box.textContent = finalText; return }
    let step = 0
    const timer = setInterval(() => {
      if (step < 12) {
        // 中文/符号/空格固定，字母数字乱序跳动（乱序池同 pattens）
        box.textContent = Array.from(finalText, (ch) =>
          /[A-Za-z0-9]/.test(ch) ? CHAR_POOL[(Math.random() * 26) | 0] : ch,
        ).join('')
        step++
      } else {
        box.textContent = finalText
        clearInterval(timer)
      }
    }, 35)
  }
  const setLabel = (text) => {
    if (!labelEl) return
    labelEl.innerHTML = ''
    labelEl.textContent = text
  }

  /* 卡翻到正面 → 标签换成"作者 · 名称"（乱序落定） */
  const onFlip = (e) => {
    shuffleTo(ensureAuthor(), e.detail || (cur && cur.label))
  }
</script>

<FaultyTerminal />

<main class="stage">
  <!-- 中央牌堆：背后 8 层卡背扇形（装饰），顶层是真实可交互卡 -->
  <div class="stack" id="stack" class:pop>
    <div class="stack__fan" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
    </div>
    <div class="card-wrap" id="card-wrap" class:rising>
      {#key keyId}
        <Card
          card={cur}
          autoFlip={autoFlip}
          on:dismiss={onDismiss}
          on:flip={onFlip}
        />
      {/key}
    </div>
  </div>

  <!-- 标签：卡背提示 / 翻面后的推荐名 -->
  <p class="draw-label" id="draw-label" bind:this={labelEl}>点一下翻面 · 不喜欢右划划走</p>
</main>
