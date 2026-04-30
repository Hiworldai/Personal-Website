<template>
  <section ref="rootRef" class="mouse-trail-effect">
    <canvas ref="canvasRef" class="trail-canvas" aria-hidden="true"></canvas>

    <div v-if="showCopy" class="trail-copy" :style="copyStyle">
      <slot>
        <div v-if="avatar" class="trail-avatar">
          <img v-if="avatarVisible" :src="avatar" alt="" @error="hideBrokenAvatar">
        </div>
        <h1 class="trail-title">
          <span class="trail-title-text">{{ title }}</span>
          <span class="trail-title-reflection" aria-hidden="true">{{ title }}</span>
        </h1>
        <p v-if="subtitle" class="trail-subtitle">{{ subtitle }}</p>
      </slot>
    </div>

    <button
      v-if="showScrollHint"
      class="trail-scroll-hint"
      type="button"
      aria-label="Scroll"
      @click="$emit('scrollHint')"
    >
      <span></span>
    </button>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: 'Hi,imchenkanghong'
  },
  subtitle: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  showScrollHint: {
    type: Boolean,
    default: true
  },
  showCopy: {
    type: Boolean,
    default: true
  },
  dissolveOnScroll: {
    type: Boolean,
    default: true
  },
  fadeDistance: {
    type: Number,
    default: 420
  },
  splatRadius: {
    type: Number,
    default: 0.0048
  },
  curl: {
    type: Number,
    default: 28
  }
});

defineEmits(['scrollHint']);

const rootRef = ref(null);
const canvasRef = ref(null);
const textOpacity = ref(1);
const avatarVisible = ref(true);

const copyStyle = computed(() => {
  const vanish = 1 - textOpacity.value;

  return {
    opacity: textOpacity.value,
    filter: `blur(${vanish * 5}px)`,
    transform: `translate3d(-50%, calc(-50% + ${vanish * -18}px), 0) scale(${1 - vanish * 0.04})`
  };
});

let gl;
let animationFrame = 0;
let textureWidth = 0;
let textureHeight = 0;
let ext;
let density;
let velocity;
let divergence;
let curlFbo;
let pressure;
let fallbackContext;
let fallbackPoints = [];
let fallbackLastTime = 0;
let fallbackAnimationFrame = 0;

const config = {
  textureDownsample: 1,
  densityDissipation: 0.982,
  velocityDissipation: 0.985,
  pressureDissipation: 0.8,
  pressureIterations: 24
};

const palette = [
  [0.02, 0.9, 1.0],
  [0.0, 0.62, 0.98],
  [0.1, 0.98, 0.86],
  [0.2, 0.76, 1.0]
];

const pointer = {
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
  moved: false,
  color: palette[0]
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hideBrokenAvatar = () => {
  avatarVisible.value = false;
};

const updateFade = () => {
  if (!props.showCopy) {
    textOpacity.value = 0;
    return;
  }

  if (!props.dissolveOnScroll) {
    textOpacity.value = 1;
    return;
  }

  textOpacity.value = clamp(1 - window.scrollY / props.fadeDistance, 0, 1);
};

const getCanvasPoint = (event) => {
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
};

const pickColor = (x, y) => {
  const index = Math.abs(Math.floor((x + y + performance.now() * 0.08) / 160)) % palette.length;
  return palette[index];
};

const movePointer = (clientX, clientY) => {
  const point = getCanvasPoint({ clientX, clientY });
  const dx = point.x - pointer.x;
  const dy = point.y - pointer.y;

  pointer.dx = dx * 8;
  pointer.dy = dy * 8;
  pointer.x = point.x;
  pointer.y = point.y;
  pointer.color = pickColor(point.x, point.y);
  pointer.moved = Math.abs(dx) + Math.abs(dy) > 0;

  if (fallbackContext) {
    fallbackPoints.push({
      x: point.x,
      y: point.y,
      radius: 72 + Math.min(Math.hypot(dx, dy) * 2, 110),
      life: 1,
      color: pointer.color
    });
  }
};

const handlePointerMove = (event) => {
  movePointer(event.clientX, event.clientY);
};

const handleTouchMove = (event) => {
  if (!event.touches.length) return;
  event.preventDefault();
  movePointer(event.touches[0].clientX, event.touches[0].clientY);
};

const handleResize = () => {
  resizeCanvas();
};

const compileShader = (type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || 'Shader compile failed');
  }

  return shader;
};

