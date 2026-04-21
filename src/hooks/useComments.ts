import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Comment } from '../types';
import { useAuth } from './useAuth';

export function useComments(requestId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (!requestId) return;

    const commentsRef = collection(db, 'marketing_requests', requestId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData: Comment[] = [];
      snapshot.forEach((doc) => {
        commentsData.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(commentsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching comments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [requestId]);

  const addComment = async (text: string) => {
    if (!profile || !text.trim()) return;

    const commentsRef = collection(db, 'marketing_requests', requestId, 'comments');
    await addDoc(commentsRef, {
      text: text.trim(),
      userId: profile.uid,
      userName: profile.displayName,
      userRole: profile.role,
      createdAt: Timestamp.now()
    });
  };

  return { comments, loading, addComment };
}
