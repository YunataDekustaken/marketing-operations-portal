import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ActivityLogEntry } from '../types';

export function useActivityLog(requestId: string) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;

    const logsRef = collection(db, 'marketing_requests', requestId, 'activityLog');
    const q = query(logsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData: ActivityLogEntry[] = [];
      snapshot.forEach((doc) => {
        logsData.push({ id: doc.id, ...doc.data() } as ActivityLogEntry);
      });
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching activity logs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [requestId]);

  return { logs, loading };
}
