import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MathUtils, PerspectiveCamera, Raycaster, Vector2, type Object3D } from "three";
import {
  OrbitCameraControls,
  type OrbitCameraControlsHandle,
} from "../shared/OrbitCameraControls";
import { DraggableWaste, type SortingDropTarget } from "./DraggableWaste";
import { GardenSortingStation } from "./GardenSortingStation";
import { IndonesianWasteBin } from "./IndonesianWasteBin";
import {
  binDefinitionsByCategory,
  WASTE_BIN_MOUTH_POSITION,
  type BinDefinition,
  type WasteCategory,
} from "./sortingBins";
import type { WasteItem } from "./wasteItems";

type BinPlacement = {
  definition: BinDefinition;
  position: [number, number, number];
  rotationY: number;
  scale: number;
  mouth: [number, number, number];
};

type WasteSortingSceneProps = {
  item: WasteItem;
  enabled: boolean;
  highlightedCategory: WasteCategory | null;
  wrongCategory: WasteCategory | null;
  reducedMotion: boolean;
  onDragChange: (dragging: boolean) => void;
  onHoverChange: (category: WasteCategory | null) => void;
  onDrop: (category: WasteCategory | null) => void;
  onReturnComplete: () => void;
  onSuccessComplete: () => void;
};

const DESKTOP_SCALE = 0.72;
const COMPACT_FRONT_SCALE = 0.74;
const COMPACT_REAR_SCALE = 0.79;
const DESKTOP_CAMERA_TARGET: [number, number, number] = [0, 0.12, -0.62];
const COMPACT_CAMERA_TARGET: [number, number, number] = [0, 0.06, -0.62];

function isDraggableHitTarget(object: Object3D | null) {
  let candidate = object;
  while (candidate) {
    if (!candidate.visible) return false;
    if (candidate.userData.isDraggableWasteHitTarget === true) return true;
    candidate = candidate.parent;
  }
  return false;
}

function createPlacement(
  definition: BinDefinition,
  position: [number, number, number],
  scale: number,
  rotationY = 0,
): BinPlacement {
  const localMouthX = WASTE_BIN_MOUTH_POSITION[0] * scale;
  const localMouthZ = WASTE_BIN_MOUTH_POSITION[2] * scale;
  return {
    definition,
    position,
    rotationY,
    scale,
    mouth: [
      position[0] + (localMouthX * Math.cos(rotationY)) + (localMouthZ * Math.sin(rotationY)),
      position[1] + (WASTE_BIN_MOUTH_POSITION[1] * scale),
      position[2] - (localMouthX * Math.sin(rotationY)) + (localMouthZ * Math.cos(rotationY)),
    ],
  };
}

const DESKTOP_LAYOUT: BinPlacement[] = [
  createPlacement(binDefinitionsByCategory.organic, [-3.5, -1.14, -0.55], DESKTOP_SCALE, 0.12),
  createPlacement(binDefinitionsByCategory.reusable, [-1.75, -1.14, -0.9], DESKTOP_SCALE, 0.06),
  createPlacement(binDefinitionsByCategory.recyclable, [0, -1.14, -1.02], DESKTOP_SCALE),
  createPlacement(binDefinitionsByCategory.hazardous, [1.75, -1.14, -0.9], DESKTOP_SCALE, -0.06),
  createPlacement(binDefinitionsByCategory.residue, [3.5, -1.14, -0.55], DESKTOP_SCALE, -0.12),
];

const COMPACT_LAYOUT: BinPlacement[] = [
  createPlacement(binDefinitionsByCategory.organic, [-0.86, -0.75, -1.82], COMPACT_REAR_SCALE, 0.035),
  createPlacement(binDefinitionsByCategory.reusable, [0.86, -0.75, -1.82], COMPACT_REAR_SCALE, -0.035),
  createPlacement(binDefinitionsByCategory.recyclable, [-1.34, -1.14, -0.04], COMPACT_FRONT_SCALE, 0.08),
  createPlacement(binDefinitionsByCategory.hazardous, [0, -1.14, -0.12], COMPACT_FRONT_SCALE),
  createPlacement(binDefinitionsByCategory.residue, [1.34, -1.14, -0.04], COMPACT_FRONT_SCALE, -0.08),
];

const DESKTOP_START: [number, number, number] = [0, 0.16, 2.85];
const COMPACT_START: [number, number, number] = [0, 0.16, 3.15];

const DESKTOP_TARGETS: SortingDropTarget[] = DESKTOP_LAYOUT.map(({ definition, mouth }) => ({
  category: definition.category,
  mouth,
}));

const COMPACT_TARGETS: SortingDropTarget[] = COMPACT_LAYOUT.map(({ definition, mouth }) => ({
  category: definition.category,
  mouth,
}));

function CameraRig({ compact }: { compact: boolean }) {
  const { camera, invalidate, size } = useThree();

  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const veryNarrow = compact && aspect < 0.78;
    const target = compact ? COMPACT_CAMERA_TARGET : DESKTOP_CAMERA_TARGET;

    if (veryNarrow) {
      camera.position.set(0, 4.25, 10.55);
    } else if (compact) {
      camera.position.set(0, 4.05, 9.85);
    } else {
      camera.position.set(0, 3.72, 10.7);
    }
    camera.lookAt(...target);

    if (camera instanceof PerspectiveCamera) {
      const fov = veryNarrow ? 41 : compact ? 39 : 38;
      const focalLength = 0.5 * camera.getFilmHeight() / Math.tan(MathUtils.degToRad(fov * 0.5));
      camera.setFocalLength(focalLength);
      camera.updateProjectionMatrix();
    }

    invalidate();
  }, [camera, compact, invalidate, size.height, size.width]);

  return null;
}

