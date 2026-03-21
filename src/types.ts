export type Role = 'admin' | 'patient' | 'staff';

export interface User {
  id: number;
  uid?: string;
  name: string;
  email: string;
  role: Role;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  age?: number;
  gender?: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  type: 'frame' | 'lens' | 'sunglasses' | 'accessory';
  brand: string;
  model: string;
  price: number;
  stock: number;
  image_url?: string;
  model_url?: string; // URL for 3D model (.glb/.gltf)
  base_scale: number;
  details: any; // Can be object or string
}

export interface Appointment {
  id: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  date: string;
  time: string;
  status: 'pending' | 'approved' | 'completed';
  notes: string;
}

export interface EyeTest {
  id: number;
  customer_id: number;
  customer_name?: string;
  date: string;
  results: string; // JSON string
  image_url?: string;
}

export interface Prescription {
  id: number;
  customer_id: number;
  customer_name?: string;
  date: string;
  sph_od: string;
  cyl_od: string;
  axis_od: string;
  sph_os: string;
  cyl_os: string;
  axis_os: string;
  add_power: string;
  pd: string;
  doctor_notes: string;
}

export interface Sale {
  id: number;
  customer_id: number;
  total: number;
  items: string; // JSON string
  date: string;
}
