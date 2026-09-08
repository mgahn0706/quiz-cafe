type SoundPool = {
  clips: HTMLAudioElement[];
  cursor: number;
};

const pools = new Map<string, SoundPool>();

function poolFor(source: string, size: number) {
  let pool = pools.get(source);
  if (!pool) {
    pool = {
      clips: Array.from({ length: size }, () => {
        const clip = new Audio(source);
        clip.preload = "auto";
        return clip;
      }),
      cursor: 0,
    };
    pools.set(source, pool);
  }
  return pool;
}

function playSound(source: string, volume: number, poolSize: number) {
  if (typeof window === "undefined") return;
  try {
    const pool = poolFor(source, poolSize);
    const clip = pool.clips[pool.cursor];
    pool.cursor = (pool.cursor + 1) % pool.clips.length;
    clip.pause();
    clip.currentTime = 0;
    clip.volume = volume;
    void clip.play().catch(() => undefined);
  } catch {
    // Sound playback must never interrupt lock interaction.
  }
}

export function playDirectionSfx() {
  playSound("/sounds/direction-dial-input.mp3", .75, 4);
}

export function playDialSfx() {
  playSound("/sounds/dial-input.mp3", .72, 4);
}

export function playPinSfx() {
  playSound("/sounds/eight-pin-toggling.mp3", .8, 4);
}

export function playUnlockSfx() {
  playSound("/sounds/lock-open.mp3", .9, 2);
}

export function playUnlockFailedSfx() {
  playSound("/sounds/unlock-failed.mp3", .82, 2);
}
