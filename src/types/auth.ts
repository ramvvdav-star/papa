import { ExamType, SubjectName } from './exam';

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'PENDING';

export interface TeacherPermissions {
  canCreateTests: boolean;
  canCreateQuestions: boolean;
  canManageBatches: boolean;
  canResetStudentPasswords: boolean;
  canViewAllStudents: boolean;
}

export interface AuthProfile {
  id: string;
  username?: string | null;
  email?: string | null;
  fullName: string;
  role: UserRole;
  studentId?: string | null;
  teacherId?: string | null;
  teacherName?: string | null;
  batchId?: string | null;
  batchName?: string | null;
  className?: string | null;
  examCategory: ExamType;
  targetYear: number;
  subjectAccess: SubjectName[];
  testAccess: string[];
  teacherPermissions: TeacherPermissions;
  status: AccountStatus;
  mustChangePassword: boolean;
  tempPasswordHint?: string | null;
  expiresAt?: string | null;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
  activeSessionsCount?: number;
}

export interface BatchRecord {
  id: string;
  name: string;
  description: string;
  examCategory: ExamType;
  className: string;
  teacherId: string;
  teacherName: string;
  status: 'ACTIVE' | 'ARCHIVED';
  assignedTestIds: string[];
  studentIds: string[];
  createdAt: string;
}

export interface TestAssignmentRecord {
  id: string;
  testId: string;
  visibility: 'PUBLIC' | 'ASSIGNED_ONLY';
  assignedByUserId: string;
  assignedTeacherIds: string[];
  assignedBatchIds: string[];
  assignedStudentIds: string[];
  dueDate?: string | null;
  createdAt: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  targetAudience: 'ALL' | 'TEACHERS' | 'STUDENTS' | 'BATCH';
  targetBatchId?: string | null;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  target: string;
  details?: string | null;
  createdAt: string;
}

export interface PasswordRecoveryRecord {
  id: string;
  userId: string;
  identifier: string;
  userName: string;
  userRole: UserRole;
  teacherId?: string | null;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  recoveryCode?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface StudentIdConfig {
  jeeMainPrefix: string;
  jeeAdvancedPrefix: string;
  neetPrefix: string;
  nextJeeMainSeq: number;
  nextJeeAdvancedSeq: number;
  nextNeetSeq: number;
  mode: 'SEQUENTIAL' | 'ALPHANUMERIC';
}

export interface SessionRecord {
  id: string;
  userId: string;
  role: UserRole;
  userAgent?: string | null;
  ipAddress?: string | null;
  rememberMe: boolean;
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
}
