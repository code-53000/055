export type UserRole = 'ACCOUNT_MANAGER' | 'DESIGNER' | 'CLIENT';

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'APPROVED' | 'COMPLETED';

export type AssetStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'FINAL';

export type FeedbackStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface Milestone {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  orderIndex: number;
  status: MilestoneStatus;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  code: string;
  managerId: number;
  clientId: number;
  createdAt: string;
  updatedAt: string;
  manager: User;
  client: User;
  milestones: Milestone[];
  _count?: { assets: number; feedbacks: number };
}

export interface Asset {
  id: number;
  projectId: number;
  milestoneId?: number;
  uploaderId: number;
  version: number;
  name: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  changeLog?: string;
  status: AssetStatus;
  isFinal: boolean;
  createdAt: string;
  updatedAt: string;
  uploader: User;
  milestone?: { id: number; name: string };
  _count?: { feedbacks: number };
}

export interface Feedback {
  id: number;
  projectId: number;
  milestoneId?: number;
  assetId?: number;
  authorId: number;
  content: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  author: User;
  asset?: { id: number; name: string; version: number };
  milestone?: { id: number; name: string };
}
