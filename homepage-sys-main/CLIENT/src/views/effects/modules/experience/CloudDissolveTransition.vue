<template>
  <div
    ref="hostRef"
    class="cloud-dissolve-transition"
    :class="{ 'is-active': isActive }"
    aria-hidden="true"
  >
    <canvas ref="canvasRef" class="cloud-dissolve-canvas"></canvas>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { journeyPanels, journeyScenes } from '../../content/experienceContent';

const props = defineProps({
  progress: {
    type: Number,
    default: 0
  }
});

const hostRef = ref(null);
const canvasRef = ref(null);
const isActive = computed(() => props.progress > 0.001 && props.progress < 0.999);
const outroCopy = journeyPanels[journeyPanels.length - 1];
const finalScene = journeyScenes[journeyScenes.length - 1];

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uSceneTexture;
uniform sampler2D uNoiseTexture;
uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform float uImageAspect;
uniform float uProgress;
uniform float uTime;

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 eased = local * local * (3.0 - 2.0 * local);
  float size = 256.0;
  float a = texture2D(uNoiseTexture, (cell + vec2(0.5, 0.5)) / size).r;
  float b = texture2D(uNoiseTexture, (cell + vec2(1.5, 0.5)) / size).r;
  float c = texture2D(uNoiseTexture, (cell + vec2(0.5, 1.5)) / size).r;
  float d = texture2D(uNoiseTexture, (cell + vec2(1.5, 1.5)) / size).r;
  return mix(mix(a, b, eased.x), mix(c, d, eased.x), eased.y);
}

float fbm(vec2 point, int detail) {
  float value = 0.0;
  float amplitude = 0.58;
  float weight = 0.0;

  for (int index = 0; index < 7; index++) {
    if (index >= detail) break;
    value += noise(point) * amplitude;
    weight += amplitude;
    point = mat2(0.82, -0.57, 0.57, 0.82) * point * 1.96 + 17.3;
    amplitude *= 0.58;
  }

  return value / max(weight, 0.001);
}

vec2 coverUv(vec2 uv) {
  float viewportAspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 covered = uv;

  if (viewportAspect > uImageAspect) {
    float scale = viewportAspect / uImageAspect;
    covered.y = (uv.y - 0.5) / scale + 0.5;
  } else {
    float scale = uImageAspect / viewportAspect;
    covered.x = (uv.x - 0.5) / scale + 0.5;
  }

  return covered;
}

