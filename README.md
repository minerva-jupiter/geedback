# Geedback

A real-time sensor-driven WASM DSP synthesizer.

## Design Philosophy & Direction

### 1. WASM-Centric DSP
All core signal processing is implemented in Rust/WASM for high performance and portability. The project follows a stateful processor pattern, designed for future integration with frameworks like **NIH-plug**.

### 2. Physical State Modeling
Sensor data is interpreted as physical forces:
- **Orientation (Tilt)**: Static position in 3D space.
- **Linear Acceleration (Force)**: Dynamic impact and rapid movement.

### 3. Seamless 2D Trigonometric Mapping
To ensure unique parameter states and perfectly smooth 360-degree rotation:
- **$\sin(\theta/2) \to$ Pitch**: Spread over a 360-degree period to prevent half-turn repetition.
- **$\cos(\theta/2) \to$ Waveform Morphing**: Ensures every angle has a unique "Timbre," even when pitches match.

### 4. Organic Parameter Smoothing
Internal Low-Pass Filters (LPF) with a high coefficient (**0.9995**) eliminate "zipper noise" from 60Hz sensor updates, creating a creamy, instrument-like feel with physical inertia.

---

## Detailed Specifications

### 1. Synthesis Engine
- **3-Oscillator Architecture**: Each oscillator has independent phase and selectable waveforms.
- **Available Waveforms**: Sine, Triangle, Triangle-Sawtooth, Sawtooth, Reverse Sawtooth, Square, Wide Pulse, Narrow Pulse.
- **FM Modulation**: Each carrier oscillator is frequency-modulated by a dedicated modulator, driven by dynamic physical forces.

### 2. Motion Mapping (Orientation & Acceleration)
| Input Axis | Target Oscillator | Static Control ($\sin/\cos$) | Dynamic Control (Linear Accel) |
| :--- | :--- | :--- | :--- |
| **Gamma (Y)** | Oscillator 1 | Pitch & Waveform Morph | FM Modulation Depth |
| **Alpha (Z)** | Oscillator 2 | Pitch & Waveform Morph | FM Modulation Depth |
| **Beta (X)**  | Oscillator 3 | Pitch & Waveform Morph | FM Modulation Depth |

- **Waveform Morphing Examples**:
  - Pulse Waves: Modulates Pulse Width (2% to 50%).
  - Triangle-Sawtooth: Modulates the blend ratio.
  - Sine: Adds subtle saturation/harmonics.

### 3. Kaoss Pad (Global Filter)
- **UI**: A red crosshair square canvas with scroll-safe touch handling.
- **Algorithm**: High-quality Global Biquad Low-Pass Filter (LPF).
- **Control Mapping**:
  - **X-axis**: Cutoff Frequency (**100Hz to 18kHz**, exponential scale).
  - **Y-axis**: Resonance / Q (**0.707 to 15.0**).
- **Stability**: Includes a safety clamp at **0.45 * Sample Rate** to prevent NaN/mathematical explosion at high cutoff frequencies.

### 4. Technical Integration
- **Web Audio API**: Real-time streaming via `ScriptProcessorNode`.
- **Permission Handling**: Integrated iOS `DeviceMotionEvent.requestPermission` flow.
- **Build System**: Automated `wasm-pack workflow targeting standard browser environments.

---

## 🤖 Message for Future Coding Agents

### Technical Handoff Notes
When continuing development on Geedback, please adhere to the following architectural constraints:

1.  **Stateful Processor**: Keep `GeedbackProcessor` stateful. It is designed to mimic the `process()` loop of standard audio plugins. Avoid adding global static state; encapsulate everything within the struct to facilitate future **NIH-plug** porting.
2.  **The "Zipper Noise" Battle**: Sensor updates from browsers are slow (~60Hz). Always use the internal LPF (**`0.9995` coefficient**) for any parameter driven by sensors. Never map raw sensor values directly to audio parameters.
3.  **Trigonometric Periodicity**: Use `theta / 2.0` before calculating `sin/cos` for orientation. This is a deliberate choice to spread a full oscillator cycle across a **360-degree** physical turn, preventing the pitch from repeating every half-turn.
4.  **Filter Stability**: The Biquad implementation is sensitive to the Nyquist frequency. **Always clamp** the cutoff frequency to below `0.45 * sample_rate`. If you implement other filter types (High-Pass, Band-Pass), apply similar safety guards to prevent NaN explosions.
5.  **2D Mapping Integrity**: Maintain the `sin` (Pitch) and `cos` (Timbre) coupling. This is the primary solution to "data collapse" where multiple orientations would otherwise yield the same sound.

### Future Roadmap Ideas
- Implement an ADSR envelope triggered by sharp Linear Acceleration spikes.
- Add a "Delay" or "Reverb" module, potentially controlled by the Z-axis (Alpha) or Magnetometer (if available).
- Port the current `GeedbackProcessor` logic into a Rust-native audio plugin using NIH-plug.
