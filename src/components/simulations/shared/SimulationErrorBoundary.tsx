import { Component, type ErrorInfo, type ReactNode } from "react";

type SimulationErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type SimulationErrorBoundaryState = {
  failed: boolean;
};

export class SimulationErrorBoundary extends Component<SimulationErrorBoundaryProps, SimulationErrorBoundaryState> {
  state: SimulationErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): SimulationErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Simulasi 3D gagal dimuat", error, info);
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
