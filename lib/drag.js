// Drag a window by its top bar (mouse + touch). Clamped to the viewport.
(function () {
  window.SM.makeDraggable = function (win, handle, opts = {}) {
    const onMove = opts.onMove || (() => {});
    let dragging = false;
    let offX = 0, offY = 0;

    function position(x, y) {
      const maxX = window.innerWidth - win.offsetWidth;
      const maxY = window.innerHeight - win.offsetHeight;
      const px = Math.max(0, Math.min(x, maxX));
      const py = Math.max(0, Math.min(y, maxY));
      win.style.left = px + 'px';
      win.style.top = py + 'px';
      onMove(px, py);
    }

    function start(clientX, clientY) {
      const r = win.getBoundingClientRect();
      offX = clientX - r.left;
      offY = clientY - r.top;
      dragging = true;
      win.classList.add('sm-dragging');
      handle.classList.add('sm-dragging');
    }

    function move(clientX, clientY) {
      if (!dragging) return;
      position(clientX - offX, clientY - offY);
    }

    function stop() {
      if (!dragging) return;
      dragging = false;
      win.classList.remove('sm-dragging');
      handle.classList.remove('sm-dragging');
    }

    // ---- mouse ----
    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('button, input, textarea, select, a')) return;
      e.preventDefault();
      start(e.clientX, e.clientY);
      const mm = (ev) => { ev.preventDefault(); move(ev.clientX, ev.clientY); };
      const mu = () => {
        stop();
        document.removeEventListener('mousemove', mm);
        document.removeEventListener('mouseup', mu);
      };
      document.addEventListener('mousemove', mm);
      document.addEventListener('mouseup', mu);
    });

    // ---- touch ----
    handle.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      if (!t) return;
      if (e.target.closest('button, input, textarea, select, a')) return;
      e.preventDefault();
      start(t.clientX, t.clientY);
      const tm = (ev) => {
        const tt = ev.touches[0];
        if (!tt) return;
        ev.preventDefault();
        move(tt.clientX, tt.clientY);
      };
      const te = () => {
        stop();
        document.removeEventListener('touchmove', tm);
        document.removeEventListener('touchend', te);
      };
      document.addEventListener('touchmove', tm, { passive: false });
      document.addEventListener('touchend', te);
    }, { passive: false });
  };
})();