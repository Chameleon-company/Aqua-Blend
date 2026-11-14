"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COLUMNS = 160;
const ROWS = 64;
const WIDTH = 34;
const DEPTH = 15;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uMouseStrength;

  varying float vDepth;

  void main() {
    vec3 pos = position;

    float wave =
      sin(pos.x * 0.55 + uTime * 0.55) * 0.32 +
      sin(pos.y * 0.85 - uTime * 0.35) * 0.22 +
      sin((pos.x + pos.y) * 0.32 + uTime * 0.22) * 0.18;
    pos.z += wave;

    float dist = distance(pos.xy, uMouse);
    float ripple = smoothstep(3.2, 0.0, dist) * uMouseStrength;
    pos.z += ripple * 0.9;

    vDepth = pos.z + ripple * 0.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (2.0 + ripple * 2.5) * (260.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;
  varying float vDepth;
  uniform vec3 uColorLow;
  uniform vec3 uColorHigh;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float t = clamp((vDepth + 0.8) / 1.6, 0.0, 1.0);
    vec3 color = mix(uColorLow, uColorHigh, t);
    float alpha = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(color, alpha * 0.85);
  }
`;

export function ParticleField() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const smoothedMouse = useRef(new THREE.Vector2(0, 0));
  const targetStrength = useRef(0);

  const { positions } = useMemo(() => {
    const count = COLUMNS * ROWS;
    const positions = new Float32Array(count * 3);
    let i = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        const x = (col / (COLUMNS - 1) - 0.5) * WIDTH;
        const y = (row / (ROWS - 1) - 0.5) * DEPTH;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = 0;
        i++;
      }
    }
    return { positions };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uMouseStrength: { value: 0 },
      uColorLow: { value: new THREE.Color("#0b3d5c") },
      uColorHigh: { value: new THREE.Color("#5be6ef") },
    }),
    [],
  );

  useFrame((state, delta) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value += delta;

    const pointer = state.pointer;
    const targetX = pointer.x * (WIDTH / 2);
    const targetY = pointer.y * (DEPTH / 2);
    smoothedMouse.current.x += (targetX - smoothedMouse.current.x) * 0.06;
    smoothedMouse.current.y += (targetY - smoothedMouse.current.y) * 0.06;
    materialRef.current.uniforms.uMouse.value.copy(smoothedMouse.current);

    const isOverCanvas = Math.abs(pointer.x) <= 1 && Math.abs(pointer.y) <= 1;
    targetStrength.current += ((isOverCanvas ? 1 : 0) - targetStrength.current) * 0.08;
    materialRef.current.uniforms.uMouseStrength.value = targetStrength.current;
  });

  return (
    <points rotation={[-0.5, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
