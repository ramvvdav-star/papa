import crypto from 'node:crypto';
import { eq, desc, or, and, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  courses,
  enrollments,
  studyMaterials,
  profiles,
  authSessions,
  batches,
  testAssignments,
  announcements,
  auditLogs,
  passwordRecoveryRequests,
  platformSettings,
} from './schema.ts';
import {
  AuthProfile,
  UserRole,
  AccountStatus,
  CourseType,
  EnrollmentStatus,
  CourseRecord,
  EnrollmentRecord,
  StudyMaterialRecord,
  BatchRecord,
  TestAssignmentRecord,
  AnnouncementRecord,
  AuditLogRecord,
  PasswordRecoveryRecord,
  StudentIdConfig,
  TeacherPermissions,
} from '../types/auth.ts';
import { ExamType, SubjectName } from '../types/exam.ts';

// ----------------- COURSE & ENROLLMENT AUTHORIZATION HELPERS -----------------

export function resolveCourseFromExam(
  examOrCourse?: string | null
): {
  courseId: string;
  courseType: CourseType;
  assignedCourses: CourseType[];
  defaultSubjects: SubjectName[];
} {
  const val = (examOrCourse || 'JEE_MAIN').toUpperCase();
  if (val === 'NEET' || val === 'COURSE_NEET') {
    return {
      courseId: 'course_neet',
      courseType: 'NEET',
      assignedCourses: ['NEET'],
      defaultSubjects: ['Physics', 'Chemistry', 'Botany', 'Zoology'],
    };
  }
  if (val === 'JEE_ADVANCED' || val === 'COURSE_JEE_ADV') {
    return {
      courseId: 'course_jee_adv',
      courseType: 'JEE_ADVANCED',
      assignedCourses: ['JEE', 'JEE_ADVANCED'],
      defaultSubjects: ['Physics', 'Chemistry', 'Mathematics'],
    };
  }
  return {
    courseId: 'course_jee',
    courseType: 'JEE',
    assignedCourses: ['JEE'],
    defaultSubjects: ['Physics', 'Chemistry', 'Mathematics'],
  };
}

export function normalizeTargetToCourseType(target?: string | null): CourseType {
  const val = (target || 'JEE').toUpperCase();
  if (val === 'NEET' || val === 'COURSE_NEET') return 'NEET';
  if (val === 'JEE_ADVANCED' || val === 'COURSE_JEE_ADV') return 'JEE_ADVANCED';
  return 'JEE';
}

export function getAuthorizedCourseTypes(profile?: AuthProfile | null): CourseType[] {
  if (!profile) return [];
  if (profile.role === 'ADMIN') {
    return ['JEE', 'JEE_ADVANCED', 'NEET'];
  }
  if (profile.role === 'STUDENT' && profile.enrollmentStatus && profile.enrollmentStatus !== 'ACTIVE') {
    return [];
  }
  if (profile.assignedCourses && profile.assignedCourses.length > 0) {
    return profile.assignedCourses;
  }
  const resolved = resolveCourseFromExam(profile.courseType || profile.examCategory);
  return resolved.assignedCourses;
}

export function getAuthorizedCourseIds(profile?: AuthProfile | null): string[] {
  const types = getAuthorizedCourseTypes(profile);
  const ids: string[] = [];
  if (types.includes('JEE')) ids.push('course_jee');
  if (types.includes('JEE_ADVANCED')) ids.push('course_jee_adv');
  if (types.includes('NEET')) ids.push('course_neet');
  return ids;
}

export function isCourseAuthorizedForUser(
  profile: AuthProfile | null | undefined,
  targetCourseOrExam: string | null | undefined
): boolean {
  if (!profile) return false;
  if (profile.role === 'ADMIN') return true;
  if (profile.status !== 'ACTIVE') return false;
  if (profile.role === 'STUDENT' && profile.enrollmentStatus && profile.enrollmentStatus !== 'ACTIVE') {
    return false;
  }
  if (!targetCourseOrExam || targetCourseOrExam === 'ALL') return true;
  const targetCourseType = normalizeTargetToCourseType(targetCourseOrExam);
  const allowed = getAuthorizedCourseTypes(profile);
  return allowed.includes(targetCourseType);
}

export function getAuthorizedSubjectsForUser(profile?: AuthProfile | null): SubjectName[] {
  if (!profile) return ['Physics', 'Chemistry', 'Mathematics'];
  if (profile.role === 'ADMIN') {
    return ['Physics', 'Chemistry', 'Mathematics', 'Botany', 'Zoology'];
  }
  const allowedCourses = getAuthorizedCourseTypes(profile);
  if (allowedCourses.includes('NEET') && !allowedCourses.includes('JEE')) {
    return ['Physics', 'Chemistry', 'Botany', 'Zoology'];
  }
  if (allowedCourses.includes('JEE') && !allowedCourses.includes('NEET')) {
    return ['Physics', 'Chemistry', 'Mathematics'];
  }
  return profile.subjectAccess && profile.subjectAccess.length > 0
    ? profile.subjectAccess
    : ['Physics', 'Chemistry', 'Mathematics'];
}

// ----------------- CRYPTOGRAPHIC PASSWORD & TOKEN HELPERS -----------------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash || !storedHash.startsWith('scrypt$')) return false;
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const [, salt, keyHex] = parts;
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const derivedBuffer = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedBuffer.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function validatePasswordComplexity(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number (0-9).' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (e.g., @, #, $, !, %).' };
  }
  return { valid: true };
}

// ----------------- MAPPER HELPERS -----------------

const DEFAULT_TEACHER_PERMS: TeacherPermissions = {
  canCreateTests: true,
  canCreateQuestions: true,
  canManageBatches: true,
  canResetStudentPasswords: true,
  canViewAllStudents: false,
};

function parseJsonSafe<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mapRowToProfile(
  row: typeof profiles.$inferSelect,
  teacherMap?: Map<string, string>,
  batchMap?: Map<string, string>,
  sessionCounts?: Map<string, number>,
  enrollmentMap?: Map<string, EnrollmentRecord[]>
): AuthProfile {
  const resolved = resolveCourseFromExam(row.courseType || row.examCategory);
  const courseId = row.courseId || resolved.courseId;
  const courseType = (row.courseType as CourseType) || resolved.courseType;
  const enrollmentStatus = (row.enrollmentStatus as EnrollmentStatus) || 'ACTIVE';
  const assignedCourses = parseJsonSafe<CourseType[]>(
    row.assignedCoursesJson,
    row.role === 'ADMIN'
      ? ['JEE', 'JEE_ADVANCED', 'NEET']
      : resolved.assignedCourses
  );

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.fullName,
    role: (row.role as UserRole) || 'STUDENT',
    studentId: row.studentId,
    teacherId: row.teacherId,
    teacherName: row.teacherId && teacherMap ? teacherMap.get(row.teacherId) || null : null,
    batchId: row.batchId,
    batchName: row.batchId && batchMap ? batchMap.get(row.batchId) || null : null,
    className: row.className,
    examCategory: (row.examCategory as ExamType) || 'JEE_MAIN',
    courseId,
    courseType,
    enrollmentStatus,
    assignedCourses,
    enrollments: enrollmentMap ? enrollmentMap.get(row.id) || [] : [],
    targetYear: row.targetYear || 2026,
    subjectAccess: parseJsonSafe<SubjectName[]>(row.subjectAccessJson, resolved.defaultSubjects),
    testAccess: parseJsonSafe<string[]>(row.testAccessJson, []),
    teacherPermissions: parseJsonSafe<TeacherPermissions>(row.teacherPermissionsJson, DEFAULT_TEACHER_PERMS),
    status: (row.status as AccountStatus) || 'ACTIVE',
    mustChangePassword: Boolean(row.mustChangePassword),
    tempPasswordHint: row.tempPasswordHint,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    lastLogin: row.lastLogin ? row.lastLogin.toISOString() : null,
    createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    activeSessionsCount: sessionCounts ? sessionCounts.get(row.id) || 0 : 0,
  };
}

export function mapRowToBatch(row: typeof batches.$inferSelect): BatchRecord {
  const resolved = resolveCourseFromExam(row.courseType || row.examCategory);
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    examCategory: (row.examCategory as ExamType) || 'JEE_MAIN',
    courseId: row.courseId || resolved.courseId,
    courseType: (row.courseType as CourseType) || resolved.courseType,
    className: row.className || 'Class 12',
    teacherId: row.teacherId,
    teacherName: row.teacherName,
    status: (row.status as 'ACTIVE' | 'ARCHIVED') || 'ACTIVE',
    assignedTestIds: parseJsonSafe<string[]>(row.assignedTestIdsJson, []),
    studentIds: parseJsonSafe<string[]>(row.studentIdsJson, []),
    createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
  };
}

// ----------------- STUDENT ID GENERATOR -----------------

const DEFAULT_STUDENT_ID_CONFIG: StudentIdConfig = {
  jeeMainPrefix: 'JEE26',
  jeeAdvancedPrefix: 'JADV26',
  neetPrefix: 'NEET26',
  nextJeeMainSeq: 10004,
  nextJeeAdvancedSeq: 10002,
  nextNeetSeq: 10003,
  mode: 'SEQUENTIAL',
};

export async function getStudentIdConfig(): Promise<StudentIdConfig> {
  try {
    const rows = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, 'student_id_config'));
    if (rows.length > 0) {
      return { ...DEFAULT_STUDENT_ID_CONFIG, ...parseJsonSafe(rows[0].valueJson, DEFAULT_STUDENT_ID_CONFIG) };
    }
  } catch (err) {
    console.error('Error reading student_id_config:', err);
  }
  return DEFAULT_STUDENT_ID_CONFIG;
}

export async function updateStudentIdConfig(patch: Partial<StudentIdConfig>): Promise<StudentIdConfig> {
  const current = await getStudentIdConfig();
  const updated: StudentIdConfig = { ...current, ...patch };
  await db
    .insert(platformSettings)
    .values({
      key: 'student_id_config',
      valueJson: JSON.stringify(updated),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        valueJson: JSON.stringify(updated),
        updatedAt: new Date(),
      },
    });
  return updated;
}