function SortingWorld(props: WasteSortingSceneProps) {
  const { camera, gl, scene, size } = useThree();
  const compact = size.width < 600;
  const [draggingWaste, setDraggingWaste] = useState(false);
  const [controlsEpoch, setControlsEpoch] = useState(0);
  const draggingWasteRef = useRef(false);
  const controlsRef = useRef<OrbitCameraControlsHandle>(null);
  const layout = compact ? COMPACT_LAYOUT : DESKTOP_LAYOUT;
  const startPosition = compact ? COMPACT_START : DESKTOP_START;
  const targets = compact ? COMPACT_TARGETS : DESKTOP_TARGETS;
  const cameraTarget = compact ? COMPACT_CAMERA_TARGET : DESKTOP_CAMERA_TARGET;
  const notifyDragChange = props.onDragChange;

  const handleDragChange = useCallback((dragging: boolean) => {
    const wasDragging = draggingWasteRef.current;
    draggingWasteRef.current = dragging;
    controlsRef.current?.setEnabled(!dragging);
    setDraggingWaste(dragging);
    if (wasDragging && !dragging) {
      // Recreate OrbitControls after a waste gesture. This clears Three.js'
      // private touch-pointer bookkeeping while preserving the camera pose.
      setControlsEpoch((current) => current + 1);
    }
    notifyDragChange(dragging);
  }, [notifyDragChange]);

  useEffect(() => {
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const canvas = gl.domElement;

    const guardWastePointerDown = (event: PointerEvent) => {
      if (!props.enabled || !event.isPrimary || event.button !== 0) return;

      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1,
        -(((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 - 1),
      );
      raycaster.setFromCamera(pointer, camera);
      const grabbedWaste = raycaster
        .intersectObjects(scene.children, true)
        .some((intersection) => isDraggableHitTarget(intersection.object));
      if (grabbedWaste) {
        controlsRef.current?.setEnabled(false);
        queueMicrotask(() => {
          if (!draggingWasteRef.current) controlsRef.current?.setEnabled(true);
        });
      }
    };

    const releaseGuardedControls = () => {
      queueMicrotask(() => {
        if (!draggingWasteRef.current) controlsRef.current?.setEnabled(true);
      });
    };

    canvas.addEventListener("pointerdown", guardWastePointerDown, { capture: true });
    canvas.addEventListener("pointerup", releaseGuardedControls, { capture: true });
    canvas.addEventListener("pointercancel", releaseGuardedControls, { capture: true });
    return () => {
      canvas.removeEventListener("pointerdown", guardWastePointerDown, { capture: true });
      canvas.removeEventListener("pointerup", releaseGuardedControls, { capture: true });
      canvas.removeEventListener("pointercancel", releaseGuardedControls, { capture: true });
    };
  }, [camera, gl, props.enabled, scene]);

  return (
    <>
      <color attach="background" args={["#dcebd5"]} />
      <fog attach="fog" args={["#dcebd5", 10.5, 20]} />
      <CameraRig compact={compact} />
      <OrbitCameraControls
        key={controlsEpoch}
        ref={controlsRef}
        enabled={!draggingWaste}
        enableZoom={!compact}
        target={cameraTarget}
        minDistance={compact ? 8.4 : 7.8}
        maxDistance={compact ? 11.2 : 13.2}
        minPolarAngle={Math.PI * 0.22}
        maxPolarAngle={Math.PI * 0.49}
      />

      <hemisphereLight intensity={1.42} color="#fff7dc" groundColor="#47634f" />
      <directionalLight position={[4.5, 8, 5.8]} intensity={2.35} color="#fff2cf" />
      <directionalLight position={[-5, 3.5, -3]} intensity={0.72} color="#acd9bc" />

      <GardenSortingStation compact={compact} />

      {layout.map((placement) => (
        <group
          key={placement.definition.category}
          position={placement.position}
          rotation={[0, placement.rotationY, 0]}
          scale={placement.scale}
        >
          <IndonesianWasteBin
            definition={placement.definition}
            position={[0, 0, 0]}
            highlighted={props.highlightedCategory === placement.definition.category}
            wrong={props.wrongCategory === placement.definition.category}
            reducedMotion={props.reducedMotion}
          />
        </group>
      ))}

      <DraggableWaste
        item={props.item}
        startPosition={startPosition}
        targets={targets}
        enabled={props.enabled}
        compact={compact}
        visualScale={compact ? 0.92 : 0.94}
        reducedMotion={props.reducedMotion}
        onDragChange={handleDragChange}
        onHoverChange={props.onHoverChange}
        onDrop={props.onDrop}
        onReturnComplete={props.onReturnComplete}
        onSuccessComplete={props.onSuccessComplete}
      />
    </>
  );
}

export function WasteSortingScene(props: WasteSortingSceneProps) {
  return (
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, 3.72, 10.7], fov: 38 }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
    >
      <SortingWorld {...props} />
    </Canvas>
  );
}
