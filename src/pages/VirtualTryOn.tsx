import React, { useState, useRef, useEffect, Suspense } from "react";
import Webcam from "react-webcam";
import { 
  Camera, 
  RotateCcw, 
  Download, 
  Eye, 
  Layers, 
  Maximize2, 
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Box,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { InventoryItem } from "../types";
import { cn } from "../lib/utils";
import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { getFaceLandmarker } from "../utils/mediaPipe";
import { GoogleGenAI } from "@google/genai";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

// --- ADVANCED AR COMPONENTS ---

/**
 * DynamicEnvironment: Uses the webcam feed as a real-time environment map
 * for realistic reflections on the glasses.
 */
function DynamicEnvironment({ webcamRef }: { webcamRef: React.RefObject<Webcam> }) {
  const { scene } = useThree();
  
  useFrame(() => {
    if (webcamRef.current && webcamRef.current.video) {
      const video = webcamRef.current.video;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // We create a video texture from the webcam
        const texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
      }
    }
  });

  return null;
}

/**
 * OccluderHead: Renders an invisible head mesh that hides the arms of the glasses
 * when they go behind the user's head.
 */
function OccluderHead({ arDataRef }: { arDataRef: React.RefObject<any> }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current && arDataRef.current && arDataRef.current.visible) {
      if (arDataRef.current.matrix) {
        const matrix = new THREE.Matrix4().fromArray(arDataRef.current.matrix);
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        matrix.decompose(position, quaternion, scale);

        // Adjust position slightly to center the head
        meshRef.current.position.set(position.x, position.y - 0.2, position.z + 4.8);
        meshRef.current.quaternion.copy(quaternion);
        meshRef.current.scale.set(0.85, 1.0, 0.85); // Approximate head size
      }
    }
  });

  return (
    <mesh ref={meshRef} visible={arDataRef.current?.visible || false}>
      <sphereGeometry args={[10, 32, 32]} />
      <meshBasicMaterial colorWrite={false} />
    </mesh>
  );
}

/**
 * LightEstimator: Analyzes the webcam feed to adjust the scene lighting
 */
function LightEstimator({ webcamRef }: { webcamRef: React.RefObject<Webcam> }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  useFrame(() => {
    if (webcamRef.current && webcamRef.current.video && lightRef.current) {
      const video = webcamRef.current.video;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 16;
          canvas.height = 16;
          ctx.drawImage(video, 0, 0, 16, 16);
          const data = ctx.getImageData(0, 0, 16, 16).data;
          
          let totalBrightness = 0;
          let leftBrightness = 0;
          let rightBrightness = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const brightness = (r + g + b) / 3;
            totalBrightness += brightness;

            const pixelIndex = i / 4;
            const x = pixelIndex % 16;
            if (x < 8) leftBrightness += brightness;
            else rightBrightness += brightness;
          }

          const avgBrightness = totalBrightness / (16 * 16 * 255);
          lightRef.current.intensity = 0.5 + avgBrightness * 1.5;
          
          // Move light based on where the room is brighter
          if (leftBrightness > rightBrightness) {
            lightRef.current.position.set(-10, 10, 10);
          } else {
            lightRef.current.position.set(10, 10, 10);
          }
        }
      }
    }
  });

  return <directionalLight ref={lightRef} position={[10, 10, 10]} intensity={1} />;
}

function GlassesModel({ url, arDataRef, manualOffset, baseScale = 1.0 }: { url: string, arDataRef: React.RefObject<any>, manualOffset: any, baseScale?: number }) {
  // Ensure the URL is absolute for the loader
  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  const { scene } = useGLTF(fullUrl);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current && arDataRef.current && arDataRef.current.visible) {
      if (arDataRef.current.matrix) {
        // Apply the transformation matrix from MediaPipe directly
        const matrix = new THREE.Matrix4().fromArray(arDataRef.current.matrix);
        
        // Decompose to apply manual offsets
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        matrix.decompose(position, quaternion, scale);

        // Apply position with manual offsets
        // Note: We don't invert X here because the parent group is mirrored
        groupRef.current.position.set(
          position.x + (manualOffset.x / 10), 
          position.y - (manualOffset.y / 10) - 0.3, // Adjusted down slightly for better fit
          position.z + 5
        );
        
        groupRef.current.quaternion.copy(quaternion);
        
        const finalScale = 0.085 * manualOffset.scale * baseScale; // Slightly smaller default
        groupRef.current.scale.set(finalScale, finalScale, finalScale);
      } else {
        // Fallback positioning
        const x = ((arDataRef.current.x + manualOffset.x) / 100 - 0.5) * 10;
        const y = -((arDataRef.current.y + manualOffset.y) / 100 - 0.5) * 7.5;
        groupRef.current.position.set(x, y, 5);
        groupRef.current.scale.setScalar(arDataRef.current.scale * manualOffset.scale * 0.085 * baseScale);
        groupRef.current.rotation.z = THREE.MathUtils.degToRad(arDataRef.current.rotation);
      }
    }
  });

  return (
    <group ref={groupRef} visible={arDataRef.current?.visible || false}>
      <primitive 
        object={scene} 
        rotation={[0, Math.PI, 0]} 
      />
    </group>
  );
}

