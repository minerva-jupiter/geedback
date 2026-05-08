use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(PartialEq, Clone, Copy)]
pub enum Waveform {
    Sine,
    Triangle,
    TriangleSawtooth,
    Sawtooth,
    ReverseSawtooth,
    Square,
    WidePulse,
    NarrowPulse,
}

#[wasm_bindgen]
pub struct GeedbackProcessor {
    // Primary inputs
    orient_a: f64, // Z (Alpha)
    orient_b: f64, // X (Beta)
    orient_g: f64, // Y (Gamma)
    linear_accel_x: f64,
    linear_accel_y: f64,
    linear_accel_z: f64,

    // Touch inputs (Kaoss Pad)
    touch_x: f64,
    touch_y: f64,

    // Smoothed parameters for all 3 axes (sin/cos pairs)
    s_a_sin: f64,
    s_a_cos: f64,
    s_b_sin: f64,
    s_b_cos: f64,
    s_g_sin: f64,
    s_g_cos: f64,

    // Smoothed linear acceleration per axis
    s_la_x: f64,
    s_la_y: f64,
    s_la_z: f64,

    // Oscillator States
    phases: [f64; 3],
    phases_mod: [f64; 3], // Dedicated modulator phases
    waveforms: [Waveform; 3],
    mixes: [f64; 3],

    sample_rate: f64,
    latest_output: f64,

    // Filter state
    s_filter_cutoff: f64,
    s_filter_res: f64,
    filter_mem: [f64; 4], // x1, x2, y1, y2
}

