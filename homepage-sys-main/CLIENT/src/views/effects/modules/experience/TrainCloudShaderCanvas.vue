<template>
  <canvas ref="canvasRef" class="train-cloud-shader-canvas"></canvas>
</template>

<script setup>
import * as THREE from 'three';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  scenes: {
    type: Array,
    required: true
  },
  progress: {
    type: Number,
    default: 0
  },
  intensity: {
    type: Number,
    default: 0.82
  },
  cloudSpeed: {
    type: Number,
    default: 0.72
  },
  smokeSpeed: {
    type: Number,
    default: 0.58
  },
  warmth: {
    type: Number,
    default: 0.35
  },
  reducedMotion: {
    type: Boolean,
    default: false
  }
});

const canvasRef = ref(null);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const sceneCount = computed(() => Math.max(props.scenes.length, 1));

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;

varying vec2 vUv;

uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D uSceneTexture;
uniform sampler2D uNextSceneTexture;
uniform sampler2D uNoiseTexture;
uniform float uSceneMix;
uniform float uIntensity;
uniform float uCloudSpeed;
uniform float uSmokeSpeed;
uniform float uWarmth;
uniform float uSceneIndex;
uniform float uScenePosition;
uniform vec2 uMouse;
uniform float uImageAspect;

float noise(vec2 x) {
  vec2 f = fract(x);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 p = floor(x);
  float size = 256.0;
  float a = texture2D(uNoiseTexture, (p + vec2(0.0, 0.0)) / size).x;
  float b = texture2D(uNoiseTexture, (p + vec2(1.0, 0.0)) / size).x;
  float c = texture2D(uNoiseTexture, (p + vec2(0.0, 1.0)) / size).x;
  float d = texture2D(uNoiseTexture, (p + vec2(1.0, 1.0)) / size).x;

  return a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;
}

float fbm(vec2 x, int detail) {
  float a = 0.0;
  float b = 1.0;
  float t = 0.0;

  for (int i = 0; i < 8; i++) {
    if (i >= detail) break;
    float n = noise(x);
    a += b * n;
    t += b;
    b *= 0.66;
    x = mat2(0.82, -0.58, 0.58, 0.82) * x * 2.02 + 11.7;
  }

  return a / max(t, 0.001);
}

float fbmSoft(vec2 x, int detail) {
  float a = 0.0;
  float b = 1.0;
  float t = 0.0;

  for (int i = 0; i < 7; i++) {
    if (i >= detail) break;
    float n = noise(x);
    a += b * n;
    t += b;
    b *= 0.82;
    x = x * 1.86 + 9.4;
  }

  return a / max(t, 0.001);
}

vec2 coverUv(vec2 uv) {
  float screenAspect = iResolution.x / max(iResolution.y, 1.0);
  vec2 covered = uv;

  if (screenAspect > uImageAspect) {
    float scale = screenAspect / uImageAspect;
    covered.y = (uv.y - 0.5) / scale + 0.5;
  } else {
    float scale = uImageAspect / screenAspect;
    covered.x = (uv.x - 0.5) / scale + 0.5;
  }

  return covered;
}

vec3 sceneColor(vec2 uv) {
  vec3 currentScene = texture2D(uSceneTexture, uv).rgb;
  vec3 nextScene = texture2D(uNextSceneTexture, uv).rgb;
  return mix(currentScene, nextScene, smoothstep(0.0, 1.0, uSceneMix));
}

vec3 cloudPalette(float warmth) {
  vec3 morning = vec3(0.92, 0.78, 1.0);
  vec3 noon = vec3(0.74, 0.88, 1.0);
  vec3 sunset = vec3(1.0, 0.54, 0.34);
  return mix(mix(morning, noon, smoothstep(0.18, 0.48, warmth)), sunset, smoothstep(0.48, 1.0, warmth));
}

