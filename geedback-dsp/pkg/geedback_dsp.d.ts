/* tslint:disable */
/* eslint-disable */

export class GeedbackProcessor {
    free(): void;
    [Symbol.dispose](): void;
    get_latest_output(): number;
    constructor();
    process(): number;
    set_linear_accel(x: number, y: number, z: number): void;
    set_orient(a: number, b: number, g: number): void;
    set_sample_rate(sample_rate: number): void;
    set_touch(x: number, y: number): void;
    set_waveform(index: number, wave: Waveform): void;
}

export enum Waveform {
    Sine = 0,
    Triangle = 1,
    TriangleSawtooth = 2,
    Sawtooth = 3,
    ReverseSawtooth = 4,
    Square = 5,
    WidePulse = 6,
    NarrowPulse = 7,
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_geedbackprocessor_free: (a: number, b: number) => void;
    readonly geedbackprocessor_get_latest_output: (a: number) => number;
    readonly geedbackprocessor_new: () => number;
    readonly geedbackprocessor_process: (a: number) => number;
    readonly geedbackprocessor_set_linear_accel: (a: number, b: number, c: number, d: number) => void;
    readonly geedbackprocessor_set_orient: (a: number, b: number, c: number, d: number) => void;
    readonly geedbackprocessor_set_sample_rate: (a: number, b: number) => void;
    readonly geedbackprocessor_set_touch: (a: number, b: number, c: number) => void;
    readonly geedbackprocessor_set_waveform: (a: number, b: number, c: number) => void;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
