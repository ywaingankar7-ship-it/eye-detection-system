import { 
  collection, 
  doc, 
  setDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { OperationType, handleFirestoreError } from '../firebaseUtils';

export const migrateData = async (token: string) => {
  const collections = [
    { local: 'customers', firestore: 'customers' },
    { local: 'inventory', firestore: 'inventory' },
    { local: 'appointments', firestore: 'appointments' },
    { local: 'prescriptions', firestore: 'prescriptions' },
    { local: 'eye-tests', firestore: 'eye_tests' },
    { local: 'notifications', firestore: 'notifications' }
  ];

  const results: any = {};

  for (const col of collections) {
    try {
      const response = await fetch(`/api/${col.local}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        results[col.firestore] = 0;
        continue;
      }

      const batch = writeBatch(db);
      data.forEach((item: any) => {
        const docId = item.id.toString();
        const docRef = doc(db, col.firestore, docId);
        
        // Clean up item for Firestore (remove local id if desired, or keep it)
        const { id, ...firestoreData } = item;
        
        // Handle JSON strings from SQLite
        if (firestoreData.details && typeof firestoreData.details === 'string') {
          try { firestoreData.details = JSON.parse(firestoreData.details); } catch(e) {}
        }
        if (firestoreData.results && typeof firestoreData.results === 'string') {
          try { firestoreData.results = JSON.parse(firestoreData.results); } catch(e) {}
        }

        batch.set(docRef, firestoreData);
      });

      await batch.commit();
      results[col.firestore] = data.length;
    } catch (error) {
      console.error(`Migration failed for ${col.local}:`, error);
      handleFirestoreError(error, OperationType.WRITE, col.firestore);
    }
  }

  return results;
};
