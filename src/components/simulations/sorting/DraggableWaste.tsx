import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import { MathUtils, Plane, Vector2, Vector3, type Group } from "three";
import type { WasteCategory } from "./sortingBins";
import { WasteObject } from "./WasteObject";
import type { WasteItem } from "./wasteItems";

export type SortingDropTarget = {
  category: WasteCategory;
  mouth: [number, number, number];
};

type DraggableWasteProps = {
  item: WasteItem;
  startPosition: [number, number, number];
  targets: SortingDropTarget[];
  enabled: boolean;
  compact: boolean;
  visualScale: number;
  reducedMotion: boolean;
  onDragChange: (dragging: boolean) => void;
  onHoverChange: (category: WasteCategory | null) => void;
  onDrop: (category: WasteCategory | null) => void;
  onReturnComplete: () => void;
  onSuccessComplete: () => void;
};

type ItemAnimation = {
  kind: "return" | "success";
  startedAt: number;
  duration: number;
  from: Vector3;
  target: Vector3;
};

type PointerCaptureTarget = EventTarget & {
  setPointerCapture: (pointerId: number) => void;
  hasPointerCapture: (pointerId: number) => boolean;
  releasePointerCapture: (pointerId: number) => void;
};

const tempProjected = new Vector3();
const tempDirection = new Vector3();
const tempPoint = new Vector3();

function findDropTarget(
  pointer: Vector2,
  targets: SortingDropTarget[],
  camera: Parameters<Vector3["project"]>[0],
  compact: boolean,
): WasteCategory | null {
  const threshold = compact ? 0.31 : 0.2;
  let closest: WasteCategory | null = null;
  let closestDistance = threshold * threshold;

  targets.forEach((target) => {
    tempProjected.set(...target.mouth).project(camera);
    const distance = ((pointer.x - tempProjected.x) ** 2) + ((pointer.y - tempProjected.y) ** 2);
    if (distance > closestDistance) return;
    closestDistance = distance;
    closest = target.category;
  });

  return closest;
}