export async function generateUniqueStudentId(
  examCategory: ExamType = 'JEE_MAIN',
  forceMode?: 'SEQUENTIAL' | 'ALPHANUMERIC'
): Promise<string> {
  const config = await getStudentIdConfig();
  const mode = forceMode || config.mode;

  let prefix = config.jeeMainPrefix || 'JEE26';
  if (examCategory === 'NEET') prefix = config.neetPrefix || 'NEET26';
  else if (examCategory === 'JEE_ADVANCED') prefix = config.jeeAdvancedPrefix || 'JADV26';

  for (let attempt = 0; attempt < 25; attempt++) {
    let candidate = '';
    if (mode === 'ALPHANUMERIC') {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let suffix = '';
      for (let i = 0; i < 5; i++) {
        suffix += chars.charAt(crypto.randomInt(0, chars.length));
      }
      candidate = `${prefix}-${suffix}`;
    } else {
      let seq = config.nextJeeMainSeq;
      if (examCategory === 'NEET') seq = config.nextNeetSeq;
      else if (examCategory === 'JEE_ADVANCED') seq = config.nextJeeAdvancedSeq;
      candidate = `${prefix}-${seq + attempt}`;
    }

    const existing = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.studentId, candidate));

    if (existing.length === 0) {
      if (mode === 'SEQUENTIAL') {
        if (examCategory === 'NEET') {
          await updateStudentIdConfig({ nextNeetSeq: config.nextNeetSeq + attempt + 1 });
        } else if (examCategory === 'JEE_ADVANCED') {
          await updateStudentIdConfig({ nextJeeAdvancedSeq: config.nextJeeAdvancedSeq + attempt + 1 });
        } else {
          await updateStudentIdConfig({ nextJeeMainSeq: config.nextJeeMainSeq + attempt + 1 });
        }
      }
      return candidate;
    }
  }

  const fallbackRandom = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${fallbackRandom}`;
}

// ----------------- AUDIT LOGGING -----------------

export async function createAuditLog(params: {
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  target: string;
  details?: string;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: params.action,
      target: params.target,
      details: params.details || null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to insert audit log:', err);
  }
}

export async function getAuditLogs(limit = 100): Promise<AuditLogRecord[]> {
  const rows = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    actorId: r.actorId,
    actorName: r.actorName,
    actorRole: r.actorRole as UserRole,
    action: r.action,
    target: r.target,
    details: r.details,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ----------------- DATABASE SEEDING FOR AUTH & RBAC -----------------

let isAuthSeeded = false;

export async function ensureAuthSeeded(): Promise<void> {
  if (isAuthSeeded) return;
  try {
    const adminId = 'usr-admin-01';
    const teacher1Id = 'usr-teacher-hcverma';
    const teacher2Id = 'usr-teacher-ritusharma';

    const batchJeeMainId = 'batch-jee-main-2027-m';
    const batchJeeAdvId = 'batch-jee-adv-2027-a';
    const batchNeetBioId = 'batch-neet-2027-bio';

    const student1Id = 'usr-student-rahul';
    const student2Id = 'usr-student-aarav';
    const student3Id = 'usr-student-ananya';
    const student4Id = 'usr-student-rohan';
    const student5Id = 'usr-student-vikram';

    // Always ensure canonical courses, enrollments, and study materials exist
    await db
      .insert(courses)
      .values([
        {
          id: 'course_jee',
          name: 'JEE (Main) Engineering Entrance Course',
          type: 'JEE',
          description: 'Physics, Chemistry & Mathematics — Official 75-Question (300 Marks) NTA CBT Curriculum.',
          active: true,
          createdAt: new Date(),
        },
        {
          id: 'course_jee_adv',
          name: 'JEE (Advanced) IIT Entrance Course',
          type: 'JEE_ADVANCED',
          description: 'High-Order Multi-Format Paper 1 & Paper 2 IIT Entrance Curriculum (Physics, Chemistry, Mathematics).',
          active: true,
          createdAt: new Date(),
        },
        {
          id: 'course_neet',
          name: 'NEET (UG) Pre-Medical Entrance Course',
          type: 'NEET',
          description: 'Physics, Chemistry, Botany & Zoology — Official 180-Question (720 Marks) Medical Entrance Curriculum.',
          active: true,
          createdAt: new Date(),
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(enrollments)
      .values([
        {
          id: 'enr-rahul-jee',
          studentId: student1Id,
          courseId: 'course_jee',
          courseType: 'JEE',
          status: 'ACTIVE',
          assignedBy: teacher1Id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'enr-aarav-jee',
          studentId: student2Id,
          courseId: 'course_jee',
          courseType: 'JEE',
          status: 'ACTIVE',
          assignedBy: teacher1Id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'enr-aarav-jee-adv',
          studentId: student2Id,
          courseId: 'course_jee_adv',
          courseType: 'JEE_ADVANCED',
          status: 'ACTIVE',
          assignedBy: teacher1Id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'enr-ananya-neet',
          studentId: student3Id,
          courseId: 'course_neet',
          courseType: 'NEET',
          status: 'ACTIVE',
          assignedBy: teacher2Id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'enr-rohan-neet',
          studentId: student4Id,
          courseId: 'course_neet',
          courseType: 'NEET',
          status: 'ACTIVE',
          assignedBy: teacher2Id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'enr-vikram-jee',
          studentId: student5Id,
          courseId: 'course_jee',
          courseType: 'JEE',
          status: 'SUSPENDED',
          assignedBy: teacher1Id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(studyMaterials)
      .values([
        {
          id: 'mat-jee-phy-01',
          courseId: 'course_jee',
          courseType: 'JEE',
          subject: 'Physics',
          chapter: 'Rotational Mechanics & Electrostatics',
          title: 'JEE Main 2026 Physics Master Formula & Theorem Sheet',
          materialType: 'FORMULA_SHEET',
          description: 'Complete Moment of Inertia tensors, Rolling without slipping conservation equations, Gauss Law flux integrals, and Dielectric slab capacitor relations.',
          contentBody: '1. Moment of Inertia: I_cm for Ring = MR^2, Disc = 1/2 MR^2, Solid Sphere = 2/5 MR^2, Hollow Sphere = 2/3 MR^2.\n2. Rolling Acceleration on incline θ: a = g sinθ / (1 + I / MR^2).\n3. Parallel Plate Capacitor with Dielectric Slab thickness t: C = ε₀A / (d - t + t/K).',
          createdBy: teacher1Id,
          createdAt: new Date(),
        },
        {
          id: 'mat-jee-chem-01',
          courseId: 'course_jee',
          courseType: 'JEE',
          subject: 'Chemistry',
          chapter: 'Electrochemistry & Chemical Kinetics',
          title: 'JEE Main Physical Chemistry Rapid Revision Handbook',
          materialType: 'CONCEPT_SUMMARY',
          description: 'Nernst equation derivations at 298 K, First-order kinetics half-life relations, Arrhenius activation energy equations, and Colligative properties.',
          contentBody: '1. Nernst Equation: E_cell = E°_cell - (0.0591 / n) log Q at 298 K.\n2. First Order Kinetics: k = (2.303 / t) log([A]₀ / [A]_t), t_{1/2} = 0.693 / k.\n3. Gibbs Free Energy: ΔG° = -nFE°_cell = -2.303 RT log K_eq.',
          createdBy: teacher1Id,
          createdAt: new Date(),
        },
        {
          id: 'mat-jee-math-01',
          courseId: 'course_jee',
          courseType: 'JEE',
          subject: 'Mathematics',
          chapter: 'Definite Calculus, Matrices & 3D Vectors',
          title: 'JEE Main Mathematics High-Weightage Identities & Shortcuts',
          materialType: 'FORMULA_SHEET',
          description: 'King property of definite integrals, Cayley-Hamilton characteristic equations, Shortest distance between skew lines, and Conic section tangents.',
          contentBody: '1. King Property: ∫_a^b f(x) dx = ∫_a^b f(a + b - x) dx.\n2. Determinants: |adj(A)| = |A|^{n-1}, |kA| = k^n |A|.\n3. Shortest Distance between Skew Lines: d = |(b₁ × b₂) · (a₂ - a₁)| / |b₁ × b₂|.',
          createdBy: teacher1Id,
          createdAt: new Date(),
        },
        {
          id: 'mat-jee-adv-01',
          courseId: 'course_jee_adv',
          courseType: 'JEE_ADVANCED',
          subject: 'Physics',
          chapter: 'Advanced Electrodynamics & Modern Physics',
          title: 'JEE Advanced Multi-Concept Problem Solving Monograph',
          materialType: 'PYQ_BOOKLET',
          description: 'Non-uniform charge distributions, motional EMF in rotating conductors, de Broglie matter waves in variable potentials, and RC transient circuits.',
          contentBody: '1. Motional EMF in rotating rod in uniform B: ε = 1/2 B ω L^2.\n2. Radiation Pressure for perfectly reflecting surface: P = 2I / c.\n3. Bohr Orbit Velocity & Energy: v_n ∝ Z/n, E_n = -13.6 Z^2 / n^2 eV.',
          createdBy: teacher1Id,
          createdAt: new Date(),
        },
        {
          id: 'mat-neet-bio-01',
          courseId: 'course_neet',
          courseType: 'NEET',
          subject: 'Botany',
          chapter: 'Genetics, Molecular Biology & Plant Physiology',
          title: 'NEET UG NCERT Line-by-Line Botany Master Compendium',
          materialType: 'NOTES',
          description: 'Mendelian dihybrid phenotypic ratios, Lac Operon regulation, C3 vs C4 Kranz anatomy pathways, and Meiosis Prophase-I sub-stages.',
          contentBody: '1. Prophase-I Stages: Leptotene -> Zygotene (Synapsis) -> Pachytene (Crossing over) -> Diplotene (Chiasmata) -> Diakinesis.\n2. C4 Cycle (Hatch-Slack): Primary CO₂ acceptor is PEP (3-carbon) in mesophyll cells catalyzed by PEPcase.\n3. Hardy-Weinberg Equilibrium: p² + 2pq + q² = 1.',
          createdBy: teacher2Id,
          createdAt: new Date(),
        },
        {
          id: 'mat-neet-zoo-01',
          courseId: 'course_neet',
          courseType: 'NEET',
          subject: 'Zoology',
          chapter: 'Human Physiology & Biotechnology Applications',
          title: 'NEET UG Zoology High-Yield NCERT Clinical & Hormone Chart',
          materialType: 'CONCEPT_SUMMARY',
          description: 'Cardiac cycle ventricular volumes, Oxyhaemoglobin dissociation curve shifts, Counter-current mechanism in Henle loop, and PCR Taq polymerase steps.',
          contentBody: '1. Cardiac Output = Stroke Volume (70 mL) × Heart Rate (72 bpm) ≈ 5040 mL/min.\n2. PCR Cycle Steps: Denaturation (94°C) -> Annealing (54°C) -> Extension (72°C with Taq Polymerase).\n3. Neurohypophysis Hormones: Oxytocin and Vasopressin (ADH) synthesized in hypothalamus.',
          createdBy: teacher2Id,
          createdAt: new Date(),
        },
        {
          id: 'mat-neet-phychem-01',
          courseId: 'course_neet',
          courseType: 'NEET',
          subject: 'Physics',
          chapter: 'NEET Physics & Chemistry Rapid Calculation Formulae',
          title: 'NEET UG 180-Minute Speed Calculation Formula Booklet',
          materialType: 'FORMULA_SHEET',
          description: 'Ray optics lens-maker equation, Logic gates truth tables, Semiconductors, Coordination chemistry EAN & VSEPR hybridization tables for NEET.',
          contentBody: '1. Lens Maker Formula: 1/f = (n₂/n₁ - 1)(1/R₁ - 1/R₂).\n2. Radioactive Decay & Photoelectric Effect: K_max = hν - φ₀.\n3. Spin-Only Magnetic Moment: μ = √(n(n+2)) BM where n = number of unpaired electrons.',
          createdBy: teacher2Id,
          createdAt: new Date(),
        },
      ])
      .onConflictDoNothing();

    const existingProfiles = await db.select({ id: profiles.id }).from(profiles).limit(1);
    if (existingProfiles.length > 0) {
      isAuthSeeded = true;
      return;
    }

    console.log('Seeding initial RBAC accounts, courses, enrollments, batches, and settings...');

    await updateStudentIdConfig(DEFAULT_STUDENT_ID_CONFIG);

    await db.insert(profiles).values([
      {
        id: adminId,
        username: 'admin',
        email: 'admin@ntapulse.edu.in',
        fullName: 'Dr. Rajeshwar Rao (Chief Controller of Examinations)',
        passwordHash: hashPassword('Admin@2026!'),
        role: 'ADMIN',
        studentId: null,
        teacherId: null,
        batchId: null,
        className: 'Administration',
        examCategory: 'JEE_MAIN',
        courseId: 'course_jee',
        courseType: 'JEE',
        enrollmentStatus: 'ACTIVE',
        assignedCoursesJson: JSON.stringify(['JEE', 'JEE_ADVANCED', 'NEET']),
        targetYear: 2026,
        subjectAccessJson: JSON.stringify(['Physics', 'Chemistry', 'Mathematics', 'Botany', 'Zoology']),
        testAccessJson: JSON.stringify(['ALL']),
        teacherPermissionsJson: JSON.stringify({
          canCreateTests: true,
          canCreateQuestions: true,
          canManageBatches: true,
          canResetStudentPasswords: true,
          canViewAllStudents: true,
        }),
        status: 'ACTIVE',
        mustChangePassword: false,
        tempPasswordHint: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: teacher1Id,
        username: 'hcverma',
        email: 'hcverma@ntapulse.edu.in',
        fullName: 'Prof. H.C. Verma (HOD Physics & JEE Mentor)',
        passwordHash: hashPassword('Teacher@2026!'),
        role: 'TEACHER',
        studentId: null,
        teacherId: null,
        batchId: null,
        className: 'JEE Faculty',
        examCategory: 'JEE_MAIN',
        courseId: 'course_jee',
        courseType: 'JEE',
        enrollmentStatus: 'ACTIVE',
        assignedCoursesJson: JSON.stringify(['JEE', 'JEE_ADVANCED']),
        targetYear: 2026,
        subjectAccessJson: JSON.stringify(['Physics', 'Chemistry', 'Mathematics']),
        testAccessJson: JSON.stringify([]),
        teacherPermissionsJson: JSON.stringify(DEFAULT_TEACHER_PERMS),
        status: 'ACTIVE',
        mustChangePassword: false,
        tempPasswordHint: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: teacher2Id,
        username: 'ritusharma',
        email: 'ritusharma@ntapulse.edu.in',
        fullName: 'Dr. Ritu Sharma (Senior NEET Biology & Chemistry Faculty)',
        passwordHash: hashPassword('Teacher@2026!'),
        role: 'TEACHER',
        studentId: null,
        teacherId: null,
        batchId: null,
        className: 'NEET Faculty',
        examCategory: 'NEET',
        courseId: 'course_neet',
        courseType: 'NEET',
        enrollmentStatus: 'ACTIVE',
        assignedCoursesJson: JSON.stringify(['NEET']),
        targetYear: 2026,
        subjectAccessJson: JSON.stringify(['Physics', 'Chemistry', 'Botany', 'Zoology']),
        testAccessJson: JSON.stringify([]),
        teacherPermissionsJson: JSON.stringify(DEFAULT_TEACHER_PERMS),
        status: 'ACTIVE',
        mustChangePassword: false,
        tempPasswordHint: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: student1Id,
        username: null,
        email: 'rahul.verma@student.ntapulse.edu.in',
        fullName: 'Rahul Verma',
        passwordHash: hashPassword('Student@2026!'),
        role: 'STUDENT',
        studentId: 'JEE26-10001',
        teacherId: teacher1Id,
        batchId: batchJeeMainId,
        className: 'Class 12',
        examCategory: 'JEE_MAIN',
        courseId: 'course_jee',
        courseType: 'JEE',
        enrollmentStatus: 'ACTIVE',
        assignedCoursesJson: JSON.stringify(['JEE']),
        targetYear: 2026,
        subjectAccessJson: JSON.stringify(['Physics', 'Chemistry', 'Mathematics']),
        testAccessJson: JSON.stringify(['jee-main-full-mock-01', 'JEE-MAIN-002']),
        teacherPermissionsJson: JSON.stringify({}),
        status: 'ACTIVE',
        mustChangePassword: false,
        tempPasswordHint: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: student2Id,
        username: null,
        email: 'aarav.mehta@student.ntapulse.edu.in',
        fullName: 'Aarav Mehta',
        passwordHash: hashPassword('Temp@7F42K'),
        role: 'STUDENT',
        studentId: 'JEE26-7F42K',
        teacherId: teacher1Id,
        batchId: batchJeeAdvId,
        className: 'Class 12',
        examCategory: 'JEE_ADVANCED',
        courseId: 'course_jee_adv',
        courseType: 'JEE_ADVANCED',
        enrollmentStatus: 'ACTIVE',
        assignedCoursesJson: JSON.stringify(['JEE', 'JEE_ADVANCED']),
        targetYear: 2026,
        subjectAccessJson: JSON.stringify(['Physics', 'Chemistry', 'Mathematics']),
        testAccessJson: JSON.stringify(['jee-adv-paper1-mock-01', 'jee-main-full-mock-01']),
        teacherPermissionsJson: JSON.stringify({}),
        status: 'ACTIVE',
        mustChangePassword: true,
        tempPasswordHint: 'Temp@7F42K',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: student3Id,
        username: null,
        email: 'ananya.krishnan@student.ntapulse.edu.in',
        fullName: 'Ananya Krishnan',
        passwordHash: hashPassword('Student@2026!'),
        role: 'STUDENT',
        studentId: 'NEET26-10001',
        teacherId: teacher2Id,
        batchId: batchNeetBioId,
        className: 'Class 12',
        examCategory: 'NEET',
        courseId: 'course_neet',
        courseType: 'NEET',
        enrollmentStatus: 'ACTIVE',
        assignedCoursesJson: JSON.stringify(['NEET']),
        targetYear: 2026,
        subjectAccessJson: JSON.stringify(['Physics', 'Chemistry', 'Botany', 'Zoology']),
        testAccessJson: JSON.stringify(['neet-ug-full-mock-01', 'NEET-UG-002']),
        teacherPermissionsJson: JSON.stringify({}),
        status: 'ACTIVE',
        mustChangePassword: false,
        tempPasswordHint: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: student4Id,
        username: null,
        email: 'rohan.gupta@student.ntapulse.edu.in',
        fullName: 'Rohan Gupta',
        passwordHash: hashPassword('Temp@10482'),
        role: 'STUDENT',
        studentId: 'NEET26-10482',
        teacherId: teacher2Id,
        batchId: batchNeetBioId,
        className: 'Dropper / Repeater',
        examCategory: 'NEET',
        courseId: 'course_neet',
        courseType: 'NEET',
        enrollmentStatus: 'ACTIVE',
        assignedCoursesJson: JSON.stringify(['NEET']),
        targetYear: 2026,
        subjectAccessJson: JSON.stringify(['Physics', 'Chemistry', 'Botany', 'Zoology']),
        testAccessJson: JSON.stringify(['neet-ug-full-mock-01']),
        teacherPermissionsJson: JSON.stringify({}),
        status: 'ACTIVE',
        mustChangePassword: true,
        tempPasswordHint: 'Temp@10482',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: student5Id,
        username: null,
        email: 'vikram.singh@student.ntapulse.edu.in',
        fullName: 'Vikramaditya Singh',
        passwordHash: hashPassword('Student@2026!'),
        role: 'STUDENT',
        studentId: 'JEE26-10003',
        teacherId: teacher1Id,
        batchId: batchJeeMainId,
        className: 'Class 11',
        examCategory: 'JEE_MAIN',
        courseId: 'course_jee',
        courseType: 'JEE',
        enrollmentStatus: 'SUSPENDED',
        assignedCoursesJson: JSON.stringify(['JEE']),
        targetYear: 2027,
        subjectAccessJson: JSON.stringify(['Physics', 'Chemistry', 'Mathematics']),
        testAccessJson: JSON.stringify([]),
        teacherPermissionsJson: JSON.stringify({}),
        status: 'SUSPENDED',
        mustChangePassword: false,
        tempPasswordHint: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // 2. Seed Batches with Course IDs
    await db.insert(batches).values([
      {
        id: batchJeeAdvId,
        name: 'JEE Advanced 2027 Batch A',
        description: 'Elite rankers batch focused on multi-concept problem solving for IIT JEE Paper 1 & Paper 2.',
        examCategory: 'JEE_ADVANCED',
        courseId: 'course_jee_adv',
        courseType: 'JEE_ADVANCED',
        className: 'Class 12',
        teacherId: teacher1Id,
        teacherName: 'Prof. H.C. Verma (HOD Physics & JEE Mentor)',
        status: 'ACTIVE',
        assignedTestIdsJson: JSON.stringify(['jee-adv-paper1-mock-01', 'JEE-ADV-002', 'jee-main-full-mock-01']),
        studentIdsJson: JSON.stringify([student2Id]),
        createdAt: new Date(),
      },
      {
        id: batchJeeMainId,
        name: 'JEE Main 2027 Morning Batch',
        description: 'Comprehensive NCERT + NTA CBT simulation batch for JEE Main Paper 1 (75 Questions / 300 Marks).',
        examCategory: 'JEE_MAIN',
        courseId: 'course_jee',
        courseType: 'JEE',
        className: 'Class 12',
        teacherId: teacher1Id,
        teacherName: 'Prof. H.C. Verma (HOD Physics & JEE Mentor)',
        status: 'ACTIVE',
        assignedTestIdsJson: JSON.stringify(['jee-main-full-mock-01', 'JEE-MAIN-002', 'pyq-jee-main-2025-jan-s1']),
        studentIdsJson: JSON.stringify([student1Id, student5Id]),
        createdAt: new Date(),
      },
      {
        id: batchNeetBioId,
        name: 'NEET 2027 Biology Batch',
        description: 'Dedicated pre-medical cohort covering Physics, Chemistry, Botany & Zoology (180 Compulsory Questions).',
        examCategory: 'NEET',
        courseId: 'course_neet',
        courseType: 'NEET',
        className: 'Class 12',
        teacherId: teacher2Id,
        teacherName: 'Dr. Ritu Sharma (Senior NEET Biology & Chemistry Faculty)',
        status: 'ACTIVE',
        assignedTestIdsJson: JSON.stringify(['neet-ug-full-mock-01', 'NEET-UG-002', 'pyq-neet-ug-2025-official']),
        studentIdsJson: JSON.stringify([student3Id, student4Id]),
        createdAt: new Date(),
      },
    ]);

    // 3. Seed Course-Scoped Announcements
    await db.insert(announcements).values([
      {
        id: 'ann-01',
        title: 'Official 2026 Examination Security & Course Isolation Active',
        content: 'All mock tests, PYQ archives, and analytics are strictly bound to your enrolled course. Complete your system check 15 minutes before starting.',
        courseId: 'ALL',
        courseType: 'ALL',
        authorId: adminId,
        authorName: 'Dr. Rajeshwar Rao (Chief Controller)',
        authorRole: 'ADMIN',
        targetAudience: 'ALL',
        targetBatchId: null,
        priority: 'URGENT',
        createdAt: new Date(),
      },
      {
        id: 'ann-02',
        title: 'JEE Main Morning Batch: Mandatory Full Mock #01 Review',
        content: 'All JEE students in JEE Main 2027 Morning Batch must complete Full Mock Test #01 by Sunday 8:00 PM. Rotational mechanics and electrostatics numericals will be discussed.',
        courseId: 'course_jee',
        courseType: 'JEE',
        authorId: teacher1Id,
        authorName: 'Prof. H.C. Verma',
        authorRole: 'TEACHER',
        targetAudience: 'BATCH',
        targetBatchId: batchJeeMainId,
        priority: 'IMPORTANT',
        createdAt: new Date(),
      },
      {
        id: 'ann-03',
        title: 'NEET 2027 Biology Batch: Genetics & Plant Physiology Drill',
        content: 'NEET Full Mock #01 (180 Compulsory MCQs) has been assigned to the NEET cohort. Pay special attention to NCERT Genetics and Human Physiology.',
        courseId: 'course_neet',
        courseType: 'NEET',
        authorId: teacher2Id,
        authorName: 'Dr. Ritu Sharma',
        authorRole: 'TEACHER',
        targetAudience: 'BATCH',
        targetBatchId: batchNeetBioId,
        priority: 'NORMAL',
        createdAt: new Date(),
      },
    ]);

    // 4. Seed Initial Audit Logs
    await db.insert(auditLogs).values([
      {
        id: 'audit-init-1',
        actorId: adminId,
        actorName: 'Dr. Rajeshwar Rao',
        actorRole: 'ADMIN',
        action: 'SYSTEM_BOOTSTRAP',
        target: 'RBAC & Course Separation Security Engine',
        details: 'Initialized PostgreSQL profiles, courses (JEE, JEE_ADVANCED, NEET), student enrollments, and course-scoped RLS policies.',
        createdAt: new Date(),
      },
      {
        id: 'audit-init-2',
        actorId: teacher1Id,
        actorName: 'Prof. H.C. Verma',
        actorRole: 'TEACHER',
        action: 'ENROLL_STUDENT_COURSE',
        target: 'JEE26-10001 (Rahul Verma) -> course_jee',
        details: 'Verified ACTIVE enrollment in JEE (Main) course.',
        createdAt: new Date(),
      },
    ]);

    isAuthSeeded = true;
    console.log('RBAC & Course Separation seeding complete.');
  } catch (err) {
    console.error('Error seeding RBAC tables:', err);
  }
}

// ----------------- AUTHENTICATION & SESSION OPERATIONS -----------------

export async function authenticateUser(params: {
  role: UserRole;
  identifier: string; // Student ID for STUDENT, Email/Username for TEACHER, Email/Username for ADMIN
  password: string;
  rememberMe?: boolean;
  userAgent?: string;
  ipAddress?: string;
}): Promise<{
  success: boolean;
  statusCode: number;
  error?: string;
  accountStatus?: AccountStatus;
  token?: string;
  profile?: AuthProfile;
}> {
  await ensureAuthSeeded();
  const cleanId = params.identifier.trim();

  let matchedRows: (typeof profiles.$inferSelect)[] = [];

  if (params.role === 'STUDENT') {
    // Students log in using their unique Student ID (case-insensitive match)
    const allStudents = await db
      .select()
      .from(profiles)
      .where(eq(profiles.role, 'STUDENT'));
    matchedRows = allStudents.filter(
      (s) => s.studentId && s.studentId.toUpperCase() === cleanId.toUpperCase()
    );
  } else if (params.role === 'TEACHER') {
    const allTeachers = await db
      .select()
      .from(profiles)
      .where(eq(profiles.role, 'TEACHER'));
    matchedRows = allTeachers.filter(
      (t) =>
        (t.email && t.email.toLowerCase() === cleanId.toLowerCase()) ||
        (t.username && t.username.toLowerCase() === cleanId.toLowerCase())
    );
  } else if (params.role === 'ADMIN') {
    const allAdmins = await db
      .select()
      .from(profiles)
      .where(eq(profiles.role, 'ADMIN'));
    matchedRows = allAdmins.filter(
      (a) =>
        (a.email && a.email.toLowerCase() === cleanId.toLowerCase()) ||
        (a.username && a.username.toLowerCase() === cleanId.toLowerCase())
    );
  }

  if (matchedRows.length === 0) {
    const idLabel =
      params.role === 'STUDENT'
        ? 'Student ID'
        : params.role === 'TEACHER'
        ? 'Teacher email/username'
        : 'Administrator email';
    return {
      success: false,
      statusCode: 401,
      error: `Invalid ${idLabel} or password. Please verify your credentials and selected role tab.`,
    };
  }

  const userRow = matchedRows[0];

  // Verify password hash first
  const passwordValid = verifyPassword(params.password, userRow.passwordHash);
  if (!passwordValid) {
    return {
      success: false,
      statusCode: 401,
      error: 'Invalid credentials. Please check your password and try again.',
    };
  }

  // Check Account Status (Section 17 requirement)
  if (userRow.status === 'SUSPENDED') {
    return {
      success: false,
      statusCode: 403,
      accountStatus: 'SUSPENDED',
      error:
        'Account Suspended — Your examination portal account has been suspended by the administration. Please contact your assigned faculty or Examination Controller.',
    };
  }
  if (userRow.status === 'DEACTIVATED') {
    return {
      success: false,
      statusCode: 403,
      accountStatus: 'DEACTIVATED',
      error:
        'Account Deactivated — This account is currently inactive and cannot access tests or dashboard resources.',
    };
  }
  if (userRow.status === 'PENDING') {
    return {
      success: false,
      statusCode: 403,
      accountStatus: 'PENDING',
      error:
        'Account Pending Approval — Your account setup is awaiting activation by an administrator.',
    };
  }

  // Check Account Expiry if set
  if (userRow.expiresAt && new Date(userRow.expiresAt).getTime() < Date.now()) {
    return {
      success: false,
      statusCode: 403,
      error: `Account Expired — Your examination enrollment expired on ${new Date(
        userRow.expiresAt
      ).toLocaleDateString()}. Please contact your teacher or administrator to extend validity.`,
    };
  }

  // Check Course Enrollment Status for STUDENT (Section 1 & Section 24)
  if (
    userRow.role === 'STUDENT' &&
    userRow.enrollmentStatus &&
    userRow.enrollmentStatus !== 'ACTIVE'
  ) {
    return {
      success: false,
      statusCode: 403,
      error: `Course Enrollment ${userRow.enrollmentStatus} — Your enrollment in the ${
        userRow.courseType || userRow.examCategory
      } course is currently ${userRow.enrollmentStatus}. Please contact your Faculty Mentor or Administrator.`,
    };
  }

  // Update lastLogin timestamp
  const now = new Date();
  await db
    .update(profiles)
    .set({ lastLogin: now, updatedAt: now })
    .where(eq(profiles.id, userRow.id));

  // Create persistent session in PostgreSQL
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const ttlMs = params.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  await db.insert(authSessions).values({
    id: `sess-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    tokenHash,
    userId: userRow.id,
    role: userRow.role,
    userAgent: params.userAgent || 'Browser Client',
    ipAddress: params.ipAddress || '127.0.0.1',
    rememberMe: Boolean(params.rememberMe),
    expiresAt,
    revoked: false,
    createdAt: now,
  });

  await createAuditLog({
    actorId: userRow.id,
    actorName: userRow.fullName,
    actorRole: userRow.role as UserRole,
    action: 'USER_LOGIN',
    target: userRow.studentId || userRow.email || userRow.id,
    details: `${userRow.role} signed in successfully`,
  });

  const enrichedProfile = await getProfileById(userRow.id);

  return {
    success: true,
    statusCode: 200,
    token: rawToken,
    profile: enrichedProfile || mapRowToProfile({ ...userRow, lastLogin: now }),
  };
}

