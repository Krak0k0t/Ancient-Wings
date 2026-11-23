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
  private currentTheme: MusicTheme = 'menu';
  private musicVolume = 0.65;
  private sfxVolume = 0.8;
  private muted = false;
  private stepIndex = 0;

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
    this.droneGain.gain.value = 0.16;

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'triangle';
    this.droneOsc1.frequency.value = 73.42; // D2

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'sine';
    this.droneOsc2.frequency.value = 110.0; // A2

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
      this.playThemeStep();
    }, 950);
  }

  private playThemeStep(): void {
    if (!this.ctx || !this.musicGain) return;
    if (this.currentTheme === 'silence_horus') return; // Sacred silence during Set Phase 3

    // Phrygian dominant & Hijaz-inspired Egyptian scales
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

    // Sparse, meditative phrasing (not cluttered)
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

    const peak = this.currentTheme === 'boss_set' ? 0.12 : 0.085;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + 0.08);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + 1.5);

    // Frame drum pulse in Memphis & Set boss
    if ((this.currentTheme === 'memphis' || this.currentTheme === 'boss_set') && this.stepIndex % 2 === 0) {
      const drumOsc = this.ctx.createOscillator();
      const drumEnv = this.ctx.createGain();
      drumOsc.type = 'sine';
      drumOsc.frequency.setValueAtTime(this.currentTheme === 'boss_set' ? 88 : 112, now);
      drumOsc.frequency.exponentialRampToValueAtTime(42, now + 0.16);
      drumEnv.gain.setValueAtTime(0.16, now);
      drumEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      drumOsc.connect(drumEnv);
      drumEnv.connect(this.musicGain);
      drumOsc.start(now);
      drumOsc.stop(now + 0.24);
    }
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setTheme(theme: MusicTheme): void {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    const ctx = this.ctx;
    if (!ctx || !this.droneOsc1 || !this.droneOsc2 || !this.droneGain || !this.filterNode || !this.windGain) {
      return;
    }

    const now = ctx.currentTime;
    const baseFreqs: Record<MusicTheme, [number, number, number, number]> = {
      menu: [73.42, 110.0, 0.16, 0.08],
      excavation: [65.41, 98.0, 0.13, 0.09],
      workshop: [65.41, 110.0, 0.11, 0.05],
      flight_dawn: [73.42, 146.83, 0.15, 0.14],
      portal_duat: [82.41, 164.81, 0.18, 0.04],
      memphis: [73.42, 110.0, 0.17, 0.12],
      boss_set: [55.0, 82.41, 0.24, 0.24],
      silence_horus: [73.42, 146.83, 0.02, 0.01],
      hook: [73.42, 110.0, 0.12, 0.04],
    };

    const [f1, f2, dg, wg] = baseFreqs[theme];
    this.droneOsc1.frequency.setTargetAtTime(f1, now, 0.45);
    this.droneOsc2.frequency.setTargetAtTime(f2, now, 0.45);
    this.droneGain.gain.setTargetAtTime(dg, now, 0.5);
    this.windGain.gain.setTargetAtTime(wg, now, 0.5);
  }

  public setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    if (this.ctx && this.musicGain && this.sfxGain) {
      this.musicGain.gain.setTargetAtTime(music * 0.45, this.ctx.currentTime, 0.08);
      this.sfxGain.gain.setTargetAtTime(sfx * 0.65, this.ctx.currentTime, 0.08);
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
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
    // Sycamore wood tap + bronze overtone
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
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const soundEngine = new SoundEngine();
