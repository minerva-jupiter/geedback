import "./style.css";
import init, {
  GeedbackProcessor,
  Waveform,
} from "../geedback-dsp/pkg/geedback_dsp.js";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <div>
    <h1>Multi-Osc WASM Synth</h1>
    <button id="start-btn">Start Audio & Sensors</button>

    <canvas id="kaoss-pad"></canvas>

    <div style="margin-top: 20px; padding: 15px; border: 2px solid #ff4444; border-radius: 8px; background: #1a1a1a;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <strong>DSP Output:</strong> <span id="wasm-output" style="font-family: monospace;">-</span>
      </div>
      <div style="font-size: 0.8em; color: #888; margin-bottom: 10px;">
        Cutoff (X): <span id="touch-x">-</span> | Resonance (Y): <span id="touch-y">-</span>
      </div>

      <div class="osc-controls">
        ${[0, 1, 2]
          .map(
            (i) => `
          <div style="margin-bottom: 8px;">
            <label>Osc ${i + 1} Wave:</label>
            <select id="osc-${i}-wave" class="wave-select">
              <option value="Sine">Sine</option>
              <option value="Triangle">Triangle</option>
              <option value="TriangleSawtooth">Tri-Saw</option>
              <option value="Sawtooth">Sawtooth</option>
              <option value="ReverseSawtooth">Rev-Saw</option>
              <option value="Square">Square</option>
              <option value="WidePulse">Wide Pulse</option>
              <option value="NarrowPulse">Narrow Pulse</option>
            </select>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>

    <table border="1" style="margin-top: 20px; width: 100%; border-collapse: collapse; font-size: 0.8em; opacity: 0.7;">
      <tbody id="sensor-table">
        <tr id="row-accel"><td>Accel</td><td class="x">-</td><td class="y">-</td><td class="z">-</td></tr>
        <tr id="row-linear"><td>Linear</td><td class="x">-</td><td class="y">-</td><td class="z">-</td></tr>
        <tr id="row-orient"><td>Orient</td><td class="x">-</td><td class="y">-</td><td class="z">-</td></tr>
      </tbody>
    </table>
  </div>
`;

const startBtn = document.querySelector<HTMLButtonElement>("#start-btn")!;
const wasmOutput = document.querySelector<HTMLSpanElement>("#wasm-output")!;
const canvas = document.querySelector<HTMLCanvasElement>("#kaoss-pad")!;
const touchXEl = document.querySelector<HTMLSpanElement>("#touch-x")!;
const touchYEl = document.querySelector<HTMLSpanElement>("#touch-y")!;

let processor: GeedbackProcessor | null = null;
let audioCtx: AudioContext | null = null;
let isActive = false;
let wasmInitialized = false;

const updateRow = (
  id: string,
  x: number | null,
  y?: number | null,
  z?: number | null,
) => {
  const row = document.getElementById(id);
  if (!row) return;
  if (x !== null)
    (row.querySelector(".x") as HTMLElement).textContent = x.toFixed(2);
  if (y !== undefined && y !== null)
    (row.querySelector(".y") as HTMLElement).textContent = y.toFixed(2);
  if (z !== undefined && z !== null)
    (row.querySelector(".z") as HTMLElement).textContent = z.toFixed(2);
};

const setupWaveformControls = () => {
  [0, 1, 2].forEach((i) => {
    const select = document.getElementById(
      `osc-${i}-wave`,
    ) as HTMLSelectElement;
    select.addEventListener("change", (e) => {
      if (processor) {
        const val = (e.target as HTMLSelectElement).value;
        processor.set_waveform(i, (Waveform as any)[val]);
      }
    });
    if (i === 0) select.value = "Sine";
    if (i === 1) select.value = "Sine";
    if (i === 2) select.value = "Sine";
  });
};

const drawPad = (x: number, y: number) => {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo((i * canvas.width) / 4, 0);
    ctx.lineTo((i * canvas.width) / 4, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (i * canvas.height) / 4);
    ctx.lineTo(canvas.width, (i * canvas.height) / 4);
    ctx.stroke();
  }

  // Touch point - RED
  ctx.fillStyle = "#ff4444";
  ctx.beginPath();
  ctx.arc(x * canvas.width, y * canvas.height, 10, 0, Math.PI * 2);
  ctx.fill();

  // Crosshair - RED
  ctx.strokeStyle = "#ff4444";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x * canvas.width, 0);
  ctx.lineTo(x * canvas.width, canvas.height);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, y * canvas.height);
  ctx.lineTo(canvas.width, y * canvas.height);
  ctx.stroke();
};

