import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  LinearFilter,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  type Group,
} from "three";
import { WASTE_BIN_MOUTH_POSITION, type BinDefinition, type WasteCategory } from "./sortingBins";

function createBinBodyGeometry() {
  const shape = new Shape();
  shape.moveTo(-0.63, 0);
  shape.quadraticCurveTo(-0.69, 0.02, -0.7, 0.12);
  shape.lineTo(-0.77, 1.31);
  shape.quadraticCurveTo(-0.78, 1.44, -0.65, 1.47);
  shape.lineTo(0.65, 1.47);
  shape.quadraticCurveTo(0.78, 1.44, 0.77, 1.31);
  shape.lineTo(0.7, 0.12);
  shape.quadraticCurveTo(0.69, 0.02, 0.63, 0);
  shape.closePath();

  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.84,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    curveSegments: 6,
  });
  geometry.translate(0, 0, -0.42);
  return geometry;
}

function createRoundedLidGeometry() {
  const width = 1.72;
  const height = 1.02;
  const radius = 0.13;
  const x = -width / 2;
  const y = -height / 2;
  const shape = new Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  shape.closePath();

  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.11,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.025,
    curveSegments: 5,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

const BODY_GEOMETRY = createBinBodyGeometry();
const LID_GEOMETRY = createRoundedLidGeometry();
const FRONT_PANEL_GEOMETRY = new BoxGeometry(1.27, 0.91, 0.045, 2, 2, 1);
const RIB_GEOMETRY = new BoxGeometry(0.045, 1.05, 0.035);
const SLOT_SURROUND_GEOMETRY = new BoxGeometry(0.93, 0.025, 0.42);
const SLOT_GEOMETRY = new BoxGeometry(0.75, 0.035, 0.27);
const WHEEL_GEOMETRY = new CylinderGeometry(0.2, 0.2, 0.16, 22);
const HUB_GEOMETRY = new CylinderGeometry(0.082, 0.082, 0.18, 18);
const AXLE_GEOMETRY = new CylinderGeometry(0.045, 0.045, 1.22, 12);
const HANDLE_POST_GEOMETRY = new CylinderGeometry(0.033, 0.033, 0.34, 10);
const HANDLE_BAR_GEOMETRY = new CylinderGeometry(0.045, 0.045, 0.95, 12);
const HINGE_GEOMETRY = new CylinderGeometry(0.065, 0.065, 1.05, 14);
const LABEL_BACK_GEOMETRY = new BoxGeometry(1.29, 0.7, 0.045);
const LABEL_GEOMETRY = new PlaneGeometry(1.23, 0.64);
const PEDAL_GEOMETRY = new BoxGeometry(0.42, 0.08, 0.24);
const DROP_TARGET_GEOMETRY = new BoxGeometry(1.48, 0.7, 1.12);
const SHADOW_GEOMETRY = new CircleGeometry(0.78, 32);

const RUBBER_MATERIAL = new MeshStandardMaterial({
  color: "#202522",
  metalness: 0.02,
  roughness: 0.96,
});

const HARDWARE_MATERIAL = new MeshStandardMaterial({
  color: "#68706c",
  metalness: 0.62,
  roughness: 0.38,
});

const SLOT_MATERIAL = new MeshStandardMaterial({
  color: "#101713",
  metalness: 0.02,
  roughness: 0.98,
});

const DROP_TARGET_MATERIAL = new MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  opacity: 0,
  transparent: true,
});

const SHADOW_MATERIAL = new MeshBasicMaterial({
  color: "#284b3b",
  depthWrite: false,
  opacity: 0.2,
  transparent: true,
});

const LID_OPEN_ANGLE = -0.9;
const SHAKE_DURATION = 0.58;

export type IndonesianWasteBinProps = {
  definition: BinDefinition;
  position: [number, number, number];
  highlighted: boolean;
  wrong: boolean;
  reducedMotion: boolean;
};

function roundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawArrowHead(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
) {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(
    x - Math.cos(angle - Math.PI / 5) * size,
    y - Math.sin(angle - Math.PI / 5) * size,
  );
  context.lineTo(
    x - Math.cos(angle + Math.PI / 5) * size,
    y - Math.sin(angle + Math.PI / 5) * size,
  );
  context.closePath();
  context.fill();
}

