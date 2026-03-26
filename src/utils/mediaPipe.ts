import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let faceLandmarkerInstance: FaceLandmarker | null = null;
let isInitializing = false;
let initializationPromise: Promise<FaceLandmarker | null> | null = null;

export const getFaceLandmarker = async (): Promise<FaceLandmarker | null> => {
  if (faceLandmarkerInstance) return faceLandmarkerInstance;
  if (isInitializing) return initializationPromise;

  isInitializing = true;
  initializationPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
      );
      
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });

      faceLandmarkerInstance = landmarker;
      return landmarker;
    } catch (err) {
      console.error("Failed to initialize FaceLandmarker singleton:", err);
      isInitializing = false;
      initializationPromise = null;
      return null;
    }
  })();

  return initializationPromise;
};
