<!-- 全息卡 · 翻卡页（Svelte 版）
     页面 = 故障终端背景（#94a3b8 灰蓝）+ 中央牌堆（fan 装饰层 + 顶层真卡）+ 作者标签。
     牌堆状态机：38 张洗牌、右划划走换卡、划完自动洗牌重置。 -->
<script>
  import Card from './lib/components/Card.svelte'
  import FaultyTerminal from './lib/components/FaultyTerminal.svelte'
  import { CARDS } from './lib/data/cards.js'

  /* 预加载全部 38 张卡图 + 卡背图：
     只 new Image() 设 src 不够——① 循环里不保存引用会被 GC 回收，
     浏览器把缓存条目清掉，划走后新卡还是要现场拉图（已验证首用重拉）；
     ② fetch 完成≠解码，解码发生在首次绘制时，正好卡在新卡露脸的瞬间。
     这里保存引用 + decode() 强制解码到位（分批错峰，避免 38 张同时解码
     冲击首帧），保证划走换卡/翻面瞬间图案立即可用——
     新卡不会再长时间停在暗卡背（"闪黑"感），任何视口高度下都一致 */
  const preloaded = CARDS.map((c) => {
    const i = new Image()
    i.src = c.img
    return i
  })
  {
    const b = new Image()
    b.src = '/img/card-back.webp'
    preloaded.push(b)
  }
  let warmIdx = 0
  const warmDecode = () => {
    for (const i of preloaded.slice(warmIdx, warmIdx + 4)) {
      if (i.decode) i.decode().catch(() => {})
    }
    warmIdx += 4
    if (warmIdx < preloaded.length) setTimeout(warmDecode, 80)
  }
  warmDecode()

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
    }, reduce ? 0 : 480)
  }

  /* 作者名字方框：同 pattens 标题旁 shuffle-code —— 整串乱序 N 步后落定（35ms/步）。
     只有方框（无 "AUTHOR" 前缀）：结构只建一次、复用（不清空重建）；
     标签进入作者态加 .label-author（与牌堆同宽居中）→ 方框左右两边都随名字长度伸缩 */
  const CHAR_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const ensureAuthor = () => {
    const existing = labelEl.querySelector('.author-box')
    if (existing) return existing
    labelEl.innerHTML = ''
    labelEl.classList.add('label-author')
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
    labelEl.classList.remove('label-author') // 提示态回到默认居中
    labelEl.textContent = text
  }

  /* 卡翻到正面 → 标签换成名字方框（乱序落定） */
  const onFlip = (e) => {
    shuffleTo(ensureAuthor(), e.detail || (cur && cur.label))
  }
</script>

<FaultyTerminal />

<main class="stage">
  <!-- 中央牌堆：背后 8 层卡背扇形（装饰），顶层是真实可交互卡 -->
  <div class="stack" id="stack">
    <div class="stack__fan" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
    </div>
    <div class="card-wrap" id="card-wrap">
      <!-- 牌堆里等待的下一张：恒在顶层卡下方同一位置（卡背朝上），
           顶层卡划走时自然露出，再由 {#key} 重建的 Card 原位接替并自动翻面 -->
      <div class="card next-back" aria-hidden="true">
        <div class="card__translater">
          <div class="card__rotator">
            <img class="card__back" src="/img/card-back.webp" alt="" width="660" height="921" />
          </div>
        </div>
      </div>
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

  <!-- 标签：初始无提示文字（空占位保持布局），翻面后才出现作者名字方框 -->
  <p class="draw-label" id="draw-label" bind:this={labelEl}></p>
</main>
