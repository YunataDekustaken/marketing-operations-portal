import { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, doc, Timestamp, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format, addBusinessDays } from 'date-fns';
import { MarketingRequest, UserRole, Department, Brand, RequestType, Priority, RequestStatus, UserProfile } from '../types';
import { useAuth } from './useAuth';
import { useToast } from '../components/ToastProvider';

// Helper to recursively remove undefined values from objects/arrays for Firestore
const deepClean = (obj: any): any => {
  if (obj === undefined) return undefined;
  if (obj === null) return null;
  
  if (Array.isArray(obj)) {
    return obj.map(v => deepClean(v)).filter(v => v !== undefined);
  }
  
  if (typeof obj === 'object' && !(obj instanceof Timestamp) && !(obj instanceof Date)) {
    const cleaned: any = {};
    let hasValues = false;
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = deepClean(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
        hasValues = true;
      }
    }
    return hasValues ? cleaned : undefined;
  }
  
  return obj;
};

export function useRequests() {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [requests, setRequests] = useState<MarketingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const sendNotification = async (notif: { userId: string; title: string; message: string; type: string; requestId: string }) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notif,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      if (error instanceof Error && error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, 'create' as any, 'notifications');
      }
    }
  };

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error.message,
      operationType: operation,
      path,
      authInfo: {
        userId: profile?.uid,
        email: profile?.email,
        role: profile?.role
      }
    };
    console.error('Firestore Error Detail:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  useEffect(() => {
    if (!profile) return;

    let q;
    if (profile.role === 'marketing_supervisor' || profile.role === 'marketing_member') {
      q = query(collection(db, 'marketing_requests'), orderBy('dateRequested', 'desc'));
    } else {
      q = query(
        collection(db, 'marketing_requests'),
        where('requestedBy', '==', profile.uid),
        orderBy('dateRequested', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MarketingRequest[];
      setRequests(docs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [profile]);

  const createRequest = async (data: Partial<MarketingRequest>, file?: File) => {
    if (!profile) return;

    let attachmentUrl = '';
    let attachmentName = '';

    if (file) {
      const storageRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      attachmentUrl = await getDownloadURL(storageRef);
      attachmentName = file.name;
    }

    const requestsRef = collection(db, 'marketing_requests');
    // Generate a simple unique ID based on timestamp and random string instead of counting all docs
    const requestId = `MR-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // Clean undefined values
    const cleanData = deepClean(data) || {};

    try {
      const docRef = await addDoc(requestsRef, {
        ...cleanData,
        requestId,
        requestedBy: profile.uid,
        requestedByEmail: profile.email,
        requestorName: data.requestorName || profile.displayName || profile.email,
        department: profile.department,
        dateRequested: Timestamp.now(),
        status: data.status || 'Pending',
        assignedTo: data.assignedTo || 'Unassigned',
        assignedToName: data.assignedToName || 'Unassigned',
        requestAttachmentUrl: attachmentUrl,
        requestAttachmentName: attachmentName,
        requestAttachmentLink: data.requestAttachmentLink || '',
        revisionCount: 0,
        tatAcknowledged: data.tatAcknowledged || false,
        revisions: [],
        estimatedCompletionDate: data.estimatedCompletionDate || ''
      });

      // Write initial activity log to subcollection
      try {
        await addDoc(collection(db, 'marketing_requests', docRef.id, 'activityLog'), {
          action: 'Request created',
          userId: profile.uid,
          userName: profile.displayName,
          createdAt: Timestamp.now()
        });
      } catch (logError) {
        console.error("Failed to write activity log:", logError);
        // Don't fail the whole request creation if just the log fails
      }

      // Notify Supervisors
      try {
        const supervisorsQuery = query(collection(db, 'users'), where('role', '==', 'marketing_supervisor'));
        const supervisorsSnapshot = await getDocs(supervisorsQuery);
        console.log(`Found ${supervisorsSnapshot.docs.length} supervisors to notify for new request.`);
        supervisorsSnapshot.docs.forEach(doc => {
          console.log(`Sending notification to supervisor: ${doc.id} (${doc.data().displayName})`);
          sendNotification({
            userId: doc.id,
            title: 'New Request Submitted',
            message: `${profile.displayName} from ${profile.department} submitted: ${data.requestTitle}`,
            type: 'new_request',
            requestId: docRef.id
          });
        });
      } catch (notifError) {
        console.error("Failed to send notifications:", notifError);
      }
      
      addToast('success', 'Request submitted successfully');
    } catch (error) {
      addToast('error', 'Failed to submit request');
      handleFirestoreError(error, 'create', 'marketing_requests');
    }
  };

  const deleteRequest = async (id: string) => {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'marketing_requests', id));
  };

  const updateRequest = async (id: string, data: Partial<MarketingRequest>, deliverableFile?: File) => {
    console.log(`Starting updateRequest for id: ${id}`, data);
    const docRef = doc(db, 'marketing_requests', id);
    
    let updateData = { ...data };

    if (deliverableFile) {
      console.log(`Uploading deliverable file: ${deliverableFile.name}`);
      try {
        const storageRef = ref(storage, `deliverables/${Date.now()}_${deliverableFile.name}`);
        console.log('Storage ref created, starting uploadBytes...');
        await uploadBytes(storageRef, deliverableFile);
        console.log('uploadBytes completed, getting download URL...');
        updateData.deliverableFileUrl = await getDownloadURL(storageRef);
        updateData.deliverableFileName = deliverableFile.name;
        console.log('File upload successful:', updateData.deliverableFileUrl);
      } catch (err) {
        console.error('Error during file upload:', err);
        throw err;
      }
    }

    // Automations
    if (data.status === 'Revision Needed') {
      const currentRequest = requests.find(r => r.id === id);
      const isRequestorRevision = profile?.role === 'department';
      
      const newRevision = {
        id: `rev-${Date.now()}`,
        notes: data.revisionNotes || '',
        fileUrl: currentRequest?.deliverableFileUrl || '',
        fileName: currentRequest?.deliverableFileName || '',
        link: currentRequest?.deliverableLink || '',
        requestedByName: profile?.displayName || profile?.email || 'Unknown',
        createdAt: Timestamp.now(),
        type: (isRequestorRevision ? 'requestor' : 'internal') as 'internal' | 'requestor'
      };
      
      updateData.revisionCount = (currentRequest?.revisionCount || 0) + 1;
      updateData.revisions = [...(currentRequest?.revisions || []), newRevision];
      
      // Clear current deliverable fields to allow for new submission
      updateData.deliverableFileUrl = '';
      updateData.deliverableFileName = '';
      updateData.deliverableLink = '';
      updateData.revisionNotes = ''; // Clear the notes field after adding to history

      // Problem 2: If requestor requests revision, clear assignment so it falls back to supervisor's pending view
      if (isRequestorRevision) {
        updateData.assignedTo = 'Unassigned';
        updateData.assignedToName = 'Unassigned';
      }
    }

    if (data.status === 'Completed') {
      updateData.completedAt = Timestamp.now();
    }

    if (data.assignedTo && data.assignedTo !== 'Unassigned') {
      updateData.status = 'Assigned';
    }

    // Ensure status is updated if submitting for review
    if (updateData.deliverableFileUrl || updateData.deliverableLink) {
      updateData.status = 'For Review';
      
      const currentRequest = requests.find(r => r.id === id);
      const newResubmission = {
        id: `rev-sub-${Date.now()}`,
        revisionNumber: currentRequest?.revisionCount || 0,
        fileUrl: updateData.deliverableFileUrl || '',
        fileName: updateData.deliverableFileName || '',
        link: updateData.deliverableLink || data.deliverableLink || '',
        submittedBy: profile?.uid || '',
        submittedByName: profile?.displayName || profile?.email || 'Unknown',
        createdAt: Timestamp.now()
      };
      updateData.resubmissions = [...(currentRequest?.resubmissions || []), newResubmission];
    }

    const currentRequest = requests.find(r => r.id === id);
    const logEntries: { action: string; userId: string; userName: string; createdAt: any }[] = [];
    
    if (updateData.status && updateData.status !== currentRequest?.status) {
      logEntries.push({
        action: `Status changed from ${currentRequest?.status} to ${updateData.status}`,
        userId: profile?.uid || '',
        userName: profile?.displayName || '',
        createdAt: Timestamp.now()
      });
    }
    
    if (updateData.assignedTo && updateData.assignedTo !== currentRequest?.assignedTo) {
      logEntries.push({
        action: updateData.assignedTo === 'Unassigned' ? 'Unassigned task' : `Assigned to ${updateData.assignedToName}`,
        userId: profile?.uid || '',
        userName: profile?.displayName || '',
        createdAt: Timestamp.now()
      });
    }

    if (updateData.status === 'Revision Needed') {
      logEntries.push({
        action: `Requested a revision`,
        userId: profile?.uid || '',
        userName: profile?.displayName || '',
        createdAt: Timestamp.now()
      });
    }

    if (updateData.locked && !currentRequest?.locked) {
      logEntries.push({
        action: `Locked the task`,
        userId: profile?.uid || '',
        userName: profile?.displayName || '',
        createdAt: Timestamp.now()
      });
    } else if (updateData.locked === false && currentRequest?.locked) {
      logEntries.push({
        action: `Unlocked the task`,
        userId: profile?.uid || '',
        userName: profile?.displayName || '',
        createdAt: Timestamp.now()
      });
    }

    // Check for general edits (if no status/assign change but other fields changed)
    const otherFields = ['requestTitle', 'description', 'brand', 'requestType', 'priority', 'dateNeeded', 'estimatedCompletionDate'];
    const hasOtherChanges = otherFields.some(field => 
      updateData[field as keyof MarketingRequest] !== undefined && 
      updateData[field as keyof MarketingRequest] !== currentRequest?.[field as keyof MarketingRequest]
    );

    if (hasOtherChanges && logEntries.length === 0) {
      logEntries.push({
        action: `Request edited by ${profile?.displayName}`,
        userId: profile?.uid || '',
        userName: profile?.displayName || '',
        createdAt: Timestamp.now()
      });
    }

    console.log('Updating Firestore document with data:', updateData);
    
    // Clean undefined values recursively
    const cleanUpdateData = deepClean(updateData) || {};

    try {
      await updateDoc(docRef, cleanUpdateData);
      
      // Write activity logs to subcollection
      try {
        for (const entry of logEntries) {
          await addDoc(collection(db, 'marketing_requests', id, 'activityLog'), entry);
        }
      } catch (logError) {
        console.error("Failed to write activity logs:", logError);
      }

      console.log('Firestore update successful');

      // Notifications logic
      if (updateData.assignedTo && updateData.assignedTo !== 'Unassigned' && updateData.assignedTo !== currentRequest?.assignedTo) {
        sendNotification({
          userId: updateData.assignedTo,
          title: 'New Task Assigned',
          message: `You have been assigned to: ${currentRequest?.requestTitle || 'a task'}`,
          type: 'assignment',
          requestId: id
        });
      }

      if (updateData.status === 'Completed' && currentRequest?.requestedBy) {
        sendNotification({
          userId: currentRequest.requestedBy,
          title: 'Request Completed',
          message: `Your request "${currentRequest.requestTitle}" has been completed!`,
          type: 'completion',
          requestId: id
        });
      }

      // Notify Supervisors when task is submitted for review
      if (updateData.status === 'For Review') {
        const supervisorsQuery = query(collection(db, 'users'), where('role', '==', 'marketing_supervisor'));
        const supervisorsSnapshot = await getDocs(supervisorsQuery);
        console.log(`Found ${supervisorsSnapshot.docs.length} supervisors to notify for review.`);
        supervisorsSnapshot.docs.forEach(doc => {
          console.log(`Sending review notification to supervisor: ${doc.id} (${doc.data().displayName})`);
          sendNotification({
            userId: doc.id,
            title: 'Task Submitted for Review',
            message: `${profile?.displayName} submitted "${currentRequest?.requestTitle}" for review.`,
            type: 'status_change',
            requestId: id
          });
        });
      }

      // Problem 3: Notify Supervisors when requestor requests a revision
      if (updateData.status === 'Revision Needed' && profile?.role === 'department') {
        const supervisorsQuery = query(collection(db, 'users'), where('role', '==', 'marketing_supervisor'));
        const supervisorsSnapshot = await getDocs(supervisorsQuery);
        supervisorsSnapshot.docs.forEach(doc => {
          sendNotification({
            userId: doc.id,
            title: 'Revision Requested by Client',
            message: `${profile?.displayName} requested a revision for "${currentRequest?.requestTitle}".`,
            type: 'status_change',
            requestId: id
          });
        });
      }

      // Notify Supervisors and involved team members when task is locked/approved by requestor
      if (updateData.locked && profile?.role === 'department') {
        // 1. Notify Supervisors
        const supervisorsQuery = query(collection(db, 'users'), where('role', '==', 'marketing_supervisor'));
        const supervisorsSnapshot = await getDocs(supervisorsQuery);
        supervisorsSnapshot.docs.forEach(doc => {
          sendNotification({
            userId: doc.id,
            title: 'Task Approved by Client',
            message: `${profile?.displayName} approved "${currentRequest?.requestTitle}". Task is now locked.`,
            type: 'completion',
            requestId: id
          });
        });

        // 2. Notify involved team members
        const involvedUids = new Set<string>();
        if (currentRequest?.assignedTo && currentRequest.assignedTo !== 'Unassigned') {
          involvedUids.add(currentRequest.assignedTo);
        }
        currentRequest?.resubmissions?.forEach(sub => {
          if (sub.submittedBy) involvedUids.add(sub.submittedBy);
        });

        involvedUids.forEach(uid => {
          sendNotification({
            userId: uid,
            title: 'Task Approved by Client',
            message: `The task "${currentRequest?.requestTitle}" you worked on has been approved and locked.`,
            type: 'completion',
            requestId: id
          });
        });
      }

      if (updateData.deliverableFileUrl || updateData.deliverableLink) {
        addToast('success', 'Deliverable submitted for review');
      } else if (updateData.status && updateData.status !== currentRequest?.status) {
        addToast('info', `Request status updated to ${updateData.status}`);
      } else {
        addToast('success', 'Request updated successfully');
      }
    } catch (err) {
      console.error('Error updating Firestore document:', err);
      addToast('error', 'Failed to update request');
      handleFirestoreError(err, 'update', `marketing_requests/${id}`);
    }
  };

  const seedMarketingRequests = async () => {
    if (!profile) return;
    const requestsRef = collection(db, 'marketing_requests');
    
    const sampleRequests = [
      {
        requestTitle: 'STLAF Summer Campaign Banner',
        description: 'Need a high-quality banner for the summer campaign. Dimensions: 1920x1080.',
        brand: 'STLAF',
        requestType: 'Graphic Design',
        priority: 'Normal',
        status: 'Pending',
        department: 'Marketing',
        requestorName: 'Chloie Alvarado',
        dateRequested: Timestamp.now(),
        dateNeeded: format(addBusinessDays(new Date(), 3), 'yyyy-MM-dd'),
        assignedTo: 'Unassigned',
        assignedToName: 'Unassigned',
        requestId: `MR-${Math.floor(Math.random() * 10000)}`
      },
      {
        requestTitle: 'MassageDaily PH Video Edit',
        description: 'Short 15-second reel for Instagram. Footage attached.',
        brand: 'MassagedailyPH',
        requestType: 'Photo/Video Editing',
        priority: 'Urgent',
        status: 'Assigned',
        department: 'Operations',
        requestorName: 'Operations Dept',
        dateRequested: Timestamp.now(),
        dateNeeded: format(addBusinessDays(new Date(), 1), 'yyyy-MM-dd'),
        assignedTo: profile.uid, // Assign to current user for testing
        assignedToName: profile.displayName,
        requestId: `MR-${Math.floor(Math.random() * 10000)}`
      }
    ];

    for (const req of sampleRequests) {
      await addDoc(requestsRef, req);
    }
  };

  return { requests, loading, createRequest, updateRequest, deleteRequest, seedMarketingRequests };
}
