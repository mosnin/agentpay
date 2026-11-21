// Watch each canonical head once. HTTP providers use a lightweight head poll. Reading
// the hash also detects a replacement at the same height. Never overlap snapshot reads.
export function watchChainView({
  provider,
  read,
  onError,
  visibility = document,
  delay = 2800,
}) {
  let alive = true,
    running = false,
    pending = false,
    lastHash,
    timer;
  async function tick() {
    if (!alive || visibility.hidden) return;
    if (running) {
      pending = true;
      return;
    }
    running = true;
    clearTimeout(timer);
    try {
      const head = await provider.getBlock("latest");
      if (!head?.hash) throw Error("Waiting for a confirmed block.");
      if (alive && head.hash !== lastHash) {
        await read(head, () => alive);
        lastHash = head.hash;
      }
    } catch (error) {
      lastHash = undefined;
      if (alive) onError(error);
    } finally {
      running = false;
      if (alive) {
        timer = setTimeout(tick, pending ? 0 : delay);
        pending = false;
      }
    }
  }
  visibility.addEventListener("visibilitychange", tick);
  tick();
  return () => {
    alive = false;
    clearTimeout(timer);
    visibility.removeEventListener("visibilitychange", tick);
  };
}
