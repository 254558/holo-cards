/* ═══════════════════════════════════════════════
   故障终端背景 —— 移植自 vue-bits FaultyTerminal（ogl 全屏着色器）
   零依赖 vanilla WebGL：单个全屏三角形 + 片段着色器，
   渲染 CRT 终端数字网格（扫描线 / 位移抖动 / 鼠标波纹 / 载入淡入）。
   参数取 vue-bits demo 预览默认：绿色荧光 #A7EF9E，brightness 0.6。
   prefers-reduced-motion：只渲染一帧静态网格，不跑动画。
   运行状态写入容器 data-bg-* 属性（只读验证用，不污染 window）。
   ═══════════════════════════════════════════════ */
(function () {
  'use strict'

  var host = document.getElementById('bg-terminal')
  if (!host) return
  if (!window.WebGLRenderingContext) { host.setAttribute('data-bg-error', 'no-webgl'); return }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // 状态标记（data-bg-started/ready/error/size/stats）
  function mark(key, val) {
    try { host.setAttribute('data-bg-' + key, val === undefined ? '1' : String(val)) } catch (e) {}
  }
  mark('started')

  try {
    // ── 配置（= vue-bits FaultyTerminal demo 预览参数）──
    var CFG = {
      scale: 1.5,           // 图案缩放
      gridMul: [2, 1],      // 字形网格密度 [x, y]
      digitSize: 1.2,       // 字形大小
      timeScale: 0.5,       // 动画速度
      scanlineIntensity: 0.5,
      glitchAmount: 1,      // 位移抖动幅度（1 = 默认抖动）
      flickerAmount: 1,     // 闪烁强度
      noiseAmp: 1,
      chromaticAberration: 0,
      dither: 0,
      curvature: 0.1,       // CRT 桶形畸变
      tint: '#A7EF9E',      // 荧光绿（demo 预览色）
      mouseReact: true,
      mouseStrength: 0.5,
      pageLoadAnimation: true,
      brightness: 0.6
    }

    var TINT = (function hexToRgb(h) {
      h = h.replace('#', '').trim()
      if (h.length === 3) h = h.split('').map(function (c) { return c + c }).join('')
      var n = parseInt(h, 16)
      return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
    })(CFG.tint)

    var canvas = document.createElement('canvas')
    host.appendChild(canvas)
    var gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false, alpha: false })
    if (!gl) { canvas.remove(); mark('error', 'no-gl'); return }
    gl.clearColor(0, 0, 0, 1)

    /* ── 着色器（与 vue-bits FaultyTerminal.vue 完全一致）── */
    var VERT = [
      'attribute vec2 position;',
      'attribute vec2 uv;',
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  gl_Position = vec4(position, 0.0, 1.0);',
      '}'
    ].join('\n')

    var FRAG = `
precision mediump float;

varying vec2 vUv;

uniform float iTime;
uniform vec3  iResolution;
uniform float uScale;

uniform vec2  uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3  uTint;
uniform vec2  uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;

float time;

float hash21(vec2 p){
  p = fract(p * 234.56);
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p)
{
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2;
}

mat2 rotate(float angle)
{
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float fbm(vec2 p)
{
  p *= 1.1;
  float f = 0.0;
  float amp = 0.5 * uNoiseAmp;

  mat2 modify0 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify0 * p * 2.0;
  amp *= 0.454545; // 1/2.2

  mat2 modify1 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify1 * p * 2.0;
  amp *= 0.454545;

  mat2 modify2 = rotate(time * 0.08);
  f += amp * noise(p);

  return f;
}

float pattern(vec2 p, out vec2 q, out vec2 r) {
  vec2 offset1 = vec2(1.0);
  vec2 offset0 = vec2(0.0);
  mat2 rot01 = rotate(0.1 * time);
  mat2 rot1 = rotate(0.1);

  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
  return fbm(p + r);
}

float digit(vec2 p){
    vec2 grid = uGridMul * 15.0;
    vec2 s = floor(p * grid) / grid;
    p = p * grid;
    vec2 q, r;
    float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;

    if(uUseMouse > 0.5){
        vec2 mouseWorld = uMouse * uScale;
        float distToMouse = distance(s, mouseWorld);
        float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
        intensity += mouseInfluence;

        float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
        intensity += ripple;
    }

    if(uUsePageLoadAnimation > 0.5){
        float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
        float cellDelay = cellRandom * 0.8;
        float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);

        float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
        intensity *= fadeAlpha;
    }

    p = fract(p);
    p *= uDigitSize;

    float px5 = p.x * 5.0;
    float py5 = (1.0 - p.y) * 5.0;
    float x = fract(px5);
    float y = fract(py5);

    float i = floor(py5) - 2.0;
    float j = floor(px5) - 2.0;
    float n = i * i + j * j;
    float f = n * 0.0625;

    float isOn = step(0.1, intensity - f);
    float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);

    return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
}

float onOff(float a, float b, float c)
{
  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
}

float displace(vec2 look)
{
    float y = look.y - mod(iTime * 0.25, 1.0);
    float window = 1.0 / (1.0 + 50.0 * y * y);
    return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}

vec3 getColor(vec2 p){

    float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0; // more efficient than ternary
    bar *= uScanlineIntensity;

    float displacement = displace(p);
    p.x += displacement;

    if (uGlitchAmount != 1.0) {
      float extra = displacement * (uGlitchAmount - 1.0);
      p.x += extra;
    }

    float middle = digit(p);

    const float off = 0.002;
    float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +
                digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +
                digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));

    vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
    return baseColor;
}

vec2 barrel(vec2 uv){
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + uCurvature * r2;
  return c * 0.5 + 0.5;
}

void main() {
    time = iTime * 0.333333;
    vec2 uv = vUv;

    if(uCurvature != 0.0){
      uv = barrel(uv);
    }

    vec2 p = uv * uScale;
    vec3 col = getColor(p);

    if(uChromaticAberration != 0.0){
      vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
      col.r = getColor(p + ca).r;
      col.b = getColor(p - ca).b;
    }

    col *= uTint;
    col *= uBrightness;

    if(uDither > 0.0){
      float rnd = hash21(gl_FragCoord.xy);
      col += (rnd - 0.5) * (uDither * 0.003922);
    }

    gl_FragColor = vec4(col, 1.0);
}
`

    function compile(type, src) {
      var sh = gl.createShader(type)
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error('shader: ' + gl.getShaderInfoLog(sh))
      }
      return sh
    }

    var vs = compile(gl.VERTEX_SHADER, VERT)
    var fs = compile(gl.FRAGMENT_SHADER, FRAG)

    var program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('link: ' + gl.getProgramInfoLog(program))
    }
    gl.useProgram(program)

    // 全屏三角形（同 ogl Triangle：覆盖视口，uv 0..1 线性映射）
    var posBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    var aPos = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    var uvBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 2, 0, 0, 2]), gl.STATIC_DRAW)
    var aUv = gl.getAttribLocation(program, 'uv')
    gl.enableVertexAttribArray(aUv)
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)

    // ── uniform 定位 ──
    var U = {}
    ;['iTime', 'iResolution', 'uScale', 'uGridMul', 'uDigitSize', 'uScanlineIntensity',
      'uGlitchAmount', 'uFlickerAmount', 'uNoiseAmp', 'uChromaticAberration', 'uDither',
      'uCurvature', 'uTint', 'uMouse', 'uMouseStrength', 'uUseMouse', 'uPageLoadProgress',
      'uUsePageLoadAnimation', 'uBrightness'].forEach(function (name) {
      U[name] = gl.getUniformLocation(program, name)
    })

    function set1(loc, v) { gl.uniform1f(loc, v) }
    function set2(loc, a, b) { gl.uniform2f(loc, a, b) }
    function set3(loc, a, b, c) { gl.uniform3f(loc, a, b, c) }

    // 固定值只设一次
    set1(U.uScale, CFG.scale)
    set2(U.uGridMul, CFG.gridMul[0], CFG.gridMul[1])
    set1(U.uDigitSize, CFG.digitSize)
    set1(U.uScanlineIntensity, CFG.scanlineIntensity)
    set1(U.uGlitchAmount, CFG.glitchAmount)
    set1(U.uFlickerAmount, CFG.flickerAmount)
    set1(U.uNoiseAmp, CFG.noiseAmp)
    set1(U.uChromaticAberration, CFG.chromaticAberration)
    set1(U.uDither, CFG.dither)
    set1(U.uCurvature, CFG.curvature)
    set3(U.uTint, TINT[0], TINT[1], TINT[2])
    set1(U.uMouseStrength, CFG.mouseStrength)
    set1(U.uUseMouse, reduce ? 0 : (CFG.mouseReact ? 1 : 0))
    set1(U.uUsePageLoadAnimation, CFG.pageLoadAnimation ? 1 : 0)
    set1(U.uBrightness, CFG.brightness)

    // ── 尺寸（跟随容器 = 视口，dpr 封顶 2）──
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2)
      var w = host.clientWidth
      var h = host.clientHeight
      if (!w || !h) return
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
      set3(U.iResolution, canvas.width, canvas.height, canvas.width / canvas.height)
    }
    resize()
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host)
    window.addEventListener('resize', resize, { passive: true })

    // ── 鼠标波纹（容器 pointer-events:none，改挂 window）──
    var mouse = { x: 0.5, y: 0.5 }
    var smooth = { x: 0.5, y: 0.5 }
    function onMove(e) {
      mouse.x = e.clientX / window.innerWidth
      mouse.y = 1 - e.clientY / window.innerHeight
    }
    if (!reduce && CFG.mouseReact) window.addEventListener('pointermove', onMove, { passive: true })

    // ── 渲染 ──
    var timeOffset = Math.random() * 100
    var loadStart = 0
    var doneFirst = false

    // 首帧采样一次像素亮度（验证用；在载入淡入完成后取，避免全黑误判）
    function sampleOnce() {
      if (doneFirst) return
      doneFirst = true
      var w = canvas.width, h = canvas.height
      var pts = 24
      var buf = new Uint8Array(4)
      var sum = 0, min = 255, max = 0, lit = 0
      for (var k = 0; k < pts; k++) {
        var px = Math.floor((k + 0.5) / pts * w)
        gl.readPixels(px, Math.floor(h / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf)
        var v = buf[0]
        sum += v; if (v < min) min = v; if (v > max) max = v; if (v > 8) lit++
      }
      mark('stats', JSON.stringify({ min: min, max: max, avg: Math.round(sum / pts), lit: lit }))
    }

    function draw() {
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    function frame(t) {
      raf = requestAnimationFrame(frame)
      if (loadStart === 0) loadStart = t
      var elapsed = (t * 0.001 + timeOffset) * CFG.timeScale
      set1(U.iTime, elapsed)
      var progress = 1
      if (CFG.pageLoadAnimation) {
        progress = Math.min((t - loadStart) / 2000, 1)
        set1(U.uPageLoadProgress, progress)
      }
      if (!reduce && CFG.mouseReact) {
        smooth.x += (mouse.x - smooth.x) * 0.08
        smooth.y += (mouse.y - smooth.y) * 0.08
        set2(U.uMouse, smooth.x, smooth.y)
      }
      draw()
      if (progress >= 1) sampleOnce()
    }

    if (reduce) {
      // 动效减弱：静态一帧（时间冻结，网格静止）
      set1(U.iTime, timeOffset * CFG.timeScale)
      set1(U.uPageLoadProgress, 1)
      set2(U.uMouse, 0.5, 0.5)
      draw()
      sampleOnce()
    } else {
      var raf = requestAnimationFrame(frame)
    }

    mark('ready')
    mark('size', canvas.width + 'x' + canvas.height)
  } catch (e) {
    mark('error', e && e.message)
    if (window.console) console.error('faulty-terminal:', e)
  }
})()