const setupKaossPad = () => {
  let isTouching = false;

  const updateTouch = (e: MouseEvent | TouchEvent) => {
    if (!isActive) return;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    if (processor) {
      processor.set_touch(clampedX, clampedY);
    }

    touchXEl.textContent = clampedX.toFixed(2);
    touchYEl.textContent = clampedY.toFixed(2);

    drawPad(clampedX, clampedY);
  };

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  drawPad(0.5, 0.5);

  canvas.addEventListener("mousedown", (e) => {
    isTouching = true;
    updateTouch(e);
  });
  window.addEventListener("mousemove", (e) => {
    if (isTouching) updateTouch(e);
  });
  window.addEventListener("mouseup", () => {
    isTouching = false;
  });

  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (e.target === canvas) {
        isTouching = true;
        updateTouch(e);
        e.preventDefault();
      }
    },
    { passive: false },
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (isTouching) {
        updateTouch(e);
        e.preventDefault();
      }
    },
    { passive: false },
  );
  window.addEventListener("touchend", () => {
    isTouching = false;
  });
};

const startSynth = async () => {
  if (!wasmInitialized) {
    try {
      await init();
      wasmInitialized = true;
      processor = new GeedbackProcessor();
      setupWaveformControls();
      setupKaossPad();
    } catch (e) {
      alert("WASM failed");
      return;
    }
  }

  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (processor) processor.set_sample_rate(audioCtx.sampleRate);

  const scriptNode = audioCtx.createScriptProcessor(4096, 0, 1);
  scriptNode.onaudioprocess = (e) => {
    const out = e.outputBuffer.getChannelData(0);
    if (processor && isActive) {
      for (let i = 0; i < out.length; i++) out[i] = processor.process();
    } else {
      for (let i = 0; i < out.length; i++) out[i] = 0;
    }
  };
  scriptNode.connect(audioCtx.destination);
  if (audioCtx.state === "suspended") await audioCtx.resume();

  // Sensor Permissions (iOS)
  if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
    await (DeviceMotionEvent as any).requestPermission();
  }

  isActive = true;
  startBtn.textContent = "Stop Audio & Sensors";
  startBtn.classList.add("active");
};

const stopSynth = async () => {
  isActive = false;
  if (audioCtx) {
    await audioCtx.close();
    audioCtx = null;
  }
  startBtn.textContent = "Start Audio & Sensors";
  startBtn.classList.remove("active");
};

startBtn.addEventListener("click", () => {
  if (!isActive) {
    startSynth();
  } else {
    stopSynth();
  }
});

// Setup global event listeners once
window.addEventListener("devicemotion", (e) => {
  if (!isActive || !processor) return;
  const la = e.acceleration;
  if (la) {
    processor.set_linear_accel(la.x || 0, la.y || 0, la.z || 0);
    updateRow("row-linear", la.x, la.y, la.z);
  }
  const a = e.accelerationIncludingGravity;
  if (a) updateRow("row-accel", a.x, a.y, a.z);
});

window.addEventListener("deviceorientation", (e) => {
  if (!isActive || !processor) return;
  processor.set_orient(e.alpha || 0, e.beta || 0, e.gamma || 0);
  updateRow("row-orient", e.alpha, e.beta, e.gamma);
});

const uiLoop = () => {
  if (processor && isActive)
    wasmOutput.textContent = processor.get_latest_output().toFixed(6);
  requestAnimationFrame(uiLoop);
};
uiLoop();
