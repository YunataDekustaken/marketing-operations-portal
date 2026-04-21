export type UserRole = 'marketing_supervisor' | 'marketing_member' | 'department';

export type Department = 'Litigation' | 'Corporate' | 'HR' | 'Accounting' | 'Operations' | 'Marketing';

export type Brand = 'STLAF' | 'MassagedailyPH' | 'LuxeLounge';

export type RequestType = 'Photo/Video Editing' | 'Social Media Content' | 'Graphic Design' | 'Marketing Collateral' | 'Website / Digital' | 'Other';

export type Priority = 'Low' | 'Normal' | 'Urgent';

export type RequestStatus = 'Pending' | 'Assigned' | 'In Progress' | 'For Review' | 'Revision Needed' | 'Completed' | 'Cancelled';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department: Department;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'new_request' | 'assignment' | 'status_change' | 'completion';
  requestId: string;
  createdAt: any;
  read: boolean;
}

export interface Revision {
  id: string;
  notes: string;
  fileUrl?: string;
  fileName?: string;
  link?: string;
  requestedByName?: string;
  createdAt: any;
  type?: 'internal' | 'requestor';
}

export interface Resubmission {
  id: string;
  revisionNumber: number;
  notes?: string;
  fileUrl?: string;
  fileName?: string;
  link?: string;
  submittedBy: string;
  submittedByName: string;
  createdAt: any;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  createdAt: any;
}

export interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  createdAt: any;
}

export interface MarketingRequest {
  id: string;
  requestId: string;
  requestTitle: string;
  description: string;
  requestedBy: string;
  requestedByEmail: string;
  requestorName: string;
  department: Department;
  brand: Brand;
  requestType: RequestType;
  priority: Priority;
  dateRequested: any; // Timestamp
  dateNeeded: string;
  assignedTo: string; // User UID or 'Unassigned'
  assignedToName: string; // User Display Name or 'Unassigned'
  status: RequestStatus;
  internalNotes?: string;
  revisionNotes?: string;
  requestAttachmentUrl?: string;
  requestAttachmentName?: string;
  requestAttachmentLink?: string;
  deliverableFileUrl?: string;
  deliverableFileName?: string;
  deliverableLink?: string;
  estimatedCompletionDate?: string;
  revisionCount: number;
  completedAt?: any; // Timestamp
  updatedAt?: any; // Timestamp
  tatAcknowledged?: boolean;
  revisions?: Revision[];
  resubmissions?: Resubmission[];
  activityLog?: ActivityLogEntry[];
  locked?: boolean;
  previouslyLocked?: boolean;
}
