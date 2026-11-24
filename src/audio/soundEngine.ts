export type MusicTheme =
  | 'menu'
  | 'excavation'
  | 'workshop'
  | 'flight_dawn'
  | 'portal_duat'
  | 'memphis'
  | 'boss_set'
  | 'silence_horus'
  | 'hook';

type BgmTrackId = 'necropolis' | 'seth';

const TRACK_URLS: Record<BgmTrackId, string> = {
  necropolis: '/audio/descent-into-the-necropolis.ogg',
  seth: '/audio/seth-god-of-egypt.ogg',
};

function themeToTrack(theme: MusicTheme): BgmTrackId | null {
  if (theme === 'silence_horus') return null;
  if (theme === 'boss_set') return 'seth';
  return 'necropolis';
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private noteTimer: number | null = null;

  private audioTracks: Partial<Record<BgmTrackId, HTMLAudioElement>> = {};
  private activeTrackId: BgmTrackId | null = null;
  private bgmPlaying = false;
  private unlocked = false;

  private currentTheme: MusicTheme = 'menu';
  private musicVolume = 0.65;
  private sfxVolume = 0.8;
  private muted = false;
  private stepIndex = 0;

  private ensureAudioTrack(trackId: BgmTrackId): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    let el = this.audioTracks[trackId];
    if (!el) {
      el = new Audio(TRACK_URLS[trackId]);
      el.loop = true;
      el.preload = 'auto';
      el.volume = this.muted ? 0 : this.musicVolume * 0.78;
      this.audioTracks[trackId] = el;
    }
    return el;
  }

  private syncBgmTrack(): void {
    const targetTrack = themeToTrack(this.currentTheme);

    // Pause any non-target track cleanly
    (['necropolis', 'seth'] as BgmTrackId[]).forEach((id) => {
      const el = this.audioTracks[id];
      if (el && id !== targetTrack && !el.paused) {
        el.pause();
        if (this.currentTheme === 'silence_horus') {
          // Hold dramatic silence in Set Phase 3
          el.volume = 0;
        }
      }
    });

    this.activeTrackId = targetTrack;
    if (!targetTrack) {
      this.bgmPlaying = false;
      return;
    }

    const activeEl = this.ensureAudioTrack(targetTrack);
    if (!activeEl) return;

    activeEl.volume = this.muted ? 0 : this.musicVolume * 0.78;

    if (this.unlocked && !this.muted && activeEl.paused) {
      activeEl
        .play()
        .then(() => {
          this.bgmPlaying = true;
        })
        .catch(() => {
          this.bgmPlaying = false;
        });
    } else if (!activeEl.paused) {
      this.bgmPlaying = true;
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume * 0.45;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume * 0.65;
      this.sfxGain.connect(this.masterGain);

      this.setupAmbienceBed();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private setupAmbienceBed(): void {
    if (!this.ctx || !this.musicGain) return;
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 420;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.08;

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'triangle';
    this.droneOsc1.frequency.value = 73.42;

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'sine';
    this.droneOsc2.frequency.value = 110.0;

    this.droneOsc1.connect(this.filterNode);
    this.droneOsc2.connect(this.filterNode);
    this.filterNode.connect(this.droneGain);
    this.droneGain.connect(this.musicGain);

    this.droneOsc1.start();
    this.droneOsc2.start();

    // Subtle desert wind noise loop
    const sampleRate = this.ctx.sampleRate;
    const len = sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, len, sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 1.8;
    }

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = buffer;
    this.windSource.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 340;
    windFilter.Q.value = 1.4;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.08;

    this.windSource.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.musicGain);
    this.windSource.start();

    this.startMelodyLoop();
  }

  private startMelodyLoop(): void {
    if (this.noteTimer !== null) {
      window.clearInterval(this.noteTimer);
    }
    this.noteTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || this.muted) return;
      // Avoid clashing with active OGG soundtrack once loaded & playing
      if (this.bgmPlaying) return;
      this.playThemeStep();
    }, 950);
  }

  private playThemeStep(): void {
    if (!this.ctx || !this.musicGain) return;
    if (this.currentTheme === 'silence_horus') return;

    const scales: Record<MusicTheme, number[]> = {
      menu: [146.83, 155.56, 185.0, 196.0, 220.0, 233.08, 293.66],
      excavation: [146.83, 174.61, 196.0, 220.0, 261.63],
      workshop: [130.81, 146.83, 174.61, 196.0, 233.08],
      flight_dawn: [146.83, 185.0, 220.0, 246.94, 293.66, 369.99],
      portal_duat: [164.81, 196.0, 246.94, 293.66, 329.63, 392.0],
      memphis: [146.83, 155.56, 185.0, 220.0, 233.08, 277.18, 293.66],
      boss_set: [110.0, 116.54, 138.59, 146.83, 164.81],
      silence_horus: [293.66],
      hook: [146.83, 220.0, 293.66, 329.63],
    };

    const notes = scales[this.currentTheme] ?? scales.menu;
    this.stepIndex = (this.stepIndex + 1) % 16;

    if (this.stepIndex % 2 !== 0 && this.currentTheme !== 'memphis' && this.currentTheme !== 'boss_set') {
      return;
    }

    const note = notes[(this.stepIndex * 3 + (this.stepIndex % 5)) % notes.length];
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type =
      this.currentTheme === 'portal_duat'
        ? 'sine'
        : this.currentTheme === 'boss_set'
          ? 'sawtooth'
          : 'triangle';
    osc.frequency.setValueAtTime(note, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.currentTheme === 'boss_set' ? 680 : 1250;

    const peak = this.currentTheme === 'boss_set' ? 0.1 : 0.065;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + 0.08);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + 1.5);
  }

  public unlock(): void {
    this.unlocked = true;
    this.ensureContext();
    this.syncBgmTrack();
  }

  public setTheme(theme: MusicTheme): void {
    if (this.currentTheme === theme) {
      this.syncBgmTrack();
      return;
    }
    this.currentTheme = theme;
    this.syncBgmTrack();

    const ctx = this.ctx;
    if (!ctx || !this.droneOsc1 || !this.droneOsc2 || !this.droneGain || !this.filterNode || !this.windGain) {
      return;
    }

    const now = ctx.currentTime;
    const baseFreqs: Record<MusicTheme, [number, number, number, number]> = {
      menu: [73.42, 110.0, 0.05, 0.07],
      excavation: [65.41, 98.0, 0.04, 0.08],
      workshop: [65.41, 110.0, 0.03, 0.04],
      flight_dawn: [73.42, 146.83, 0.04, 0.12],
      portal_duat: [82.41, 164.81, 0.05, 0.04],
      memphis: [73.42, 110.0, 0.04, 0.1],
      boss_set: [55.0, 82.41, 0.06, 0.22],
      silence_horus: [73.42, 146.83, 0.005, 0.005],
      hook: [73.42, 110.0, 0.04, 0.04],
    };

    const [f1, f2, dg, wg] = baseFreqs[theme];
    this.droneOsc1.frequency.setTargetAtTime(f1, now, 0.45);
    this.droneOsc2.frequency.setTargetAtTime(f2, now, 0.45);
    this.droneGain.gain.setTargetAtTime(this.bgmPlaying ? dg * 0.4 : dg, now, 0.5);
    this.windGain.gain.setTargetAtTime(wg, now, 0.5);
  }

  public setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    if (this.ctx && this.musicGain && this.sfxGain) {
      this.musicGain.gain.setTargetAtTime(music * 0.45, this.ctx.currentTime, 0.08);
      this.sfxGain.gain.setTargetAtTime(sfx * 0.65, this.ctx.currentTime, 0.08);
    }
    if (this.activeTrackId) {
      const activeEl = this.audioTracks[this.activeTrackId];
      if (activeEl) {
        activeEl.volume = this.muted ? 0 : this.musicVolume * 0.78;
      }
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    (['necropolis', 'seth'] as BgmTrackId[]).forEach((id) => {
      const el = this.audioTracks[id];
      if (!el) return;
      if (muted) {
        el.volume = 0;
        if (!el.paused) el.pause();
      } else if (id === this.activeTrackId) {
        el.volume = this.musicVolume * 0.78;
        if (this.unlocked) {
          el.play()
            .then(() => {
              this.bgmPlaying = true;
            })
            .catch(() => {});
        }
      }
    });
  }

  public playUiHover(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520 + Math.random() * 40, now);
    env.gain.setValueAtTime(0.05, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playUiClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.09);
    env.gain.setValueAtTime(0.18, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playWoodFlutter(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [330, 440, 587].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      env.gain.setValueAtTime(0.09, now + idx * 0.045);
      env.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.18);
      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.2);
    });
  }

  public playWingSurge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.22);
    env.gain.setValueAtTime(0.15, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playCheckpoint(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(587.33, now + 0.09);
    env.gain.setValueAtTime(0.16, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.58);
  }

  public playPortalAnomaly(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [220, 329.63, 440, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      env.gain.setValueAtTime(0.12, now + i * 0.07);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(now + i * 0.07);
      osc.stop(now + 1.35);
    });
  }

  public playWitnessChord(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    [293.66, 369.99, 440, 587.33].forEach((freq) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      env.gain.setValueAtTime(0.09, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 2.3);
    });
  }

  public dispose(): void {
    if (this.noteTimer !== null) {
      window.clearInterval(this.noteTimer);
      this.noteTimer = null;
    }
    (['necropolis', 'seth'] as BgmTrackId[]).forEach((id) => {
      const el = this.audioTracks[id];
      if (el) {
        el.pause();
        el.src = '';
      }
    });
    this.audioTracks = {};
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const soundEngine = new SoundEngine();
