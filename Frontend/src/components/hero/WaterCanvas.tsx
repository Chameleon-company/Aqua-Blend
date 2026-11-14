"use client";

import { Canvas } from "@react-three/fiber";
import { ParticleField } from "./ParticleField";

export default function WaterCanvas({ active }: { active: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 2.4, 11], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ParticleField />
    </Canvas>
  );
}
