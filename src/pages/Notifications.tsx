import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Calendar, Activity, Info, CheckCircle2, Trash2, Clock } from "lucide-react";
import { db, auth } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../firebaseUtils";

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", auth.currentUser.uid),
      orderBy("created_at", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "notifications");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { is_read: 1 });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "notifications");
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.is_read).forEach(n => {
        batch.update(doc(db, "notifications", n.id), { is_read: 1 });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "notifications");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "notifications");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "appointment": return <Calendar className="w-5 h-5 text-cyan-400" />;
      case "diagnosis": return <Activity className="w-5 h-5 text-violet-400" />;
      case "info": return <Info className="w-5 h-5 text-blue-400" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="w-8 h-8 text-cyan-400" />
            Notifications
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">Stay updated with your clinic activities and alerts.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={markAllAsRead}
            className="glass px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark all as read
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-4">
            <Bell className="w-12 h-12 text-slate-500 mx-auto opacity-20" />
            <p className="text-slate-500 font-medium">No notifications yet.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notifications.map((notification, i) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card p-6 flex items-start gap-4 group relative ${!notification.is_read ? "border-l-4 border-l-cyan-500" : ""}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${!notification.is_read ? "bg-cyan-500/10" : "bg-white/5"}`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-bold ${!notification.is_read ? "text-white" : "text-slate-400"}`}>
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                      <button 
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {notification.message}
                  </p>
                  {!notification.is_read && (
                    <button 
                      onClick={() => markAsRead(notification.id)}
                      className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mt-2 hover:underline"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
