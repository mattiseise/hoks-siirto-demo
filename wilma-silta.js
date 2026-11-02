// Silta synteettiseen Wilma v2:een selaimessa.
//
// Synteettinen Wilma v2 on puhdasta Pythonia. Se ajetaan Pyodidella (pinnattu versio alla), ja
// sen sivut renderöidään iframeen (srcdoc). Iframen linkit, lomakkeet, XMLHttpRequest ja fetch
// kaapataan ja ohjataan Pythonin `silta.request`-funktiolle. Kaikki tila on vain muistissa.
(() => {
  'use strict';

  const PYODIDE_VERSION = '0.26.4';
  const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
  const PY_DIR = '/home/pyodide/wilma-py';

  let silta = null;
  let host = 'wilma.synteettinen.test';
  let frame = null;
  let pathEl = null;
  let noteEl = null;
  let current = '/';
  let stepText = null;
  let noteTimer = null;
  const backStack = [];
  const eventListeners = [];
  const navListeners = [];
  let loadWaiters = [];

  // Iframeen lisättävät tyylit: täytettyjen kenttien korostus ja kapean paneelin asettelu.
  // Wilman omia sivuja tai teemaa ei muuteta; nämä ovat upotuksen tyylejä.
  const FRAME_CSS = `
.ota-filled{outline:2px solid #f3c37e!important;outline-offset:1px;background-color:#fffaf0!important}
.ota-active{outline:3px solid #f0a43a!important;outline-offset:2px;box-shadow:0 0 0 6px rgba(240,164,58,.3)!important;background-color:#fff8ec!important}
.ota-target{outline:3px solid #f0a43a!important;outline-offset:2px;box-shadow:0 0 0 6px rgba(240,164,58,.35)!important;border-radius:3px}
#ota-pointer{position:fixed;z-index:4000;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(240,164,58,.92);border:2px solid #12305a;box-shadow:0 2px 8px rgba(0,0,0,.35);pointer-events:none;transition:left .3s ease,top .3s ease}
#ota-pointer::after{content:"";position:absolute;inset:-9px;border-radius:50%;border:2px solid rgba(240,164,58,.7);animation:ota-ping 1s ease-out infinite}
@keyframes ota-ping{from{transform:scale(.55);opacity:1}to{transform:scale(1.35);opacity:0}}
@media (prefers-reduced-motion:reduce){#ota-pointer{transition:none}#ota-pointer::after{animation:none}}
body[data-ds-step]{padding-bottom:150px!important}
@media (max-width:900px){
 body.ds-skin{padding:56px 10px 60px!important}
 .ds-v2 main>div>div:has(>div>h1){display:block!important;width:auto!important;margin-right:0!important}
 .ds-v2 #tree-left-column,.ds-v2 #tree-right-column{display:block!important;width:auto!important;margin:0 0 10px!important}
 .ds-v2 .sidepanel{width:92%!important;padding:12px 14px 30px!important}
 .ds-v2 form.form-common>div{padding:12px!important}
 .ds-skin input.autocomplete{width:calc(100% - 44px)!important}
 .ds-skin textarea{max-width:100%}
 body[data-ds-step]::after{left:8px;right:8px;max-width:none;font-size:14px}
}`;

  // Ajetaan iframen sisällä ennen sivun omia skriptejä (funktio sarjallistetaan srcdociin).
  function frameShim() {
    var B = parent.WilmaSilta && parent.WilmaSilta._frame;
    if (!B) return;
    window.__wilmaPath = B.path().split('?')[0];

    function FakeXHR() {
      this.readyState = 0; this.status = 0; this.statusText = ''; this.responseText = '';
      this.response = ''; this.responseType = ''; this.timeout = 0; this.withCredentials = false;
      this.onload = null; this.onerror = null; this.onloadend = null; this.onreadystatechange = null;
      this._l = {}; this._ct = '';
    }
    FakeXHR.UNSENT = 0; FakeXHR.OPENED = 1; FakeXHR.HEADERS_RECEIVED = 2; FakeXHR.LOADING = 3; FakeXHR.DONE = 4;
    FakeXHR.prototype.open = function (m, u, async) {
      this._m = String(m || 'GET'); this._u = String(u); this._async = async !== false; this.readyState = 1;
    };
    FakeXHR.prototype.setRequestHeader = function () {};
    FakeXHR.prototype.overrideMimeType = function () {};
    FakeXHR.prototype.abort = function () {};
    FakeXHR.prototype.getResponseHeader = function (n) { return /^content-type$/i.test(n) ? this._ct : null; };
    FakeXHR.prototype.getAllResponseHeaders = function () { return this._ct ? 'content-type: ' + this._ct + '\r\n' : ''; };
    FakeXHR.prototype.addEventListener = function (t, f) { (this._l[t] = this._l[t] || []).push(f); };
    FakeXHR.prototype.removeEventListener = function (t, f) { this._l[t] = (this._l[t] || []).filter(function (g) { return g !== f; }); };
    FakeXHR.prototype._fire = function (t) {
      var x = this, ev = {type: t, target: x, currentTarget: x};
      if (typeof x['on' + t] === 'function') x['on' + t].call(x, ev);
      (x._l[t] || []).forEach(function (f) { f.call(x, ev); });
    };
    FakeXHR.prototype.send = function (body) {
      var x = this;
      var run = function () {
        var r = B.xhr(x._m, x._u, body == null ? '' : String(body));
        x.status = r.status; x.statusText = String(r.status); x.responseText = r.body; x.response = r.body;
        x._ct = r.contentType; x.readyState = 4;
        x._fire('readystatechange'); x._fire(r.status ? 'load' : 'error'); x._fire('loadend');
      };
      if (x._async) setTimeout(run, 0); else run();
    };
    window.XMLHttpRequest = FakeXHR;
    window.fetch = function (input, init) {
      init = init || {};
      var url = typeof input === 'string' ? input : (input && input.url) || String(input);
      var body = init.body == null ? '' : String(init.body);
      return new Promise(function (resolve) {
        var r = B.xhr(init.method || 'GET', url, body);
        resolve(new Response(r.body, {status: r.status >= 200 && r.status <= 599 ? r.status : 500,
          headers: {'Content-Type': r.contentType || 'text/plain'}}));
      });
    };
    window.open = function (u) { if (u) B.link(String(u)); return null; };
    ['pushState', 'replaceState'].forEach(function (n) {
      var orig = history[n];
      history[n] = function (s, t, u) {
        if (u != null) B.replaced(String(u));
        try { return orig.call(history, s, t); } catch (e) { return undefined; }
      };
    });

    function send(form, submitter) {
      var fd = new FormData(form);
      if (submitter && submitter.name && !submitter.disabled) fd.append(submitter.name, submitter.value || '');
      var pairs = [];
      fd.forEach(function (v, k) { if (typeof v === 'string') pairs.push([k, v]); });
      B.submit(form.getAttribute('method') || 'get', form.getAttribute('action') || '',
        new URLSearchParams(pairs).toString());
    }
    HTMLFormElement.prototype.submit = function () { send(this, null); };

    window.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button) return;
      var t = e.target && e.target.closest ? e.target : e.target.parentElement;
      if (!t) return;
      var close = t.closest('.sidepanel-close');
      if (close) {
        var panel = close.closest('.sidepanel');
        if (panel) panel.style.display = 'none';
        e.preventDefault();
        return;
      }
      var a = t.closest('a[href]');
      if (!a) return;
      var h = a.getAttribute('href') || '';
      e.preventDefault();
      if (!h || h.charAt(0) === '#' || /^javascript:/i.test(h)) return;
      B.link(h);
    });
    window.addEventListener('submit', function (e) {
      if (e.defaultPrevented) return;
      e.preventDefault();
      send(e.target, e.submitter || null);
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.crossOrigin = 'anonymous';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Pyodide-CDN ei vastannut.'));
      document.head.appendChild(s);
    });
  }

  function withTimeout(promise, ms, message) {
    let t;
    return Promise.race([promise, new Promise((_, reject) => { t = setTimeout(() => reject(new Error(message)), ms); })])
      .finally(() => clearTimeout(t));
  }

  async function fetchText(url) {
    const res = await fetch(url, {cache: 'no-cache'});
    if (!res.ok) throw new Error(`Tiedostoa ei saatu: ${url} (${res.status})`);
    return res.text();
  }

  async function start(onStatus) {
    onStatus(`Ladataan Python-ympäristöä (Pyodide ${PYODIDE_VERSION})…`);
    await withTimeout(loadScript(INDEX_URL + 'pyodide.js'), 30000, 'Pyodide-CDN ei vastannut.');
    const py = await withTimeout(window.loadPyodide({indexURL: INDEX_URL}), 120000,
      'Pyodiden käynnistys aikakatkaistiin.');
    onStatus('Ladataan synteettistä Wilmaa…');
    const manifest = JSON.parse(await fetchText('py/manifest.json'));
    for (const rel of manifest.files) {
      const text = await fetchText('py/' + rel);
      const full = `${PY_DIR}/${rel}`;
      py.FS.mkdirTree(full.slice(0, full.lastIndexOf('/')));
      py.FS.writeFile(full, text);
    }
    py.runPython(`import sys\nif ${JSON.stringify(PY_DIR)} not in sys.path:\n    sys.path.insert(0, ${JSON.stringify(PY_DIR)})`);
    silta = py.pyimport('silta');
    const seed = call('seed');
    host = seed.host;
    return seed;
  }

  function call(name, ...args) {
    const fn = silta[name];
    try {
      return JSON.parse(fn(...args));
    } finally {
      if (fn && fn.destroy) fn.destroy();
    }
  }

  // Yksi pyyntö Wilmaan. Tallennusten tapahtumat välitetään kuuntelijoille (setTimeoutilla, jotta
  // iframen synkroninen XHR ehtii palata ennen sovelluksen käsittelyä).
  function request(method, url, body = '', opts = {}) {
    const r = call('request', method, url, body || '', opts.skin !== false);
    if (r.events && r.events.length) {
      const events = r.events;
      setTimeout(() => eventListeners.forEach((f) => f(events, r)), 0);
    }
    return r;
  }

  function resolve(href) {
    const base = `https://${host}`;
    let u;
    try { u = new URL(href, base + current); } catch (e) { return null; }
    if (u.origin !== base) return null;
    return u.pathname + u.search;
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  }

  function inject(r) {
    let html = r.body;
    if (!String(r.content_type).startsWith('text/html')) {
      html = `<!doctype html><html lang="fi"><head><meta charset="utf-8"></head><body><pre>${escHtml(r.body)}</pre></body></html>`;
    }
    const extra = '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + `<style id="ota-frame">${FRAME_CSS}</style><script>(${frameShim.toString()})();<\/script>`;
    const i = html.indexOf('<head>');
    return i >= 0 ? html.slice(0, i + 6) + extra + html.slice(i + 6) : extra + html;
  }

  function showPath() {
    if (pathEl) pathEl.textContent = current;
    if (pathEl) pathEl.parentElement.title = host + current;
  }

  function applyStep() {
    const d = frame && frame.contentDocument;
    if (!d || !d.body) return;
    if (stepText) d.body.setAttribute('data-ds-step', stepText);
    else d.body.removeAttribute('data-ds-step');
  }

  function show(r, push = true) {
    if (push && r.url !== current) backStack.push(current);
    if (backStack.length > 50) backStack.shift();
    current = r.url;
    showPath();
    return new Promise((done) => {
      const onload = () => {
        frame.removeEventListener('load', onload);
        applyStep();
        const waiters = loadWaiters;
        loadWaiters = [];
        waiters.forEach((w) => w());
        navListeners.forEach((f) => f(r));
        done(r);
      };
      frame.addEventListener('load', onload);
      frame.srcdoc = inject(r);
    });
  }

  function navigate(url, push = true) {
    return show(request('GET', url), push);
  }

  function flash(message) {
    if (!noteEl) return;
    noteEl.textContent = message;
    noteEl.hidden = false;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { noteEl.hidden = true; }, 5000);
  }

  // Iframen skriptien käyttämä rajapinta.
  const frameApi = {
    path: () => current,
    link(href) {
      const url = resolve(href);
      if (url === null) { flash(`Ulkoinen linkki ei avaudu tässä demossa: ${href}`); return; }
      navigate(url);
    },
    submit(method, action, body) {
      const url = resolve(action || current);
      if (url === null) { flash('Lomake osoittaa Wilman ulkopuolelle, ei lähetetty.'); return; }
      if (String(method).toUpperCase() === 'POST') show(request('POST', url, body));
      else navigate(url.split('?')[0] + (body ? `?${body}` : ''));
    },
    xhr(method, url, body) {
      const path = resolve(url);
      if (path === null) return {status: 0, body: '', contentType: ''};
      const r = request(method, path, body, {skin: false});
      return {status: r.status, body: r.body, contentType: r.content_type};
    },
    replaced(url) {
      const path = resolve(url);
      if (path !== null) { current = path; showPath(); }
    },
  };

  window.WilmaSilta = {
    PYODIDE_VERSION,
    _frame: frameApi,
    attach(frameEl, pathElement, noteElement) { frame = frameEl; pathEl = pathElement; noteEl = noteElement; },
    start,
    call,
    request,
    navigate,
    show,
    back() { if (backStack.length) return navigate(backStack.pop(), false); return Promise.resolve(); },
    reload() { return navigate(current, false); },
    current: () => current,
    host: () => host,
    doc: () => frame.contentDocument,
    win: () => frame.contentWindow,
    nextLoad(timeout = 5000) {
      return new Promise((done, fail) => {
        const t = setTimeout(() => fail(new Error('Wilman sivu ei latautunut.')), timeout);
        loadWaiters.push(() => { clearTimeout(t); done(); });
      });
    },
    setStep(text) { stepText = text || null; applyStep(); },
    onEvents(f) { eventListeners.push(f); },
    onNavigate(f) { navListeners.push(f); },
    flash,
    clearHistory() { backStack.length = 0; },
  };
})();