vec4 morningFogComposite(vec2 uv, vec2 sceneUv) {
  vec2 mouse = (uMouse - 0.5) * 2.0;
  float time = iTime * uCloudSpeed;
  vec3 base = sceneColor(sceneUv);

  vec2 fogDirection = uSceneIndex < 0.5
    ? normalize(vec2(0.78, -0.42))
    : normalize(vec2(1.0, -0.08));
  vec2 fogNormal = vec2(-fogDirection.y, fogDirection.x);
  vec2 flowUv = vec2(dot(uv, fogDirection), dot(uv, fogNormal));
  flowUv += vec2(time * 0.055, sin(time * 0.18) * 0.035) + mouse * vec2(0.035, 0.015);

  float broadFog = fbmSoft(flowUv * vec2(2.1, 0.9) + vec2(19.0, 3.0), 7);
  float ribbonFog = fbm(flowUv * vec2(6.5, 1.7) + vec2(-time * 0.24, time * 0.08), 6);
  float directionFog = fbmSoft(flowUv * vec2(1.35, 8.0) + vec2(time * 0.11, 31.0), 6);
  directionFog = smoothstep(0.38, 0.78, directionFog);
  float lowMist = smoothstep(0.42, 0.06, uv.y) * 0.42;
  float edgeMist = smoothstep(0.1, 0.82, length((uv - 0.5) * vec2(0.96, 0.72))) * 0.18;
  float fog = smoothstep(0.32, 0.78, broadFog * 0.72 + ribbonFog * 0.36);
  fog = clamp(fog * 0.26 + directionFog * 0.28 + lowMist + edgeMist, 0.0, 0.62);

  vec3 fogColor = uSceneIndex < 0.5
    ? vec3(0.94, 0.88, 1.0)
    : vec3(1.0, 0.88, 0.78);
  vec3 color = mix(base, fogColor, fog * uIntensity);
  color += fogColor * fog * 0.08;

  return vec4(color, 1.0);
}

vec4 summerHeatComposite(vec2 uv, vec2 sceneUv) {
  vec2 mouse = (uMouse - 0.5) * 2.0;
  float time = iTime * max(uCloudSpeed, 0.1);
  float heatMask = smoothstep(0.08, 0.28, uv.y) * (1.0 - smoothstep(0.84, 1.0, uv.y));
  float skyMask = smoothstep(0.42, 0.62, uv.y) * (1.0 - smoothstep(0.94, 1.0, uv.y));
  float horizonMask = smoothstep(0.2, 0.36, uv.y) * (1.0 - smoothstep(0.55, 0.76, uv.y));
  vec2 flowUv = uv * vec2(1.22, 0.86)
    + vec2(time * 0.009, -time * 0.012)
    + mouse * vec2(0.01, 0.004);

  float broadSteam = fbmSoft(flowUv + vec2(37.0, 12.0), 5);
  float softBands = fbmSoft(vec2(uv.x * 1.45 + time * 0.016, uv.y * 4.8 - time * 0.045), 5);
  float risingVeil = smoothstep(0.46, 0.84, broadSteam * 0.68 + softBands * 0.32) * heatMask;
  float slowRipple = sin(uv.y * 15.0 + time * 0.42 + broadSteam * 1.4);
  vec2 skyWarp = vec2(
    (broadSteam - 0.5) * 0.0022 + slowRipple * 0.0009,
    0.0
  ) * skyMask * uIntensity;
  vec2 horizonWarp = vec2(
    (softBands - 0.5) * 0.0016,
    0.0
  ) * horizonMask * uIntensity;
  vec2 warpedSceneUv = clamp(sceneUv + skyWarp + horizonWarp, 0.001, 0.999);
  float lowGlow = smoothstep(0.2, 0.72, uv.y) * 0.04 * uIntensity;

  vec3 base = sceneColor(warpedSceneUv);
  vec3 warmth = vec3(1.0, 0.9, 0.68);
  vec3 softened = mix(base, vec3(dot(base, vec3(0.299, 0.587, 0.114))), risingVeil * 0.025);
  vec3 color = mix(softened, warmth, risingVeil * 0.14 * uIntensity);
  color += warmth * (risingVeil * 0.05 + lowGlow);

  return vec4(color, 1.0);
}