import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { ModelErrorBoundary } from "../components/ModelErrorBoundary";

export default function VirtualTryOn() {
  const [frames, setFrames] = useState<InventoryItem[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [isModelValid, setIsModelValid] = useState<boolean | null>(null);
  const [isValidatingModel, setIsValidatingModel] = useState(false);
  
  const [vtoActive, setVtoActive] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  
  // AR Data Ref for 3D model (no re-renders)
  const arDataRef = useRef<{
    x: number;
    y: number;
    scale: number;
    rotation: number;
    visible: boolean;
    matrix: number[] | null;
  }>({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    visible: false,
    matrix: null
  });

  // AR State for 2D UI (throttled re-renders)
  const [arState, setArState] = useState({
    visible: false,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0
  });

  // Manual adjustments (offsets)
  const [manualOffset, setManualOffset] = useState({ x: 0, y: 0, scale: 1 });

  const stopVto = () => {
    setVtoActive(false);
    setIsCameraReady(false);
    setArState({ visible: false, x: 0, y: 0, scale: 1, rotation: 0 });
    arDataRef.current = { x: 0, y: 0, scale: 1, rotation: 0, visible: false, matrix: null };
  };

  const webcamRef = useRef<Webcam>(null);
  const requestRef = useRef<number>(undefined);
  const lastUpdateRef = useRef<number>(0);
  const lastStateUpdateRef = useRef<number>(0);

  useEffect(() => {
    const initFaceLandmarker = async () => {
      const landmarker = await getFaceLandmarker();
      if (landmarker) setFaceLandmarker(landmarker);
    };

    // Wait for auth to be fully initialized
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) return;

      const unsub = onSnapshot(collection(db, "inventory"), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        const frameItems = items.filter(i => i.type === 'frame' || i.type === 'sunglasses');
        setFrames(frameItems);
        if (frameItems.length > 0 && !selectedFrame) setSelectedFrame(frameItems[0]);
        setLoading(false);
      }, (err) => {
        console.error("Failed to fetch inventory", err);
        setLoading(false);
      });

      return () => unsub();
    });

    initFaceLandmarker();
    return () => unsubscribeAuth();
  }, [selectedFrame]);

  // Validate model URL before trying to load it in 3D
  useEffect(() => {
    if (selectedFrame?.model_url) {
      setIsValidatingModel(true);
      const fullUrl = selectedFrame.model_url.startsWith('http') 
        ? selectedFrame.model_url 
        : `${window.location.origin}${selectedFrame.model_url}`;
        
      fetch(fullUrl, { method: 'HEAD' })
        .then(res => {
          if (res.ok && selectedFrame.model_url?.toLowerCase().endsWith('.gltf')) {
            console.warn("GLTF model detected. These often fail if external assets are missing. Recommend using .glb");
          }
          setIsModelValid(res.ok);
          setIsValidatingModel(false);
        })
        .catch(() => {
          setIsModelValid(false);
          setIsValidatingModel(false);
        });
    } else {
      setIsModelValid(false);
      setIsValidatingModel(false);
    }
  }, [selectedFrame?.model_url]);

  const detectFace = () => {
    if (
      faceLandmarker &&
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const now = performance.now();
      
      // Detection loop
      if (now - lastUpdateRef.current > 33) {
        const results = faceLandmarker.detectForVideo(video, now);

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          
          const leftEye = landmarks[33];
          const rightEye = landmarks[263];
          const noseBridge = landmarks[168];

          const centerX = (leftEye.x + rightEye.x) / 2;
          const centerY = noseBridge.y;

          const dx = rightEye.x - leftEye.x;
          const dy = rightEye.y - leftEye.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          const rotation = Math.atan2(dy, dx) * (180 / Math.PI);

          // Update Ref (no re-render)
          arDataRef.current = {
            x: centerX * 100,
            y: centerY * 100,
            scale: distance * 1.6,
            rotation: rotation,
            visible: true,
            matrix: results.facialTransformationMatrixes?.[0]?.data || null
          };

          // Update State for 2D overlay (throttled to ~15fps to reduce lag)
          if (now - lastStateUpdateRef.current > 66) {
            setArState({
              visible: true,
              x: centerX * 100,
              y: centerY * 100,
              scale: distance * 1.6,
              rotation: rotation
            });
            lastStateUpdateRef.current = now;
          }
        } else {
          arDataRef.current.visible = false;
          if (arState.visible) {
            setArState(prev => ({ ...prev, visible: false }));
          }
        }
        lastUpdateRef.current = now;
      }
    }
    requestRef.current = requestAnimationFrame(detectFace);
  };

  useEffect(() => {
    if (isCameraReady && faceLandmarker && vtoActive) {
      requestRef.current = requestAnimationFrame(detectFace);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isCameraReady, faceLandmarker, vtoActive]);

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      const link = document.createElement("a");
      link.href = imageSrc;
      link.download = "eyepower-try-on.png";
      link.click();
    }
  };

  const askAiStylist = async () => {
    if (!webcamRef.current || !selectedFrame) return;
    
    setIsAiLoading(true);
    setShowAiModal(true);
    setAiAdvice(null);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Could not capture screenshot");

      // Extract base64 data
      const base64Data = imageSrc.split(',')[1];

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: `You are a professional optical stylist. Analyze this person wearing the ${selectedFrame.brand} ${selectedFrame.model} glasses. 
              Consider their face shape, skin tone, and the frame style. 
              Provide a professional critique and styling advice in 3-4 concise sentences. 
              Be encouraging but honest about the fit and color match.` },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Data
                }
              }
            ]
          }
        ]
      });

      setAiAdvice(response.text || "I'm sorry, I couldn't analyze the image. You look great though!");
    } catch (error) {
      console.error("AI Stylist Error:", error);
      setAiAdvice("The AI Stylist is currently busy assisting other customers. Please try again in a moment.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Virtual Try-On</h1>
          <p className="text-slate-500">Experience our collection in real-time using AI-assisted AR.</p>
        </div>
        <div className="flex items-center gap-3">
          {vtoActive && (
            <button 
              onClick={stopVto}
              className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-rose-500/20 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Stop VTO
            </button>
          )}
          <div className={cn(
            "px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all",
            arState.visible 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
          )}>
            <Zap className={cn("w-4 h-4", arState.visible && "animate-pulse")} />
            {arState.visible ? "Face Detected" : "Detecting Face..."}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Camera Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card overflow-hidden relative aspect-video bg-slate-900 border-white/5 shadow-2xl">
            {!vtoActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-50 bg-slate-950/80 backdrop-blur-md text-center p-8">
                <div className="w-24 h-24 bg-cyan-500/10 rounded-full flex items-center justify-center mb-2">
                  <Camera className="w-12 h-12 text-cyan-400" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-2xl font-bold text-white mb-3">Ready to See the Future?</h3>
                  <p className="text-slate-400 mb-8">
                    Experience our premium eyewear collection in augmented reality. Our AI will track your face to provide a realistic fit.
                  </p>
                  <button 
                    onClick={() => setVtoActive(true)}
                    className="px-10 py-4 gradient-bg rounded-2xl font-black text-white shadow-xl shadow-cyan-500/20 hover:scale-105 transition-all flex items-center gap-3 mx-auto"
                  >
                    <Zap className="w-6 h-6" /> Start Virtual Try On
                  </button>
                </div>
              </div>
            )}

            {vtoActive && !isCameraReady && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-slate-950">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Initializing AI Camera...</p>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-slate-950 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Camera Access Denied</h3>
                <p className="text-slate-500 max-w-xs">
                  Please enable camera permissions in your browser settings to use the Virtual Try-On feature.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-6 py-2 rounded-xl gradient-bg text-white font-bold"
                >
                  Retry Connection
                </button>
              </div>
            )}
            
            {vtoActive && (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/png"
                onUserMedia={() => {
                  setIsCameraReady(true);
                  setCameraError(null);
                }}
                onUserMediaError={(err) => {
                  console.error("Webcam Error:", err);
                  setCameraError(err.toString());
                }}
                className="w-full h-full object-cover"
                videoConstraints={{ facingMode: "user" }}
                mirrored={true}
                disablePictureInPicture={false}
                forceScreenshotSourceSize={false}
                imageSmoothing={true}
                screenshotQuality={1}
              />
            )}

            {vtoActive && isCameraReady && (
              <button 
                onClick={stopVto}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-rose-500/80 text-white hover:bg-rose-600 transition-all shadow-lg pointer-events-auto"
                title="Stop Camera"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* AR Overlay (2D or 3D) */}
            <div className="absolute inset-0 pointer-events-none z-30">
              {selectedFrame?.model_url && isModelValid !== false ? (
                <ModelErrorBoundary 
                  modelUrl={selectedFrame.model_url}
                  fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-3xl text-xs font-bold flex flex-col items-center gap-3 pointer-events-auto max-w-[250px] text-center backdrop-blur-md">
                      <AlertCircle className="w-8 h-8" />
                      <div>
                        <p className="mb-1">3D Model Loading Failed</p>
                        <p className="text-[10px] opacity-70 font-normal">
                          {selectedFrame.model_url?.toLowerCase().endsWith('.gltf') 
                            ? "This .gltf model may be missing its .bin or texture files. Try using a .glb file."
                            : "The 3D asset could not be loaded or is corrupted."}
                        </p>
                      </div>
                      <div className="mt-2 px-3 py-1 bg-rose-500/20 rounded-full">
                        Using 2D Fallback
                      </div>
                    </div>
                    {/* 2D Fallback Image */}
                    <AnimatePresence>
                      {arState.visible && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ 
                            opacity: 1,
                            left: `${(100 - arState.x) + manualOffset.x}%`,
                            top: `${arState.y + manualOffset.y}%`,
                            scale: arState.scale * manualOffset.scale,
                            rotate: -arState.rotation
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          style={{
                            position: 'absolute',
                            transform: 'translate(-50%, -50%)',
                            width: '100%',
                            maxWidth: '800px',
                          }}
                        >
                          <img 
                            src={selectedFrame.image_url || `https://picsum.photos/seed/${selectedFrame.id}/400/200`} 
                            alt="Frame Overlay"
                            className="w-full h-auto drop-shadow-2xl"
                            referrerPolicy="no-referrer"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                }>
                  {isValidatingModel ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-cyan-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Validating 3D Model...</p>
                      </div>
                    </div>
                  ) : (
                    <Canvas gl={{ preserveDrawingBuffer: true }}>
                      <PerspectiveCamera makeDefault position={[0, 0, 10]} />
                      <Suspense fallback={null}>
                        <DynamicEnvironment webcamRef={webcamRef} />
                        <LightEstimator webcamRef={webcamRef} />
                        <group scale={[-1, 1, 1]}>
                          <OccluderHead arDataRef={arDataRef} />
                          <GlassesModel 
                            url={selectedFrame.model_url} 
                            arDataRef={arDataRef} 
                            manualOffset={manualOffset} 
                            baseScale={selectedFrame.base_scale}
                          />
                        </group>
                        <ContactShadows opacity={0.5} scale={10} blur={1} far={10} resolution={256} color="#000000" />
                      </Suspense>
                      <ambientLight intensity={0.5} />
                    </Canvas>
                  )}
                </ModelErrorBoundary>
              ) : (
                <AnimatePresence>
                  {selectedFrame && arState.visible && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: 1,
                        left: `${(100 - arState.x) + manualOffset.x}%`,
                        top: `${arState.y + manualOffset.y}%`,
                        scale: arState.scale * manualOffset.scale,
                        rotate: -arState.rotation
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      style={{
                        position: 'absolute',
                        transform: 'translate(-50%, -50%)',
                        width: '100%',
                        maxWidth: '800px',
                      }}
                    >
                      <img 
                        src={selectedFrame.image_url || `https://picsum.photos/seed/${selectedFrame.id}/400/200`} 
                        alt="Frame Overlay"
                        className="w-full h-auto drop-shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* Controls Overlay */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40">
              <button 
                onClick={() => setManualOffset(prev => ({ ...prev, scale: prev.scale - 0.05 }))}
                className="p-3 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all"
                title="Decrease Size"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
              
              <button 
                onClick={askAiStylist}
                className="p-4 rounded-2xl bg-indigo-500/80 backdrop-blur-md border border-indigo-500/20 text-white hover:bg-indigo-500 transition-all shadow-lg flex items-center gap-2"
                title="AI Stylist Advice"
              >
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">AI Stylist</span>
              </button>

              <button 
                onClick={handleCapture}
                className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center text-white shadow-2xl shadow-cyan-500/40 hover:scale-110 active:scale-95 transition-all"
                title="Capture Photo"
              >
                <Camera className="w-8 h-8" />
              </button>

              <button 
                onClick={() => setManualOffset(prev => ({ ...prev, scale: prev.scale + 0.05 }))}
                className="p-3 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all"
                title="Increase Size"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>

            {/* Manual Adjustment Controls */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-40">
              <button 
                onClick={() => setManualOffset(p => ({ ...p, y: p.y - 1 }))} 
                className="p-2 rounded-lg bg-slate-950/80 border border-white/10 text-white hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="w-5 h-5 rotate-90" />
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => setManualOffset(p => ({ ...p, x: p.x - 1 }))} 
                  className="p-2 rounded-lg bg-slate-950/80 border border-white/10 text-white hover:bg-white/10 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setManualOffset({ x: 0, y: 0, scale: 1 })} 
                  className="p-2 rounded-lg bg-slate-950/80 border border-white/10 text-white hover:bg-white/10 transition-all"
                  title="Reset Alignment"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setManualOffset(p => ({ ...p, x: p.x + 1 }))} 
                  className="p-2 rounded-lg bg-slate-950/80 border border-white/10 text-white hover:bg-white/10 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button 
                onClick={() => setManualOffset(p => ({ ...p, y: p.y + 1 }))} 
                className="p-2 rounded-lg bg-slate-950/80 border border-white/10 text-white hover:bg-white/10 transition-all"
              >
                <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">AI Tracking</p>
                <p className="text-slate-500 text-xs">Real-time landmark detection</p>
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">AR Overlay</p>
                <p className="text-slate-500 text-xs">Dynamic frame positioning</p>
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Box className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">3D Support</p>
                <p className="text-slate-500 text-xs">GLB/GLTF model rendering</p>
              </div>
            </div>
          </div>
        </div>

        {/* Frame Selection */}
        <div className="space-y-6">
          <div className="glass-card p-6 border-white/5 h-[calc(100vh-250px)] flex flex-col">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              Select Frames
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {frames.map((frame) => (
                <button
                  key={frame.id}
                  onClick={() => setSelectedFrame(frame)}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all text-left group relative overflow-hidden",
                    selectedFrame?.id === frame.id 
                      ? "bg-cyan-500/10 border-cyan-500/50" 
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-800 border border-white/10">
                      <img 
                        src={frame.image_url || `https://picsum.photos/seed/${frame.id}/200/100`} 
                        alt={frame.model} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{frame.brand}</p>
                        {frame.model_url && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[8px] font-bold uppercase">3D</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">{frame.model}</p>
                      <p className="text-xs text-cyan-400 font-bold mt-1">${frame.price}</p>
                    </div>
                  </div>
                  {selectedFrame?.id === frame.id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/10">
              <button className="w-full gradient-bg text-white py-3 rounded-xl font-bold shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Download Collection
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* AI Stylist Modal */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAiModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass-card overflow-hidden shadow-2xl border-indigo-500/30"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white">AI Stylist Advice</h3>
                  </div>
                  <button 
                    onClick={() => setShowAiModal(false)}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {isAiLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full"></div>
                        <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <p className="text-slate-400 animate-pulse">Analyzing your style...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-slate-300 leading-relaxed italic">
                        "{aiAdvice}"
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <p className="text-xs text-slate-400">
                          This advice is generated by AI based on your current facial landmarks and frame selection.
                        </p>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowAiModal(false)}
                    className="w-full py-4 gradient-bg rounded-xl font-bold text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all"
                  >
                    Got it, thanks!
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
