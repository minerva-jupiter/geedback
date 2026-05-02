import "./style.css";
import init, { GeedbackProcessor } from "../geedback-dsp/pkg/geedback_dsp.js";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <div>
    <h1>Sensor WASM Synth</h1>
    <button id="start-btn">Start Audio & Sensors</button>
    <div style="margin-top: 20px; padding: 10px; border: 2px solid #646cff; border-radius: 8px;">
      <strong>WASM Output (DSP Value):</strong> <span id="wasm-output" style="font-family: monospace; font-size: 1.2em;">-</span>
    </div>
    <table border="1" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <thead>
        <tr><th>Category</th><th>Property</th><th>Value</th></tr>
      </thead>
      <tbody id="sensor-body">
        <tr><td rowspan="3">Acceleration</td><td>X</td><td id="acc-x">-</td></tr>
        <tr><td>Y</td><td id="acc-y">-</td></tr>
        <tr><td>Z</td><td id="acc-z">-</td></tr>
        <tr><td rowspan="3">Orientation</td><td>Alpha</td><td id="ori-a">-</td></tr>
        <tr><td>Beta</td><td id="ori-b">-</td></tr>
        <tr><td>Gamma</td><td id="ori-g">-</td></tr>
      </tbody>
    </table>
  </div>
`;

const startBtn = document.querySelector<HTMLButtonElement>("#start-btn")!;
const wasmOutput = document.querySelector<HTMLSpanElement>("#wasm-output")!;

let processor: GeedbackProcessor | null = null;
let audioCtx: AudioContext | null = null;

const updateValue = (id: string, value: number | null | undefined) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value?.toFixed(2) ?? "-";
};

const startAudio = async () => {
  // 1. Initialize WASM
  try {
    await init();
    processor = new GeedbackProcessor();
  } catch (e) {
    console.error(e);
    alert("WASM init failed");
    return;
  }

  // 2. Request Permissions (iOS)
  if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
    const res = await (DeviceMotionEvent as any).requestPermission();
    if (res !== "granted") return alert("Permission denied");
  }

  // 3. Setup Web Audio
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  processor.set_sample_rate(audioCtx.sampleRate);

  // Using ScriptProcessor for simplicity in this test
  const bufferSize = 4096;
  const scriptNode = audioCtx.createScriptProcessor(bufferSize, 0, 1);

  scriptNode.onaudioprocess = (audioEvent) => {
    const outputBuffer = audioEvent.outputBuffer.getChannelData(0);
    if (processor) {
      for (let i = 0; i < bufferSize; i++) {
        outputBuffer[i] = processor.process() * 0.2; // Volume control
      }
    }
  };

  scriptNode.connect(audioCtx.destination);
  if (audioCtx.state === "suspended") await audioCtx.resume();

  startBtn.disabled = true;
  startBtn.textContent = "Audio Active";

  // 4. Sensor Listeners
  window.addEventListener("devicemotion", (e) => {
    const acc = e.accelerationIncludingGravity;
    if (acc && processor) {
      updateValue("acc-x", acc.x);
      updateValue("acc-y", acc.y);
      updateValue("acc-z", acc.z);
      processor.set_accel(acc.x || 0, acc.y || 0, acc.z || 0);
    }
  });

  window.addEventListener("deviceorientation", (e) => {
    if (processor) {
      updateValue("ori-a", e.alpha);
      updateValue("ori-b", e.beta);
      updateValue("ori-g", e.gamma);
      processor.set_orient(e.alpha || 0, e.beta || 0, e.gamma || 0);
    }
  });

  // UI Update Loop
  const updateUI = () => {
    if (processor) {
      wasmOutput.textContent = processor.get_latest_output().toFixed(6);
    }
    requestAnimationFrame(updateUI);
  };
  updateUI();
};
startBtn.addEventListener("click", startAudio);
