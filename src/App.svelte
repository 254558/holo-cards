<!-- 全息卡 · 翻卡页（Svelte 版）
     页面 = 故障终端背景（#94a3b8 灰蓝）+ 中央牌堆（fan 装饰层 + 顶层真卡）+ 作者标签。
     牌堆状态机：42 张洗牌、右划划走换卡、划完自动洗牌重置。 -->
<script>
  import Card from './lib/components/Card.svelte'
  import FaultyTerminal from './lib/components/FaultyTerminal.svelte'
  import { CARDS } from './lib/data/cards.js'
  import { QUALITY } from './lib/helpers/quality.js'

  /* ── 预加载：滑动窗口（当前卡 + 后 N 张），不全量拉 42 张 ──
     只 new Image() 设 src 不够——不保存引用会被 GC 回收，浏览器把缓存条目清掉，
     划走后新卡还是要现场拉图（已验证首用重拉）；这里用 Map 保存引用防 GC。
     窗口内 decode 错峰：前两张（当前 + 下一张）立即、其余 80ms 后补，
     保证划走换卡/翻面瞬间图案立即可用——新卡不停在暗卡背（"闪黑"感）。
     启动只拉 1+N 张（N = QUALITY.preloadWindow，低端机更小），不再一次性
     拉全量 42 张冲击首帧 */
  const preloaded = new Map() // url -> Image（保存引用防 GC）
  {
    const b = new Image()
    b.src = '/img/card-back.webp'
    preloaded.set('/img/card-back.webp', b)
  }
  const prefetch = (url) => {
    let i = preloaded.get(url)
    if (!i) { i = new Image(); i.src = url; preloaded.set(url, i) }
    return i
  }
  let preloadTimer = null
  const warm = (start, count) => {
    const list = []
    for (let k = start; k < Math.min(start + count, order.length); k++) {
      list.push(prefetch(CARDS[order[k]].img))
    }
    list.slice(0, 2).forEach((i) => i.decode && i.decode().catch(() => {}))
    if (preloadTimer !== null) clearTimeout(preloadTimer)
    if (list.length > 2) {
      preloadTimer = setTimeout(() => {
        list.slice(2).forEach((i) => i.decode && i.decode().catch(() => {}))
      }, 80)
    }
  }

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
  warm(0, 1 + QUALITY.preloadWindow) // 初始窗口：当前顶层卡 + 后 N 张

  let cur = CARDS[order[0]]  // 初始顶层卡 = 洗牌后第一张（卡背朝上，翻面后看到它）
  let keyId = 0              // {#key} 强制重建 Card 实例 → 卡背朝上 + 每张首次 360°
  let autoFlip = false       // 划走后新卡升起：自动翻到正面
  let advancing = false      // 划走后等待飞走过渡的 480ms 内防重复推进

  let labelEl

  /* 划走后：下一张（order[cursor]）原位接替顶层，卡背朝上并自动翻面 */
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
      warm(cursor, 1 + QUALITY.preloadWindow) // 滑动窗口前移：补拉下一批
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
  <!-- SEO/读屏：视觉隐藏的结构化标题与描述（.seo-only 绝对定位不占布局） -->
  <h1 class="seo-only">全息卡 · 翻卡 | Holo Cards — 42 张全息卡牌交互体验</h1>
  <p class="seo-only">右划换卡、点按翻面、360° 弹簧弹出，每张卡都有独特的全息扫光与炫彩特效。</p>
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
