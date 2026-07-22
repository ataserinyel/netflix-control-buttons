(() => {
  if (window.__ataNetflixSeekV3Loaded) return;
  window.__ataNetflixSeekV3Loaded = true;

  const HOST_ID = "ata-netflix-seek-host-v3";
  const TIMES = [5, 10, 15, 30, 45, 60, 120];

  function getPlayer() {
    const vp =
      window.netflix?.appContext?.state?.playerApp
        ?.getAPI?.()
        ?.videoPlayer;

    if (!vp) return null;

    const ids = vp.getAllPlayerSessionIds?.() || [];
    if (!ids.length) return null;

    return vp.getVideoPlayerBySessionId?.(ids[0]) || null;
  }

  function seek(seconds) {
    const player = getPlayer();
    if (!player) return false;

    const current = Number(player.getCurrentTime?.() || 0);
    const duration = Number(player.getDuration?.());

    let target = current + seconds * 1000;

    if (Number.isFinite(duration) && duration > 0) {
      target = Math.min(target, Math.max(0, duration - 250));
    }

    player.seek(target);
    return true;
  }

  function makeHost() {
    const host = document.createElement("div");
    host.id = HOST_ID;

    Object.assign(host.style, {
      position: "fixed",
      left: "262px",
      bottom: "14px",
      zIndex: "2147483647",
      pointerEvents: "auto",
      display: "none"
    });

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
      }

      .group {
        display: flex;
        align-items: center;
        gap: 5px;
        pointer-events: auto;
        user-select: none;
      }

      button {
        all: unset;
        box-sizing: border-box;
        min-width: 39px;
        height: 35px;
        padding: 0 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255,255,255,.68);
        border-radius: 8px;
        color: white;
        background: rgba(10,10,10,.94);
        font-family: Arial, sans-serif;
        font-size: 13px;
        font-weight: 800;
        line-height: 1;
        cursor: pointer;
        pointer-events: auto;
        box-shadow: 0 4px 14px rgba(0,0,0,.5);
        transition: transform .12s ease, background .12s ease;
      }

      button:hover {
        background: #e50914;
        transform: translateY(-2px);
      }

      button:active {
        transform: scale(.92);
      }

      button.ok {
        background: #15803d;
      }

      button.error {
        background: #b91c1c;
      }

      @media (max-width: 1100px) {
        button {
          min-width: 34px;
          padding: 0 6px;
          font-size: 12px;
        }

        .group {
          gap: 3px;
        }
      }

      @media (max-width: 880px) {
        button[data-seconds="15"],
        button[data-seconds="45"] {
          display: none;
        }
      }
    `;

    const group = document.createElement("div");
    group.className = "group";

    for (const seconds of TIMES) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.seconds = String(seconds);
      button.textContent = `+${seconds}`;
      button.title = `${seconds} saniye ileri sar`;

      const swallow = event => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      };

      for (const eventName of ["pointerdown", "mousedown", "mouseup"]) {
        button.addEventListener(eventName, swallow, true);
      }

      button.addEventListener("click", event => {
        swallow(event);

        const ok = seek(seconds);
        button.classList.remove("ok", "error");
        button.classList.add(ok ? "ok" : "error");

        setTimeout(() => {
          button.classList.remove("ok", "error");
        }, 500);
      }, true);

      group.appendChild(button);
    }

    shadow.append(style, group);
    document.documentElement.appendChild(host);
    return host;
  }

  function controlsVisible() {
    const controls =
      document.querySelector('[data-uia="player-controls"]') ||
      document.querySelector('[data-uia="controls-standard"]') ||
      document.querySelector('.watch-video--bottom-controls-container');

    if (!controls) return false;

    const rect = controls.getBoundingClientRect();
    const computed = getComputedStyle(controls);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      computed.visibility !== "hidden" &&
      computed.display !== "none" &&
      Number(computed.opacity || 1) > 0.05
    );
  }

  function updatePosition(host) {
    const volume =
      document.querySelector('[data-uia="control-volume"]') ||
      document.querySelector('button[aria-label*="volume" i]') ||
      document.querySelector('button[aria-label*="ses" i]');

    if (volume) {
      const rect = volume.getBoundingClientRect();
      host.style.left = `${Math.max(8, Math.round(rect.right + 12))}px`;
      host.style.bottom = `${Math.max(8, Math.round(window.innerHeight - rect.bottom))}px`;
    }
  }

  const host = makeHost();

  function refresh() {
    updatePosition(host);
    host.style.display = controlsVisible() ? "block" : "none";
  }

  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"]
  });

  window.addEventListener("mousemove", refresh, true);
  window.addEventListener("resize", refresh);
  window.addEventListener("keydown", refresh, true);

  setInterval(refresh, 500);
  refresh();
})();