export async function verifySessionToken(rawToken: string): Promise<{
  valid: boolean;
  error?: string;
  accountStatus?: AccountStatus;
  profile?: AuthProfile;
  sessionId?: string;
}> {
  if (!rawToken) return { valid: false, error: 'Missing session token' };
  await ensureAuthSeeded();

  const tokenHash = hashToken(rawToken);
  const sessionRows = await db
    .select()
    .from(authSessions)
    .where(eq(authSessions.tokenHash, tokenHash));

  if (sessionRows.length === 0) {
    return { valid: false, error: 'Invalid or expired session. Please sign in again.' };
  }

  const session = sessionRows[0];
  if (session.revoked) {
    return {
      valid: false,
      error: 'Your session was terminated by an administrator. Please sign in again.',
    };
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return { valid: false, error: 'Session expired. Please sign in again.' };
  }

  const profile = await getProfileById(session.userId);
  if (!profile) {
    return { valid: false, error: 'User profile no longer exists.' };
  }

  if (profile.status !== 'ACTIVE') {
    return {
      valid: false,
      accountStatus: profile.status,
      error: `Account is currently ${profile.status}. Access denied.`,
    };
  }

  if (profile.expiresAt && new Date(profile.expiresAt).getTime() < Date.now()) {
    return {
      valid: false,
      error: 'Your student account validity has expired.',
    };
  }

  return {
    valid: true,
    profile,
    sessionId: session.id,
  };
}

