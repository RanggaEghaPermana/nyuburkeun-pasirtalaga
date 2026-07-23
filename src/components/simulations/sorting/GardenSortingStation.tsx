import { useEffect, useMemo } from "react";
import {
  CanvasTexture,
  Color,
  LinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";

type GardenSortingStationProps = {
  compact: boolean;
};

const TREE_POSITIONS = [
  [-5.3, -1.28, -3.5, 1.04],
  [5.2, -1.28, -3.3, 0.92],
  [-5.7, -1.28, 2.3, 0.84],
  [5.8, -1.28, 2.6, 0.8],
] as const;

const BUSH_POSITIONS = [
  [-3.9, -1.18, -3.95, 0.9],
  [-2.7, -1.18, -4.2, 0.72],
  [2.8, -1.18, -4.18, 0.76],
  [4.05, -1.18, -3.92, 0.9],
  [-4.9, -1.18, 0.3, 0.62],
  [4.9, -1.18, 0.25, 0.66],
] as const;

const FENCE_POSTS = [-4.4, -3.3, -2.2, 2.2, 3.3, 4.4] as const;

function createGrassTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return new CanvasTexture(canvas);

  context.fillStyle = "#678f4f";
  context.fillRect(0, 0, 256, 256);
  const colors = ["#759e58", "#567d43", "#84a865", "#4e733d"];
  for (let index = 0; index < 540; index += 1) {
    const x = (index * 67) % 256;
    const y = (index * 131) % 256;
    context.strokeStyle = colors[index % colors.length];
    context.lineWidth = 0.7 + ((index * 11) % 8) / 10;
    context.beginPath();
    context.moveTo(x, y + 3);
    context.lineTo(x + (((index % 5) - 2) * 0.7), y - 2 - (index % 4));
    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createStationSignTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 360;
  const context = canvas.getContext("2d");
  if (!context) return new CanvasTexture(canvas);

  context.fillStyle = "#fff9df";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0d5f43";
  context.fillRect(0, 0, canvas.width, 76);
  context.fillStyle = "#e9c75d";
  context.fillRect(0, 76, canvas.width, 12);
  context.fillStyle = "#0b513a";
  context.font = "900 80px Inter, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("STASIUN PILAH SAMPAH", 600, 205);
  context.fillStyle = "#4c6258";
  context.font = "750 34px Inter, Arial, sans-serif";
  context.fillText("NYUBURKEUN PASIRTALAGA", 600, 302);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function GardenSortingStation({ compact }: GardenSortingStationProps) {
  const grassTexture = useMemo(() => createGrassTexture(), []);
  const signTexture = useMemo(() => createStationSignTexture(), []);
  const visibleTrees = compact ? TREE_POSITIONS.slice(0, 2) : TREE_POSITIONS;
  const visibleBushes = compact ? BUSH_POSITIONS.slice(0, 4) : BUSH_POSITIONS;

  useEffect(
    () => () => {
      grassTexture.dispose();
      signTexture.dispose();
    },
    [grassTexture, signTexture],
  );

  return (
    <group name="garden-sorting-station">
      <mesh position={[0, -1.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[9.5, 72]} />
        <meshStandardMaterial map={grassTexture} color="#ffffff" roughness={1} />
      </mesh>

      <mesh position={[0, -1.26, -0.1]}>
        <cylinderGeometry args={[5.15, 5.32, 0.18, 64]} />
        <meshStandardMaterial color="#d6d0b7" roughness={0.94} />
      </mesh>
      <mesh position={[0, -1.158, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.25, 4.34, 64]} />
        <meshBasicMaterial color="#b4ac8f" transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, -1.154, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.78, 2.83, 64]} />
        <meshBasicMaterial color="#c0b89c" transparent opacity={0.64} />
      </mesh>

      {compact ? (
        <group position={[0, -0.97, -1.82]}>
          <mesh>
            <boxGeometry args={[2.65, 0.38, 1.46]} />
            <meshStandardMaterial color="#98704a" roughness={0.88} />
          </mesh>
          {[-0.86, -0.43, 0, 0.43, 0.86].map((x) => (
            <mesh key={x} position={[x, 0.198, 0]}>
              <boxGeometry args={[0.025, 0.012, 1.38]} />
              <meshBasicMaterial color="#6f5035" />
            </mesh>
          ))}
        </group>
      ) : null}

      <group position={[0, 0, compact ? 3.15 : 2.85]}>
        <mesh position={[0, -1.1, 0]}>
          <cylinderGeometry args={[0.35, 0.43, 0.13, 28]} />
          <meshStandardMaterial color="#426b55" roughness={0.84} />
        </mesh>
        <mesh position={[0, -0.76, 0]}>
          <cylinderGeometry args={[0.15, 0.21, 0.68, 24]} />
          <meshStandardMaterial color="#6f7e72" metalness={0.34} roughness={0.58} />
        </mesh>
        <mesh position={[0, -0.44, 0]}>
          <cylinderGeometry args={[0.62, 0.57, 0.13, 36]} />
          <meshStandardMaterial color="#c7a96d" roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.371, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.52, 0.047, 10, 36]} />
          <meshStandardMaterial color="#8b6a3e" roughness={0.88} />
        </mesh>
        <mesh position={[0, -0.365, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.47, 36]} />
          <meshStandardMaterial color="#e0c78f" roughness={0.9} />
        </mesh>
      </group>

      <group position={[0, 0.86, -4.15]}>
        {[-1.28, 1.28].map((x) => (
          <mesh key={x} position={[x, -0.72, 0.05]}>
            <cylinderGeometry args={[0.075, 0.095, 2.8, 12]} />
            <meshStandardMaterial color="#604a35" roughness={0.92} />
          </mesh>
        ))}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[3.02, 0.94, 0.13]} />
          <meshStandardMaterial color="#75593d" roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.2, 0.071]}>
          <planeGeometry args={[2.84, 0.78]} />
          <meshBasicMaterial map={signTexture} toneMapped={false} />
        </mesh>
      </group>

      {FENCE_POSTS.map((x) => (
        <group key={x} position={[x, -0.38, -4.62]}>
          <mesh>
            <cylinderGeometry args={[0.055, 0.075, 1.75, 10]} />
            <meshStandardMaterial color="#7a5e40" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[1.18, 0.08, 0.07]} />
            <meshStandardMaterial color="#9b7952" roughness={0.94} />
          </mesh>
          <mesh position={[0, -0.26, 0]}>
            <boxGeometry args={[1.18, 0.08, 0.07]} />
            <meshStandardMaterial color="#9b7952" roughness={0.94} />
          </mesh>
        </group>
      ))}

      {visibleTrees.map(([x, y, z, scale]) => (
        <group key={`${x}-${z}`} position={[x, y, z]} scale={scale}>
          <mesh position={[0, 1.15, 0]}>
            <cylinderGeometry args={[0.22, 0.3, 2.3, 12]} />
            <meshStandardMaterial color="#705038" roughness={1} />
          </mesh>
          {[
            [0, 2.45, 0, 1.18, "#3e793d"],
            [-0.48, 2.22, 0.05, 0.86, "#4b8a47"],
            [0.5, 2.18, -0.02, 0.9, "#568f4b"],
          ].map(([canopyX, canopyY, canopyZ, canopyScale, color]) => (
            <mesh
              key={`${canopyX}-${canopyY}`}
              position={[Number(canopyX), Number(canopyY), Number(canopyZ)]}
              scale={Number(canopyScale)}
            >
              <icosahedronGeometry args={[0.92, 2]} />
              <meshStandardMaterial color={String(color)} roughness={0.96} flatShading />
            </mesh>
          ))}
        </group>
      ))}

      {visibleBushes.map(([x, y, z, scale], bushIndex) => (
        <group key={`${x}-${z}`} position={[x, y, z]} scale={scale}>
          {[-0.42, 0, 0.42].map((offset, index) => (
            <mesh key={offset} position={[offset, 0.33 + (index % 2) * 0.12, index === 1 ? -0.12 : 0]}>
              <icosahedronGeometry args={[0.52, 1]} />
              <meshStandardMaterial
                color={new Color(bushIndex % 2 === 0 ? "#397347" : "#4c8248").offsetHSL(0, 0, index * 0.025)}
                roughness={1}
                flatShading
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
