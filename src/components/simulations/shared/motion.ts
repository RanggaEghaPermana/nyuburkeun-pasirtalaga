import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";

export type Playhead = { start: number; value: number };

// Jarum putar untuk animasi satu kali. Setiap kali `key` berubah jarumnya
// kembali ke 0 lalu berjalan sampai 1 dalam `durationMs`. Kanvas berjalan
// dengan frameloop "demand", jadi hook ini yang meminta gambar ulang selama
// animasi masih berlangsung dan berhenti sendiri setelahnya.
export function usePlayhead(key: number | null, durationMs: number, reduceMotion: boolean) {
  const invalidate = useThree((state) => state.invalidate);
  const playhead = useRef<Playhead>({ start: -1, value: 1 });

  useLayoutEffect(() => {
    if (key === null) return;
    if (reduceMotion) {
      playhead.current.start = -1;
      playhead.current.value = 1;
    } else {
      playhead.current.start = performance.now();
      playhead.current.value = 0;
    }
    invalidate();
  }, [invalidate, key, reduceMotion]);

  useFrame(() => {
    const current = playhead.current;
    if (current.start < 0) return;
    current.value = Math.min(1, (performance.now() - current.start) / durationMs);
    if (current.value >= 1) current.start = -1;
    invalidate();
  });

  return playhead;
}

export type Damped = { value: number; target: number };

// Nilai yang mengejar sasarannya dengan redaman eksponensial, untuk transisi
// warna cairan, tinggi isi, dan tonjolan tutup yang berubah karena tombol.
export function useDamped(target: number, lambda = 5, reduceMotion = false) {
  const invalidate = useThree((state) => state.invalidate);
  const damped = useRef<Damped>({ value: target, target });

  useLayoutEffect(() => {
    damped.current.target = target;
    if (reduceMotion) damped.current.value = target;
    invalidate();
  }, [invalidate, reduceMotion, target]);

  useFrame((_, delta) => {
    const current = damped.current;
    const difference = current.target - current.value;
    if (Math.abs(difference) < 1e-4) {
      current.value = current.target;
      return;
    }
    current.value += difference * (1 - Math.exp(-lambda * Math.min(delta, 0.05)));
    invalidate();
  });

  return damped;
}

export function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (Math.pow(-2 * t + 2, 3) / 2);
}

export function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Bagian dari jarum putar: 0 sebelum `from`, 1 setelah `to`.
export function segment(value: number, from: number, to: number) {
  return Math.min(Math.max((value - from) / (to - from), 0), 1);
}