export function DraggableWaste({
  item,
  startPosition,
  targets,
  enabled,
  compact,
  visualScale,
  reducedMotion,
  onDragChange,
  onHoverChange,
  onDrop,
  onReturnComplete,
  onSuccessComplete,
}: DraggableWasteProps) {
  const groupRef = useRef<Group>(null);
  const activePointerRef = useRef<number | null>(null);
  const hoveredTargetRef = useRef<WasteCategory | null>(null);
  const dragPlaneRef = useRef(new Plane());
  const grabOffsetRef = useRef(new Vector3());
  const animationRef = useRef<ItemAnimation | null>(null);
  const capturedTargetRef = useRef<PointerCaptureTarget | null>(null);
  const { camera, gl, invalidate } = useThree();

  const resetTransform = useCallback(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.set(...startPosition);
    group.rotation.set(0, 0, 0);
    group.scale.setScalar(1);
    group.visible = true;
    invalidate();
  }, [invalidate, startPosition]);

  const beginReturn = useCallback(() => {
    const group = groupRef.current;
    if (!group) return;

    if (reducedMotion) {
      resetTransform();
      onReturnComplete();
      return;
    }

    animationRef.current = {
      kind: "return",
      startedAt: performance.now(),
      duration: 0.48,
      from: group.position.clone(),
      target: new Vector3(...startPosition),
    };
    invalidate();
  }, [invalidate, onReturnComplete, reducedMotion, resetTransform, startPosition]);

  const releasePointerCapture = useCallback((pointerId: number) => {
    const captureTarget = capturedTargetRef.current;
    capturedTargetRef.current = null;
    if (!captureTarget?.hasPointerCapture(pointerId)) return;

    try {
      captureTarget.releasePointerCapture(pointerId);
    } catch {
      // Capture can already be released by the browser during pointercancel/blur.
    }
  }, []);

  const cancelActiveDrag = useCallback(() => {
    const pointerId = activePointerRef.current;
    if (pointerId === null) return;

    // Clear our state before releasing capture. lostpointercapture may fire
    // synchronously and must not start a second return animation.
    activePointerRef.current = null;
    hoveredTargetRef.current = null;
    releasePointerCapture(pointerId);
    onHoverChange(null);
    onDragChange(false);
    beginReturn();
  }, [beginReturn, onDragChange, onHoverChange, releasePointerCapture]);

  const finishActiveDrag = useCallback((pointerId: number) => {
    if (activePointerRef.current !== pointerId) return;

    const group = groupRef.current;
    const targetCategory = hoveredTargetRef.current;

    // The global pointerup fallback can run before React Three Fiber's
    // object handler. Clear first so every later delivery becomes a no-op.
    activePointerRef.current = null;
    hoveredTargetRef.current = null;
    releasePointerCapture(pointerId);
    onHoverChange(null);
    onDragChange(false);
    onDrop(targetCategory);

    if (!group || targetCategory !== item.category) {
      beginReturn();
      return;
    }

    const target = targets.find((candidate) => candidate.category === targetCategory);
    if (!target) {
      beginReturn();
      return;
    }

    if (reducedMotion) {
      group.position.set(target.mouth[0], target.mouth[1] - 0.7, target.mouth[2]);
      group.scale.setScalar(0.16);
      group.visible = false;
      invalidate();
      onSuccessComplete();
      return;
    }

    animationRef.current = {
      kind: "success",
      startedAt: performance.now(),
      duration: 0.82,
      from: group.position.clone(),
      target: new Vector3(...target.mouth),
    };
    invalidate();
  }, [
    beginReturn,
    invalidate,
    item.category,
    onDragChange,
    onDrop,
    onHoverChange,
    onSuccessComplete,
    reducedMotion,
    releasePointerCapture,
    targets,
  ]);

  useEffect(() => {
    const pointerId = activePointerRef.current;
    activePointerRef.current = null;
    if (pointerId !== null) releasePointerCapture(pointerId);
    hoveredTargetRef.current = null;
    animationRef.current = null;
    onDragChange(false);
    onHoverChange(null);
    resetTransform();
  }, [item.id, onDragChange, onHoverChange, releasePointerCapture, resetTransform]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") cancelActiveDrag();
    };

    window.addEventListener("blur", cancelActiveDrag);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("blur", cancelActiveDrag);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const pointerId = activePointerRef.current;
      activePointerRef.current = null;
      if (pointerId !== null) releasePointerCapture(pointerId);
    };
  }, [cancelActiveDrag, releasePointerCapture]);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleNativePointerUp = (event: PointerEvent) => {
      finishActiveDrag(event.pointerId);
    };
    const handleNativeInterruption = (event: PointerEvent) => {
      if (activePointerRef.current === event.pointerId) cancelActiveDrag();
    };

    // R3F currently uses pointercancel/lostpointercapture to clean its own
    // capture map without forwarding both events to the object handler. A
    // native safety net prevents an interrupted Android gesture from leaving
    // the object in `dragging` and OrbitControls disabled forever.
    window.addEventListener("pointerup", handleNativePointerUp, { capture: true });
    canvas.addEventListener("pointercancel", handleNativeInterruption, { capture: true });
    canvas.addEventListener("lostpointercapture", handleNativeInterruption, { capture: true });
    return () => {
      window.removeEventListener("pointerup", handleNativePointerUp, { capture: true });
      canvas.removeEventListener("pointercancel", handleNativeInterruption, { capture: true });
      canvas.removeEventListener("lostpointercapture", handleNativeInterruption, { capture: true });
    };
  }, [cancelActiveDrag, finishActiveDrag, gl]);

  useEffect(() => {
    if (!enabled) cancelActiveDrag();
  }, [cancelActiveDrag, enabled]);

  useEffect(() => {
    if (!reducedMotion) return;
    const group = groupRef.current;
    const animation = animationRef.current;
    if (!group || !animation) return;

    animationRef.current = null;
    if (animation.kind === "return") {
      resetTransform();
      onReturnComplete();
      return;
    }

    group.position.copy(animation.target);
    group.position.y -= 0.7;
    group.rotation.set(0, 0, 0);
    group.scale.setScalar(0.16);
    group.visible = false;
    invalidate();
    onSuccessComplete();
  }, [invalidate, onReturnComplete, onSuccessComplete, reducedMotion, resetTransform]);

  useFrame(() => {
    const group = groupRef.current;
    const animation = animationRef.current;
    if (!group || !animation) return;

    const elapsed = (performance.now() - animation.startedAt) / 1000;
    const progress = Math.min(1, elapsed / animation.duration);
    const eased = 1 - ((1 - progress) ** 3);

    if (animation.kind === "return") {
      group.position.lerpVectors(animation.from, animation.target, eased);
      group.position.y += Math.sin(progress * Math.PI) * 0.24;
      group.rotation.y = Math.sin(progress * Math.PI) * 0.45;
      group.scale.setScalar(1);
    } else {
      const arrivalProgress = Math.min(1, progress / 0.62);
      const sinkProgress = Math.max(0, (progress - 0.58) / 0.42);
      group.position.lerpVectors(animation.from, animation.target, 1 - ((1 - arrivalProgress) ** 3));
      group.position.y -= sinkProgress * 1.05;
      group.rotation.y = progress * Math.PI * 1.35;
      group.scale.setScalar(MathUtils.lerp(1, 0.16, sinkProgress));
    }

    if (progress < 1) {
      invalidate();
      return;
    }

    animationRef.current = null;
    if (animation.kind === "return") {
      resetTransform();
      onReturnComplete();
    } else {
      group.visible = false;
      invalidate();
      onSuccessComplete();
    }
  });

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!enabled || !event.nativeEvent.isPrimary || activePointerRef.current !== null) return;
    const group = groupRef.current;
    if (!group) return;

    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    animationRef.current = null;
    activePointerRef.current = event.pointerId;
    const captureTarget = event.target as PointerCaptureTarget | null;
    capturedTargetRef.current = captureTarget;
    captureTarget?.setPointerCapture(event.pointerId);

    camera.getWorldDirection(tempDirection);
    dragPlaneRef.current.setFromNormalAndCoplanarPoint(tempDirection, group.position);
    if (event.ray.intersectPlane(dragPlaneRef.current, tempPoint)) {
      grabOffsetRef.current.copy(group.position).sub(tempPoint);
    } else {
      grabOffsetRef.current.set(0, 0, 0);
    }

    onDragChange(true);
    invalidate();
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (activePointerRef.current !== event.pointerId) return;
    const group = groupRef.current;
    if (!group) return;

    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    if (event.ray.intersectPlane(dragPlaneRef.current, tempPoint)) {
      group.position.copy(tempPoint).add(grabOffsetRef.current);
      group.position.x = MathUtils.clamp(group.position.x, -4.8, 4.8);
      group.position.y = MathUtils.clamp(group.position.y, -0.2, 3.1);
      group.rotation.y += 0.035;
    }

    const nextTarget = findDropTarget(event.pointer, targets, camera, compact);
    if (nextTarget !== hoveredTargetRef.current) {
      hoveredTargetRef.current = nextTarget;
      onHoverChange(nextTarget);
    }
    invalidate();
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (activePointerRef.current !== event.pointerId) return;
    event.stopPropagation();
    // Do not stopImmediatePropagation here. OrbitControls must receive the
    // pointerup event so its internal touch-pointer list is always cleared.
    finishActiveDrag(event.pointerId);
  };

  const handlePointerInterrupted = (event: ThreeEvent<PointerEvent>) => {
    if (activePointerRef.current !== event.pointerId) return;

    event.stopPropagation();
    activePointerRef.current = null;
    hoveredTargetRef.current = null;
    releasePointerCapture(event.pointerId);
    onHoverChange(null);
    onDragChange(false);
    beginReturn();
  };

  return (
    <group ref={groupRef} position={startPosition}>
      <mesh position={[0, -0.57, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.52, 1]}>
        <circleGeometry args={[0.52, 24]} />
        <meshBasicMaterial color="#244b39" depthWrite={false} opacity={0.18} transparent />
      </mesh>
      <group scale={visualScale}>
        <WasteObject shape={item.shape} />
      </group>
      <mesh
        name="draggable-waste-hit-target"
        userData={{ isDraggableWasteHitTarget: true }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerInterrupted}
        onLostPointerCapture={handlePointerInterrupted}
      >
        <sphereGeometry args={[0.82, 16, 12]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>
    </group>
  );
}
