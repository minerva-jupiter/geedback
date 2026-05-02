use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct GeedbackProcessor {
    accel_x: f64,
    accel_y: f64,
    accel_z: f64,
    gyro_a: f64,
    gyro_b: f64,
    gyro_g: f64,
    orient_a: f64,
    orient_b: f64,
    orient_g: f64,

    // DSP state: 3 independent phases for oscillators
    phase_x: f64,
    phase_y: f64,
    phase_z: f64,

    sample_rate: f64,
}

#[wasm_bindgen]
impl GeedbackProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            accel_x: 0.0,
            accel_y: 0.0,
            accel_z: 0.0,
            gyro_a: 0.0,
            gyro_b: 0.0,
            gyro_g: 0.0,
            orient_a: 0.0,
            orient_b: 0.0,
            orient_g: 0.0,
            phase_x: 0.0,
            phase_y: 0.0,
            phase_z: 0.0,
            sample_rate: 44100.0,
        }
    }

    pub fn set_sample_rate(&mut self, sample_rate: f64) {
        self.sample_rate = sample_rate;
    }

    pub fn set_accel(&mut self, x: f64, y: f64, z: f64) {
        self.accel_x = x;
        self.accel_y = y;
        self.accel_z = z;
    }

    pub fn set_gyro(&mut self, a: f64, b: f64, g: f64) {
        self.gyro_a = a;
        self.gyro_b = b;
        self.gyro_g = g;
    }

    pub fn set_orient(&mut self, a: f64, b: f64, g: f64) {
        self.orient_a = a;
        self.orient_b = b;
        self.orient_g = g;
    }

    pub fn process(&mut self) -> f64 {
        // Map acceleration to audible frequencies (e.g., 220Hz to 880Hz)
        let freq_x = 220.0 + self.accel_x.abs() * 20.0;
        let freq_y = 330.0 + self.accel_y.abs() * 20.0;
        let freq_z = 440.0 + self.accel_z.abs() * 20.0;

        // Update phases
        self.phase_x = (self.phase_x + freq_x / self.sample_rate) % 1.0;
        self.phase_y = (self.phase_y + freq_y / self.sample_rate) % 1.0;
        self.phase_z = (self.phase_z + freq_z / self.sample_rate) % 1.0;

        // Calculate sine waves
        let out_x = (self.phase_x * 2.0 * std::f64::consts::PI).sin();
        let out_y = (self.phase_y * 2.0 * std::f64::consts::PI).sin();
        let out_z = (self.phase_z * 2.0 * std::f64::consts::PI).sin();

        // Mix output (sum of 3 oscillators)
        (out_x + out_y + out_z) / 3.0
    }
}
