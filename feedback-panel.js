/*
 * Post-chat feedback panel for Quiq web chat (host-page script).
 *
 * When the customer confirms "end chat", web chat hides itself and reports a
 * visibility change carrying the "conversationEnded" action. We then draw our own
 * panel in the same spot and save the answers into the conversation's custom fields
 * through hidden welcome-form fields (chat.setChatRegistrationField). That only works
 * while the conversation is inactive (customer-ended), not once it is closed.
 *
 * Usage: QuiqFeedbackPanel.attach(chat, { fields: {...}, title, subtitle })
 */
(function () {
  var CSS = [
    '.qfp{position:fixed;z-index:2147483646;display:flex;flex-direction:column;overflow:hidden;border-radius:28px;',
    'font-family:"Neue Haas Grotesk Text","Helvetica Neue",Helvetica,Arial,sans-serif;color:#1B1B1D;',
    'background:linear-gradient(180deg,#E9EDFF 0%,#F4F6FF 46%,#FFFFFF 100%);box-shadow:0 30px 70px -30px rgba(3,23,75,.5);',
    'opacity:0;transform:translateY(12px) scale(.98);transition:opacity .22s ease,transform .22s ease}',
    '.qfp.in{opacity:1;transform:none}',
    '.qfp *{box-sizing:border-box}',
    '.qfp-hd{display:flex;align-items:center;gap:10px;padding:18px 14px 6px 18px}',
    '.qfp-av{width:38px;height:38px;border-radius:50%;background:#00206A;display:grid;place-items:center;color:#6AD2EB;font-weight:700;font-size:15px;box-shadow:0 0 0 3px #fff,0 0 0 5px #BEEBCE;flex:none}',
    '.qfp-ttl{flex:1;min-width:0}.qfp-ttl b{display:block;font-size:15px;font-weight:600;color:#03174B}.qfp-ttl span{display:block;font-size:12.5px;margin-top:2px;color:#5C6170}',
    '.qfp-x{width:30px;height:30px;border-radius:50%;border:0;background:rgba(255,255,255,.7);color:#03174B;display:grid;place-items:center;cursor:pointer}',
    '.qfp-x svg{width:16px;height:16px}',
    '.qfp-body{flex:1;display:flex;flex-direction:column;padding:22px 20px 18px;overflow:auto}',
    '.qfp-q{font-size:17px;font-weight:600;margin:0 0 12px;color:#03174B;letter-spacing:-.01em}',
    '.qfp-row{display:flex;gap:10px;margin-bottom:22px}',
    '.qfp-opt{flex:1;font:inherit;font-size:15px;font-weight:600;padding:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'background:#fff;color:#00206A;border:0;border-radius:999px;box-shadow:0 6px 16px -10px rgba(3,23,75,.4);transition:background .15s,color .15s,transform .1s}',
    '.qfp-opt:active{transform:scale(.97)}',
    '.qfp-thumbs .qfp-opt{border-radius:20px;padding:18px}.qfp-opt svg{width:30px;height:30px}',
    '.qfp-opt[aria-pressed="true"]{background:#00206A;color:#fff}',
    '.qfp-opt.up[aria-pressed="true"]{background:#17B26A}',
    '.qfp-opt.down[aria-pressed="true"]{background:#03174B;color:#FFCD76}',
    '.qfp-more{display:grid;grid-template-rows:0fr;transition:grid-template-rows .25s ease}.qfp-more.open{grid-template-rows:1fr}.qfp-more>div{overflow:hidden}',
    '.qfp label{display:block;font-size:14px;font-weight:600;margin:0 0 8px;color:#03174B}',
    '.qfp textarea{width:100%;min-height:84px;resize:none;font:inherit;font-size:14.5px;padding:11px 12px;border:0;border-radius:18px;background:#fff;box-shadow:inset 0 0 0 1.5px #DCE1FF;margin-bottom:4px}',
    '.qfp-sp{flex:1;min-height:12px}',
    '.qfp-send{font:inherit;font-size:15px;font-weight:600;padding:14px;border:0;width:100%;cursor:pointer;background:#00206A;color:#fff;border-radius:999px;transition:opacity .15s}',
    '.qfp-send:disabled{opacity:.35;cursor:default}',
    '.qfp-skip{background:none;border:0;font:inherit;font-size:13.5px;margin-top:10px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;align-self:center;color:#5C6170}',
    '.qfp-done{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;color:#03174B}',
    '.qfp-done h3{font-size:21px;margin:18px 0 6px;font-weight:600}.qfp-done p{margin:0;font-size:14.5px;color:#5C6170}',
    '.qfp-chk{width:84px;height:84px}',
    '.qfp-chk .ring{stroke-dasharray:240;stroke-dashoffset:240;animation:qfp-draw .6s ease-out forwards}',
    '.qfp-chk .tick{stroke-dasharray:60;stroke-dashoffset:60;animation:qfp-draw .35s .5s ease-out forwards}',
    '.qfp-chk .burst{transform-origin:42px 42px;opacity:0;animation:qfp-pop .5s .75s ease-out both}',
    '@keyframes qfp-draw{to{stroke-dashoffset:0}}@keyframes qfp-pop{0%{opacity:.9;transform:scale(.7)}100%{opacity:0;transform:scale(1.35)}}',
    '.qfp button:focus-visible,.qfp textarea:focus-visible{outline:3px solid #6AD2EB;outline-offset:2px}',
    '@media (prefers-reduced-motion:reduce){.qfp{transition:none}.qfp-chk .ring,.qfp-chk .tick{animation:none;stroke-dashoffset:0}.qfp-chk .burst{display:none}.qfp-more{transition:none}}',
    '@media (max-width:480px){.qfp{inset:0!important;width:auto!important;height:auto!important;border-radius:0}}'
  ].join('');

  var ICON = {
    x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 10v10H4V10h3zM7 10l4-7c1.4 0 2.3 1.2 2 2.6L12.4 9H18a2 2 0 0 1 2 2.3l-1.2 6.6A2.5 2.5 0 0 1 16.3 20H7"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 14V4H4v10h3zM7 14l4 7c1.4 0 2.3-1.2 2-2.6L12.4 15H18a2 2 0 0 0 2-2.3l-1.2-6.6A2.5 2.5 0 0 0 16.3 4H7"/></svg>'
  };

  function esc(t) { var d = document.createElement('div'); d.textContent = String(t); return d.innerHTML; }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  function attach(chat, opts) {
    opts = opts || {};
    var f = opts.fields;
    var lastRect = null;
    var open = null;

    if (!document.getElementById('qfp-css')) {
      var st = document.createElement('style'); st.id = 'qfp-css'; st.textContent = CSS; document.head.appendChild(st);
    }

    // Remember where the chat window sits so the panel can take its exact place.
    function chatFrame() { return document.querySelector('iframe[src*="webchat-"]'); }
    setInterval(function () {
      var fr = chatFrame(); if (!fr) return;
      var r = fr.getBoundingClientRect();
      if (r.width > 200 && r.height > 300) {
        var box = fr.parentElement, radius = '';
        while (box && box !== document.body && !radius) {
          var br = getComputedStyle(box).borderTopLeftRadius;
          if (br && br !== '0px') radius = br;
          box = box.parentElement;
        }
        lastRect = { right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom, width: r.width, height: r.height, radius: radius || getComputedStyle(fr).borderTopLeftRadius };
      }
    }, 500);

    function save(field, value) {
      if (opts.debug) console.log('[qfp] save', field, value);
      chat.setChatRegistrationField(field, value);
    }

    var completed = false;
    function complete() {
      if (completed || !f.complete) return;
      completed = true;
      save(f.complete, 'yes'); // tells the bot it can close the conversation now
    }

    function close() {
      complete();
      if (!open) return;
      var p = open; open = null;
      p.classList.remove('in');
      setTimeout(function () { p.remove(); }, 250);
    }

    function show() {
      if (open) return;
      completed = false;
      var r = lastRect || { right: 20, bottom: 90, width: 380, height: 620 };
      var p = el(
        '<div class="qfp" role="dialog" aria-label="Feedback">' +
          '<div class="qfp-hd"><div class="qfp-av">' + esc(opts.avatar || 'P') + '</div>' +
            '<div class="qfp-ttl"><b>' + esc(opts.title || 'Prog assistant') + '</b><span>' + esc(opts.subtitle || 'Here to help with your lease') + '</span></div>' +
            '<button class="qfp-x" aria-label="Close">' + ICON.x + '</button></div>' +
          '<div class="qfp-body">' +
            '<p class="qfp-q">Did we answer your question?</p>' +
            '<div class="qfp-row"><button class="qfp-opt" data-k="answered" data-v="yes" aria-pressed="false">Yes</button>' +
              '<button class="qfp-opt" data-k="answered" data-v="no" aria-pressed="false">No</button></div>' +
            '<p class="qfp-q">How was this chat?</p>' +
            '<div class="qfp-row qfp-thumbs"><button class="qfp-opt up" data-k="thumb" data-v="up" aria-pressed="false" aria-label="Thumbs up">' + ICON.up + '</button>' +
              '<button class="qfp-opt down" data-k="thumb" data-v="down" aria-pressed="false" aria-label="Thumbs down">' + ICON.down + '</button></div>' +
            '<div class="qfp-more"><div><label for="qfp-c">What could we do better?</label><textarea id="qfp-c" maxlength="1000" placeholder="Optional"></textarea></div></div>' +
            '<div class="qfp-sp"></div>' +
            '<button class="qfp-send" disabled>Send feedback</button>' +
            '<button class="qfp-skip">Skip</button>' +
          '</div>' +
        '</div>');
      p.style.right = r.right + 'px'; p.style.bottom = r.bottom + 'px';
      p.style.width = r.width + 'px'; p.style.height = r.height + 'px';
      if (r.radius && r.radius !== '0px') p.style.borderRadius = r.radius;
      document.body.appendChild(p);
      open = p;
      requestAnimationFrame(function () { p.classList.add('in'); });
      save(f.shown, 'yes');

      var state = {};
      var more = p.querySelector('.qfp-more');
      var send = p.querySelector('.qfp-send');
      p.querySelectorAll('.qfp-opt').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-k');
          p.querySelectorAll('.qfp-opt[data-k="' + k + '"]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
          state[k] = b.getAttribute('data-v');
          save(f[k], state[k]); // save each tap now, so a slow customer loses at most the comment
          more.classList.toggle('open', state.answered === 'no' || state.thumb === 'down');
          send.disabled = !(state.answered && state.thumb);
        });
      });
      p.querySelector('.qfp-x').addEventListener('click', close);
      p.querySelector('.qfp-skip').addEventListener('click', close);
      send.addEventListener('click', function () {
        var c = p.querySelector('textarea').value.trim();
        if (c && more.classList.contains('open')) save(f.comment, c);
        complete();
        p.querySelector('.qfp-body').outerHTML =
          '<div class="qfp-done"><svg class="qfp-chk" viewBox="0 0 84 84" aria-hidden="true">' +
          '<circle class="burst" cx="42" cy="42" r="38" fill="none" stroke="#17B26A" stroke-width="2"/>' +
          '<circle class="ring" cx="42" cy="42" r="36" fill="none" stroke="#17B26A" stroke-width="4" stroke-linecap="round" transform="rotate(-90 42 42)"/>' +
          '<path class="tick" d="M27 43l10 10 20-21" fill="none" stroke="#17B26A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '<h3>Thanks for your feedback</h3><p>It helps us make this chat better.</p></div>';
        setTimeout(close, opts.thanksMs || 3500);
      });
    }

    chat.on('webchatVisibilityChanged', function (e) {
      var d = (e && e.data) || {};
      if (opts.debug) console.log('[qfp] visibility', JSON.stringify(d));
      if (d.visibilityStatus === 'closed' && (d.actions || []).indexOf('conversationEnded') !== -1) show();
    });

    return { show: show, close: close };
  }

  window.QuiqFeedbackPanel = { attach: attach };
})();