export async function revokeSessionByToken(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await db
    .update(authSessions)
    .set({ revoked: true })
    .where(eq(authSessions.tokenHash, tokenHash));
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  const existing = await db
    .select({ id: authSessions.id })
    .from(authSessions)
    .where(and(eq(authSessions.userId, userId), eq(authSessions.revoked, false)));

  await db
    .update(authSessions)
    .set({ revoked: true })
    .where(eq(authSessions.userId, userId));

  return existing.length;
}

// ----------------- FIRST LOGIN & PASSWORD MANAGEMENT -----------------

export async function completeFirstLoginPasswordChange(params: {
  userId: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string; profile?: AuthProfile }> {
  const check = validatePasswordComplexity(params.newPassword);
  if (!check.valid) {
    return { success: false, error: check.message };
  }

  const rows = await db.select().from(profiles).where(eq(profiles.id, params.userId));
  if (rows.length === 0) {
    return { success: false, error: 'User account not found.' };
  }

  const currentRow = rows[0];
  // Prevent setting the exact same temporary password
  if (verifyPassword(params.newPassword, currentRow.passwordHash)) {
    return {
      success: false,
      error: 'Your new password must be different from your temporary password.',
    };
  }

  const newHash = hashPassword(params.newPassword);
  const now = new Date();

  await db
    .update(profiles)
    .set({
      passwordHash: newHash,
      mustChangePassword: false,
      tempPasswordHint: null, // Destroy temporary password hint permanently
      updatedAt: now,
    })
    .where(eq(profiles.id, params.userId));

  await createAuditLog({
    actorId: currentRow.id,
    actorName: currentRow.fullName,
    actorRole: currentRow.role as UserRole,
    action: 'FIRST_LOGIN_PASSWORD_CHANGED',
    target: currentRow.studentId || currentRow.email || currentRow.id,
    details: 'Temporary password invalidated and replaced with permanent password.',
  });

  const updatedProfile = await getProfileById(params.userId);
  return { success: true, profile: updatedProfile || undefined };
}

export async function resetUserPasswordByStaff(params: {
  targetUserId: string;
  newTemporaryPassword: string;
  forceChangeOnNextLogin: boolean;
  actor: AuthProfile;
}): Promise<{ success: boolean; error?: string; profile?: AuthProfile }> {
  if (!params.newTemporaryPassword || params.newTemporaryPassword.length < 6) {
    return { success: false, error: 'Temporary password must be at least 6 characters.' };
  }

  const targetRows = await db.select().from(profiles).where(eq(profiles.id, params.targetUserId));
  if (targetRows.length === 0) {
    return { success: false, error: 'Target user not found.' };
  }

  const target = targetRows[0];

  // Role check: Teachers can only reset passwords of students assigned to them (unless elevated)
  if (params.actor.role === 'TEACHER') {
    if (target.role !== 'STUDENT') {
      return { success: false, error: 'Teachers can only reset student passwords.' };
    }
    if (
      !params.actor.teacherPermissions.canViewAllStudents &&
      target.teacherId !== params.actor.id
    ) {
      return {
        success: false,
        error: 'Access Denied — You can only reset credentials for students assigned to you.',
      };
    }
  }

  const newHash = hashPassword(params.newTemporaryPassword);
  const now = new Date();

  await db
    .update(profiles)
    .set({
      passwordHash: newHash,
      mustChangePassword: params.forceChangeOnNextLogin,
      tempPasswordHint: params.forceChangeOnNextLogin ? params.newTemporaryPassword : null,
      updatedAt: now,
    })
    .where(eq(profiles.id, params.targetUserId));

  // Also revoke existing sessions so user must re-authenticate with new credentials
  await revokeAllUserSessions(params.targetUserId);

  await createAuditLog({
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    action: 'CREDENTIAL_RESET',
    target: `${target.fullName} (${target.studentId || target.email})`,
    details: `Password reset by ${params.actor.role}. Force change on login: ${params.forceChangeOnNextLogin}`,
  });

  const updated = await getProfileById(params.targetUserId);
  return { success: true, profile: updated || undefined };
}

// ----------------- PROFILE & USER CRUD -----------------

export async function getAllProfiles(): Promise<AuthProfile[]> {
  await ensureAuthSeeded();
  const allRows = await db.select().from(profiles).orderBy(desc(profiles.createdAt));
  const allBatches = await db.select().from(batches);
  const allEnrollments = await db.select().from(enrollments);
  const activeSessions = await db
    .select()
    .from(authSessions)
    .where(eq(authSessions.revoked, false));

  const teacherMap = new Map<string, string>();
  const studentNameMap = new Map<string, { fullName: string; studentId?: string | null }>();
  allRows.forEach((r) => {
    if (r.role === 'TEACHER' || r.role === 'ADMIN') {
      teacherMap.set(r.id, r.fullName);
    }
    studentNameMap.set(r.id, { fullName: r.fullName, studentId: r.studentId });
  });

  const batchMap = new Map<string, string>();
  allBatches.forEach((b) => {
    batchMap.set(b.id, b.name);
  });

  const enrollmentMap = new Map<string, EnrollmentRecord[]>();
  allEnrollments.forEach((e) => {
    const stuInfo = studentNameMap.get(e.studentId);
    const rec: EnrollmentRecord = {
      id: e.id,
      studentId: e.studentId,
      studentName: stuInfo?.fullName,
      studentCode: stuInfo?.studentId,
      courseId: e.courseId,
      courseType: e.courseType as CourseType,
      status: (e.status as EnrollmentStatus) || 'ACTIVE',
      assignedBy: e.assignedBy,
      createdAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: e.updatedAt ? e.updatedAt.toISOString() : new Date().toISOString(),
    };
    const arr = enrollmentMap.get(e.studentId) || [];
    arr.push(rec);
    enrollmentMap.set(e.studentId, arr);
  });

  const now = Date.now();
  const sessionCounts = new Map<string, number>();
  activeSessions.forEach((s) => {
    if (new Date(s.expiresAt).getTime() > now) {
      sessionCounts.set(s.userId, (sessionCounts.get(s.userId) || 0) + 1);
    }
  });

  return allRows.map((row) =>
    mapRowToProfile(row, teacherMap, batchMap, sessionCounts, enrollmentMap)
  );
}

export async function getProfileById(userId: string): Promise<AuthProfile | null> {
  const all = await getAllProfiles();
  return all.find((p) => p.id === userId) || null;
}

export async function createTeacherAccount(params: {
  fullName: string;
  email: string;
  username?: string;
  password: string;
  examCategory: ExamType;
  className?: string;
  subjectAccess?: SubjectName[];
  teacherPermissions?: Partial<TeacherPermissions>;
  actor: AuthProfile;
}): Promise<{ success: boolean; error?: string; profile?: AuthProfile }> {
  if (params.actor.role !== 'ADMIN') {
    return { success: false, error: 'Only Administrators can create Teacher accounts.' };
  }

  const emailClean = params.email.trim().toLowerCase();
  const usernameClean = (params.username || emailClean.split('@')[0]).trim().toLowerCase();

  const existing = await db.select().from(profiles);
  if (existing.some((p) => p.email?.toLowerCase() === emailClean)) {
    return { success: false, error: 'A user with this email address already exists.' };
  }
  if (existing.some((p) => p.username?.toLowerCase() === usernameClean)) {
    return { success: false, error: 'A teacher with this username already exists.' };
  }

  const id = `usr-teacher-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
  const perms: TeacherPermissions = {
    ...DEFAULT_TEACHER_PERMS,
    ...(params.teacherPermissions || {}),
  };

  await db.insert(profiles).values({
    id,
    username: usernameClean,
    email: emailClean,
    fullName: params.fullName.trim(),
    passwordHash: hashPassword(params.password),
    role: 'TEACHER',
    studentId: null,
    teacherId: null,
    batchId: null,
    className: params.className || 'Senior Faculty',
    examCategory: params.examCategory || 'JEE_MAIN',
    targetYear: 2026,
    subjectAccessJson: JSON.stringify(
      params.subjectAccess || ['Physics', 'Chemistry', 'Mathematics']
    ),
    testAccessJson: JSON.stringify([]),
    teacherPermissionsJson: JSON.stringify(perms),
    status: 'ACTIVE',
    mustChangePassword: false,
    tempPasswordHint: params.password,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await createAuditLog({
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    action: 'CREATE_TEACHER',
    target: `${params.fullName} (${emailClean})`,
    details: `Created teacher account for ${params.examCategory}`,
  });

  const created = await getProfileById(id);
  return { success: true, profile: created || undefined };
}

export async function createStudentAccount(params: {
  fullName: string;
  email?: string;
  examCategory: ExamType;
  targetYear?: number;
  batchId?: string | null;
  teacherId?: string | null;
  className?: string;
  subjectAccess?: SubjectName[];
  testAccess?: string[];
  expiresAt?: string | null;
  initialPassword?: string;
  idFormat?: 'SEQUENTIAL' | 'ALPHANUMERIC';
  actor: AuthProfile;
}): Promise<{
  success: boolean;
  error?: string;
  profile?: AuthProfile;
  generatedStudentId?: string;
  temporaryPassword?: string;
}> {
  if (params.actor.role !== 'ADMIN' && params.actor.role !== 'TEACHER') {
    return {
      success: false,
      error: 'Only Administrators and Teachers can create Student accounts.',
    };
  }

  const studentId = await generateUniqueStudentId(params.examCategory, params.idFormat);
  const suffix = studentId.split('-')[1] || '2026';
  const tempPassword =
    params.initialPassword && params.initialPassword.trim().length >= 6
      ? params.initialPassword.trim()
      : `Temp@${suffix}`;

  const assignedTeacherId =
    params.actor.role === 'TEACHER'
      ? params.actor.id
      : params.teacherId || 'usr-teacher-hcverma';

  const resolvedCourse = resolveCourseFromExam(params.examCategory);
  const defaultSubjects = resolvedCourse.defaultSubjects;

  const id = `usr-student-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
  const cleanEmail =
    params.email && params.email.trim()
      ? params.email.trim().toLowerCase()
      : `${studentId.toLowerCase()}@student.ntapulse.edu.in`;

  await db.insert(profiles).values({
    id,
    username: null,
    email: cleanEmail,
    fullName: params.fullName.trim(),
    passwordHash: hashPassword(tempPassword),
    role: 'STUDENT',
    studentId,
    teacherId: assignedTeacherId,
    batchId: params.batchId || null,
    className: params.className || 'Class 12',
    examCategory: params.examCategory,
    courseId: resolvedCourse.courseId,
    courseType: resolvedCourse.courseType,
    enrollmentStatus: 'ACTIVE',
    assignedCoursesJson: JSON.stringify(resolvedCourse.assignedCourses),
    targetYear: params.targetYear || 2026,
    subjectAccessJson: JSON.stringify(params.subjectAccess || defaultSubjects),
    testAccessJson: JSON.stringify(params.testAccess || []),
    teacherPermissionsJson: JSON.stringify({}),
    status: 'ACTIVE',
    mustChangePassword: true, // Always force new student to create permanent password on 1st login
    tempPasswordHint: tempPassword,
    expiresAt: params.expiresAt ? new Date(params.expiresAt) : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Also create official EnrollmentRecord(s) for the student in the enrollments table
  for (const cType of resolvedCourse.assignedCourses) {
    const cId =
      cType === 'NEET' ? 'course_neet' : cType === 'JEE_ADVANCED' ? 'course_jee_adv' : 'course_jee';
    await db
      .insert(enrollments)
      .values({
        id: `enr-${id}-${cId}`,
        studentId: id,
        courseId: cId,
        courseType: cType,
        status: 'ACTIVE',
        assignedBy: params.actor.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  // If batchId was specified, also add studentId to batch's studentIdsJson
  if (params.batchId) {
    const batchRows = await db.select().from(batches).where(eq(batches.id, params.batchId));
    if (batchRows.length > 0) {
      const currentStudents = parseJsonSafe<string[]>(batchRows[0].studentIdsJson, []);
      if (!currentStudents.includes(id)) {
        await db
          .update(batches)
          .set({ studentIdsJson: JSON.stringify([...currentStudents, id]) })
          .where(eq(batches.id, params.batchId));
      }
    }
  }

  await createAuditLog({
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    action: 'CREATE_STUDENT',
    target: `${params.fullName} (${studentId})`,
    details: `Generated Student ID ${studentId} & Enrolled in ${resolvedCourse.courseType} (${resolvedCourse.courseId})`,
  });

  const created = await getProfileById(id);
  return {
    success: true,
    profile: created || undefined,
    generatedStudentId: studentId,
    temporaryPassword: tempPassword,
  };
}

export async function updateProfileByStaff(params: {
  targetUserId: string;
  patch: {
    fullName?: string;
    email?: string;
    status?: AccountStatus;
    teacherId?: string | null;
    batchId?: string | null;
    className?: string;
    examCategory?: ExamType;
    targetYear?: number;
    subjectAccess?: SubjectName[];
    testAccess?: string[];
    teacherPermissions?: TeacherPermissions;
    expiresAt?: string | null;
  };
  actor: AuthProfile;
}): Promise<{ success: boolean; error?: string; profile?: AuthProfile }> {
  const rows = await db.select().from(profiles).where(eq(profiles.id, params.targetUserId));
  if (rows.length === 0) {
    return { success: false, error: 'User not found.' };
  }
  const target = rows[0];

  if (params.actor.role === 'TEACHER') {
    if (target.role !== 'STUDENT') {
      return { success: false, error: 'Teachers can only modify student accounts.' };
    }
    if (
      !params.actor.teacherPermissions.canViewAllStudents &&
      target.teacherId !== params.actor.id
    ) {
      return {
        success: false,
        error: 'Access Denied — You can only manage students assigned to you.',
      };
    }
  } else if (params.actor.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized operation.' };
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (params.patch.fullName !== undefined) updateData.fullName = params.patch.fullName.trim();
  if (params.patch.email !== undefined) updateData.email = params.patch.email.trim().toLowerCase();
  if (params.patch.status !== undefined) updateData.status = params.patch.status;
  if (params.patch.teacherId !== undefined) updateData.teacherId = params.patch.teacherId;
  if (params.patch.batchId !== undefined) updateData.batchId = params.patch.batchId;
  if (params.patch.className !== undefined) updateData.className = params.patch.className;
  if (params.patch.examCategory !== undefined) {
    updateData.examCategory = params.patch.examCategory;
    const resolved = resolveCourseFromExam(params.patch.examCategory);
    updateData.courseId = resolved.courseId;
    updateData.courseType = resolved.courseType;
    updateData.assignedCoursesJson = JSON.stringify(resolved.assignedCourses);
    if (params.patch.subjectAccess === undefined) {
      updateData.subjectAccessJson = JSON.stringify(resolved.defaultSubjects);
    }
    // Sync enrollments table for this student
    await db.delete(enrollments).where(eq(enrollments.studentId, params.targetUserId));
    for (const cType of resolved.assignedCourses) {
      const cId =
        cType === 'NEET' ? 'course_neet' : cType === 'JEE_ADVANCED' ? 'course_jee_adv' : 'course_jee';
      await db
        .insert(enrollments)
        .values({
          id: `enr-${params.targetUserId}-${cId}`,
          studentId: params.targetUserId,
          courseId: cId,
          courseType: cType,
          status: (params.patch as any).enrollmentStatus || 'ACTIVE',
          assignedBy: params.actor.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    }
  }
  if ((params.patch as any).enrollmentStatus !== undefined) {
    const enrStat = (params.patch as any).enrollmentStatus as EnrollmentStatus;
    updateData.enrollmentStatus = enrStat;
    await db
      .update(enrollments)
      .set({ status: enrStat, updatedAt: new Date() })
      .where(eq(enrollments.studentId, params.targetUserId));
    if (enrStat !== 'ACTIVE') {
      await revokeAllUserSessions(params.targetUserId);
    }
  }
  if (params.patch.targetYear !== undefined) updateData.targetYear = params.patch.targetYear;
  if (params.patch.subjectAccess !== undefined) {
    updateData.subjectAccessJson = JSON.stringify(params.patch.subjectAccess);
  }
  if (params.patch.testAccess !== undefined) {
    updateData.testAccessJson = JSON.stringify(params.patch.testAccess);
  }
  if (params.patch.teacherPermissions !== undefined && params.actor.role === 'ADMIN') {
    updateData.teacherPermissionsJson = JSON.stringify(params.patch.teacherPermissions);
  }
  if (params.patch.expiresAt !== undefined) {
    updateData.expiresAt = params.patch.expiresAt ? new Date(params.patch.expiresAt) : null;
  }

  await db.update(profiles).set(updateData).where(eq(profiles.id, params.targetUserId));

  // If account was suspended or deactivated, revoke active sessions immediately
  if (params.patch.status === 'SUSPENDED' || params.patch.status === 'DEACTIVATED') {
    await revokeAllUserSessions(params.targetUserId);
  }

  // Sync batch membership if batchId changed
  if (params.patch.batchId !== undefined && params.patch.batchId !== target.batchId) {
    const allBatchRows = await db.select().from(batches);
    for (const b of allBatchRows) {
      const sIds = parseJsonSafe<string[]>(b.studentIdsJson, []);
      if (b.id === params.patch.batchId && !sIds.includes(target.id)) {
        await db
          .update(batches)
          .set({ studentIdsJson: JSON.stringify([...sIds, target.id]) })
          .where(eq(batches.id, b.id));
      } else if (b.id !== params.patch.batchId && sIds.includes(target.id)) {
        await db
          .update(batches)
          .set({ studentIdsJson: JSON.stringify(sIds.filter((id) => id !== target.id)) })
          .where(eq(batches.id, b.id));
      }
    }
  }

  await createAuditLog({
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    action: 'UPDATE_USER_PROFILE',
    target: `${target.fullName} (${target.studentId || target.email})`,
    details: `Updated fields: ${Object.keys(params.patch).join(', ')}`,
  });

  const updated = await getProfileById(params.targetUserId);
  return { success: true, profile: updated || undefined };
}

export async function deleteProfileByAdmin(params: {
  targetUserId: string;
  actor: AuthProfile;
}): Promise<{ success: boolean; error?: string }> {
  if (params.actor.role !== 'ADMIN') {
    return { success: false, error: 'Only Administrators can permanently delete user accounts.' };
  }
  if (params.targetUserId === params.actor.id) {
    return { success: false, error: 'You cannot delete your own active Administrator account.' };
  }

  const rows = await db.select().from(profiles).where(eq(profiles.id, params.targetUserId));
  if (rows.length === 0) return { success: false, error: 'Account not found.' };

  const target = rows[0];
  await revokeAllUserSessions(params.targetUserId);
  await db.delete(profiles).where(eq(profiles.id, params.targetUserId));

  await createAuditLog({
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    action: 'DELETE_USER_ACCOUNT',
    target: `${target.fullName} (${target.studentId || target.email})`,
    details: `Deleted ${target.role} account permanently`,
  });

  return { success: true };
}

// ----------------- BATCH / CLASS OPERATIONS -----------------

export async function getAllBatches(): Promise<BatchRecord[]> {
  await ensureAuthSeeded();
  const rows = await db.select().from(batches).orderBy(desc(batches.createdAt));
  return rows.map(mapRowToBatch);
}

export async function createBatchRecord(params: {
  name: string;
  description: string;
  examCategory: ExamType;
  className: string;
  teacherId?: string;
  studentIds?: string[];
  assignedTestIds?: string[];
  actor: AuthProfile;
}): Promise<{ success: boolean; error?: string; batch?: BatchRecord }> {
  if (params.actor.role !== 'ADMIN' && params.actor.role !== 'TEACHER') {
    return { success: false, error: 'Unauthorized' };
  }

  const assignedTeacherId =
    params.actor.role === 'TEACHER'
      ? params.actor.id
      : params.teacherId || params.actor.id;

  const teacherProfile = await getProfileById(assignedTeacherId);
  const teacherName = teacherProfile ? teacherProfile.fullName : params.actor.fullName;

  const id = `batch-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
  const studentIds = params.studentIds || [];
  const assignedTestIds = params.assignedTestIds || [];

  await db.insert(batches).values({
    id,
    name: params.name.trim(),
    description: params.description.trim(),
    examCategory: params.examCategory,
    className: params.className || 'Class 12',
    teacherId: assignedTeacherId,
    teacherName,
    status: 'ACTIVE',
    assignedTestIdsJson: JSON.stringify(assignedTestIds),
    studentIdsJson: JSON.stringify(studentIds),
    createdAt: new Date(),
  });

  // Update students' batchId
  for (const sId of studentIds) {
    await db
      .update(profiles)
      .set({ batchId: id, teacherId: assignedTeacherId, updatedAt: new Date() })
      .where(eq(profiles.id, sId));
  }

  await createAuditLog({
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    action: 'CREATE_BATCH',
    target: params.name,
    details: `Created ${params.examCategory} batch with ${studentIds.length} students`,
  });

  const rows = await db.select().from(batches).where(eq(batches.id, id));
  return { success: true, batch: rows[0] ? mapRowToBatch(rows[0]) : undefined };
}

export async function updateBatchRecord(params: {
  batchId: string;
  patch: {
    name?: string;
    description?: string;
    examCategory?: ExamType;
    className?: string;
    teacherId?: string;
    status?: 'ACTIVE' | 'ARCHIVED';
    studentIds?: string[];
    assignedTestIds?: string[];
  };
  actor: AuthProfile;
}): Promise<{ success: boolean; error?: string; batch?: BatchRecord }> {
  const rows = await db.select().from(batches).where(eq(batches.id, params.batchId));
  if (rows.length === 0) return { success: false, error: 'Batch not found.' };
  const existing = rows[0];

  if (params.actor.role === 'TEACHER' && existing.teacherId !== params.actor.id) {
    return { success: false, error: 'You can only edit batches assigned to you.' };
  }

  const updateFields: Record<string, unknown> = {};
  if (params.patch.name !== undefined) updateFields.name = params.patch.name.trim();
  if (params.patch.description !== undefined) updateFields.description = params.patch.description;
  if (params.patch.examCategory !== undefined) updateFields.examCategory = params.patch.examCategory;
  if (params.patch.className !== undefined) updateFields.className = params.patch.className;
  if (params.patch.status !== undefined) updateFields.status = params.patch.status;
  if (params.patch.teacherId !== undefined && params.actor.role === 'ADMIN') {
    updateFields.teacherId = params.patch.teacherId;
    const tProf = await getProfileById(params.patch.teacherId);
    if (tProf) updateFields.teacherName = tProf.fullName;
  }
  if (params.patch.assignedTestIds !== undefined) {
    updateFields.assignedTestIdsJson = JSON.stringify(params.patch.assignedTestIds);
  }
  if (params.patch.studentIds !== undefined) {
    updateFields.studentIdsJson = JSON.stringify(params.patch.studentIds);
    for (const sId of params.patch.studentIds) {
      await db
        .update(profiles)
        .set({ batchId: params.batchId, updatedAt: new Date() })
        .where(eq(profiles.id, sId));
    }
  }

  await db.update(batches).set(updateFields).where(eq(batches.id, params.batchId));

  const updatedRows = await db.select().from(batches).where(eq(batches.id, params.batchId));
  return { success: true, batch: updatedRows[0] ? mapRowToBatch(updatedRows[0]) : undefined };
}

export async function deleteBatchRecord(batchId: string, actor: AuthProfile): Promise<boolean> {
  await db.delete(batches).where(eq(batches.id, batchId));
  await createAuditLog({
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: 'DELETE_BATCH',
    target: batchId,
  });
  return true;
}

// ----------------- ANNOUNCEMENTS -----------------

export async function getAllAnnouncements(): Promise<AnnouncementRecord[]> {
  await ensureAuthSeeded();
  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    courseId: r.courseId || 'ALL',
    courseType: (r.courseType as CourseType | 'ALL') || 'ALL',
    authorId: r.authorId,
    authorName: r.authorName,
    authorRole: r.authorRole as UserRole,
    targetAudience: r.targetAudience as 'ALL' | 'TEACHERS' | 'STUDENTS' | 'BATCH',
    targetBatchId: r.targetBatchId,
    priority: r.priority as 'NORMAL' | 'IMPORTANT' | 'URGENT',
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createAnnouncementRecord(params: {
  title: string;
  content: string;
  courseType?: CourseType | 'ALL';
  targetAudience: 'ALL' | 'TEACHERS' | 'STUDENTS' | 'BATCH';
  targetBatchId?: string | null;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  actor: AuthProfile;
}): Promise<AnnouncementRecord> {
  const id = `ann-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
  const now = new Date();
  const resolvedCourseType: CourseType | 'ALL' =
    params.courseType ||
    (params.actor.role === 'TEACHER' ? params.actor.courseType : 'ALL');
  const resolvedCourseId =
    resolvedCourseType === 'NEET'
      ? 'course_neet'
      : resolvedCourseType === 'JEE_ADVANCED'
      ? 'course_jee_adv'
      : resolvedCourseType === 'JEE'
      ? 'course_jee'
      : 'ALL';

  await db.insert(announcements).values({
    id,
    title: params.title.trim(),
    content: params.content.trim(),
    courseId: resolvedCourseId,
    courseType: resolvedCourseType,
    authorId: params.actor.id,
    authorName: params.actor.fullName,
    authorRole: params.actor.role,
    targetAudience: params.targetAudience,
    targetBatchId: params.targetBatchId || null,
    priority: params.priority,
    createdAt: now,
  });

  await createAuditLog({
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    action: 'PUBLISH_ANNOUNCEMENT',
    target: params.title,
    details: `Course: ${resolvedCourseType}, Audience: ${params.targetAudience} (${params.priority})`,
  });

  return {
    id,
    title: params.title.trim(),
    content: params.content.trim(),
    courseId: resolvedCourseId,
    courseType: resolvedCourseType,
    authorId: params.actor.id,
    authorName: params.actor.fullName,
    authorRole: params.actor.role,
    targetAudience: params.targetAudience,
    targetBatchId: params.targetBatchId || null,
    priority: params.priority,
    createdAt: now.toISOString(),
  };
}

export async function deleteAnnouncementRecord(id: string): Promise<void> {
  await db.delete(announcements).where(eq(announcements.id, id));
}

// ----------------- PASSWORD RECOVERY REQUESTS -----------------

export async function createPasswordRecoveryRequest(params: {
  role: UserRole;
  identifier: string;
  reason?: string;
}): Promise<{ success: boolean; message: string }> {
  await ensureAuthSeeded();
  const cleanId = params.identifier.trim();
  const all = await db.select().from(profiles);

  const matched = all.find(
    (p) =>
      (p.studentId && p.studentId.toUpperCase() === cleanId.toUpperCase()) ||
      (p.email && p.email.toLowerCase() === cleanId.toLowerCase()) ||
      (p.username && p.username.toLowerCase() === cleanId.toLowerCase())
  );

  if (matched) {
    const recoveryCode = `REC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await db.insert(passwordRecoveryRequests).values({
      id: `pwreq-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      userId: matched.id,
      identifier: matched.studentId || matched.email || cleanId,
      userName: matched.fullName,
      userRole: matched.role,
      teacherId: matched.teacherId,
      reason: params.reason || 'User requested password recovery from login screen',
      status: 'PENDING',
      recoveryCode,
      createdAt: new Date(),
    });

    await createAuditLog({
      actorId: matched.id,
      actorName: matched.fullName,
      actorRole: matched.role as UserRole,
      action: 'PASSWORD_RECOVERY_REQUEST',
      target: matched.studentId || matched.email || matched.id,
      details: `Recovery ticket ${recoveryCode} logged for Teacher/Admin verification`,
    });
  }

  return {
    success: true,
    message:
      params.role === 'STUDENT'
        ? 'Your password recovery request has been logged and routed to your assigned Faculty Mentor & Examination Controller for credential reset.'
        : 'Password recovery request has been logged with the Platform Administrator.',
  };
}

export async function getPasswordRecoveryRequests(): Promise<PasswordRecoveryRecord[]> {
  await ensureAuthSeeded();
  const rows = await db
    .select()
    .from(passwordRecoveryRequests)
    .orderBy(desc(passwordRecoveryRequests.createdAt));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    identifier: r.identifier,
    userName: r.userName,
    userRole: r.userRole as UserRole,
    teacherId: r.teacherId,
    reason: r.reason || '',
    status: r.status as 'PENDING' | 'RESOLVED' | 'REJECTED',
    recoveryCode: r.recoveryCode,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
  }));
}

export async function resolvePasswordRecoveryRequest(params: {
  requestId: string;
  newTemporaryPassword: string;
  actor: AuthProfile;
}): Promise<{ success: boolean; error?: string }> {
  const reqRows = await db
    .select()
    .from(passwordRecoveryRequests)
    .where(eq(passwordRecoveryRequests.id, params.requestId));
  if (reqRows.length === 0) return { success: false, error: 'Recovery request not found.' };

  const reqItem = reqRows[0];
  const resetRes = await resetUserPasswordByStaff({
    targetUserId: reqItem.userId,
    newTemporaryPassword: params.newTemporaryPassword,
    forceChangeOnNextLogin: true,
    actor: params.actor,
  });

  if (!resetRes.success) return resetRes;

  await db
    .update(passwordRecoveryRequests)
    .set({ status: 'RESOLVED', resolvedAt: new Date() })
    .where(eq(passwordRecoveryRequests.id, params.requestId));

  return { success: true };
}

// ----------------- TEST ACCESS CONTROL -----------------

export async function getAllTestAssignments(): Promise<TestAssignmentRecord[]> {
  await ensureAuthSeeded();
  const rows = await db.select().from(testAssignments);
  return rows.map((r) => ({
    id: r.id,
    testId: r.testId,
    visibility: (r.visibility as 'PUBLIC' | 'ASSIGNED_ONLY') || 'PUBLIC',
    assignedByUserId: r.assignedByUserId,
    assignedTeacherIds: parseJsonSafe<string[]>(r.assignedTeacherIdsJson, []),
    assignedBatchIds: parseJsonSafe<string[]>(r.assignedBatchIdsJson, []),
    assignedStudentIds: parseJsonSafe<string[]>(r.assignedStudentIdsJson, []),
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function upsertTestAssignment(params: {
  testId: string;
  visibility: 'PUBLIC' | 'ASSIGNED_ONLY';
  assignedTeacherIds: string[];
  assignedBatchIds: string[];
  assignedStudentIds: string[];
  dueDate?: string | null;
  actor: AuthProfile;
}): Promise<TestAssignmentRecord> {
  const id = `assign-${params.testId}`;
  const now = new Date();
  await db
    .insert(testAssignments)
    .values({
      id,
      testId: params.testId,
      visibility: params.visibility,
      assignedByUserId: params.actor.id,
      assignedTeacherIdsJson: JSON.stringify(params.assignedTeacherIds),
      assignedBatchIdsJson: JSON.stringify(params.assignedBatchIds),
      assignedStudentIdsJson: JSON.stringify(params.assignedStudentIds),
      dueDate: params.dueDate ? new Date(params.dueDate) : null,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: testAssignments.testId,
      set: {
        visibility: params.visibility,
        assignedByUserId: params.actor.id,
        assignedTeacherIdsJson: JSON.stringify(params.assignedTeacherIds),
        assignedBatchIdsJson: JSON.stringify(params.assignedBatchIds),
        assignedStudentIdsJson: JSON.stringify(params.assignedStudentIds),
        dueDate: params.dueDate ? new Date(params.dueDate) : null,
      },
    });

  await createAuditLog({
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    action: 'UPDATE_TEST_ACCESS',
    target: params.testId,
    details: `Visibility: ${params.visibility}, Batches: ${params.assignedBatchIds.length}, Students: ${params.assignedStudentIds.length}`,
  });

  return {
    id,
    testId: params.testId,
    visibility: params.visibility,
    assignedByUserId: params.actor.id,
    assignedTeacherIds: params.assignedTeacherIds,
    assignedBatchIds: params.assignedBatchIds,
    assignedStudentIds: params.assignedStudentIds,
    dueDate: params.dueDate || null,
    createdAt: now.toISOString(),
  };
}

// ----------------- COURSES, ENROLLMENTS & STUDY MATERIALS -----------------

export async function getAllCourses(): Promise<CourseRecord[]> {
  await ensureAuthSeeded();
  const rows = await db.select().from(courses);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type as CourseType,
    description: r.description || '',
    active: Boolean(r.active),
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
  }));
}

export async function getAllEnrollments(): Promise<EnrollmentRecord[]> {
  await ensureAuthSeeded();
  const rows = await db.select().from(enrollments).orderBy(desc(enrollments.updatedAt));
  const allProfs = await db.select().from(profiles);
  const stuMap = new Map<string, { fullName: string; studentId?: string | null }>();
  allProfs.forEach((p) => stuMap.set(p.id, { fullName: p.fullName, studentId: p.studentId }));

  return rows.map((e) => ({
    id: e.id,
    studentId: e.studentId,
    studentName: stuMap.get(e.studentId)?.fullName || e.studentId,
    studentCode: stuMap.get(e.studentId)?.studentId || null,
    courseId: e.courseId,
    courseType: e.courseType as CourseType,
    status: (e.status as EnrollmentStatus) || 'ACTIVE',
    assignedBy: e.assignedBy,
    createdAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: e.updatedAt ? e.updatedAt.toISOString() : new Date().toISOString(),
  }));
}

export async function updateStudentCourseEnrollment(params: {
  studentId: string;
  courseType: CourseType;
  enrollmentStatus: EnrollmentStatus;
  includeJeeAdvanced?: boolean;
  actor: AuthProfile;
}): Promise<{ success: boolean; error?: string; profile?: AuthProfile }> {
  if (params.actor.role !== 'ADMIN' && params.actor.role !== 'TEACHER') {
    return { success: false, error: 'Only Admin or Teacher can modify course enrollments.' };
  }

  const examCategory: ExamType =
    params.courseType === 'NEET'
      ? 'NEET'
      : params.courseType === 'JEE_ADVANCED' || params.includeJeeAdvanced
      ? 'JEE_ADVANCED'
      : 'JEE_MAIN';

  const resolved = resolveCourseFromExam(examCategory);

  await db
    .update(profiles)
    .set({
      examCategory,
      courseId: resolved.courseId,
      courseType: resolved.courseType,
      enrollmentStatus: params.enrollmentStatus,
      assignedCoursesJson: JSON.stringify(resolved.assignedCourses),
      subjectAccessJson: JSON.stringify(resolved.defaultSubjects),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, params.studentId));

  await db.delete(enrollments).where(eq(enrollments.studentId, params.studentId));
  for (const cType of resolved.assignedCourses) {
    const cId =
      cType === 'NEET' ? 'course_neet' : cType === 'JEE_ADVANCED' ? 'course_jee_adv' : 'course_jee';
    await db
      .insert(enrollments)
      .values({
        id: `enr-${params.studentId}-${cId}`,
        studentId: params.studentId,
        courseId: cId,
        courseType: cType,
        status: params.enrollmentStatus,
        assignedBy: params.actor.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  if (params.enrollmentStatus !== 'ACTIVE') {
    await revokeAllUserSessions(params.studentId);
  }

  await createAuditLog({
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    action: 'UPDATE_COURSE_ENROLLMENT',
    target: params.studentId,
    details: `Course: ${resolved.assignedCourses.join(' + ')}, Status: ${params.enrollmentStatus}`,
  });

  const updated = await getProfileById(params.studentId);
  return { success: true, profile: updated || undefined };
}

export async function getStudyMaterialsForUser(
  profile?: AuthProfile | null
): Promise<StudyMaterialRecord[]> {
  await ensureAuthSeeded();
  const rows = await db.select().from(studyMaterials).orderBy(desc(studyMaterials.createdAt));
  const mapped: StudyMaterialRecord[] = rows.map((r) => ({
    id: r.id,
    courseId: r.courseId,
    courseType: r.courseType as CourseType,
    subject: r.subject as SubjectName,
    chapter: r.chapter,
    title: r.title,
    materialType: (r.materialType as StudyMaterialRecord['materialType']) || 'NOTES',
    description: r.description || '',
    contentBody: r.contentBody || '',
    createdBy: r.createdBy,
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
  }));

  if (!profile) return [];
  if (profile.role === 'ADMIN') return mapped;

  const allowedCourseIds = new Set(getAuthorizedCourseIds(profile));
  const allowedCourseTypes = new Set(getAuthorizedCourseTypes(profile));

  return mapped.filter(
    (m) => allowedCourseIds.has(m.courseId) || allowedCourseTypes.has(m.courseType)
  );
}

export async function createStudyMaterialRecord(params: {
  courseType: CourseType;
  subject: SubjectName;
  chapter: string;
  title: string;
  materialType: StudyMaterialRecord['materialType'];
  description: string;
  contentBody: string;
  actor: AuthProfile;
}): Promise<StudyMaterialRecord> {
  const courseId =
    params.courseType === 'NEET'
      ? 'course_neet'
      : params.courseType === 'JEE_ADVANCED'
      ? 'course_jee_adv'
      : 'course_jee';
  const id = `mat-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
  const now = new Date();

  await db.insert(studyMaterials).values({
    id,
    courseId,
    courseType: params.courseType,
    subject: params.subject,
    chapter: params.chapter.trim(),
    title: params.title.trim(),
    materialType: params.materialType || 'NOTES',
    description: params.description.trim(),
    contentBody: params.contentBody.trim(),
    createdBy: params.actor.id,
    createdAt: now,
  });

  await createAuditLog({
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    action: 'CREATE_STUDY_MATERIAL',
    target: params.title,
    details: `Course: ${params.courseType} (${params.subject} - ${params.chapter})`,
  });

  return {
    id,
    courseId,
    courseType: params.courseType,
    subject: params.subject,
    chapter: params.chapter.trim(),
    title: params.title.trim(),
    materialType: params.materialType || 'NOTES',
    description: params.description.trim(),
    contentBody: params.contentBody.trim(),
    createdBy: params.actor.id,
    createdAt: now.toISOString(),
  };
}

export async function deleteStudyMaterialRecord(id: string): Promise<void> {
  await db.delete(studyMaterials).where(eq(studyMaterials.id, id));
}

