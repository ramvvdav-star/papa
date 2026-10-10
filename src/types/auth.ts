import { ExamType, SubjectName } from './exam';

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'PENDING';

export type CourseType = 'JEE' | 'JEE_ADVANCED' | 'NEET';

export type EnrollmentStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'INACTIVE';

export interface CourseRecord {
  id: string; // 'course_jee' | 'course_jee_adv' | 'course_neet'
  name: string;
  type: CourseType;
  description: string;
  active: boolean;
  createdAt: string;
}

export interface EnrollmentRecord {
  id: string;
  studentId: string;
  studentName?: string;
  studentCode?: string | null;
  courseId: string;
  courseType: CourseType;
  status: EnrollmentStatus;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyMaterialRecord {
  id: string;
  courseId: string;
  courseType: CourseType;
  subject: SubjectName;
  chapter: string;
  title: string;
  materialType: 'NOTES' | 'FORMULA_SHEET' | 'PYQ_BOOKLET' | 'CONCEPT_SUMMARY' | 'SYLLABUS';
  resourceType?: string;
  description: string;
  contentBody: string;
  contentSummary?: string;
  content?: string;
  createdBy: string;
  authorName?: string;
  createdAt: string;
}

export interface TeacherPermissions {
  canCreateTests: boolean;
  canCreateQuestions: boolean;
  canUploadQuestions?: boolean;
  canEditQuestions?: boolean;
  canManageBatches: boolean;
  canResetStudentPasswords: boolean;
  canViewAllStudents: boolean;
  assignedCourses?: CourseType[];
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
  courseId: string; // 'course_jee' | 'course_jee_adv' | 'course_neet'
  courseType: CourseType; // 'JEE' | 'JEE_ADVANCED' | 'NEET'
  enrollmentStatus: EnrollmentStatus; // 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'INACTIVE'
  assignedCourses: CourseType[]; // e.g. ['JEE'] or ['JEE', 'JEE_ADVANCED'] or ['NEET']
  enrollments?: EnrollmentRecord[];
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
  courseId?: string;
  courseType?: CourseType;
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
  courseId?: string;
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
  courseId?: string; // 'ALL' | 'course_jee' | 'course_jee_adv' | 'course_neet'
  courseType?: CourseType | 'ALL';
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
  defaultMode?: 'SEQUENTIAL' | 'ALPHANUMERIC' | 'RANDOM';
  nextSequentialNumber?: number;
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

export type UserProfile = AuthProfile;
export type AnnouncementItem = AnnouncementRecord;
export type TestAssignmentRule = TestAssignmentRecord;
export type PasswordRecoveryRequest = PasswordRecoveryRecord;
export type AuditLogEntry = AuditLogRecord;
export type StudentIdGeneratorConfig = StudentIdConfig;
export type ExamCategory = ExamType;
export type TeacherPermissionMatrix = TeacherPermissions;
export type CourseEnrollmentRecord = EnrollmentRecord;

