type GardenPlantProps = {
  position: [number, number, number];
  scale?: number;
  tint?: string;
};

function GardenPlant({ position, scale = 1, tint = "#4f8f43" }: GardenPlantProps) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.31, 0.25, 0.34, 12]} />
        <meshStandardMaterial color="#b56f43" roughness={0.94} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.24, 12]} />
        <meshStandardMaterial color="#4b3624" roughness={1} />
      </mesh>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = index * 1.26;
        const radius = 0.11 + (index % 2) * 0.05;
        const height = 0.37 + (index % 3) * 0.11;
        return (
          <group key={index} rotation={[0, angle, 0]}>
            <mesh position={[radius, 0.34, 0]}>
              <cylinderGeometry args={[0.012, 0.019, height, 6]} />
              <meshStandardMaterial color="#3e7436" roughness={0.92} />
            </mesh>
            <mesh
              position={[radius + 0.13, 0.4 + index * 0.025, 0]}
              rotation={[0, 0, -0.36]}
              scale={[0.19, 0.045, 0.1]}
            >
              <sphereGeometry args={[1, 9, 6]} />
              <meshStandardMaterial color={tint} roughness={0.86} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function GrassTuft({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.12, 0, 0.12].map((x, index) => (
        <mesh key={x} position={[x, 0.18 + index * 0.03, 0]} rotation={[0, 0, x * -1.6]}>
          <coneGeometry args={[0.035, 0.48 + index * 0.07, 5]} />
          <meshStandardMaterial color={index % 2 === 0 ? "#63954e" : "#78a85c"} roughness={0.96} />
        </mesh>
      ))}
    </group>
  );
}

export const CompostGarden = memo(function CompostGarden() {
  return (
    <group>
      <mesh position={[0, -1.54, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6.4, 52]} />
        <meshStandardMaterial color="#86a96d" roughness={1} />
      </mesh>

      <mesh position={[0, -1.515, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.95, 36]} />
        <meshStandardMaterial color="#70563b" roughness={1} />
      </mesh>

      {[
        [-0.58, -1.49, 2.25],
        [0.22, -1.49, 2.65],
        [0.95, -1.49, 2.28],
      ].map((position, index) => (
        <mesh
          key={position.join("-")}
          position={position as [number, number, number]}
          rotation={[-Math.PI / 2, 0, index * 0.38]}
          scale={[1, 0.72, 1]}
        >
          <circleGeometry args={[0.34 + index * 0.035, 14]} />
          <meshStandardMaterial color={index % 2 === 0 ? "#d6c29b" : "#c7b38d"} roughness={0.98} />
        </mesh>
      ))}

      <GardenPlant position={[-2.4, -1.34, -1.5]} scale={1.08} tint="#598f48" />
      <GardenPlant position={[2.45, -1.34, -1.25]} scale={0.94} tint="#6da657" />
      <GardenPlant position={[-2.65, -1.34, 1.45]} scale={0.76} tint="#4c8540" />

      <GrassTuft position={[-1.75, -1.5, 1.65]} rotation={0.3} />
      <GrassTuft position={[1.85, -1.5, 1.45]} rotation={-0.4} />
      <GrassTuft position={[-1.75, -1.5, -1.85]} rotation={-0.2} />
      <GrassTuft position={[1.72, -1.5, -1.9]} rotation={0.52} />

      <mesh position={[-2.05, -1.42, 0.65]} rotation={[0.08, -0.25, 0.18]} scale={[0.6, 0.28, 0.42]}>
        <dodecahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="#9c9b83" flatShading roughness={1} />
      </mesh>
      <mesh position={[2.05, -1.44, 0.15]} rotation={[-0.08, 0.35, -0.12]} scale={[0.44, 0.22, 0.34]}>
        <dodecahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="#aaa58d" flatShading roughness={1} />
      </mesh>
    </group>
  );
});
import { memo } from "react";
