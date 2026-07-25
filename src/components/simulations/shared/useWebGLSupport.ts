import { useState } from "react";

function detectWebGL(): boolean {
  if (typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const supported = Boolean(context);

    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return supported;
  } catch {
    return false;
  }
}

export function useWebGLSupport() {
  const [supported] = useState(detectWebGL);
  return supported;
}
