import React from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  modelUrl?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ModelErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMessage: error.message || "Unknown error" };
  }

  componentDidCatch(error: any) {
    console.error("Model loading failed:", error);
    // If it's a GLTF error about missing buffers/textures, we can log it specifically
    if (error.message?.includes("Failed to load buffer") || error.message?.includes("Couldn't load texture")) {
      console.warn("This model appears to be a .gltf with missing external dependencies (.bin or textures). Recommend using .glb instead.");
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-3xl text-xs font-bold flex flex-col items-center gap-3 pointer-events-auto max-w-[250px] text-center backdrop-blur-md">
            <AlertCircle className="w-8 h-8" />
            <div>
              <p className="mb-1">3D Model Loading Failed</p>
              <p className="text-[10px] opacity-70 font-normal">
                {this.props.modelUrl?.toLowerCase().endsWith('.gltf') 
                  ? "This .gltf model may be missing its .bin or texture files. Try using a .glb file."
                  : "The 3D asset could not be loaded or is corrupted."}
              </p>
            </div>
            <div className="mt-2 px-3 py-1 bg-rose-500/20 rounded-full">
              Using 2D Fallback
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