vec4 trainCloudComposite(vec2 uv, vec2 sceneUv) {
  vec3 base = sceneColor(sceneUv);
  vec3 fog = morningFogComposite(uv, sceneUv).rgb;
  vec3 heat = summerHeatComposite(uv, sceneUv).rgb;
  float fogPresence = 1.0 - smoothstep(1.18, 1.72, uScenePosition);
  float heatIn = smoothstep(1.92, 2.08, uScenePosition);
  float heatOut = 1.0 - smoothstep(2.6, 2.9, uScenePosition);
  float heatPresence = heatIn * heatOut;
  vec3 color = mix(base, fog, fogPresence);
  color = mix(color, heat, heatPresence);
  return vec4(color, 1.0);
}

vec3 postProcess(vec3 col, vec2 uv) {
  float vignette = 0.5 + 0.5 * pow(16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y), 0.2);
  col *= vignette;
  col = pow(max(col, 0.0), vec3(0.92));
  return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 sceneUv = coverUv(uv);
  vec4 composed = trainCloudComposite(uv, sceneUv);
  vec3 color = postProcess(composed.rgb, uv);
  fragColor = vec4(color, 1.0);
}

void main() {
  mainImage(gl_FragColor, vUv * iResolution.xy);
}
`;

let renderer;
let scene;
let camera;
let material;
let animationFrame = 0;
let startTime = 0;
let resizeObserver;
let intersectionObserver;
let isVisible = true;
let textures = [];
let noiseTexture;
let lastRenderTime = 0;
let isMounted = false;
const mouse = { x: 0.5, y: 0.5 };
const mouseTarget = { x: 0.5, y: 0.5 };
const easeInOut = (value) => (value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2);

const getSceneState = () => {
  const scaled = clamp(props.progress, 0, 1) * Math.max(sceneCount.value - 1, 0);
  const index = Math.min(Math.floor(scaled), sceneCount.value - 1);
  const nextIndex = Math.min(index + 1, sceneCount.value - 1);
  const localProgress = scaled - index;
  const transition = index >= sceneCount.value - 1
    ? 0
    : clamp((localProgress - 0.62) / 0.38, 0, 1);

  return {
    index,
    nextIndex,
    mix: easeInOut(transition),
    position: scaled
  };
};

const updateSceneUniforms = () => {
  if (!material || !textures.length) return;

  const state = getSceneState();
  material.uniforms.uSceneTexture.value = textures[state.index] || textures[0];
  material.uniforms.uNextSceneTexture.value = textures[state.nextIndex] || textures[state.index] || textures[0];
  material.uniforms.uSceneMix.value = state.mix;
  material.uniforms.uIntensity.value = props.intensity;
  material.uniforms.uCloudSpeed.value = props.cloudSpeed;
  material.uniforms.uSmokeSpeed.value = props.smokeSpeed;
  material.uniforms.uWarmth.value = props.warmth;
  material.uniforms.uSceneIndex.value = state.index;
  material.uniforms.uScenePosition.value = state.position;
};

const updateSize = () => {
  if (!renderer || !material || !canvasRef.value) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const pixelRatio = Math.min((window.devicePixelRatio || 1) * 0.78, 1.08);

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  material.uniforms.iResolution.value.set(width, height);
};

const getFrameInterval = () => {
  if (props.reducedMotion) return Number.POSITIVE_INFINITY;

  const state = getSceneState();
  return state.index === 2 ? 1000 / 24 : 1000 / 30;
};

const renderFrame = (now = performance.now()) => {
  if (!renderer || !scene || !camera || !material) return;

  mouse.x += (mouseTarget.x - mouse.x) * 0.055;
  mouse.y += (mouseTarget.y - mouse.y) * 0.055;
  material.uniforms.iTime.value = props.reducedMotion ? 0 : (now - startTime) * 0.001;
  material.uniforms.uMouse.value.set(mouse.x, mouse.y);
  updateSceneUniforms();
  renderer.render(scene, camera);
};

const animate = (now = performance.now()) => {
  const frameInterval = getFrameInterval();
  if (!lastRenderTime || now - lastRenderTime >= frameInterval) {
    renderFrame(now);
    lastRenderTime = now;
  }

  if (isVisible && !props.reducedMotion) {
    animationFrame = requestAnimationFrame(animate);
  } else {
    animationFrame = 0;
  }
};

const startAnimation = () => {
  if (animationFrame || !renderer || !isVisible || document.hidden) return;

  if (props.reducedMotion) {
    renderFrame();
    return;
  }

  animationFrame = requestAnimationFrame(animate);
};

const stopAnimation = () => {
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
};

const handlePointerMove = (event) => {
  if (props.reducedMotion || !canvasRef.value) return;

  mouseTarget.x = clamp(event.clientX / Math.max(window.innerWidth, 1), 0, 1);
  mouseTarget.y = clamp(1 - (event.clientY / Math.max(window.innerHeight, 1)), 0, 1);
};

const createNoiseTexture = () => {
  const size = 256;
  const data = new Uint8Array(size * size * 4);

  for (let i = 0; i < size * size; i++) {
    const value = Math.floor(Math.random() * 255);
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

const prepareSceneTexture = (loader, image) => {
  const texture = loader.load(
    image,
    undefined,
    undefined,
    (error) => {
      console.warn(`Train cloud texture failed to load: ${image}`, error);
    }
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

const loadFirstSceneTexture = (loader, image) => new Promise((resolve, reject) => {
  loader.load(
    image,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      resolve(texture);
    },
    undefined,
    reject
  );
});

const initScene = async () => {
  if (!canvasRef.value || renderer || !props.scenes.length) return;

  const loader = new THREE.TextureLoader();
  const [firstScene, ...remainingScenes] = props.scenes;
  const firstTexture = await loadFirstSceneTexture(loader, firstScene.image);
  textures = [
    firstTexture,
    ...remainingScenes.map((item) => prepareSceneTexture(loader, item.image))
  ];
  noiseTexture = createNoiseTexture();

  if (!isMounted || !canvasRef.value) {
    textures.forEach((texture) => texture.dispose());
    noiseTexture.dispose();
    return;
  }

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    alpha: true,
    antialias: false,
    desynchronized: true,
    powerPreference: 'high-performance'
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(1, 1) },
      uSceneTexture: { value: textures[0] },
      uNextSceneTexture: { value: textures[0] },
      uNoiseTexture: { value: noiseTexture },
      uIntensity: { value: props.intensity },
      uCloudSpeed: { value: props.cloudSpeed },
      uSmokeSpeed: { value: props.smokeSpeed },
      uWarmth: { value: props.warmth },
      uSceneIndex: { value: 0 },
      uScenePosition: { value: 0 },
      uSceneMix: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uImageAspect: { value: 1680 / 924 }
    }
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  updateSize();
  updateSceneUniforms();
  startTime = performance.now();
  startAnimation();

  resizeObserver = new ResizeObserver(updateSize);
  resizeObserver.observe(canvasRef.value);

  intersectionObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible) {
      startAnimation();
    } else {
      stopAnimation();
    }
  }, { threshold: 0.01 });
  intersectionObserver.observe(canvasRef.value);
};

const disposeScene = () => {
  stopAnimation();
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();

  textures.forEach((texture) => texture.dispose());
  textures = [];
  noiseTexture?.dispose();
  noiseTexture = undefined;
  material?.dispose();
  scene?.traverse((item) => {
    item.geometry?.dispose?.();
  });
  renderer?.dispose();

  renderer = undefined;
  scene = undefined;
  camera = undefined;
  material = undefined;
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    stopAnimation();
  } else if (isVisible) {
    lastRenderTime = 0;
    startAnimation();
  }
};

watch(() => [
  props.progress,
  props.intensity,
  props.cloudSpeed,
  props.smokeSpeed,
  props.warmth,
  props.reducedMotion
], () => {
  updateSceneUniforms();

  if (props.reducedMotion) {
    stopAnimation();
    renderFrame();
    return;
  }

  if (isVisible) {
    startAnimation();
  }
});

onMounted(() => {
  isMounted = true;
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);
  initScene().catch((error) => {
    console.warn('Train cloud shader failed to initialize:', error);
  });
});

onBeforeUnmount(() => {
  isMounted = false;
  window.removeEventListener('pointermove', handlePointerMove);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  disposeScene();
});
</script>

<style scoped>
.train-cloud-shader-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
</style>