class GLProgram {
  constructor(vertexShader, fragmentShader) {
    this.uniforms = {};
    this.program = gl.createProgram();

    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.bindAttribLocation(this.program, 0, 'aPosition');
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(this.program) || 'Program link failed');
    }

    const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i += 1) {
      const uniformName = gl.getActiveUniform(this.program, i).name;
      this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName);
    }
  }

  bind() {
    gl.useProgram(this.program);
  }
}

const supportRenderTextureFormat = (internalFormat, format, type) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
};

const getSupportedFormat = (internalFormat, format, type) => {
  if (!supportRenderTextureFormat(internalFormat, format, type)) {
    if (internalFormat === gl.R16F) {
      return getSupportedFormat(gl.RG16F, gl.RG, type);
    }
    if (internalFormat === gl.RG16F) {
      return getSupportedFormat(gl.RGBA16F, gl.RGBA, type);
    }
    return null;
  }

  return { internalFormat, format };
};

const getWebGLContext = () => {
  const params = { alpha: false, depth: false, stencil: false, antialias: false };
  const canvas = canvasRef.value;
  let context = canvas.getContext('webgl2', params);
  const isWebGL2 = !!context;

  if (!isWebGL2) {
    context = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
  }

  if (!context) return null;

  gl = context;

  let halfFloat;
  let supportLinearFiltering;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float');
    supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
    if (!halfFloat) {
      gl = null;
      return null;
    }
  }

  const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
  const formatRGBA = isWebGL2
    ? getSupportedFormat(gl.RGBA16F, gl.RGBA, halfFloatTexType)
    : getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
  const formatRG = isWebGL2
    ? getSupportedFormat(gl.RG16F, gl.RG, halfFloatTexType)
    : getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
  const formatR = isWebGL2
    ? getSupportedFormat(gl.R16F, gl.RED, halfFloatTexType)
    : getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);

  if (!formatRGBA || !formatRG || !formatR) {
    gl = null;
    return null;
  }

  gl.clearColor(0, 0, 0, 1);

  return {
    formatRGBA,
    formatRG,
    formatR,
    halfFloatTexType,
    supportLinearFiltering
  };
};

const createFBO = (texId, width, height, internalFormat, format, type, param) => {
  gl.activeTexture(gl.TEXTURE0 + texId);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  return [texture, fbo, texId];
};

const createDoubleFBO = (texId, width, height, internalFormat, format, type, param) => {
  let fbo1 = createFBO(texId, width, height, internalFormat, format, type, param);
  let fbo2 = createFBO(texId + 1, width, height, internalFormat, format, type, param);

  return {
    get read() {
      return fbo1;
    },
    get write() {
      return fbo2;
    },
    swap() {
      const temp = fbo1;
      fbo1 = fbo2;
      fbo2 = temp;
    }
  };
};

const initFramebuffers = () => {
  textureWidth = Math.max(2, gl.drawingBufferWidth >> config.textureDownsample);
  textureHeight = Math.max(2, gl.drawingBufferHeight >> config.textureDownsample);

  const texType = ext.halfFloatTexType;
  const filter = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

  density = createDoubleFBO(2, textureWidth, textureHeight, ext.formatRGBA.internalFormat, ext.formatRGBA.format, texType, filter);
  velocity = createDoubleFBO(0, textureWidth, textureHeight, ext.formatRG.internalFormat, ext.formatRG.format, texType, filter);
  divergence = createFBO(4, textureWidth, textureHeight, ext.formatR.internalFormat, ext.formatR.format, texType, gl.NEAREST);
  curlFbo = createFBO(5, textureWidth, textureHeight, ext.formatR.internalFormat, ext.formatR.format, texType, gl.NEAREST);
  pressure = createDoubleFBO(6, textureWidth, textureHeight, ext.formatR.internalFormat, ext.formatR.format, texType, gl.NEAREST);
};

const resizeCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;

    if (gl) {
      gl.viewport(0, 0, width, height);
      initFramebuffers();
    }
  }
};

const startFallbackCanvas = () => {
  const canvas = canvasRef.value;
  fallbackContext = canvas.getContext('2d');
  if (!fallbackContext) return;

  resizeCanvas();

  const draw = (time) => {
    fallbackAnimationFrame = requestAnimationFrame(draw);
    const dt = Math.min((time - fallbackLastTime) / 1000 || 0.016, 0.032);
    fallbackLastTime = time;

    fallbackContext.globalCompositeOperation = 'source-over';
    fallbackContext.fillStyle = 'rgba(6, 8, 10, 0.08)';
    fallbackContext.fillRect(0, 0, canvas.width, canvas.height);
    fallbackContext.globalCompositeOperation = 'screen';
    fallbackContext.filter = 'blur(18px)';

    fallbackPoints = fallbackPoints.filter((point) => point.life > 0.02);
    fallbackPoints.forEach((point) => {
      point.life -= dt * 0.82;
      point.radius += dt * 30;
      const gradient = fallbackContext.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.radius);
      gradient.addColorStop(0, `rgba(${point.color[0] * 200}, ${point.color[1] * 200}, ${point.color[2] * 200}, ${point.life * 0.5})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      fallbackContext.fillStyle = gradient;
      fallbackContext.beginPath();
      fallbackContext.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      fallbackContext.fill();
    });
  };

  draw(performance.now());
};

const initFluid = () => {
  ext = getWebGLContext();
  if (!ext) {
    startFallbackCanvas();
    return;
  }

  const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`);

  const clearShader = compileShader(gl.FRAGMENT_SHADER, `
precision highp float;
precision mediump sampler2D;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float value;
void main () {
  gl_FragColor = value * texture2D(uTexture, vUv);
}`);

  const displayShader = compileShader(gl.FRAGMENT_SHADER, `
precision highp float;
precision mediump sampler2D;
varying vec2 vUv;
uniform sampler2D uTexture;
void main () {
  vec4 color = texture2D(uTexture, vUv);
  gl_FragColor = vec4(color.rgb, 1.0);
}`);

  const splatShader = compileShader(gl.FRAGMENT_SHADER, `
precision highp float;
precision mediump sampler2D;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}`);

  const advectionManualFilteringShader = compileShader(gl.FRAGMENT_SHADER, `
precision highp float;
precision mediump sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
vec4 bilerp (in sampler2D sam, in vec2 p) {
  vec4 st;
  st.xy = floor(p - 0.5) + 0.5;
  st.zw = st.xy + 1.0;
  vec4 uv = st * texelSize.xyxy;
  vec4 a = texture2D(sam, uv.xy);
  vec4 b = texture2D(sam, uv.zy);
  vec4 c = texture2D(sam, uv.xw);
  vec4 d = texture2D(sam, uv.zw);
  vec2 f = p - st.xy;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main () {
  vec2 coord = gl_FragCoord.xy - dt * texture2D(uVelocity, vUv).xy;
  gl_FragColor = dissipation * bilerp(uSource, coord);
  gl_FragColor.a = 1.0;
}`);

  const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
precision highp float;
precision mediump sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main () {
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  gl_FragColor = dissipation * texture2D(uSource, coord);
  gl_FragColor.a = 1.0;
}`);

  const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
precision highp float;
precision mediump sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
vec2 sampleVelocity (in vec2 uv) {
  vec2 multiplier = vec2(1.0, 1.0);
  if (uv.x < 0.0) { uv.x = 0.0; multiplier.x = -1.0; }
  if (uv.x > 1.0) { uv.x = 1.0; multiplier.x = -1.0; }
  if (uv.y < 0.0) { uv.y = 0.0; multiplier.y = -1.0; }
  if (uv.y > 1.0) { uv.y = 1.0; multiplier.y = -1.0; }
  return multiplier * texture2D(uVelocity, uv).xy;
}
void main () {
  float L = sampleVelocity(vL).x;
  float R = sampleVelocity(vR).x;
  float T = sampleVelocity(vT).y;
  float B = sampleVelocity(vB).y;
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}`);

  const curlShader = compileShader(gl.FRAGMENT_SHADER, `
precision highp float;
precision mediump sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(vorticity, 0.0, 0.0, 1.0);
}`);

  const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
precision highp float;
precision mediump sampler2D;
varying vec2 vUv;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = vec2(abs(T) - abs(B), 0.0);
  force *= 1.0 / length(force + 0.00001) * curl * C;
  vec2 vel = texture2D(uVelocity, vUv).xy;
  gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
}`);

  const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
precision highp float;
precision mediump sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
vec2 boundary (in vec2 uv) {
  uv = min(max(uv, 0.0), 1.0);
  return uv;
}
void main () {
  float L = texture2D(uPressure, boundary(vL)).x;
  float R = texture2D(uPressure, boundary(vR)).x;
  float T = texture2D(uPressure, boundary(vT)).x;
  float B = texture2D(uPressure, boundary(vB)).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`);

  const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
