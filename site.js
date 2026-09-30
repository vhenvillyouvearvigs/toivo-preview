(function(){
  'use strict';
  /* 每次都查，系统中途切换「减少动态」立即生效 */
  var reducedMq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── 晕染。只在首页：随滚动慢移，鼠标经过处晕开（2026-09-26 恢复）。全站另一处动效是下方的页眉字标收起 ── */
  var site = document.getElementById('site');   /* 窄屏菜单也要用，别随晕染一起删 */
  var wash = document.getElementById('wash');   /* 多页源文件里只有 index.html 有晕染块 */
  if (wash) {
    var span = 2400;
    var sizeWash = function(){
      /* 先归零再量：晕染是 .site 里的绝对定位块，不归零的话 scrollHeight 会把它自己算进去，每切一次页就长一轮 */
      wash.style.height = '0px';
      /* 晕染铺到带 data-wash-end 的区块上沿（2026-09-30 起为首页现况色带，三语页面架构 2.4），旧写法认 #evidence。
         找不到或量出 0 时退回整页高度 */
      var ev = document.querySelector('[data-wash-end]') || document.getElementById('evidence');
      span = (ev && ev.offsetTop > 0) ? ev.offsetTop : Math.max(1200, site.scrollHeight);
      wash.style.height = span + 'px';
      /* 晕染层高到 4600 以上时 b3 与 b4 之间空出一大段，多显示一团 b5 补上。按高度判断，页面在哪个宽度变长都跟得上 */
      wash.classList.toggle('wash-tall', span >= 4600);
    };
    var drift = function(){
      if (reducedMq && reducedMq.matches) return;   /* 静止一帧，CSS 同时把位移归零 */
      var p = Math.max(0, Math.min(1, window.scrollY / Math.max(1, span - window.innerHeight)));
      wash.style.setProperty('--p', p.toFixed(3));
    };
    sizeWash(); drift();
    /* 网页字体晚到会把色带往下推二三十像素，到齐后再量一次 */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ if (!wash.hidden) { sizeWash(); drift(); } });
    window.addEventListener('resize', function(){ sizeWash(); drift(); });
    window.addEventListener('scroll', drift, { passive: true });
    /* 系统中途关掉减少动态时立即按当前滚动位置落位，免得第一次滚动时色团跳一下 */
    if (reducedMq && reducedMq.addEventListener) reducedMq.addEventListener('change', drift);
    /* 指针晕开：精确指针（鼠标、触控板）经过晕染层时，每 80ms 在指针处放一团，3.2 秒后自行移除。
       09-06 采纳，09-25 撤，2026-09-26 Cindy 改回原版。触屏与减少动态下不放；只在首页，因为晕染层只在首页 */
    var fineMq = window.matchMedia && window.matchMedia('(pointer: fine)');
    var lastStamp = 0;
    site.addEventListener('pointermove', function(e){
      if (!fineMq || !fineMq.matches || (reducedMq && reducedMq.matches) || wash.hidden) return;
      var now = e.timeStamp; if (now - lastStamp < 80) return; lastStamp = now;
      var r = site.getBoundingClientRect();
      var y = e.clientY - r.top, x = e.clientX - r.left + 40;   /* 晕染层左右各伸出 40 */
      if (y > span - 200 || y < 0) return;                      /* 到色带前的淡出段不放 */
      var s = document.createElement('span');
      s.className = 'stamp'; s.style.left = x + 'px'; s.style.top = y + 'px';
      wash.appendChild(s);
      s.addEventListener('animationend', function(){ s.remove(); });
    });
    /* 字体晚到时由正式版的字体脚本调用，按新高度重铺；传 true 时隐藏晕染（旧单文件路由切页用，多页版不再调用） */
    var clearStamps = function(){ Array.prototype.forEach.call(wash.querySelectorAll('.stamp'), function(n){ n.remove(); }); };
    if (reducedMq && reducedMq.addEventListener) reducedMq.addEventListener('change', function(m){ if (m.matches) clearStamps(); });
    window.__toivoResize = function(off){
      if (off) clearStamps();          /* 晕团被隐藏时动画中止，animationend 不来，要手动清掉 */
      wash.hidden = !!off;
      if (off) return;
      sizeWash(); drift();
    };
  }

  /* ── 页眉字标收起。页面离开顶部（scrollY > 0）收成圖形標誌，回到顶部展开，与滚动方向无关（触发照 anthropic.com）。
        动作照品牌预览模板（参考/2026-09-21 品牌预览模板（字标动画）.html）「從標誌到名字」：进度 p 为 0 是圖形標誌、1 是完整字标，
        全程 500ms（模板演示页为 1150ms），按剩余距离折算时长；各部分在 p 上的时间段、easeOutCubic、smoothstep 与弧线都照模板。
        坐标换算到字标单位（模板舞台单位 ÷ 5.4505）：横笔以 x 12.84 为锚点伸缩；橙点起点是圖形標誌方块 (16.879, 7.339)，
        终点是 i 点 (49.822, 0.490)，途中上拱 13.21；字母淡入时自下 2.2 升到原位。页眉里 t 固定在左边，模板为居中所做的平移不用。
        页眉与菜单顶行的字标一起变，页脚字标不动；减少动态下直接落到终态 ── */
  var marks = Array.prototype.slice.call(document.querySelectorAll('.nav-in .wordmark svg, .menu-top .wordmark svg')).map(function(svg){
    return { bar: svg.querySelector('.wm-bar'), dot: svg.querySelector('.wm-dot'),
             letters: ['.wm-o1', '.wm-i', '.wm-v', '.wm-o2'].map(function(c){ return svg.querySelector(c); }) };
  }).filter(function(m){ return m.bar && m.dot; });
  if (marks.length) {
    var clamp = function(n){ return Math.max(0, Math.min(1, n)); };
    var range = function(p, a, b){ return clamp((p - a) / (b - a)); };
    var smooth = function(n){ return n * n * (3 - 2 * n); };
    var easeOut = function(n){ return 1 - Math.pow(1 - n, 3); };
    var mix = function(a, b, n){ return a + (b - a) * n; };
    /* 全程时长：模板演示页是 1150ms（循环展示用），页眉里压到与 anthropic.com 页眉相同的 500ms（2026-09-26 Cindy 嫌 1150 太慢）。
       各部分在 p 上的时间段与曲线不变，只是整体加快 */
    var LOGO_MS = 500;
    var DOT0 = { x: 16.879, y: 7.339 }, DOT1 = { x: 49.822, y: 0.490 };
    var renderLogo = function(p){
      var ext = easeOut(range(p, .16, .67));                       /* 横笔伸出 */
      var q = smooth(range(p, 0, .84));                            /* 橙点行程 */
      var dx = mix(DOT0.x, DOT1.x, q) - DOT1.x, dy = mix(DOT0.y, DOT1.y, q) - 13.21 * Math.sin(Math.PI * q) - DOT1.y;
      marks.forEach(function(m){
        m.bar.setAttribute('transform', 'translate(12.842 0) scale(' + ext.toFixed(4) + ' 1) translate(-12.842 0)');
        m.bar.style.opacity = ext === 0 ? '0' : '1';
        m.dot.setAttribute('transform', 'translate(' + dx.toFixed(3) + ' ' + dy.toFixed(3) + ')');
        m.letters.forEach(function(el, i){
          if (!el) return;
          var k = easeOut(range(p, .3 + i * .09, Math.min(1, .63 + i * .12)));
          el.style.opacity = k.toFixed(3);
          el.setAttribute('transform', 'translate(0 ' + (2.2 * (1 - k)).toFixed(3) + ')');
        });
      });
    };
    var logoP = window.scrollY > 0 ? 0 : 1, logoRaf = 0;
    renderLogo(logoP);
    var setLogo = function(){
      var target = window.scrollY > 0 ? 0 : 1;
      if (logoRaf) cancelAnimationFrame(logoRaf);
      if (reducedMq && reducedMq.matches) { logoP = target; renderLogo(target); return; }
      var from = logoP, dur = LOGO_MS * Math.abs(target - from), t0 = performance.now();
      if (!dur) return;
      var tick = function(now){
        var n = clamp((now - t0) / dur);
        logoP = mix(from, target, n); renderLogo(logoP);
        logoRaf = n < 1 ? requestAnimationFrame(tick) : 0;
      };
      logoRaf = requestAnimationFrame(tick);
    };
    /* 系统中途开启减少动态：停下正在走的一段，直接落到当前该在的终态（照模板） */
    if (reducedMq && reducedMq.addEventListener) reducedMq.addEventListener('change', function(m){
      if (!m.matches) return;
      if (logoRaf) { cancelAnimationFrame(logoRaf); logoRaf = 0; }
      logoP = window.scrollY > 0 ? 0 : 1; renderLogo(logoP);
    });
    var lastTarget = logoP;
    window.addEventListener('scroll', function(){
      var t = window.scrollY > 0 ? 0 : 1;
      if (t !== lastTarget) { lastTarget = t; setLogo(); }
    }, { passive: true });
  }

  /* ── 窄屏菜单。1023 以下页眉收成 字标、MENU、按钮，MENU 打开满屏菜单。
        菜单是原生 popover，MENU 与 CLOSE 带 popovertarget，没有脚本也能开关，Esc 也能关（2026-09-25）。
        脚本只做增强：模态（背后 inert）、焦点、锁滚动、点链接收起、拉宽收起；不认 popover 的旧浏览器改用 is-open 类 ── */
  var menu = document.getElementById('menu');
  var menuBtn = document.querySelector('.menu-btn');
  if (menu && menuBtn) {
    var closeBtn = menu.querySelector('.menu-close');
    var native = typeof menu.showPopover === 'function';
    /* 菜单是模态：打开时把背后的页眉、正文和跳转链接设为 inert，Tab 不会落到被遮住的元素上。
       模态靠脚本兑现，所以 aria-modal 与 aria-expanded 也由脚本标上 */
    var behind = [document.querySelector('.nav-in'), site, document.querySelector('.skip')];
    var setInert = function(on){ behind.forEach(function(el){ if (el) el.inert = on; }); };
    var isOpen = function(){ return native ? menu.matches(':popover-open') : menu.classList.contains('is-open'); };
    var restoreFocus = true;
    menu.setAttribute('aria-modal', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    var opened = function(){
      menuBtn.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('menu-open');
      setInert(true);
      if (closeBtn) closeBtn.focus();
    };
    var closed = function(){
      menuBtn.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('menu-open');
      setInert(false);                 /* 先解除 inert，焦点才能回到 MENU */
      if (restoreFocus) menuBtn.focus();
      restoreFocus = true;
    };
    /* restore 为假时焦点交给调用方：点链接后由单文件路由放到新页标题。返回收起前焦点是否在菜单里 */
    var closeMenu = function(restore){
      if (!isOpen()) return false;
      var focusInside = menu.contains(document.activeElement);
      restoreFocus = !!restore;
      /* 原生 popover 的 toggle 事件晚一拍才到，这里先解除 inert，调用方紧接着放焦点（新页标题、字标）才放得进去 */
      setInert(false);
      if (native) menu.hidePopover();
      else { menu.classList.remove('is-open'); closed(); }
      return focusInside;
    };
    if (native) {
      /* 开关由 popovertarget 触发，这里只接 toggle 事件补上增强 */
      menu.addEventListener('toggle', function(e){ if (e.newState === 'open') opened(); else closed(); });
    } else {
      menuBtn.addEventListener('click', function(){ if (!isOpen()) { menu.classList.add('is-open'); opened(); } });
      if (closeBtn) closeBtn.addEventListener('click', function(){ closeMenu(true); });
      document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(true); });
    }
    menu.addEventListener('click', function(e){ if (e.target.closest && e.target.closest('a')) closeMenu(false); });
    /* 拉宽到桌面档时自动收起。条件与 CSS 的 max-width:1023px 完全一致，焦点若在菜单里就交给字标 */
    var narrow = window.matchMedia && window.matchMedia('(max-width: 1023px)');
    if (narrow && narrow.addEventListener) narrow.addEventListener('change', function(m){
      if (!m.matches && closeMenu(false)) { var wm = document.querySelector('.nav-in .wordmark'); if (wm) wm.focus(); }
    });
  }
})();
