// TEMPORARY (design capture only, never committed): turns the rendered page into a self-contained HTML snapshot
// (computed styles inlined, images as data URIs) that Figma's html_to_figma can turn into editable layers.
const INHERITED = new Set(['color', 'font-size', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'white-space', 'visibility', 'text-shadow', 'overflow-wrap', 'word-break', 'text-decoration-line']);
const PROPS = ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'justify-content', 'align-items', 'align-self', 'align-content', 'row-gap', 'column-gap', 'grid-template-columns', 'grid-template-rows', 'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end', 'grid-auto-flow', 'order', 'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius', 'overflow-x', 'overflow-y', 'opacity', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'color', 'font-size', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration-line', 'text-decoration-color', 'text-underline-offset', 'white-space', 'overflow-wrap', 'word-break', 'vertical-align', 'object-fit', 'object-position', 'box-shadow', 'text-shadow', 'filter', 'backdrop-filter', 'transform', 'transform-origin', 'mix-blend-mode', 'visibility', 'aspect-ratio'];
const SVG_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'fill-opacity', 'opacity', 'color', 'font-family', 'font-size', 'letter-spacing', 'font-style'];
const FONT_FILES = { 'Archivo': '/fonts/Archivo_wdth_wght__1.woff2', 'Cormorant Garamond': '/fonts/CormorantGaramond_wght__1.woff2', 'Cormorant Garamond Italic': '/fonts/CormorantGaramond-Italic_wght__1.woff2', 'IBM Plex Mono Medium': '/fonts/IBMPlexMono-Medium_3.woff2', 'IBM Plex Mono Regular': '/fonts/IBMPlexMono-Regular_2.woff2' };

// modern colour spaces (oklab…) are not understood by the converter: turn them into plain rgba
const cv = document.createElement('canvas'); cv.width = cv.height = 1;
const cx = cv.getContext('2d', { willReadFrequently: true });
function fixColors(v) {
  return v
    .replace(/(\(|\s)in (?:oklab|oklch|srgb|lab|lch|hsl)[a-z ]*,/g, '$1')
    .replace(/(oklab|oklch|lab|lch|color)\(([^()]*?)(?:\s*\/\s*([\d.]+%?))?\)/g, (all, fn, inner, a) => {
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = `${fn}(${inner})`; cx.fillRect(0, 0, 1, 1);
      const [r, g, b] = cx.getImageData(0, 0, 1, 1).data;
      const al = a === undefined ? 1 : a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
      return `rgba(${r}, ${g}, ${b}, ${al})`;
    });
}
const defaults = new Map();
function defaultStyle(tag) {
  if (!defaults.has(tag)) {
    let f = document.getElementById('__snap_frame');
    if (!f) { f = document.createElement('iframe'); f.id = '__snap_frame'; f.style.cssText = 'position:absolute;left:-9999px;width:1280px;height:800px'; document.body.appendChild(f); }
    const el = f.contentDocument.createElement(tag);
    f.contentDocument.body.appendChild(el);
    const cs = f.contentDocument.defaultView.getComputedStyle(el);
    const o = {}; for (const p of PROPS) o[p] = cs.getPropertyValue(p);
    defaults.set(tag, o);
  }
  return defaults.get(tag);
}

const imgCache = new Map();
function readBlob(b) { return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); }); }
async function toData(url) {
  if (!url || url.startsWith('data:')) return url;
  if (imgCache.has(url)) return imgCache.get(url);
  const p = (async () => {
    try {
      const r = await fetch(url, { mode: 'cors' }); const b = await r.blob();
      const alpha = /\.(png|webp|svg|gif)(\?|$)/i.test(url) || /h=1100/.test(url) || /png/.test(b.type);
      if (/svg|gif/.test(b.type) || (/jpeg|png|webp/.test(b.type) && b.size < 900000)) return await readBlob(b);
      const bmp = await createImageBitmap(b);
      const k = Math.min(1, 1800 / bmp.width);
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return alpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88);
    } catch (e) { return url; }
  })();
  imgCache.set(url, p);
  return p;
}