function drawPictogram(
  context: CanvasRenderingContext2D,
  category: WasteCategory,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = size * 0.095;

  if (category === "hazardous") {
    context.beginPath();
    context.moveTo(x, y - size * 0.48);
    context.lineTo(x + size * 0.48, y + size * 0.42);
    context.lineTo(x - size * 0.48, y + size * 0.42);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(x, y - size * 0.18);
    context.lineTo(x, y + size * 0.13);
    context.stroke();
    context.beginPath();
    context.arc(x, y + size * 0.28, size * 0.055, 0, Math.PI * 2);
    context.fill();
  } else if (category === "organic") {
    context.beginPath();
    context.ellipse(x, y, size * 0.34, size * 0.49, Math.PI / 4, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(x - size * 0.27, y + size * 0.3);
    context.lineTo(x + size * 0.28, y - size * 0.28);
    context.stroke();
    context.beginPath();
    context.moveTo(x - size * 0.03, y + size * 0.04);
    context.lineTo(x - size * 0.28, y - size * 0.02);
    context.moveTo(x + size * 0.09, y - size * 0.08);
    context.lineTo(x + size * 0.06, y - size * 0.31);
    context.stroke();
  } else if (category === "reusable") {
    roundedRectangle(context, x - size * 0.2, y - size * 0.3, size * 0.4, size * 0.62, size * 0.08);
    context.stroke();
    context.beginPath();
    context.arc(x, y, size * 0.48, -Math.PI * 0.65, Math.PI * 0.55);
    context.stroke();
    drawArrowHead(context, x - size * 0.08, y + size * 0.47, Math.PI * 0.54, size * 0.2);
  } else if (category === "recyclable") {
    const radius = size * 0.38;
    for (let index = 0; index < 3; index += 1) {
      const start = -Math.PI / 2 + index * (Math.PI * 2 / 3);
      const end = start + Math.PI * 0.48;
      context.beginPath();
      context.arc(x, y, radius, start, end);
      context.stroke();
      drawArrowHead(
        context,
        x + Math.cos(end) * radius,
        y + Math.sin(end) * radius,
        end + Math.PI / 2,
        size * 0.17,
      );
    }
  } else {
    context.beginPath();
    context.moveTo(x - size * 0.3, y - size * 0.24);
    context.quadraticCurveTo(x, y - size * 0.43, x + size * 0.3, y - size * 0.24);
    context.lineTo(x + size * 0.24, y + size * 0.4);
    context.quadraticCurveTo(x, y + size * 0.5, x - size * 0.24, y + size * 0.4);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(x - size * 0.13, y - size * 0.34);
    context.lineTo(x + size * 0.13, y - size * 0.34);
    context.stroke();
  }

  context.restore();
}

function fitLabelText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  let fontSize = 118;
  do {
    context.font = `850 ${fontSize}px Inter, Arial, sans-serif`;
    fontSize -= 1;
  } while (context.measureText(value).width > maxWidth && fontSize > 58);
}

