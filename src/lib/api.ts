// src/api.ts
import { supabase } from './supabaseClient';
import { v4 as uuid } from 'uuid';
import type { Grade, AttendanceRecord, Student, Parent, Finance } from '../types';

export const TABLES = {
  users: 'Users',
  students: 'Students',
  teachers: 'Teachers',
  parents: 'Parents',
  courses: 'Courses',
  lessons: 'Lessons',
  grades: 'Grades',
  attendance: 'Attendance',
  announcements: 'Announcements',
  events: 'Events',
  finance: 'Finance',
} as const;

// ---- Helpers ----
async function must<T>(promise: Promise<{ data: T | null; error: any }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw error;
  if (data == null) throw new Error('No data');
  return data;
}

// Generic fetch-all with optional filters/order
export async function fetchAll<T = any>(table: string, opts?: {
  select?: string,
  eq?: [string, any][],
  order?: { column: string, ascending?: boolean },
  limit?: number
}) {
  let q = supabase.from(table).select(opts?.select ?? '*');
  if (opts?.eq) {
    for (const [col, val] of opts.eq) q = q.eq(col, val);
  }
  if (opts?.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? true });
  if (opts?.limit) q = q.limit(opts.limit);
  return must<T[]>(q);
}

// ---- Users ----
export async function getUsers() {
  return fetchAll(TABLES.users, { order: { column: 'name' } });
}
export async function getUserById(id: string) {
  const { data, error } = await supabase.from(TABLES.users).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
export async function getUserByEmail(email: string) {
  const { data, error } = await supabase.from(TABLES.users).select('*').eq('email', email).maybeSingle();
  if (error) throw error;
  return data;
}

// ---- Students / Teachers / Parents ----
export async function getStudents() {
  return fetchAll(TABLES.students, { order: { column: 'name' } });
}
export async function getStudentsCount() {
  const { count, error } = await supabase
    .from(TABLES.students)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}
export async function getStudentsByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [];
  const { data, error } = await supabase.from(TABLES.students).select('*').in('id', ids);
  if (error) throw error;
  return (data ?? []) as Student[];
}
export async function getStudent(id: string) {
  const { data, error } = await supabase.from(TABLES.students).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
export async function getTeachers() {
  return fetchAll(TABLES.teachers, { order: { column: 'name' } });
}
export async function getParents() {
  return fetchAll(TABLES.parents, { order: { column: 'name' } });
}
export async function getParent(id: string) {
  const { data, error } = await supabase.from(TABLES.parents).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Parent | null;
}

// ---- Courses / Lessons ----
export async function getCourses() {
  return fetchAll(TABLES.courses, { order: { column: 'code' } });
}
export async function getLessonsByCourse(courseId: string) {
  return fetchAll(TABLES.lessons, { eq: [['courseId', courseId]], order: { column: 'date' } });
}

// ---- Grades / Attendance ----
export async function getGradesByStudent(studentId: string) {
  return fetchAll(TABLES.grades, { eq: [['studentId', studentId]], order: { column: 'date', ascending: true } });
}
export async function getGrades(studentId: string) {
  const grades = await getGradesByStudent(studentId);
  return { grades };
}
export async function getGradesByCourseIds(courseIds: string[]) {
  if (!courseIds || courseIds.length === 0) return [];
  const { data, error } = await supabase
    .from(TABLES.grades)
    .select('*')
    .in('courseId', courseIds);
  if (error) throw error;
  return data ?? [];
}

export async function getStudentsByCourseId(courseId: string) {
  if (!courseId) return [];
  const { data, error } = await supabase
    .from(TABLES.courses)
    .select('studentIds')
    .eq('id', courseId)
    .maybeSingle();
  if (error) throw error;
  const studentIds = Array.isArray(data?.studentIds) ? data?.studentIds : [];
  return getStudentsByIds(studentIds);
}

export async function getAllGrades() {
  return fetchAll(TABLES.grades, { order: { column: 'date', ascending: false } });
}
export async function getAttendanceByStudent(studentId: string) {
  return fetchAll(TABLES.attendance, { eq: [['studentId', studentId]], order: { column: 'date', ascending: true } });
}
export async function getAttendance(studentId: string) {
  const attendance = await getAttendanceByStudent(studentId);
  return { attendance };
}
export async function getAttendanceByCourseNames(courseNames: string[]) {
  if (!courseNames || courseNames.length === 0) return [];
  const { data, error } = await supabase
    .from(TABLES.attendance)
    .select('*')
    .in('courseName', courseNames);
  if (error) throw error;
  return data ?? [];
}
export async function getAllAttendanceRecords() {
  return fetchAll<AttendanceRecord>(TABLES.attendance, {
    order: { column: 'date', ascending: false },
  });
}

// ---- Announcements / Events / Finance ----
export async function getAnnouncements() {
  return fetchAll(TABLES.announcements, { order: { column: 'date', ascending: false } });
}
export async function getEvents() {
  return fetchAll(TABLES.events, { order: { column: 'date', ascending: true } });
}
export async function getFinanceByStudent(studentId: string) {
  return fetchAll(TABLES.finance, { eq: [['studentId', studentId]] }).then(r => r[0] ?? null);
}
export async function getFinances() {
  return fetchAll<Finance>(TABLES.finance, { order: { column: 'studentId' } });
}

export async function getFinance(studentId: string) {
  const finance = await getFinanceByStudent(studentId);
  return { finance };
}

export async function getLessons(teacherId?: string) {
  if (teacherId) {
    const lessons = await fetchAll(TABLES.lessons, { eq: [['teacherId', teacherId]], order: { column: 'date', ascending: true } });
    return { lessons };
  }
  const lessons = await fetchAll(TABLES.lessons, { order: { column: 'date', ascending: true } });
  return { lessons };
}

export async function createLesson(lesson: any) {
  const {
    id,
    courseId,
    courseName,
    title,
    date,
    teacherId,
    room,
    description,
  } = lesson ?? {};

  const payload = {
    id: id ?? uuid(),
    courseId,
    courseName,
    title,
    date,
    teacherId,
  };

  const { data, error } = await supabase
    .from(TABLES.lessons)
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  const lessonRecord = {
    ...(data ?? payload),
    ...(room ? { room } : {}),
    ...(description ? { description } : {}),
  };
  return {
    lesson: lessonRecord,
  };
}

export async function createAttendance(record: any) {
  const payload = { id: record.id ?? uuid(), ...record };
  const { data, error } = await supabase
    .from(TABLES.attendance)
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return { attendance: data ?? payload };
}

export async function updateAttendanceRecord(
  id: string,
  patch: Partial<Omit<AttendanceRecord, 'id'>>
) {
  const { data, error } = await supabase
    .from(TABLES.attendance)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data ?? null;
}

export async function createGradeRecord(grade: Omit<Grade, 'id'>) {
  const payload = { id: uuid(), ...grade };
  const { data, error } = await supabase
    .from(TABLES.grades)
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data ?? payload;
}

export async function updateGradeRecord(
  id: string,
  patch: Partial<Omit<Grade, 'id'>>
) {
  const { data, error } = await supabase
    .from(TABLES.grades)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data ?? null;
}