function fontParts(family, weight, style) {
  const first = family.split(',')[0].trim().replace(/^["']|["']$/g, '');
  const [name, styleName = ''] = first.split(':');
  let w = weight, s = style;
  if (/light/i.test(styleName)) w = '300'; else if (/medium/i.test(styleName)) w = '500'; else if (/regular/i.test(styleName)) w = '400';
  if (/italic/i.test(styleName)) s = 'italic';
  return { family: name, weight: w, style: s };
}

function inlineStyle(el, cs, parentCs, tag) {
  const def = defaultStyle(tag);
  const vals = {};
  for (const p of PROPS) {
    const v = cs.getPropertyValue(p);
    if (!v) continue;
    if (INHERITED.has(p) && parentCs && v === parentCs.getPropertyValue(p) && p !== 'color' && p !== 'font-size') continue;
    if (!INHERITED.has(p) && v === def[p]) continue;
    vals[p] = v;
  }
  // a border with no width must say so explicitly (buttons and inputs would otherwise get the browser's own 2px border)
  for (const side of ['top', 'right', 'bottom', 'left']) {
    if (cs.getPropertyValue(`border-${side}-width`) === '0px' || cs.getPropertyValue(`border-${side}-style`) === 'none') {
      delete vals[`border-${side}-color`]; vals[`border-${side}-width`] = '0px'; vals[`border-${side}-style`] = 'none';
    }
  }
  if (['button', 'input', 'select', 'textarea'].includes(tag)) { vals['appearance'] = 'none'; vals['outline'] = 'none'; }
  if (vals.transform === 'matrix(1, 0, 0, 1, 0, 0)' || vals.transform === 'none') { delete vals.transform; delete vals['transform-origin']; } else delete vals['transform-origin'];
  if (vals.filter === 'blur(0px)') delete vals.filter;
  let out = '';
  for (const [p, v] of Object.entries(vals)) out += `${p}:${fixColors(v)};`;
  const f = fontParts(cs.fontFamily, cs.fontWeight, cs.fontStyle);
  out += `font-family:'${f.family}',${/Mono/.test(f.family) ? 'monospace' : /Cormorant/.test(f.family) ? 'serif' : 'sans-serif'};font-weight:${f.weight};font-style:${f.style};`;
  return { css: out, font: f };
}

export async function snap({ root, width, name }) {
  if (Math.abs(window.innerWidth - width) > 1) throw new Error(`viewport is ${window.innerWidth}px wide, expected ${width}`);
  const rootEl = typeof root === 'string' ? document.querySelector(root) : root;
  // everything visible, nothing animating
  document.querySelectorAll('.reveal').forEach((e) => e.classList.add('visible'));
  const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(st);
  document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; });
  window.scrollTo(0, 0);
  // images inside what is captured, never waiting more than 6 s for one
  await Promise.race([Promise.all([...rootEl.querySelectorAll('img')].map((i) => (i.complete ? 0 : i.decode().catch(() => 0)))), new Promise((r) => setTimeout(r, 6000))]);
  await new Promise((r) => setTimeout(r, 400));

  const usedFonts = new Set();
  const pending = [];
  const isFixed = getComputedStyle(rootEl).position === 'fixed';
  const docH = isFixed ? rootEl.getBoundingClientRect().height : Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  const rootRect = rootEl.getBoundingClientRect();

  async function clone(node, parentCs, parentClone) {
    if (node.nodeType === 3) { parentClone.appendChild(document.createTextNode(node.nodeValue)); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (['script', 'style', 'link', 'noscript', 'meta', 'iframe', 'template', 'source'].includes(tag)) return;
    const cs = getComputedStyle(node);
    if (cs.display === 'none') return;
    const r = node.getBoundingClientRect();
    if ((r.width <= 1 && r.height <= 1 && tag !== 'br') || r.left < -1000) return;

    if (tag === 'video') {
      const img = document.createElement('img');
      const { css } = inlineStyle(node, cs, parentCs, 'img');
      img.setAttribute('style', css + `width:${r.width}px;height:${r.height}px;`);
      pending.push(toData(node.poster).then((d) => img.setAttribute('src', d)));
      parentClone.appendChild(img); return;
    }
    if (tag === 'svg' || node.namespaceURI === 'http://www.w3.org/2000/svg') {
      if (tag === 'svg') {
        const c = node.cloneNode(true);
        const { css } = inlineStyle(node, cs, parentCs, 'svg');
        c.setAttribute('style', css + `width:${r.width}px;height:${r.height}px;`);
        c.setAttribute('width', r.width); c.setAttribute('height', r.height);
        const a = [node, ...node.querySelectorAll('*')], b = [c, ...c.querySelectorAll('*')];
        a.forEach((ea, i) => {
          const ecs = getComputedStyle(ea);
          for (const p of SVG_PROPS) { const v = ecs.getPropertyValue(p); if (v && v !== 'normal') b[i].style.setProperty(p, fixColors(v)); }
        });
        c.querySelectorAll('[class]').forEach((e) => e.removeAttribute('class')); c.removeAttribute('class');
        parentClone.appendChild(c);
      }
      return;
    }
    const el = document.createElement(tag === 'html' || tag === 'body' ? 'div' : tag);
    let { css, font } = inlineStyle(node, cs, parentCs, tag);
    usedFonts.add(`${font.family}|${font.weight}|${font.style}`);
    if (cs.position === 'sticky') {
      css += 'position:relative;top:0px;';
    }
    if (cs.position === 'fixed') {
      css += `position:absolute;top:${r.top - rootRect.top}px;left:${r.left - rootRect.left}px;right:auto;bottom:auto;width:${r.width}px;height:${r.height}px;`;
    } else if (cs.display !== 'inline' && cs.display !== 'contents') {
      css += `width:${r.width}px;height:${r.height}px;`;
    }
    // background images → data URIs
    const bg = cs.backgroundImage;
    if (bg && bg.includes('url(')) {
      const m = [...bg.matchAll(/url\("?([^")]+)"?\)/g)];
      pending.push(Promise.all(m.map((x) => toData(x[1]))).then((ds) => { let nb = bg; m.forEach((x, i) => { nb = nb.replace(x[1], ds[i]); }); el.style.backgroundImage = fixColors(nb); }));
    }
    {
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
      const hasText = [...node.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
      const inner = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth);
      if (hasText && inner < lh * 1.6) css += 'white-space:nowrap;';
    }
    el.setAttribute('style', css);
    if (tag === 'img') {
      el.setAttribute('alt', node.alt || '');
      pending.push(toData(node.currentSrc || node.src).then((d) => el.setAttribute('src', d)));
    }
    if (tag === 'a' || tag === 'button') { /* no behaviour in the snapshot */ }
    // ::before / ::after with text
    for (const ps of ['::before', '::after']) {
      const pcs = getComputedStyle(node, ps); const c = pcs.content;
      if (c && c !== 'none' && c !== 'normal' && c !== '""' && /^["']/.test(c)) {
        const sp = document.createElement('span'); sp.textContent = c.slice(1, -1);
        sp.setAttribute('style', inlineStyle(node, pcs, cs, 'span').css);
        if (ps === '::before') el.appendChild(sp); else (el.__after = sp);
      }
    }
    if (tag !== 'img' && tag !== 'input' && tag !== 'textarea') for (const ch of node.childNodes) await clone(ch, cs, el);
    if (el.__after) el.appendChild(el.__after);
    if (tag === 'input' || tag === 'textarea') { if (node.placeholder) el.setAttribute('placeholder', node.placeholder); if (node.value) el.setAttribute('value', node.value); }
    parentClone.appendChild(el);
  }

  const holder = document.createElement('div');
  await clone(rootEl, getComputedStyle(rootEl.parentElement), holder);
  await Promise.all(pending);
  const out = holder.firstElementChild;
  const wrap = document.createElement('div');
  wrap.className = 'cap';
  wrap.setAttribute('data-name', name);
  const bodyBg = fixColors(getComputedStyle(document.body).backgroundColor);
  wrap.setAttribute('style', `position:relative;width:${width}px;height:${Math.max(docH, rootRect.height)}px;overflow:hidden;background-color:${bodyBg};`);
  out.style.position = 'relative'; out.style.top = '0'; out.style.left = '0';
  wrap.appendChild(out);
  st.remove();
  return { html: wrap.outerHTML, fonts: [...usedFonts], height: docH, bytes: wrap.outerHTML.length };
}

export async function save(name, html) {
  const r = await fetch('http://localhost:9977/save?name=' + encodeURIComponent(name), { method: 'POST', body: html });
  return r.text();
}
