import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import {
  ChapterMissionLayout,
  createChapterLayout,
  createInitialKinematics,
  dist3,
  FlightInput,
  GliderKinematics,
  respawnAtCheckpoint,
  stepFlightPhysics,
} from '../game/flightPhysics';
import {
  DifficultyLevel,
  GraphicsQuality,
  HudFlightState,
  KeyBindings,
  LanguageCode,
  SceneId,
} from '../types/game';
import {
  CHAPTER_1_6_LINES,
  CHAPTER_1_7_LINES,
  localizeSpeaker,
  localizeStageDirection,
  pickDialogueText,
} from '../story/part1';
import { soundEngine } from '../audio/soundEngine';
import { buildArchitectureLayer } from './world/ArchitectureLayer';
import { buildEntitiesAndBoss } from './world/EntitiesAndBoss';
import { buildSaqqaraGlider } from './world/GliderModel';
import { createProceduralMaterials } from './world/materials';
import { buildNatureLayer } from './world/NatureLayer';

export type EngineViewMode = 'menu' | 'transition' | 'flight' | 'static_backdrop';

export interface EngineCallbacks {
  onHudUpdate: (hud: HudFlightState) => void;
  onChapterProgressEvent: (event:
    | { type: '1_3_takeoff' }
    | { type: '1_3_post'; totalPosts: number }
    | { type: '1_3_thermal_detour' }
    | { type: '1_3_anomaly' }
    | { type: '1_4_mission'; mission: 'thermals' | 'boatSlalom' | 'headwindFin' }
    | { type: '1_5_portal' }
    | { type: '1_5_trail_done' }
    | { type: '1_6_memphis_done' }
    | { type: '1_7_phase'; phase: 1 | 2 | 3 }
    | { type: '1_7_horus' }
    | { type: '1_7_witness_done' }
    | { type: 'flight_complete' }
  ) => void;
  onHeroPreviewClicked: () => void;
  onTransitionComplete: () => void;
  onRequestRestartFlight: () => void;
  onRequestPause: () => void;
}