void main() {
  vec2 uv = vUv;
  float progress = clamp(uProgress, 0.0, 1.0);
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
  float approach = smoothstep(0.0, 0.58, progress);
  float zoom = mix(1.0, 1.96, approach);
  vec2 sceneUv = coverUv(uv);
  vec2 focus = vec2(0.5, 0.58);
  sceneUv = (sceneUv - focus) / zoom + focus;

  vec3 base = texture2D(uSceneTexture, clamp(sceneUv, 0.001, 0.999)).rgb;
  float cloudEntry = smoothstep(0.025, 0.23, progress);
  float cloudDepth = smoothstep(0.08, 0.68, progress);
  float time = uTime * 0.08;

  vec2 farUv = centered * (0.92 + cloudDepth * 0.26)
    + vec2(time * 0.2, -cloudDepth * 0.22 - time * 0.12);
  vec2 middleUv = centered * (1.72 + cloudDepth * 0.54)
    + vec2(-time * 0.38 + cloudDepth * 0.08, -cloudDepth * 0.48 + time * 0.21);
  vec2 nearUv = centered * (2.72 + cloudDepth * 0.86)
    + vec2(time * 0.64 - cloudDepth * 0.12, -cloudDepth * 0.78 - time * 0.34);

  float farNoise = fbm(farUv + vec2(12.7, 31.8), 6);
  float middleNoise = fbm(middleUv + vec2(41.2, 8.6), 6);
  float nearNoise = fbm(nearUv + vec2(7.8, 54.1), 5);
  float centerFill = smoothstep(0.16, 0.5, cloudDepth);
  float spatialMask = mix(0.72 + farNoise * 0.28, 1.0, centerFill);
  float farCloud = smoothstep(0.31, 0.63, farNoise * 0.7 + middleNoise * 0.42);
  float middleCloud = smoothstep(0.38, 0.67, middleNoise * 0.64 + nearNoise * 0.46);
  float nearCloud = smoothstep(0.5, 0.73, nearNoise) * (0.76 + middleNoise * 0.24);
  float cloudMass = clamp(
    (farCloud * 0.9 + middleCloud * cloudDepth * 0.72) * spatialMask
      + nearCloud * cloudDepth * 0.44,
    0.0,
    1.0
  );

  vec2 skyUv = clamp(sceneUv + vec2(0.0, 0.16), 0.001, 0.999);
  vec3 sampledSky = texture2D(uSceneTexture, skyUv).rgb;
  vec3 localCloud = mix(base, sampledSky, 0.48);
  vec3 farCloudColor = localCloud * mix(vec3(0.94, 0.96, 1.0), vec3(0.69, 0.72, 0.8), cloudDepth);
  vec3 middleCloudColor = localCloud * mix(vec3(0.91, 0.93, 0.98), vec3(0.61, 0.64, 0.73), cloudDepth);
  vec3 nearCloudColor = mix(localCloud, base, 0.34) * mix(0.9, 0.64, cloudDepth);
  vec3 cloudColor = mix(farCloudColor, middleCloudColor, clamp(middleCloud + nearCloud * 0.5, 0.0, 1.0));

  vec3 color = mix(base, cloudColor, cloudMass * cloudEntry * 0.64);
  color = mix(color, color * color * (3.0 - 2.0 * color), cloudMass * cloudEntry * 0.1);

  vec4 textSample = texture2D(uTextTexture, uv);
  float textPresence = 1.0 - smoothstep(0.58, 0.78, progress);
  float textOcclusion = 1.0 - middleCloud * cloudDepth * 0.48 - nearCloud * 0.2;
  color = mix(color, textSample.rgb, textSample.a * textPresence * clamp(textOcclusion, 0.16, 1.0));
  color *= 1.0 - smoothstep(0.3, 0.78, progress) * 0.48;

  float pixelSize = mix(1.35, 2.35, smoothstep(0.34, 0.86, progress));
  vec2 pixelUv = (floor(uv * uResolution / pixelSize) + 0.5) * pixelSize / uResolution;
  float avatarTravel = smoothstep(0.52, 0.84, progress);
  vec2 avatarOrigin = vec2(0.5, mix(0.965, 0.74, avatarTravel));
  vec2 dissolvePoint = (pixelUv - avatarOrigin) * vec2(aspect, 1.0);
  float radialDistance = length(dissolvePoint);
  float coarseNoise = fbm(dissolvePoint * 3.8 + vec2(24.8, 11.4), 6);
  float detailNoise = fbm(dissolvePoint * 13.2 + vec2(3.6, 42.9), 4);
  float particleNoise = fbm(dissolvePoint * 31.0 + vec2(61.2, 4.8), 3);
  float erodedDistance = radialDistance
    + (coarseNoise - 0.5) * 0.34
    + (detailNoise - 0.5) * 0.072;

  float dissolve = smoothstep(0.43, 0.91, progress);
  float verticalReach = max(avatarOrigin.y, 1.0 - avatarOrigin.y);
  float farthestCorner = length(vec2(aspect * 0.5, verticalReach)) + 0.2;
  float waveRadius = mix(-0.18, farthestCorner, dissolve);
  float edgeSoftness = mix(0.018, 0.011, dissolve);
  float baseVisible = smoothstep(
    waveRadius - edgeSoftness,
    waveRadius + edgeSoftness,
    erodedDistance
  );

  float trailDistance = waveRadius - erodedDistance;
  float behindWave = smoothstep(0.008, 0.032, trailDistance);
  float shortTrail = 1.0 - smoothstep(0.065, 0.135, trailDistance);
  float fragmentShape = smoothstep(
    0.57,
    0.76,
    particleNoise * 0.68 + detailNoise * 0.22 + nearNoise * 0.1
  );
  float fragmentAlpha = behindWave * shortTrail * fragmentShape;
  float finalCleanup = 1.0 - smoothstep(0.9, 0.955, progress);
  fragmentAlpha *= finalCleanup;

  float alpha = max(baseVisible, fragmentAlpha * 0.82) * finalCleanup;
  vec3 fragmentColor = mix(middleCloudColor, nearCloudColor, particleNoise);
  color = mix(
    color,
    fragmentColor,
    fragmentAlpha * (1.0 - baseVisible) * 0.74
  );

  float vignette = 0.58 + 0.42 * pow(
    16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y),
    0.18
  );
  color *= vignette;
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
`;

let renderer;
let scene;
let camera;
let material;
let sceneTexture;
let noiseTexture;
let textTexture;
let resizeObserver;
let animationFrame = 0;
let startedAt = 0;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createNoiseTexture = () => {
  const size = 256;
  const data = new Uint8Array(size * size * 4);

  for (let index = 0; index < size * size; index += 1) {
    const value = Math.floor(Math.random() * 256);
    data[index * 4] = value;
    data[index * 4 + 1] = value;
    data[index * 4 + 2] = value;
    data[index * 4 + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

const fitFontSize = (context, text, maxWidth, initialSize, weight = 800) => {
  let size = initialSize;
  while (size > 16) {
    context.font = `${weight} ${size}px "Noto Sans SC", "Microsoft YaHei", sans-serif`;
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
};

const createTextTexture = (width, height) => {
  const drawingCanvas = document.createElement('canvas');
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  drawingCanvas.width = Math.max(1, Math.round(width * pixelRatio));
  drawingCanvas.height = Math.max(1, Math.round(height * pixelRatio));
  const context = drawingCanvas.getContext('2d');
  context.scale(pixelRatio, pixelRatio);
  context.clearRect(0, 0, width, height);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(212, 207, 235, 0.38)';
  context.shadowBlur = Math.max(8, width * 0.012);

  const maxWidth = Math.min(width * 0.78, 780);
  const titleSize = fitFontSize(context, outroCopy.title, maxWidth, clamp(width * 0.052, 34, 68), 900);
  const centerY = height * 0.55;
  context.fillStyle = 'rgba(255, 250, 246, 0.96)';
  context.font = `800 ${clamp(width * 0.011, 11, 15)}px Inter, sans-serif`;
  context.fillText(outroCopy.kicker.toUpperCase(), width * 0.5, centerY - titleSize * 0.92);
  context.font = `900 ${titleSize}px "Noto Sans SC", "Microsoft YaHei", sans-serif`;
  context.fillText(outroCopy.title, width * 0.5, centerY);
  context.fillStyle = 'rgba(247, 238, 232, 0.8)';
  context.font = `700 ${clamp(width * 0.016, 13, 18)}px "Noto Sans SC", "Microsoft YaHei", sans-serif`;
  context.fillText(outroCopy.body, width * 0.5, centerY + titleSize * 0.86);

  const texture = new THREE.CanvasTexture(drawingCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

const updateSize = () => {
  if (!renderer || !material || !hostRef.value) return;
  const rect = hostRef.value.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  renderer.setPixelRatio(Math.min((window.devicePixelRatio || 1) * 0.78, 1.12));
  renderer.setSize(width, height, false);
  material.uniforms.uResolution.value.set(width, height);
  textTexture?.dispose();
  textTexture = createTextTexture(width, height);
  material.uniforms.uTextTexture.value = textTexture;
};

const renderFrame = (time = performance.now()) => {
  if (!renderer || !material || !scene || !camera) return;
  material.uniforms.uProgress.value = props.progress;
  material.uniforms.uTime.value = (time - startedAt) * 0.001;
  renderer.render(scene, camera);
};

const animate = (time) => {
  animationFrame = 0;
  renderFrame(time);
  if (isActive.value && !document.hidden) {
    animationFrame = requestAnimationFrame(animate);
  }
};

const startAnimation = () => {
  if (animationFrame || !isActive.value || document.hidden) return;
  animationFrame = requestAnimationFrame(animate);
};

const stopAnimation = () => {
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
};

const init = async () => {
  if (!canvasRef.value || !hostRef.value) return;
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
    premultipliedAlpha: false
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  camera = new THREE.Camera();
  noiseTexture = createNoiseTexture();
  sceneTexture = await new THREE.TextureLoader().loadAsync(finalScene.image);
  sceneTexture.colorSpace = THREE.SRGBColorSpace;
  sceneTexture.minFilter = THREE.LinearFilter;
  sceneTexture.magFilter = THREE.LinearFilter;
  const imageWidth = sceneTexture.image?.naturalWidth || sceneTexture.image?.width || 1680;
  const imageHeight = sceneTexture.image?.naturalHeight || sceneTexture.image?.height || 924;

  material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uSceneTexture: { value: sceneTexture },
      uNoiseTexture: { value: noiseTexture },
      uTextTexture: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uImageAspect: { value: imageWidth / Math.max(imageHeight, 1) },
      uProgress: { value: props.progress },
      uTime: { value: 0 }
    }
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  startedAt = performance.now();
  await document.fonts?.ready;
  updateSize();
  renderFrame();

  resizeObserver = new ResizeObserver(updateSize);
  resizeObserver.observe(hostRef.value);
  startAnimation();
};

watch(() => props.progress, () => {
  renderFrame();
  if (isActive.value) startAnimation();
  else stopAnimation();
});

onMounted(() => {
  init().catch((error) => {
    console.warn('Cloud dissolve transition failed to initialize:', error);
  });
});

onBeforeUnmount(() => {
  stopAnimation();
  resizeObserver?.disconnect();
  sceneTexture?.dispose();
  noiseTexture?.dispose();
  textTexture?.dispose();
  material?.dispose();
  scene?.traverse((object) => object.geometry?.dispose?.());
  renderer?.dispose();
});
</script>

<style scoped>
.cloud-dissolve-transition {
  position: fixed;
  inset: 0;
  z-index: 30;
  width: 100%;
  height: 100svh;
  visibility: hidden;
  pointer-events: none;
  opacity: 0;
}

.cloud-dissolve-transition.is-active {
  visibility: visible;
  opacity: 1;
}

.cloud-dissolve-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .cloud-dissolve-transition {
    display: none;
  }
}
</style>