precision highp float;
precision mediump sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
vec2 boundary (in vec2 uv) {
  uv = min(max(uv, 0.0), 1.0);
  return uv;
}
void main () {
  float L = texture2D(uPressure, boundary(vL)).x;
  float R = texture2D(uPressure, boundary(vR)).x;
  float T = texture2D(uPressure, boundary(vT)).x;
  float B = texture2D(uPressure, boundary(vB)).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`);

  const clearProgram = new GLProgram(baseVertexShader, clearShader);
  const displayProgram = new GLProgram(baseVertexShader, displayShader);
  const splatProgram = new GLProgram(baseVertexShader, splatShader);
  const advectionProgram = new GLProgram(baseVertexShader, ext.supportLinearFiltering ? advectionShader : advectionManualFilteringShader);
  const divergenceProgram = new GLProgram(baseVertexShader, divergenceShader);
  const curlProgram = new GLProgram(baseVertexShader, curlShader);
  const vorticityProgram = new GLProgram(baseVertexShader, vorticityShader);
  const pressureProgram = new GLProgram(baseVertexShader, pressureShader);
  const gradientSubtractProgram = new GLProgram(baseVertexShader, gradientSubtractShader);

  const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    return (destination) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  })();

  const splat = (x, y, dx, dy, color) => {
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read[2]);
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvasRef.value.width / canvasRef.value.height);
    gl.uniform2f(splatProgram.uniforms.point, x / canvasRef.value.width, 1.0 - y / canvasRef.value.height);
    gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1.0);
    gl.uniform1f(splatProgram.uniforms.radius, props.splatRadius);
    blit(velocity.write[1]);
    velocity.swap();

    gl.uniform1i(splatProgram.uniforms.uTarget, density.read[2]);
    gl.uniform3f(splatProgram.uniforms.color, color[0] * 0.28, color[1] * 0.28, color[2] * 0.28);
    blit(density.write[1]);
    density.swap();
  };

  const multipleSplats = (amount) => {
    for (let i = 0; i < amount; i += 1) {
      const color = palette[i % palette.length];
      const x = canvasRef.value.width * (0.2 + Math.random() * 0.6);
      const y = canvasRef.value.height * (0.25 + Math.random() * 0.5);
      const dx = 700 * (Math.random() - 0.5);
      const dy = 700 * (Math.random() - 0.5);
      splat(x, y, dx, dy, color);
    }
  };

  resizeCanvas();
  multipleSplats(7);

  let lastTime = performance.now();
  const update = (time) => {
    animationFrame = requestAnimationFrame(update);
    resizeCanvas();

    const dt = Math.min((time - lastTime) / 1000, 0.016);
    lastTime = time;

    gl.viewport(0, 0, textureWidth, textureHeight);

    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2]);
    gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read[2]);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.velocityDissipation);
    blit(velocity.write[1]);
    velocity.swap();

    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read[2]);
    gl.uniform1i(advectionProgram.uniforms.uSource, density.read[2]);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.densityDissipation);
    blit(density.write[1]);
    density.swap();

    if (pointer.moved) {
      splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color);
      pointer.moved = false;
    }

    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read[2]);
    blit(curlFbo[1]);

    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read[2]);
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curlFbo[2]);
    gl.uniform1f(vorticityProgram.uniforms.curl, props.curl);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write[1]);
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read[2]);
    blit(divergence[1]);

    clearProgram.bind();
    const pressureTexId = pressure.read[2];
    gl.activeTexture(gl.TEXTURE0 + pressureTexId);
    gl.bindTexture(gl.TEXTURE_2D, pressure.read[0]);
    gl.uniform1i(clearProgram.uniforms.uTexture, pressureTexId);
    gl.uniform1f(clearProgram.uniforms.value, config.pressureDissipation);
    blit(pressure.write[1]);
    pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence[2]);
    gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read[2]);
    gl.activeTexture(gl.TEXTURE0 + pressure.read[2]);
    for (let i = 0; i < config.pressureIterations; i += 1) {
      gl.bindTexture(gl.TEXTURE_2D, pressure.read[0]);
      blit(pressure.write[1]);
      pressure.swap();
    }

    gradientSubtractProgram.bind();
    gl.uniform2f(gradientSubtractProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight);
    gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.read[2]);
    gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read[2]);
    blit(velocity.write[1]);
    velocity.swap();

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    displayProgram.bind();
    gl.uniform1i(displayProgram.uniforms.uTexture, density.read[2]);
    blit(null);
  };

  update(performance.now());
};

onMounted(() => {
  updateFade();
  initFluid();

  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', updateFade);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('scroll', updateFade);
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('touchmove', handleTouchMove);
  cancelAnimationFrame(animationFrame);
  cancelAnimationFrame(fallbackAnimationFrame);
});
</script>

<style scoped>
.mouse-trail-effect {
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 520px;
  overflow: hidden;
  background: #02070c;
  cursor: crosshair;
  isolation: isolate;
}

.trail-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.trail-copy {
  position: absolute;
  top: 56%;
  left: 50%;
  z-index: 1;
  width: min(86vw, 760px);
  color: #fff;
  text-align: center;
  pointer-events: none;
  transition: opacity 0.18s linear, filter 0.18s linear, transform 0.18s linear;
  will-change: opacity, filter, transform;
}

.trail-scroll-hint {
  position: absolute;
  bottom: 28px;
  left: 50%;
  z-index: 2;
  width: 24px;
  height: 38px;
  padding: 0;
  border: 2px solid rgba(205, 253, 255, 0.92);
  border-radius: 15px;
  background: transparent;
  transform: translateX(-50%);
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.trail-scroll-hint:hover {
  box-shadow: 0 0 20px rgba(41, 229, 255, 0.72);
}

.trail-scroll-hint span {
  position: absolute;
  top: 8px;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #d8feff;
  transform: translateX(-50%);
  animation: trail-scroll-dot 1s infinite;
}

@keyframes trail-scroll-dot {
  0% {
    top: 8px;
    opacity: 1;
  }
  100% {
    top: 25px;
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .mouse-trail-effect {
    min-height: 620px;
  }

  .trail-copy {
    top: 54%;
    width: min(90vw, 520px);
  }
}
</style>