const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.5);
const _rayHitPoint = new THREE.Vector3();
const _aimDirVec = new THREE.Vector3();
const _panDelta = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class FlightEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private isSoftwareGl: boolean;

  private mats: ReturnType<typeof createProceduralMaterials>;
  private glider: ReturnType<typeof buildSaqqaraGlider>;
  private nature: ReturnType<typeof buildNatureLayer>;
  private arch: ReturnType<typeof buildArchitectureLayer>;
  private entities: ReturnType<typeof buildEntitiesAndBoss>;
  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  private callbacks: EngineCallbacks;
  private mode: EngineViewMode = 'menu';
  private paused = false;
  private quality: GraphicsQuality = 'high';
  private difficulty: DifficultyLevel = 'adept';
  private language: LanguageCode = 'en';
  private bindings: KeyBindings;
  private portalActive = false;

  private sceneId: SceneId = '1_3';
  private layout: ChapterMissionLayout = createChapterLayout('1_3');
  private kinematics: GliderKinematics = createInitialKinematics('1_3');
  private waypointIdx = 0;
  private flightRunId = 1;
  private bossPhase: 0 | 1 | 2 | 3 = 0;
  private witnessVisible = false;
  private witnessTimer = 0;
  private horusTimer = 0;
  private flightCompleted = false;

  private modelCardNote: string | null = null;
  private activeDialogue: HudFlightState['activeDialogue'] = null;
  private dialogueTimer = 0;
  private checkpointFlash: string | null = null;
  private flashTimer = 0;
  private memphisPriestPlayed = false;
  private memphisWarriorPlayed = false;
  private lastAvoidThermalWarn = 0;

  private keysHeld = new Set<string>();
  private mouseButtonsHeld = new Set<string>();
  private touchAxis = { x: 0, y: 0 };
  private touchSurge = false;

  private controls: OrbitControls;
  private cursorAimEnabled = true;
  private cursorNdc = new THREE.Vector2(0, 0);
  private hasCursorMoved = false;
  private isOrbitDragging = false;
  private resettingCamera = false;
  private prevGliderPos = new THREE.Vector3();

  private transitionTimer = 0;
  private lastFrameMs = performance.now();
  private elapsed = 0;
  private lastHudEmit = 0;
  private frameId = 0;
  private disposed = false;

  constructor(
    container: HTMLElement,
    callbacks: EngineCallbacks,
    initialBindings: KeyBindings
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.bindings = { ...initialBindings };
    this.isSoftwareGl = detectSoftwareGl();

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcfa87a);
    this.scene.fog = new THREE.FogExp2(0xcfa87a, 0.0042);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.4, 900);
    this.camera.position.set(6, 5.5, 118);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.enableRotate = true;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.minDistance = 5.5;
    this.controls.maxDistance = 42;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    this.controls.enabled = false;
    this.syncControlMouseButtons();

    // 3-Point Warm/Cool Studio + Solar Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xa3c4e8, 0x8c6b43, 0.78);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffdca8, 2.25);
    this.keyLight.position.set(55, 72, 45);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 10;
    this.keyLight.shadow.camera.far = 260;
    this.keyLight.shadow.camera.left = -90;
    this.keyLight.shadow.camera.right = 90;
    this.keyLight.shadow.camera.top = 90;
    this.keyLight.shadow.camera.bottom = -90;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight(0x88b4e6, 0.65);
    rimLight.position.set(-45, 30, -60);
    this.scene.add(rimLight);

    // Build modular AAA layers
    this.mats = createProceduralMaterials(this.renderer, this.isSoftwareGl);
    this.nature = buildNatureLayer(this.mats);
    this.arch = buildArchitectureLayer(this.mats);
    this.glider = buildSaqqaraGlider(this.mats);
    this.entities = buildEntitiesAndBoss(this.mats);

    this.scene.add(this.nature.group, this.arch.root, this.glider.root, this.entities.root);

    // Setup Post-Processing (GPU High/Cinematic only)
    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.38, 0.45, 0.86);
      this.composer.addPass(this.bloomPass);
      const vignette = new ShaderPass(VignetteShader);
      vignette.uniforms['offset'].value = 1.05;
      vignette.uniforms['darkness'].value = 0.95;
      this.composer.addPass(vignette);
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.applySceneAtmosphere('menu');
    this.startLoop();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('contextmenu', this.handleContextMenu);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.controls.addEventListener('start', this.handleOrbitStart);
    this.controls.addEventListener('end', this.handleOrbitEnd);
  }

  private handleOrbitStart = () => {
    this.isOrbitDragging = true;
    this.resettingCamera = false;
  };

  private handleOrbitEnd = () => {
    this.isOrbitDragging = false;
  };

  private syncControlMouseButtons(): void {
    const rmbFree = this.bindings.wingSurge !== 'MouseRight';
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: rmbFree ? THREE.MOUSE.PAN : (null as unknown as THREE.MOUSE),
    };
  }

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handleBlur = () => {
    this.keysHeld.clear();
    this.mouseButtonsHeld.clear();
    this.isOrbitDragging = false;
  };

  private handleResize = () => {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
  };

  private mapMouseCode(button: number): string {
    if (button === 0) return 'MouseLeft';
    if (button === 2) return 'MouseRight';
    return `Mouse${button}`;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    soundEngine.unlock();
    this.keysHeld.add(e.code);

    if (this.mode === 'flight' && !this.paused) {
      if (e.code === this.bindings.toggleCursorAim) {
        e.preventDefault();
        this.toggleCursorAim();
        return;
      }
      if (e.code === this.bindings.resetCamera || e.code === 'KeyV') {
        e.preventDefault();
        this.resetCamera();
        return;
      }
      if (e.code === this.bindings.restartFlight) {
        e.preventDefault();
        this.callbacks.onRequestRestartFlight();
        return;
      }
      if (e.code === this.bindings.pauseMenu || e.code === 'KeyP') {
        e.preventDefault();
        this.callbacks.onRequestPause();
        return;
      }
      if (e.code === this.bindings.wingSurge || e.code === 'Space') {
        soundEngine.playWingSurge();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.cursorNdc.x = THREE.MathUtils.clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    this.cursorNdc.y = THREE.MathUtils.clamp(-((e.clientY - rect.top) / rect.height) * 2 + 1, -1, 1);
    this.hasCursorMoved = true;
  };

  private handlePointerDown = (e: PointerEvent) => {
    soundEngine.unlock();
    const code = this.mapMouseCode(e.button);
    this.mouseButtonsHeld.add(code);

    if (this.mode === 'menu' && e.button === 0) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointerNdc, this.camera);
      const hits = _raycaster.intersectObject(this.glider.root, true);
      if (hits.length > 0) {
        this.glider.triggerInspectPulse();
        soundEngine.playWoodFlutter();
        this.callbacks.onHeroPreviewClicked();
      }
      return;
    }

    if (this.mode === 'flight' && !this.paused) {
      if (code === this.bindings.wingSurge) {
        soundEngine.playWingSurge();
      }
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    this.mouseButtonsHeld.delete(this.mapMouseCode(e.button));
  };

  public setSettings(
    quality: GraphicsQuality,
    difficulty: DifficultyLevel,
    language: LanguageCode,
    bindings: KeyBindings
  ): void {
    this.quality = quality;
    this.difficulty = difficulty;
    this.language = language;
    this.bindings = { ...bindings };
    this.syncControlMouseButtons();

    const highSpec = quality === 'high' || quality === 'cinematic';
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && highSpec;
    this.keyLight.castShadow = !this.isSoftwareGl && highSpec;
    if (this.bloomPass) {
      this.bloomPass.enabled = highSpec;
      this.bloomPass.strength = quality === 'cinematic' ? 0.48 : 0.3;
    }
    this.nature.setQuality(quality);
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    this.controls.enabled = this.mode === 'flight' && !paused;
    if (paused) {
      this.keysHeld.clear();
      this.mouseButtonsHeld.clear();
      this.isOrbitDragging = false;
    }
  }

  public toggleCursorAim(): boolean {
    this.cursorAimEnabled = !this.cursorAimEnabled;
    soundEngine.playUiClick();
    this.emitHud(true);
    return this.cursorAimEnabled;
  }

  public resetCamera(): void {
    this.resettingCamera = true;
    soundEngine.playUiClick();
  }

  public setTouchInput(x: number, y: number, surge: boolean): void {
    this.touchAxis.x = x;
    this.touchAxis.y = y;
    this.touchSurge = surge;
    if (surge) soundEngine.playWingSurge();
  }

  public setPortalActive(active: boolean): void {
    this.portalActive = active;
  }

  public startMenuTransition(): void {
    this.mode = 'transition';
    this.controls.enabled = false;
    this.transitionTimer = 0;
  }

  public enterStaticBackdrop(): void {
    this.mode = 'static_backdrop';
    this.controls.enabled = false;
    this.applySceneAtmosphere('menu');
  }

  public enterMenuMode(): void {
    this.mode = 'menu';
    this.paused = false;
    this.controls.enabled = false;
    this.glider.root.position.set(0, 2.35, 112);
    this.glider.root.rotation.set(0.08, 0.35, 0);
    this.glider.root.scale.setScalar(1.0);
    this.applySceneAtmosphere('menu');
  }

  public startFlightScene(sceneId: SceneId, runId: number, portalActive: boolean): void {
    this.sceneId = sceneId;
    this.flightRunId = runId;
    this.portalActive = portalActive;
    this.mode = 'flight';
    this.paused = false;
    this.controls.enabled = true;
    this.resettingCamera = false;
    this.isOrbitDragging = false;
    this.layout = createChapterLayout(sceneId);
    this.kinematics = createInitialKinematics(sceneId);
    this.waypointIdx = 0;
    this.bossPhase = sceneId === '1_7' ? 1 : 0;
    this.witnessVisible = false;
    this.witnessTimer = 0;
    this.horusTimer = 0;
    this.flightCompleted = false;
    this.memphisPriestPlayed = false;
    this.memphisWarriorPlayed = false;
    this.modelCardNote = null;
    this.activeDialogue = null;
    this.checkpointFlash = null;

    this.snapCameraToGlider();
    this.entities.configureForScene(sceneId, this.layout, portalActive, this.difficulty);
    this.applySceneAtmosphere(sceneId);

    if (sceneId === '1_7') {
      this.showDialogue(CHAPTER_1_7_LINES.setStart, 5.5);
    }
    this.emitHud(true);
  }

  private snapCameraToGlider(): void {
    const p = this.kinematics.pos;
    this.prevGliderPos.set(p.x, p.y, p.z);
    this.controls.target.set(p.x, p.y, p.z);
    const distBack = 12.5;
    const heightUp = 4.2;
    this.camera.position.set(
      p.x + Math.sin(this.kinematics.yaw) * distBack,
      Math.max(2.4, p.y + heightUp),
      p.z + Math.cos(this.kinematics.yaw) * distBack
    );
    this.controls.update();
  }

  private applySceneAtmosphere(target: 'menu' | SceneId): void {
    // Restore default exposure & sand tint before per-scene tuning
    this.renderer.toneMappingExposure = 1.05;
    this.mats.sand.color.setHex(0xffffff);
    this.hemiLight.intensity = 0.78;
    if (this.bloomPass) {
      const highSpec = this.quality === 'high' || this.quality === 'cinematic';
      this.bloomPass.enabled = highSpec;
      this.bloomPass.strength = this.quality === 'cinematic' ? 0.48 : 0.3;
      this.bloomPass.threshold = 0.86;
    }

    if (target === 'menu' || target === '1_3' || target === '1_4') {
      const col = target === 'menu' ? 0xd2a372 : 0xdcb486;
      this.scene.background = new THREE.Color(col);
      this.scene.fog = new THREE.FogExp2(col, 0.0038);
      this.keyLight.color.setHex(0xffd79e);
      this.keyLight.intensity = 2.25;
      this.hemiLight.color.setHex(0x9fc4e8);
      this.hemiLight.groundColor.setHex(0x8c683e);
      this.arch.setMode(target === 'menu' ? 'menu' : 'dawn');
    } else if (target === '1_5') {
      // Book of the Dead nocturnal starry sky
      this.scene.background = new THREE.Color(0x0b132b);
      this.scene.fog = new THREE.FogExp2(0x0b132b, 0.0046);
      this.keyLight.color.setHex(0xffe199);
      this.keyLight.intensity = 1.5;
      this.hemiLight.color.setHex(0x3a508b);
      this.hemiLight.groundColor.setHex(0x161b33);
      this.arch.setMode('duat');
    } else if (target === '1_6') {
      // Living Memphis midday golden haze
      this.scene.background = new THREE.Color(0xdcb98a);
      this.scene.fog = new THREE.FogExp2(0xdcb98a, 0.004);
      this.keyLight.color.setHex(0xffe4b3);
      this.keyLight.intensity = 2.4;
      this.hemiLight.color.setHex(0xa6d1f0);
      this.hemiLight.groundColor.setHex(0x9a7446);
      this.arch.setMode('memphis');
    } else if (target === '1_7') {
      // Set Sandstorm: controlled contrast, zero horizon/ground washout, clear boundary with Upper Silence
      this.renderer.toneMappingExposure = 0.84;
      this.mats.sand.color.setHex(0xb88b58);
      this.scene.background = new THREE.Color(0x4c3018);
      this.scene.fog = new THREE.FogExp2(0x633e1f, 0.0042);
      this.keyLight.color.setHex(0xf2a14c);
      this.keyLight.intensity = 1.38;
      this.hemiLight.color.setHex(0x4b5f86);
      this.hemiLight.groundColor.setHex(0x3a2310);
      this.hemiLight.intensity = 0.65;
      if (this.bloomPass) {
        this.bloomPass.strength = 0.22;
        this.bloomPass.threshold = 0.92;
      }
      this.arch.setMode('set');
    }
  }

  private showDialogue(
    entry: typeof CHAPTER_1_7_LINES.setStart,
    durationSec: number
  ): void {
    this.activeDialogue = {
      speaker: localizeSpeaker(entry.speaker, this.language),
      text: pickDialogueText(entry, this.language),
      stage: localizeStageDirection(entry.stageDirection, this.language),
    };
    this.dialogueTimer = durationSec;
  }

  private isActionHeld(code: string, fallbackAlt?: string): boolean {
    if (this.keysHeld.has(code) || this.mouseButtonsHeld.has(code)) return true;
    if (fallbackAlt && (this.keysHeld.has(fallbackAlt) || this.mouseButtonsHeld.has(fallbackAlt))) {
      return true;
    }
    return false;
  }

  private startLoop(): void {
    this.lastFrameMs = performance.now();
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = Math.max(0.001, (now - this.lastFrameMs) / 1000);
      this.lastFrameMs = now;
      const dt = Math.min(rawDt, 0.05);
      this.elapsed += dt;

      this.updateFrame(dt, rawDt);
      this.renderFrame();

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    if (this.disposed) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateFrame(dt: number, rawDt: number): void {
    const isDuat = this.mode === 'flight' && this.sceneId === '1_5';
    this.nature.update(this.elapsed, dt, this.quality, isDuat);
    this.arch.update(this.elapsed);

    if (this.mode === 'menu' || this.mode === 'static_backdrop') {
      // Slow cinematic orbital dolly around the Saqqara pylon & glider hero
      const angle = this.elapsed * 0.14;
      const radius = 14.5 + Math.sin(this.elapsed * 0.25) * 1.8;
      _camDesired.set(
        Math.sin(angle) * radius,
        5.8 + Math.sin(this.elapsed * 0.3) * 0.9,
        112 + Math.cos(angle) * radius * 0.65
      );
      this.camera.position.lerp(_camDesired, 1 - Math.exp(-3.5 * dt));
      _camTarget.set(0, 3.2, 107);
      this.camera.lookAt(_camTarget);

      this.glider.root.position.set(0, 2.35 + Math.sin(this.elapsed * 1.6) * 0.08, 112);
      this.glider.root.rotation.set(0.06, 0.35 + Math.sin(this.elapsed * 0.5) * 0.08, 0);
      this.glider.updateVisuals(this.elapsed, dt, Math.sin(this.elapsed * 0.8) * 0.12, 0.05, 0);
      return;
    }

    if (this.mode === 'transition') {
      // Smooth fly-through straight through the Saqqara Pylon Gate toward the Nile sky
      this.transitionTimer += Math.min(rawDt, 0.25);
      const t = Math.min(1, this.transitionTimer / 1.1);
      const ease = t * t * (3 - 2 * t);
      this.camera.position.set(
        THREE.MathUtils.lerp(4, 0, ease),
        THREE.MathUtils.lerp(5.5, 11.5, ease),
        THREE.MathUtils.lerp(119, 78, ease)
      );
      this.camera.lookAt(0, 12, 0);
      this.glider.updateVisuals(this.elapsed, dt, 0, 0.05, 0.2);
      if (t >= 1) {
        this.callbacks.onTransitionComplete();
      }
      return;
    }

    if (this.mode === 'flight' && !this.paused) {
      this.updateFlight(dt);
    }
  }

  private updateFlight(dt: number): void {
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.activeDialogue = null;
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.checkpointFlash = null;
    }

    // Handle Set Phase 3 -> Horus -> Witness micro-scene sequence
    if (this.witnessVisible) {
      this.witnessTimer -= dt;
      this.glider.updateVisuals(this.elapsed, dt, 0, 0.04, 0);
      this.entities.update(
        this.elapsed,
        dt,
        this.sceneId,
        this.waypointIdx,
        this.bossPhase,
        true,
        this.kinematics.pos
      );
      if (this.witnessTimer <= 0 && !this.flightCompleted) {
        this.flightCompleted = true;
        this.callbacks.onChapterProgressEvent({ type: '1_7_witness_done' });
        this.callbacks.onChapterProgressEvent({ type: 'flight_complete' });
      }
      this.emitHud(false);
      return;
    }

    if (this.horusTimer > 0) {
      this.horusTimer -= dt;
      this.glider.updateVisuals(this.elapsed, dt, 0, 0.04, 0);
      this.entities.update(
        this.elapsed,
        dt,
        this.sceneId,
        this.waypointIdx,
        3,
        false,
        this.kinematics.pos
      );
      if (this.horusTimer <= 0) {
        this.witnessVisible = true;
        this.witnessTimer = 4.2;
        soundEngine.playWitnessChord();
        this.showDialogue(CHAPTER_1_7_LINES.witnessVoice, 4.1);
      }
      this.emitHud(false);
      return;
    }

    let aimTargetDir: FlightInput['aimTargetDir'];
    if (this.cursorAimEnabled && this.hasCursorMoved && !this.isOrbitDragging) {
      _raycaster.setFromCamera(this.cursorNdc, this.camera);
      const hitGround = _raycaster.ray.intersectPlane(_groundPlane, _rayHitPoint);
      const hitDist = hitGround
        ? _rayHitPoint.distanceTo(_raycaster.ray.origin)
        : Infinity;
      if (!hitGround || hitDist > 130 || hitDist < 12) {
        _rayHitPoint
          .copy(_raycaster.ray.direction)
          .multiplyScalar(95)
          .add(_raycaster.ray.origin);
      }
      _aimDirVec
        .set(
          _rayHitPoint.x - this.kinematics.pos.x,
          _rayHitPoint.y - this.kinematics.pos.y,
          _rayHitPoint.z - this.kinematics.pos.z
        )
        .normalize();
      aimTargetDir = { x: _aimDirVec.x, y: _aimDirVec.y, z: _aimDirVec.z };
    }

    const input: FlightInput = {
      pitchUp: this.isActionHeld(this.bindings.pitchUp, 'ArrowUp'),
      pitchDown: this.isActionHeld(this.bindings.pitchDown, 'ArrowDown'),
      turnLeft: this.isActionHeld(this.bindings.turnLeft, 'ArrowLeft'),
      turnRight: this.isActionHeld(this.bindings.turnRight, 'ArrowRight'),
      wingSurge: this.isActionHeld(this.bindings.wingSurge, 'Space') || this.touchSurge,
      brakeHold: this.isActionHeld(this.bindings.brakeHold),
      touchX: this.touchAxis.x,
      touchY: this.touchAxis.y,
      cursorAimActive: this.cursorAimEnabled && this.hasCursorMoved && !this.isOrbitDragging,
      aimTargetDir,
    };
    this.touchSurge = false;

    const step = stepFlightPhysics(this.kinematics, input, this.layout, this.difficulty, dt);
    this.kinematics = step.kinematics;

    if (step.crashedToCheckpoint) {
      this.snapCameraToGlider();
      this.triggerCheckpointFlash();
    }

    if (step.hitAvoidThermal && this.elapsed - this.lastAvoidThermalWarn > 2.0) {
      this.lastAvoidThermalWarn = this.elapsed;
      this.kinematics = respawnAtCheckpoint(this.kinematics);
      this.snapCameraToGlider();
      this.triggerCheckpointFlash();
    }

    // Update Glider 3D transform & rudder/wing visuals
    this.glider.root.position.set(
      this.kinematics.pos.x,
      this.kinematics.pos.y,
      this.kinematics.pos.z
    );
    this.glider.root.rotation.order = 'YXZ';
    this.glider.root.rotation.set(
      this.kinematics.pitch,
      this.kinematics.yaw,
      this.kinematics.roll
    );
    this.glider.updateVisuals(
      this.elapsed,
      dt,
      this.kinematics.rudderAngle,
      this.kinematics.wingAngle,
      this.kinematics.surgeTimer
    );

    // Sync OrbitControls with glider translation in flight
    const dx = this.kinematics.pos.x - this.prevGliderPos.x;
    const dy = this.kinematics.pos.y - this.prevGliderPos.y;
    const dz = this.kinematics.pos.z - this.prevGliderPos.z;
    this.controls.target.x += dx;
    this.controls.target.y += dy;
    this.controls.target.z += dz;
    this.camera.position.x += dx;
    this.camera.position.y += dy;
    this.camera.position.z += dz;
    this.prevGliderPos.set(this.kinematics.pos.x, this.kinematics.pos.y, this.kinematics.pos.z);

    if (this.resettingCamera) {
      const distBack = 12.5;
      const heightUp = 4.2;
      _camDesired.set(
        this.kinematics.pos.x + Math.sin(this.kinematics.yaw) * distBack,
        Math.max(2.4, this.kinematics.pos.y + heightUp - Math.sin(this.kinematics.pitch) * 3.5),
        this.kinematics.pos.z + Math.cos(this.kinematics.yaw) * distBack
      );
      _camTarget.set(this.kinematics.pos.x, this.kinematics.pos.y, this.kinematics.pos.z);
      const t = 1 - Math.exp(-7.5 * dt);
      this.controls.target.lerp(_camTarget, t);
      this.camera.position.lerp(_camDesired, t);
      this.camera.lookAt(this.controls.target);
      if (
        this.camera.position.distanceTo(_camDesired) < 0.14 &&
        this.controls.target.distanceTo(_camTarget) < 0.14
      ) {
        this.camera.position.copy(_camDesired);
        this.controls.target.copy(_camTarget);
        this.resettingCamera = false;
        this.controls.update();
      }
    } else {
      // Keep pan focus within bounded radius around the glider
      _panDelta.subVectors(this.controls.target, this.prevGliderPos);
      if (_panDelta.length() > 14) {
        _panDelta.setLength(14);
        this.controls.target.copy(this.prevGliderPos).add(_panDelta);
      }
      this.controls.update();
    }

    // Clamp minimum camera height above ground & Nile water so camera never clips underground
    if (this.camera.position.y < 2.4) {
      this.camera.position.y = 2.4;
    }

    // Subtle speed FOV widening
    const targetFov = 58 + (this.kinematics.speed - 25) * 0.35;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.exp(-5 * dt));
      this.camera.updateProjectionMatrix();
    }

    // Entities & Hazards update
    const { hazards } = this.entities.update(
      this.elapsed,
      dt,
      this.sceneId,
      this.waypointIdx,
      this.bossPhase,
      this.witnessVisible,
      this.kinematics.pos
    );

    // Check collisions with hazards (Memphis spears/neutral watchers or Set sand streams / wind blast)
    for (const h of hazards) {
      if (dist3(this.kinematics.pos, h.pos) < h.radius) {
        this.kinematics = respawnAtCheckpoint(this.kinematics);
        this.snapCameraToGlider();
        if (h.kind === 'set_wind_blast') {
          this.checkpointFlash =
            this.language === 'ru'
              ? 'Штормовая волна — поднимитесь над пылью в верхнюю тишину!'
              : 'Storm wind blast — climb above the dust layer into upper silence!';
          this.flashTimer = 2.6;
        } else {
          this.triggerCheckpointFlash();
        }
        break;
      }
    }

    // Chapter 1_6 scripted dialogue triggers
    if (this.sceneId === '1_6') {
      if (!this.memphisPriestPlayed && this.kinematics.pos.z < 95) {
        this.memphisPriestPlayed = true;
        this.showDialogue(CHAPTER_1_6_LINES[0], 4.5);
      }
      if (!this.memphisWarriorPlayed && this.kinematics.pos.z < 20) {
        this.memphisWarriorPlayed = true;
        this.showDialogue(CHAPTER_1_6_LINES[1], 4.5);
      }
    }

    // Evaluate Active Waypoint Progression
    const activeWp = this.layout.waypoints[this.waypointIdx];
    if (activeWp && !this.flightCompleted) {
      const d = dist3(this.kinematics.pos, activeWp.pos);
      if (d <= activeWp.radius) {
        // Save checkpoint here!
        this.kinematics.checkpointPos = { ...activeWp.pos };
        this.kinematics.checkpointYaw = this.kinematics.yaw;
        soundEngine.playCheckpoint();

        this.handleWaypointCleared(activeWp.id, activeWp.kind);
        this.waypointIdx += 1;

        if (this.waypointIdx >= this.layout.waypoints.length) {
          this.handleAllWaypointsCleared();
        }
      }
    }

    this.emitHud(false);
  }

  private handleWaypointCleared(wpId: string, kind: string): void {
    if (this.sceneId === '1_3') {
      if (kind === 'takeoff') {
        this.callbacks.onChapterProgressEvent({ type: '1_3_takeoff' });
      } else if (wpId === 'post_1_a' || wpId === 'post_2_a') {
        this.modelCardNote =
          this.language === 'ru'
            ? 'наблюдение: земля видит нас и молчит'
            : 'observation: the earth sees us and stays silent';
        this.callbacks.onChapterProgressEvent({ type: '1_3_post', totalPosts: 1 });
      } else if (wpId === 'skirt_turn') {
        this.callbacks.onChapterProgressEvent({ type: '1_3_thermal_detour' });
      } else if (wpId === 'post_2_b' || wpId === 'post_1_b') {
        this.callbacks.onChapterProgressEvent({ type: '1_3_post', totalPosts: 2 });
      } else if (kind === 'anomaly') {
        soundEngine.playPortalAnomaly();
        this.portalActive = true;
        this.entities.configureForScene('1_3', this.layout, true, this.difficulty);
        this.callbacks.onChapterProgressEvent({ type: '1_3_anomaly' });
      }
    } else if (this.sceneId === '1_4') {
      if (wpId === 'm1_2') {
        this.callbacks.onChapterProgressEvent({ type: '1_4_mission', mission: 'thermals' });
      } else if (wpId === 'm2_2') {
        this.callbacks.onChapterProgressEvent({ type: '1_4_mission', mission: 'boatSlalom' });
      } else if (wpId === 'm3_2') {
        this.callbacks.onChapterProgressEvent({ type: '1_4_mission', mission: 'headwindFin' });
      }
    } else if (this.sceneId === '1_5') {
      if (kind === 'portal') {
        soundEngine.playPortalAnomaly();
        this.callbacks.onChapterProgressEvent({ type: '1_5_portal' });
      } else if (kind === 'exit') {
        this.callbacks.onChapterProgressEvent({ type: '1_5_trail_done' });
      }
    } else if (this.sceneId === '1_6') {
      if (kind === 'exit') {
        this.callbacks.onChapterProgressEvent({ type: '1_6_memphis_done' });
      }
    } else if (this.sceneId === '1_7') {
      if (wpId === 'set_phase_1_gate') {
        this.bossPhase = 2;
        this.callbacks.onChapterProgressEvent({ type: '1_7_phase', phase: 1 });
      } else if (wpId === 'set_phase_2_silence') {
        this.bossPhase = 3;
        soundEngine.setTheme('silence_horus');
        this.callbacks.onChapterProgressEvent({ type: '1_7_phase', phase: 2 });
      } else if (wpId === 'set_phase_3_horus') {
        this.callbacks.onChapterProgressEvent({ type: '1_7_phase', phase: 3 });
        this.callbacks.onChapterProgressEvent({ type: '1_7_horus' });
        this.showDialogue(CHAPTER_1_7_LINES.horusEnd, 3.6);
        this.horusTimer = 3.6;
      }
    }
  }

  private handleAllWaypointsCleared(): void {
    if (this.sceneId === '1_7') {
      // 1_7 waits for Horus -> Witness micro-scene timer to conclude
      return;
    }
    this.flightCompleted = true;
    this.callbacks.onChapterProgressEvent({ type: 'flight_complete' });
  }

  private triggerCheckpointFlash(): void {
    this.checkpointFlash =
      this.language === 'ru'
        ? 'Возврат к последнему чекпоинту главы'
        : 'Returned to last checkpoint';
    this.flashTimer = 2.2;
  }

  private emitHud(force: boolean): void {
    if (!force && this.elapsed - this.lastHudEmit < 0.1) return;
    this.lastHudEmit = this.elapsed;

    const activeWp = this.layout.waypoints[this.waypointIdx];
    const headingDeg = (((-this.kinematics.yaw * 180) / Math.PI) % 360 + 360) % 360;
    const nearAnomaly =
      this.sceneId === '1_3' && activeWp?.kind === 'anomaly' && dist3(this.kinematics.pos, activeWp.pos) < 55;
    const nearPortal =
      (this.sceneId === '1_3' && this.portalActive) ||
      (this.sceneId === '1_5' && activeWp?.kind === 'portal');

    this.callbacks.onHudUpdate({
      sceneId: this.sceneId,
      altitude: Math.round(this.kinematics.pos.y),
      speed: Math.round(this.kinematics.speed),
      headingDeg: Math.round(headingDeg),
      windStrength: Math.round(Math.hypot(this.layout.windVec.x, this.layout.windVec.z)),
      rudderAngleDeg: Math.round((this.kinematics.rudderAngle * 180) / Math.PI),
      wingAngleDeg: Math.round((this.kinematics.wingAngle * 180) / Math.PI),
      checkpointIndex: Math.min(this.waypointIdx, this.layout.waypoints.length),
      totalCheckpoints: this.layout.waypoints.length,
      subMissionIndex: Math.min(Math.floor(this.waypointIdx / 2) + 1, 3),
      subMissionTotal: 3,
      taskLabel: activeWp
        ? this.language === 'ru'
          ? activeWp.labelRu
          : activeWp.labelEn
        : this.language === 'ru'
          ? 'Маршрут завершён'
          : 'Course complete',
      taskDetail: '',
      modelCardNote: this.modelCardNote,
      activeDialogue: this.activeDialogue,
      checkpointFlash: this.checkpointFlash,
      bossPhase: this.bossPhase,
      bossName: this.sceneId === '1_7' ? (this.language === 'ru' ? 'СЕТ' : 'SET') : null,
      bossSilenceWindow: this.sceneId === '1_7' && this.bossPhase === 3,
      inThermal: false,
      nearAnomaly,
      nearPortal,
      offTrailWarning: this.sceneId === '1_5' && Math.abs(this.kinematics.pos.x) > 48,
      hostileAlert: this.sceneId === '1_6',
      canAdvanceScene: this.flightCompleted,
      flightRunId: this.flightRunId,
      cursorAimEnabled: this.cursorAimEnabled,
    });
  }

  private renderFrame(): void {
    const useComposer =
      this.composer &&
      !this.isSoftwareGl &&
      (this.quality === 'high' || this.quality === 'cinematic');

    if (useComposer && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('contextmenu', this.handleContextMenu);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.controls.removeEventListener('start', this.handleOrbitStart);
    this.controls.removeEventListener('end', this.handleOrbitEnd);
    this.controls.dispose();

    this.nature.dispose();
    this.arch.dispose();
    this.entities.dispose();
    this.mats.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