#[wasm_bindgen]
impl GeedbackProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            orient_a: 0.0,
            orient_b: 0.0,
            orient_g: 0.0,
            linear_accel_x: 0.0,
            linear_accel_y: 0.0,
            linear_accel_z: 0.0,
            touch_x: 0.5,
            touch_y: 0.5,
            s_a_sin: 0.0,
            s_a_cos: 1.0,
            s_b_sin: 0.0,
            s_b_cos: 1.0,
            s_g_sin: 0.0,
            s_g_cos: 1.0,
            s_la_x: 0.0,
            s_la_y: 0.0,
            s_la_z: 0.0,
            s_filter_cutoff: 0.5,
            s_filter_res: 0.1,
            filter_mem: [0.0; 4],
            phases: [0.0; 3],
            phases_mod: [0.0; 3],
            waveforms: [Waveform::Sine, Waveform::Sine, Waveform::Sine],
            mixes: [0.3, 0.3, 0.3],
            sample_rate: 44100.0,
            latest_output: 0.0,
        }
    }

    pub fn set_waveform(&mut self, index: usize, wave: Waveform) {
        if index < 3 {
            self.waveforms[index] = wave;
        }
    }

    pub fn set_orient(&mut self, a: f64, b: f64, g: f64) {
        self.orient_a = a;
        self.orient_b = b;
        self.orient_g = g;
    }

    pub fn set_linear_accel(&mut self, x: f64, y: f64, z: f64) {
        self.linear_accel_x = x;
        self.linear_accel_y = y;
        self.linear_accel_z = z;
    }

    pub fn set_touch(&mut self, x: f64, y: f64) {
        self.touch_x = x.clamp(0.0, 1.0);
        self.touch_y = y.clamp(0.0, 1.0);
    }

    pub fn set_sample_rate(&mut self, sample_rate: f64) {
        self.sample_rate = sample_rate;
    }

    fn calculate_wave(&self, phase: f64, wave: Waveform, morph: f64) -> f64 {
        let m = (morph + 1.0) * 0.5;
        let p = phase.fract();

        match wave {
            Waveform::Sine => {
                let raw = (p * 2.0 * std::f64::consts::PI).sin();
                if m > 0.5 {
                    let drive = 1.0 + (m - 0.5) * 2.0;
                    (raw * drive).tanh()
                } else {
                    raw
                }
            }
            Waveform::Triangle => 1.0 - 2.0 * (p + 0.75).fract().abs(),
            Waveform::TriangleSawtooth => {
                let tri = 1.0 - 2.0 * (p + 0.75).fract().abs();
                let saw = 2.0 * p - 1.0;
                tri * (1.0 - m) + saw * m
            }
            Waveform::Sawtooth => 2.0 * p - 1.0,
            Waveform::ReverseSawtooth => 1.0 - p * 2.0,
            Waveform::Square | Waveform::WidePulse | Waveform::NarrowPulse => {
                let width = 0.02 + m * 0.48;
                if p < width { 1.0 } else { -1.0 }
            }
        }
    }

    pub fn process(&mut self) -> f64 {
        let rad_a = (self.orient_a / 2.0).to_radians();
        let rad_b = (self.orient_b / 2.0).to_radians();
        let rad_g = (self.orient_g / 2.0).to_radians();

        let lpf_val = 0.9995;
        let gain_val = 0.0005;

        // Smooth Orientation
        self.s_a_sin = self.s_a_sin * lpf_val + rad_a.sin() * gain_val;
        self.s_a_cos = self.s_a_cos * lpf_val + rad_a.cos() * gain_val;
        self.s_b_sin = self.s_b_sin * lpf_val + rad_b.sin() * gain_val;
        self.s_b_cos = self.s_b_cos * lpf_val + rad_b.cos() * gain_val;
        self.s_g_sin = self.s_g_sin * lpf_val + rad_g.sin() * gain_val;
        self.s_g_cos = self.s_g_cos * lpf_val + rad_g.cos() * gain_val;

        // Smooth Linear Accel
        let la_lpf = 0.995;
        let la_gain = 0.005;
        self.s_la_x = self.s_la_x * la_lpf + self.linear_accel_x * la_gain;
        self.s_la_y = self.s_la_y * la_lpf + self.linear_accel_y * la_gain;
        self.s_la_z = self.s_la_z * la_lpf + self.linear_accel_z * la_gain;

        self.s_filter_cutoff = self.s_filter_cutoff * 0.9995 + self.touch_x * 0.0005;
        self.s_filter_res = self.s_filter_res * 0.9995 + (1.0 - self.touch_y) * 0.0005;

        let freqs = [
            110.0 * 2.0_f64.powf(self.s_g_sin * 2.5), // Osc 1: Y
            164.8 * 2.0_f64.powf(self.s_a_sin * 4.0), // Osc 2: Z
            220.0 * 2.0_f64.powf(self.s_b_sin * 2.5), // Osc 3: X
        ];

        let morphs = [self.s_g_cos, self.s_a_cos, self.s_b_cos];

        let fm_depths = [
            self.s_la_y.abs() * 50.0, // Osc 1: Y (Extremely high depth)
            self.s_la_z.abs() * 50.0, // Osc 2: Z
            self.s_la_x.abs() * 50.0, // Osc 3: X
        ];

        let mut mixed_output = 0.0;

        for i in 0..3 {
            self.phases_mod[i] = (self.phases_mod[i] + (freqs[i] * 1.5) / self.sample_rate) % 1.0;
            let modulation =
                (self.phases_mod[i] * 2.0 * std::f64::consts::PI).sin() * (fm_depths[i] * 5.0);
            let osc_out =
                self.calculate_wave(self.phases[i] + modulation, self.waveforms[i], morphs[i]);
            mixed_output += osc_out * self.mixes[i];
            self.phases[i] = (self.phases[i] + freqs[i] / self.sample_rate) % 1.0;
        }

        let mut cutoff_hz = 200.0 * 180.0_f64.powf(self.s_filter_cutoff);

        // Safety: Clamp cutoff to slightly below Nyquist to prevent NaN
        let max_cutoff = self.sample_rate * 0.45;
        if cutoff_hz > max_cutoff {
            cutoff_hz = max_cutoff;
        }

        let q = 0.707 + self.s_filter_res * 14.3;

        let omega = 2.0 * std::f64::consts::PI * cutoff_hz / self.sample_rate;
        let alpha = omega.sin() / (2.0 * q);
        let cos_w = omega.cos();

        let b0 = (1.0 - cos_w) / 2.0;
        let b1 = 1.0 - cos_w;
        let b2 = (1.0 - cos_w) / 2.0;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_w;
        let a2 = 1.0 - alpha;

        // Denormal prevention: add a tiny offset to the input
        let filter_input = mixed_output + 1e-20;

        let filtered = (b0 / a0) * filter_input
            + (b1 / a0) * self.filter_mem[0]
            + (b2 / a0) * self.filter_mem[1]
            - (a1 / a0) * self.filter_mem[2]
            - (a2 / a0) * self.filter_mem[3];

        self.filter_mem[1] = self.filter_mem[0];
        self.filter_mem[0] = filter_input;
        self.filter_mem[3] = self.filter_mem[2];
        self.filter_mem[2] = filtered;

        self.latest_output = filtered;

        // "Metal Zone" Mode: Scale master gain with acceleration for heavy saturation
        let shake_intensity = (self.s_la_x.abs() + self.s_la_y.abs() + self.s_la_z.abs()) * 4.0;
        let master_gain = 0.6 + shake_intensity;
        (filtered * master_gain).tanh()
    }

    pub fn get_latest_output(&self) -> f64 {
        self.latest_output
    }
}
