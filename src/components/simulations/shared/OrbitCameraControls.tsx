import { useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { MOUSE, TOUCH } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type OrbitCameraControlsProps = {
  enabled?: boolean;
  enableZoom?: boolean;
  target?: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
};

export type OrbitCameraControlsHandle = {
  setEnabled: (enabled: boolean) => void;
};

const DEFAULT_TARGET: [number, number, number] = [0, 0, 0];

export const OrbitCameraControls = forwardRef<OrbitCameraControlsHandle, OrbitCameraControlsProps>(
  function OrbitCameraControls({
    enabled = true,
    enableZoom = true,
    target = DEFAULT_TARGET,
    minDistance = 4,
    maxDistance = 12,
    minPolarAngle = Math.PI * 0.2,
    maxPolarAngle = Math.PI * 0.58,
  }: OrbitCameraControlsProps, forwardedRef) {
    const { camera, gl, invalidate } = useThree();
    const controlsRef = useRef<OrbitControls | null>(null);
    const [targetX, targetY, targetZ] = target;

    useImperativeHandle(forwardedRef, () => ({
      setEnabled(nextEnabled: boolean) {
        if (controlsRef.current) controlsRef.current.enabled = nextEnabled;
      },
    }), []);

    useEffect(() => {
      const controls = new OrbitControls(camera, gl.domElement);

      controls.enableDamping = false;
      controls.enablePan = false;
      controls.rotateSpeed = 0.58;
      controls.zoomSpeed = 0.72;
      controls.mouseButtons.LEFT = MOUSE.ROTATE;
      controls.mouseButtons.MIDDLE = MOUSE.DOLLY;
      controls.mouseButtons.RIGHT = MOUSE.ROTATE;
      controls.touches.ONE = TOUCH.ROTATE;
      controls.touches.TWO = TOUCH.DOLLY_ROTATE;

      const handleChange = () => invalidate();
      controls.addEventListener("change", handleChange);
      controlsRef.current = controls;

      return () => {
        controls.removeEventListener("change", handleChange);
        controls.dispose();
        controlsRef.current = null;
      };
    }, [camera, gl, invalidate]);

    useEffect(() => {
      const controls = controlsRef.current;
      if (!controls) return;

      controls.enabled = enabled;
      controls.enableZoom = enableZoom;
      controls.minDistance = minDistance;
      controls.maxDistance = maxDistance;
      controls.minPolarAngle = minPolarAngle;
      controls.maxPolarAngle = maxPolarAngle;
      controls.target.set(targetX, targetY, targetZ);
      controls.update();
      invalidate();
    }, [
      camera,
      enableZoom,
      enabled,
      gl,
      invalidate,
      maxDistance,
      maxPolarAngle,
      minDistance,
      minPolarAngle,
      targetX,
      targetY,
      targetZ,
    ]);

    return null;
  },
);
