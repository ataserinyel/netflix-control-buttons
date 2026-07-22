const status = document.getElementById("status");

async function seek(seconds) {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id || !/^https:\/\/(www\.)?netflix\.com\//i.test(tab.url || "")) {
    throw new Error("Open the Netflix tab.");
  }

  const result = await chrome.scripting.executeScript({
    target: {tabId: tab.id},
    world: "MAIN",
    func: seconds => {
      const vp = window.netflix?.appContext?.state?.playerApp?.getAPI?.()?.videoPlayer;
      const ids = vp?.getAllPlayerSessionIds?.() || [];
      const player = ids.length ? vp.getVideoPlayerBySessionId(ids[0]) : null;
      if (!player) return false;

      const current = Number(player.getCurrentTime?.() || 0);
      const duration = Number(player.getDuration?.());
      let target = current + seconds * 1000;

      if (Number.isFinite(duration) && duration > 0) {
        target = Math.min(target, Math.max(0, duration - 250));
      }

      player.seek(target);
      return true;
    },
    args: [seconds]
  });

  if (!result?.[0]?.result) throw new Error("Player not found..");
}

document.querySelectorAll("button[data-seconds]").forEach(button => {
  button.addEventListener("click", async () => {
    const seconds = Number(button.dataset.seconds);
    try {
      await seek(seconds);
      status.textContent = `Fast forwarded ${seconds} seconds.`;
      status.className = "ok";
    } catch (error) {
      status.textContent = error.message;
      status.className = "error";
    }
  });
});
