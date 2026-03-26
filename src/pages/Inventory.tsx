import React, { useState, useEffect, Suspense } from "react";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  AlertCircle,
  TrendingDown,
  ShoppingCart,
  Eye,
  X,
  Camera,
  CheckCircle2,
  Loader2,
  Box
} from "lucide-react";
import { InventoryItem } from "../types";
import { ModelErrorBoundary } from "../components/ModelErrorBoundary";
import { motion, AnimatePresence } from "motion/react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei";
import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { getFaceLandmarker } from "../utils/mediaPipe";
import * as THREE from "three";
import { db, auth } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  setDoc
} from "firebase/firestore";
import { handleFirestoreError, OperationType, logActivity } from "../firebaseUtils";

function Glasses3DPreview({ url, arDataRef }: { url: string, arDataRef?: React.RefObject<any> }) {
  const { scene } = useGLTF(url);
  const groupRef = React.useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current && arDataRef?.current && arDataRef.current.visible) {
      if (arDataRef.current.matrix) {
        const matrix = new THREE.Matrix4().fromArray(arDataRef.current.matrix);
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        matrix.decompose(position, quaternion, scale);

        groupRef.current.position.set(position.x, position.y - 0.3, position.z + 5);
        groupRef.current.quaternion.copy(quaternion);
        groupRef.current.scale.setScalar(0.085);
      }
    }
  });

  return (
    <group ref={groupRef} visible={arDataRef?.current?.visible || false}>
      <primitive 
        object={scene} 
        rotation={[0, Math.PI, 0]} 
        scale={2} 
        position={[0, 0, 0]} 
      />
    </group>
  );
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [vtoItem, setVtoItem] = useState<InventoryItem | null>(null);
  const [isVtoOpen, setIsVtoOpen] = useState(false);
  const [vtoLoading, setVtoLoading] = useState(false);
  const [vtoActive, setVtoActive] = useState(false);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const requestRef = React.useRef<number>(undefined);
  const arDataRef = React.useRef<any>({ visible: false, matrix: null });

  const [newItem, setNewItem] = useState({
    brand: "",
    model: "",
    type: "frame",
    price: 0,
    stock: 0,
    image_url: "",
    model_url: "",
    base_scale: 1.0,
    details: "{}"
  });
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'model_url') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Warning for .gltf files
    if (field === 'model_url') {
      const hasGltf = Array.from(files).some(f => f.name.toLowerCase().endsWith('.gltf'));
      if (hasGltf) {
        const confirmGltf = window.confirm(
          "Warning: .gltf files often require additional .bin and texture files to load correctly. " +
          "Please select ALL associated files (the .gltf, the .bin, and any textures) together. " +
          "We strongly recommend using .glb files instead, as they are self-contained. " +
          "Do you want to proceed?"
        );
        if (!confirmGltf) return;
      }
    }

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("eyepower_token")}` 
        },
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      
      // If multiple files were uploaded, find the .gltf or .glb as the main URL
      let finalUrl = data.url;
      if (data.files && data.files.length > 1) {
        const modelFile = data.files.find((f: any) => 
          f.name.toLowerCase().endsWith('.gltf') || f.name.toLowerCase().endsWith('.glb')
        );
        if (modelFile) finalUrl = modelFile.url;
      }
      
      setNewItem(prev => ({ ...prev, [field]: finalUrl }));
    } catch (err) {
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("eyepower_user");
    if (savedUser) setUser(JSON.parse(savedUser));
    
    // Switch to Firestore real-time listener
    const q = query(collection(db, "inventory"), orderBy("brand", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id as any,
        ...doc.data()
      })) as InventoryItem[];
      setItems(inventoryData);
      setLoading(false);
    }, (err) => {
      console.error("Firestore inventory error:", err);
      handleFirestoreError(err, OperationType.LIST, "inventory");
      setError("Failed to sync inventory with cloud.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const initFaceLandmarker = async () => {
      const landmarker = await getFaceLandmarker();
      if (landmarker) setFaceLandmarker(landmarker);
    };
    if (vtoActive) {
      initFaceLandmarker();
    }
  }, [vtoActive]);

  const detectFace = () => {
    if (faceLandmarker && videoRef.current && videoRef.current.readyState === 4) {
      const now = performance.now();
      const results = faceLandmarker.detectForVideo(videoRef.current, now);
      if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
        arDataRef.current = {
          visible: true,
          matrix: results.facialTransformationMatrixes[0].data
        };
      } else {
        arDataRef.current.visible = false;
      }
    }
    requestRef.current = requestAnimationFrame(detectFace);
  };

  useEffect(() => {
    if (vtoActive && faceLandmarker) {
      requestRef.current = requestAnimationFrame(detectFace);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [vtoActive, faceLandmarker]);

  const fetchInventory = () => {
    fetch("/api/inventory", {
      headers: { Authorization: `Bearer ${localStorage.getItem("eyepower_token")}` }
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    })
    .then(data => {
      setItems(data);
    })
    .catch(err => {
      console.error("Failed to fetch inventory", err);
      setError(err.message);
    })
    .finally(() => {
      setLoading(false);
    });
  };

  const handleAddToCart = async (item: InventoryItem) => {
    if (!auth.currentUser) {
      alert("Please sign in to add items to cart.");
      return;
    }

    try {
      const cartRef = doc(db, `cart/${auth.currentUser.uid}_${item.id}`);
      await setDoc(cartRef, {
        uid: auth.currentUser.uid,
        inventory_id: item.id,
        brand: item.brand,
        model: item.model,
        price: item.price,
        image_url: item.image_url || "",
        type: item.type,
        quantity: 1, // Simple increment logic could be added here
        added_at: new Date().toISOString()
      }, { merge: true });
      
      alert(`${item.brand} ${item.model} added to cart!`);
    } catch (err) {
      console.error("Failed to add to cart", err);
      handleFirestoreError(err, OperationType.WRITE, "cart");
    }
  };

  const startVto = (item: InventoryItem) => {
    console.log("Opening VTO modal for item:", item.brand, item.model);
    setVtoItem(item);
    setIsVtoOpen(true);
    setVtoActive(false);
    setVtoLoading(false);
  };

  const setupCamera = async () => {
    console.log("Setting up camera for VTO...");
    setVtoLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setVtoActive(true);
        setVtoLoading(false);
        console.log("Camera stream started successfully");
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Camera access denied or not available. Please ensure you have granted camera permissions.");
      setVtoLoading(false);
    }
  };

  const stopVto = () => {
    console.log("Stopping VTO and closing modal");
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => {
        track.stop();
        console.log("Stopped camera track:", track.label);
      });
      videoRef.current.srcObject = null;
    }
    setIsVtoOpen(false);
    setVtoItem(null);
    setVtoActive(false);
  };

  const startAdd = () => {
    setNewItem({ 
      brand: "", 
      model: "", 
      type: "frame", 
      price: 0, 
      stock: 0, 
      image_url: "", 
      model_url: "", 
      base_scale: 1.0, 
      details: "{}" 
    });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    
    try {
      let parsedDetails = {};
      try {
        parsedDetails = typeof newItem.details === 'string' ? JSON.parse(newItem.details || "{}") : newItem.details;
      } catch (e) {
        alert("Invalid JSON in details field.");
        return;
      }

      const itemData = {
        brand: newItem.brand,
        model: newItem.model,
        type: newItem.type,
        price: Number(newItem.price),
        stock: Number(newItem.stock),
        image_url: newItem.image_url,
        model_url: newItem.model_url,
        base_scale: Number(newItem.base_scale),
        details: parsedDetails,
        updated_at: new Date().toISOString()
      };
      
      if (isEditing && editingId) {
        const itemRef = doc(db, "inventory", editingId);
        await updateDoc(itemRef, itemData);
        await logActivity("Update Inventory", `Updated item: ${itemData.brand} ${itemData.model}`);
      } else {
        await addDoc(collection(db, "inventory"), {
          ...itemData,
          created_at: new Date().toISOString()
        });
        await logActivity("Add Inventory", `Added new item: ${itemData.brand} ${itemData.model}`);
      }
      
      setShowModal(false);
      setIsEditing(false);
      setEditingId(null);
      setNewItem({ brand: "", model: "", type: "frame", price: 0, stock: 0, image_url: "", model_url: "", base_scale: 1.0, details: "{}" });
      alert(isEditing ? "Item updated successfully!" : "Item added to inventory!");
    } catch (err: any) {
      console.error("Inventory action error:", err);
      alert(`Failed to ${isEditing ? 'update' : 'add'} item: ${err.message || 'Unknown error'}`);
      // handleFirestoreError(err, isEditing ? OperationType.UPDATE : OperationType.CREATE, "inventory");
    }
  };

  const startEdit = (item: InventoryItem) => {
    setNewItem({
      brand: item.brand,
      model: item.model,
      type: item.type,
      price: item.price,
      stock: item.stock,
      image_url: item.image_url || "",
      model_url: item.model_url || "",
      base_scale: item.base_scale || 1.0,
      details: typeof item.details === 'string' ? item.details : JSON.stringify(item.details)
    });
    setEditingId(item.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, "inventory", id));
      await logActivity("Delete Inventory", `Deleted item ID: ${id}`);
      alert("Item deleted successfully!");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(`Failed to delete item: ${err.message || 'Unknown error'}`);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = (item.brand + " " + item.model).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {user?.role === 'patient' ? 'Shop Eyewear' : 'Inventory Management'}
          </h1>
          <p className="text-slate-400 mt-1">
            {user?.role === 'patient' ? 'Browse and virtually try on our premium collection.' : 'Manage frames, lenses, and optical equipment stock.'}
          </p>
        </div>
        {user?.role === 'admin' && (
          <button 
            onClick={startAdd}
            className="gradient-bg px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-5 h-5" />
            Add New Item
          </button>
        )}
      </div>

      {error && (
        <div className="glass-card p-8 text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Inventory</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button 
            onClick={() => fetchInventory()}
            className="gradient-bg px-6 py-2 rounded-xl font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* VTO Modal */}
      <AnimatePresence>
        {isVtoOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={stopVto}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl glass-card overflow-hidden shadow-2xl border-cyan-500/30"
            >
              <div className="flex flex-col md:flex-row h-full">
                <div className="relative flex-1 bg-black aspect-video md:aspect-auto">
                  {!vtoActive && !vtoLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center p-8">
                      <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-2">
                        <Camera className="w-10 h-10 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">Ready to Try On?</h3>
                        <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">
                          Click the button below to start your camera and see how these {vtoItem?.brand} frames look on you.
                        </p>
                        <button 
                          onClick={setupCamera}
                          className="px-8 py-3 gradient-bg rounded-xl font-bold flex items-center gap-2 mx-auto shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all"
                        >
                          <Camera className="w-5 h-5" /> Start Camera
                        </button>
                      </div>
                    </div>
                  )}
                  {vtoLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-cyan-400 bg-slate-950/50 backdrop-blur-sm">
                      <Loader2 className="w-12 h-12 animate-spin" />
                      <p className="text-sm font-bold uppercase tracking-widest">Initializing AI Try-On...</p>
                    </div>
                  )}
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className={`w-full h-full object-cover mirror ${vtoActive ? 'opacity-100' : 'opacity-0'}`} 
                  />
                  {vtoActive && vtoItem && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      {vtoItem.model_url ? (
                        <div className="w-full h-full">
                          <ModelErrorBoundary modelUrl={vtoItem.model_url}>
                            <Canvas>
                              <PerspectiveCamera makeDefault position={[0, 0, 5]} />
                              <Suspense fallback={null}>
                                <Environment preset="city" />
                                <group scale={[-1, 1, 1]}>
                                  <Glasses3DPreview url={vtoItem.model_url} arDataRef={arDataRef} />
                                </group>
                                <ContactShadows opacity={0.5} scale={10} blur={1} far={10} resolution={256} color="#000000" />
                              </Suspense>
                              <ambientLight intensity={0.5} />
                              <pointLight position={[10, 10, 10]} />
                            </Canvas>
                          </ModelErrorBoundary>
                        </div>
                      ) : (
                        <div className="relative w-64 h-32">
                          <img 
                            src={vtoItem.image_url || `https://picsum.photos/seed/${vtoItem.id}/400/300`} 
                            alt="VTO Overlay"
                            className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-cyan-500/20 backdrop-blur-md border border-cyan-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                          {vtoItem.model_url ? "3D Model Loaded" : "AI Face Tracked"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-full md:w-80 p-8 flex flex-col justify-between bg-slate-900">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <h2 className="text-2xl font-black">{vtoItem?.brand}</h2>
                      <button onClick={stopVto} className="p-2 hover:bg-white/5 rounded-lg text-slate-500">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <p className="text-slate-400 mb-2">{vtoItem?.model}</p>
                    <p className="text-3xl font-black text-cyan-400 mb-8">${vtoItem?.price}</p>
                  </div>
                  <div className="space-y-3">
                    <button 
                      onClick={() => vtoItem && handleAddToCart(vtoItem)}
                      className="w-full gradient-bg py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20"
                    >
                      <ShoppingCart className="w-5 h-5" /> Add to Cart
                    </button>
                    <button 
                      onClick={stopVto}
                      className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-rose-500/20"
                    >
                      <X className="w-5 h-5" /> End Virtual Try On
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-md relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold mb-6">{isEditing ? 'Edit Inventory Item' : 'Add Inventory Item'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Brand</label>
                    <input 
                      required
                      value={newItem.brand}
                      onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      placeholder="e.g. Ray-Ban"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Model</label>
                    <input 
                      required
                      value={newItem.model}
                      onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      placeholder="e.g. Aviator"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Type</label>
                  <select 
                    value={newItem.type}
                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="frame">Frames (Specs)</option>
                    <option value="sunglasses">Sunglasses</option>
                    <option value="lens">Lenses</option>
                    <option value="accessory">Accessory</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Image</label>
                  <div className="flex gap-2">
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'image_url')}
                      className="hidden"
                      id="image-upload"
                    />
                    <label 
                      htmlFor="image-upload"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm cursor-pointer hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      {newItem.image_url ? "Image Selected" : "Upload Image"}
                    </label>
                    {newItem.image_url && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                        <img src={newItem.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">3D Model (.glb recommended)</label>
                  <div className="flex gap-2">
                    <input 
                      type="file"
                      accept=".glb,.gltf,.bin,image/*"
                      multiple={true}
                      onChange={(e) => handleFileUpload(e, 'model_url')}
                      className="hidden"
                      id="model-upload"
                    />
                    <label 
                      htmlFor="model-upload"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm cursor-pointer hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
                      {newItem.model_url ? "Model Selected" : "Upload 3D Model"}
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    Note: .glb files are self-contained. .gltf files may fail if they reference external .bin or texture files.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Price ($)</label>
                    <input 
                      type="number"
                      required
                      value={isNaN(newItem.price) ? '' : newItem.price}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setNewItem({ ...newItem, price: isNaN(val) ? 0 : val });
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Stock Quantity</label>
                    <input 
                      type="number"
                      required
                      value={isNaN(newItem.stock) ? '' : newItem.stock}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setNewItem({ ...newItem, stock: isNaN(val) ? 0 : val });
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Base Scale (3D)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={isNaN(newItem.base_scale) ? '' : newItem.base_scale}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setNewItem({ ...newItem, base_scale: isNaN(val) ? 1.0 : val });
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="1.0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Details (JSON)</label>
                  <textarea 
                    value={newItem.details}
                    onChange={(e) => setNewItem({ ...newItem, details: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 h-20"
                    placeholder='{"color": "Black", "material": "Metal"}'
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={uploading}
                    className="flex-1 py-3 gradient-bg rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? "Uploading..." : (isEditing ? "Update Item" : "Add to Inventory")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Total Items</p>
              <h3 className="text-xl font-bold">{items.length}</h3>
            </div>
          </div>
          <div className="glass-card flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Low Stock</p>
              <h3 className="text-xl font-bold">{items.filter(i => i.stock < 5).length}</h3>
            </div>
          </div>
          <div className="glass-card flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Out of Stock</p>
              <h3 className="text-xl font-bold">{items.filter(i => i.stock === 0).length}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by brand or model..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-sm focus:outline-none py-3"
            >
              <option value="all">All Types</option>
              <option value="frame">Frames</option>
              <option value="sunglasses">Sunglasses</option>
              <option value="lens">Lenses</option>
              <option value="accessory">Accessories</option>
            </select>
          </div>
        </div>
      </div>

      {user?.role === 'patient' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card overflow-hidden group"
            >
              <div className="aspect-[4/3] bg-white/5 relative overflow-hidden">
                <img 
                  src={item.image_url || `https://picsum.photos/seed/${item.id}/400/300`} 
                  alt={item.model}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <div className="flex gap-2 w-full">
                    <button 
                      onClick={() => handleAddToCart(item)}
                      className="flex-1 bg-cyan-500 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all"
                    >
                      <ShoppingCart className="w-3 h-3" /> Add to Cart
                    </button>
                    {(item.type === 'frame' || item.type === 'sunglasses') && (
                      <button 
                        onClick={() => startVto(item)}
                        className="flex-1 bg-white/10 backdrop-blur-md py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
                      >
                        <Eye className="w-3 h-3" /> Start Virtual Try On
                      </button>
                    )}
                  </div>
                </div>
                <div className="absolute top-3 left-3 px-2 py-1 bg-slate-950/60 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-widest text-cyan-400 border border-white/10">
                  {item.type}
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg truncate flex-1">{item.brand}</h3>
                  <span className="text-cyan-400 font-black">${item.price}</span>
                </div>
                <p className="text-sm text-slate-400 mb-4 truncate">{item.model}</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.stock > 10 ? 'bg-emerald-400' : item.stock > 0 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-widest text-slate-500 border-b border-white/10">
                  <th className="px-6 py-4">Item Details</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  [1,2,3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-8 h-12 bg-white/5"></td>
                    </tr>
                  ))
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-cyan-500/50 transition-colors">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.model} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Package className="w-6 h-6 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">{item.brand}</p>
                            <p className="text-xs text-slate-500">{item.model}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          item.type === 'frame' ? 'bg-blue-400/10 text-blue-400' : 
                          item.type === 'sunglasses' ? 'bg-amber-400/10 text-amber-400' :
                          item.type === 'lens' ? 'bg-violet-400/10 text-violet-400' :
                          'bg-slate-400/10 text-slate-400'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">${item.price.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{item.stock}</span>
                          <span className="text-[10px] text-slate-500">Scale: {item.base_scale || 1.0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.stock > 10 ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> In Stock
                          </span>
                        ) : item.stock > 0 ? (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Low Stock
                          </span>
                        ) : (
                          <span className="text-xs text-rose-400 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Out of Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user?.role === 'admin' && (
                            <>
                              <button 
                                onClick={() => startEdit(item)}
                                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-400 transition-all"
                                title="Edit Item"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-2 hover:bg-rose-400/10 rounded-lg text-slate-400 hover:text-rose-400 transition-all"
                                title="Delete Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => alert(`Details for ${item.brand} ${item.model}:\n${JSON.stringify(item.details, null, 2)}`)}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-all"
                            title="View Details"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <Package className="w-12 h-12" />
                        <p>No inventory items found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
