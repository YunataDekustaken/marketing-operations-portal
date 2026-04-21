import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

export const KNOWN_USERS: Record<string, string> = {
  'chloie@stlafglobal.com': 'Chloie Alvarado',
  'pat@stlafglobal.com': 'Patricia Minimo',
  'khian@stlafglobal.com': 'Khian De Ocampo',
  'enzo@stlafglobal.com': 'Lorenzo Raña',
  'charleth@stlafglobal.com': 'Charleth Ramos',
  'kcs@stlafglobal.com': 'Atty. Kathrina Sadsad-Tamesis',
};

export const getKnownName = (email: string | null | undefined): string | null => {
  if (!email) return null;
  return KNOWN_USERS[email.toLowerCase()] || null;
};

export const syncUserNames = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const updates: Promise<void>[] = [];
    const uidToNameMap: Record<string, string> = {};
    
    snapshot.forEach((userDoc) => {
      const data = userDoc.data() as UserProfile;
      const knownName = getKnownName(data.email);
      
      if (knownName) {
        uidToNameMap[data.uid] = knownName;
        if (data.displayName !== knownName) {
          updates.push(updateDoc(doc(db, 'users', userDoc.id), { displayName: knownName }));
        }
      }
    });

    const requestsSnapshot = await getDocs(collection(db, 'marketing_requests'));
    for (const reqDoc of requestsSnapshot.docs) {
      const data = reqDoc.data();
      let reqUpdated = false;
      const reqUpdates: any = {};

      const knownRequestorName = getKnownName(data.requestedByEmail);
      if (knownRequestorName && data.requestorName !== knownRequestorName) {
        reqUpdates.requestorName = knownRequestorName;
        reqUpdated = true;
      }

      if (data.assignedTo && data.assignedTo !== 'Unassigned') {
        const knownAssignedName = uidToNameMap[data.assignedTo];
        if (knownAssignedName && data.assignedToName !== knownAssignedName) {
          reqUpdates.assignedToName = knownAssignedName;
          reqUpdated = true;
        }
      }

      // Update revisions
      if (data.revisions && Array.isArray(data.revisions)) {
        let revisionsUpdated = false;
        const updatedRevisions = data.revisions.map((rev: any) => {
          // We don't have requestedBy UID in revision, but we can check if requestedByName matches a known user's old name
          // Actually, it's safer to just leave it or try to match by name.
          // Let's skip revisions for now since we don't have the UID.
          return rev;
        });
      }

      // Update resubmissions
      if (data.resubmissions && Array.isArray(data.resubmissions)) {
        let resubmissionsUpdated = false;
        const updatedResubmissions = data.resubmissions.map((resub: any) => {
          const knownName = uidToNameMap[resub.submittedBy];
          if (knownName && resub.submittedByName !== knownName) {
            resubmissionsUpdated = true;
            return { ...resub, submittedByName: knownName };
          }
          return resub;
        });
        if (resubmissionsUpdated) {
          reqUpdates.resubmissions = updatedResubmissions;
          reqUpdated = true;
        }
      }

      // Update activityLog
      if (data.activityLog && Array.isArray(data.activityLog)) {
        let activityLogUpdated = false;
        const updatedActivityLog = data.activityLog.map((log: any) => {
          const knownName = uidToNameMap[log.userId];
          if (knownName && log.userName !== knownName) {
            activityLogUpdated = true;
            return { ...log, userName: knownName };
          }
          return log;
        });
        if (activityLogUpdated) {
          reqUpdates.activityLog = updatedActivityLog;
          reqUpdated = true;
        }
      }

      if (reqUpdated) {
        updates.push(updateDoc(doc(db, 'marketing_requests', reqDoc.id), reqUpdates));
      }

      // Update comments
      const commentsSnapshot = await getDocs(collection(db, 'marketing_requests', reqDoc.id, 'comments'));
      commentsSnapshot.forEach((commentDoc) => {
        const commentData = commentDoc.data();
        const knownCommenterName = uidToNameMap[commentData.userId];
        if (knownCommenterName && commentData.userName !== knownCommenterName) {
          updates.push(updateDoc(doc(db, 'marketing_requests', reqDoc.id, 'comments', commentDoc.id), { userName: knownCommenterName }));
        }
      });
    }
    
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`Synced ${updates.length} documents with correct names.`);
    }
  } catch (error) {
    console.error('Error syncing user names:', error);
  }
};