function createLabelTexture(definition: BinDefinition) {
  const density = 2;
  const logicalWidth = 768;
  const logicalHeight = 384;
  const canvas = document.createElement("canvas");
  canvas.width = logicalWidth * density;
  canvas.height = logicalHeight * density;
  const context = canvas.getContext("2d");

  if (!context) return new CanvasTexture(canvas);

  context.scale(density, density);
  roundedRectangle(context, 8, 8, logicalWidth - 16, logicalHeight - 16, 34);
  context.fillStyle = "#fffef9";
  context.fill();
  context.lineWidth = 12;
  context.strokeStyle = definition.color;
  context.stroke();

  const labelInk = new Color(definition.color).offsetHSL(0, 0.02, -0.2).getStyle();
  roundedRectangle(context, 28, 28, 164, 328, 24);
  context.fillStyle = new Color(definition.color).offsetHSL(0, -0.02, 0.38).getStyle();
  context.fill();
  drawPictogram(context, definition.category, 110, 192, 104, labelInk);

  context.fillStyle = labelInk;
  context.textBaseline = "middle";
  const labelLines = definition.shortLabel.toUpperCase().split(" ");
  if (labelLines.length === 1) {
    fitLabelText(context, labelLines[0], 536);
    context.fillText(labelLines[0], 210, 192);
  } else {
    labelLines.slice(0, 2).forEach((line, index) => {
      fitLabelText(context, line, 536);
      context.fillText(line, 210, 132 + (index * 120));
    });
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createPlasticTexture(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return new CanvasTexture(canvas);

  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const base = new Color(color);
  for (let index = 0; index < 420; index += 1) {
    const x = (index * 71) % 256;
    const y = (index * 137) % 256;
    const lightness = index % 3 === 0 ? 0.08 : -0.06;
    context.fillStyle = base.clone().offsetHSL(0, -0.015, lightness).getStyle();
    const size = 0.6 + ((index * 17) % 12) / 10;
    context.fillRect(x, y, size, size);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function damp(current: number, target: number, speed: number, delta: number) {
  return current + (target - current) * (1 - Math.exp(-speed * delta));
}

export function IndonesianWasteBin({
  definition,
  position,
  highlighted,
  wrong,
  reducedMotion,
}: IndonesianWasteBinProps) {
  const animatedGroupRef = useRef<Group>(null);
  const lidRef = useRef<Group>(null);
  const wrongElapsedRef = useRef(0);
  const { gl, invalidate } = useThree();

  const labelTexture = useMemo(() => {
    const texture = createLabelTexture(definition);
    texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    return texture;
  }, [definition, gl]);
  const plasticTexture = useMemo(() => {
    const texture = createPlasticTexture(definition.color);
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    return texture;
  }, [definition.color, gl]);
  const emissiveColor = wrong ? "#a51e16" : highlighted ? definition.color : "#000000";
  const emissiveIntensity = wrong ? 0.55 : highlighted ? 0.28 : 0;
  const bodyMaterial = useMemo(
    () => new MeshPhysicalMaterial({
      color: "#ffffff",
      map: plasticTexture,
      emissive: emissiveColor,
      emissiveIntensity,
      clearcoat: 0.16,
      clearcoatRoughness: 0.72,
      metalness: 0.01,
      roughness: 0.78,
    }),
    [emissiveColor, emissiveIntensity, plasticTexture],
  );
  const accentMaterial = useMemo(() => {
    const accentColor = new Color(definition.color).offsetHSL(0, 0.01, -0.09);
    return new MeshPhysicalMaterial({
      color: accentColor,
      emissive: emissiveColor,
      emissiveIntensity,
      clearcoat: 0.22,
      clearcoatRoughness: 0.62,
      metalness: 0.01,
      roughness: 0.69,
    });
  }, [definition.color, emissiveColor, emissiveIntensity]);
  const labelBackMaterial = useMemo(
    () => new MeshStandardMaterial({
      color: new Color(definition.color).offsetHSL(0, 0.01, -0.14),
      roughness: 0.72,
    }),
    [definition.color],
  );
  const slotSurroundMaterial = useMemo(
    () => new MeshBasicMaterial({
      color: highlighted ? "#f4ffd2" : definition.color,
      opacity: highlighted ? 0.96 : 0.34,
      side: DoubleSide,
      transparent: true,
      toneMapped: false,
    }),
    [definition.color, highlighted],
  );
  const labelMaterial = useMemo(
    () => new MeshBasicMaterial({ map: labelTexture, transparent: true, toneMapped: false }),
    [labelTexture],
  );

  useEffect(() => {
    if (wrong) wrongElapsedRef.current = 0;
    invalidate();
  }, [highlighted, invalidate, reducedMotion, wrong]);

  useEffect(
    () => () => {
      bodyMaterial.dispose();
      accentMaterial.dispose();
      labelBackMaterial.dispose();
      slotSurroundMaterial.dispose();
    }, [accentMaterial, bodyMaterial, labelBackMaterial, slotSurroundMaterial],
  );

  useEffect(
    () => () => {
      labelMaterial.dispose();
      labelTexture.dispose();
      plasticTexture.dispose();
    }, [labelMaterial, labelTexture, plasticTexture],
  );

  useFrame((_, delta) => {
    const animatedGroup = animatedGroupRef.current;
    const lid = lidRef.current;
    if (!animatedGroup || !lid) return;

    const targetLidRotation = highlighted ? LID_OPEN_ANGLE : 0;
    let needsAnotherFrame = false;

    if (reducedMotion) {
      lid.rotation.x = targetLidRotation;
      animatedGroup.position.x = 0;
    } else {
      lid.rotation.x = damp(lid.rotation.x, targetLidRotation, 11, delta);
      if (Math.abs(lid.rotation.x - targetLidRotation) > 0.001) needsAnotherFrame = true;

      if (wrong && wrongElapsedRef.current < SHAKE_DURATION) {
        wrongElapsedRef.current = Math.min(SHAKE_DURATION, wrongElapsedRef.current + delta);
        const progress = wrongElapsedRef.current / SHAKE_DURATION;
        animatedGroup.position.x = Math.sin(progress * Math.PI * 8) * (1 - progress) * 0.13;
        needsAnotherFrame = progress < 1;
      } else {
        animatedGroup.position.x = damp(animatedGroup.position.x, 0, 16, delta);
        if (Math.abs(animatedGroup.position.x) > 0.001) needsAnotherFrame = true;
      }
    }

    if (needsAnotherFrame) invalidate();
  });

  return (
    <group
      dispose={null}
      name={`waste-bin-${definition.category}`}
      position={position}
      userData={{ category: definition.category }}
    >
      <mesh
        geometry={SHADOW_GEOMETRY}
        material={SHADOW_MATERIAL}
        position={[0, 0.045, 0.03]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.18, 0.68, 1]}
      />
      <group ref={animatedGroupRef}>
        <mesh geometry={BODY_GEOMETRY} material={bodyMaterial} position={[0, 0.16, 0]} />

        <mesh geometry={FRONT_PANEL_GEOMETRY} material={bodyMaterial} position={[0, 0.91, 0.468]} />
        {[-0.64, 0.64].map((x) => (
          <mesh key={x} geometry={RIB_GEOMETRY} material={accentMaterial} position={[x, 0.94, 0.493]} />
        ))}
        <mesh geometry={LABEL_BACK_GEOMETRY} material={labelBackMaterial} position={[0, 0.92, 0.505]} />
        <mesh geometry={LABEL_GEOMETRY} material={labelMaterial} position={[0, 0.92, 0.532]} />

        <mesh
          geometry={AXLE_GEOMETRY}
          material={HARDWARE_MATERIAL}
          position={[0, 0.22, -0.39]}
          rotation={[0, 0, Math.PI / 2]}
        />
        {[-0.72, 0.72].map((x) => (
          <group key={x} position={[x, 0.22, -0.39]} rotation={[0, 0, Math.PI / 2]}>
            <mesh geometry={WHEEL_GEOMETRY} material={RUBBER_MATERIAL} />
            <mesh geometry={HUB_GEOMETRY} material={HARDWARE_MATERIAL} position={[0, 0.015, 0]} />
          </group>
        ))}

        {[-0.45, 0.45].map((x) => (
          <mesh
            key={x}
            geometry={HANDLE_POST_GEOMETRY}
            material={HARDWARE_MATERIAL}
            position={[x, 1.47, -0.42]}
          />
        ))}
        <mesh
          geometry={HANDLE_BAR_GEOMETRY}
          material={RUBBER_MATERIAL}
          position={[0, 1.62, -0.42]}
          rotation={[0, 0, Math.PI / 2]}
        />
        <mesh
          geometry={PEDAL_GEOMETRY}
          material={HARDWARE_MATERIAL}
          position={[0, 0.12, 0.53]}
          rotation={[-0.2, 0, 0]}
        />

        <group ref={lidRef} position={[0, 1.65, -0.47]}>
          <mesh geometry={HINGE_GEOMETRY} material={HARDWARE_MATERIAL} rotation={[0, 0, Math.PI / 2]} />
          <mesh geometry={LID_GEOMETRY} material={accentMaterial} position={[0, 0.02, 0.43]} />
          <mesh geometry={SLOT_SURROUND_GEOMETRY} material={slotSurroundMaterial} position={[0, 0.17, 0.48]} />
          <mesh geometry={SLOT_GEOMETRY} material={SLOT_MATERIAL} position={[0, 0.19, 0.48]} />
        </group>

        <mesh
          geometry={DROP_TARGET_GEOMETRY}
          material={DROP_TARGET_MATERIAL}
          name={`waste-bin-drop-target-${definition.category}`}
          position={WASTE_BIN_MOUTH_POSITION}
          userData={{ category: definition.category, isWasteBinDropTarget: true }}
        />
      </group>
    </group>
  );
}
