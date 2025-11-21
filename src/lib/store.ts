import { v4 as uuid } from 'uuid';
import { supabase } from './supabaseClient';
import { fetchAll, TABLES } from './api';
import {
  User,
  Student,
  Teacher,
  Parent,
  Course,
  Grade,
  AttendanceRecord,
  Announcement,
  Event,
  Finance,
  Lesson,
} from '../types';

type StoreShape = {
  users: Record<string, User>;
  students: Student[];
  teachers: Teacher[];
  parents: Parent[];
  courses: Course[];
  grades: Grade[];
  attendance: AttendanceRecord[];
  announcements: Announcement[];
  events: Event[];
  finances: Finance[];
  lessons: Lesson[];
};

async function bootstrap(): Promise<StoreShape> {
  const [
    usersRaw,
    students,
    teachers,
    parents,
    courses,
    grades,
    attendance,
    announcements,
    events,
    finances,
    lessons,
  ] = await Promise.all([
    fetchAll<User>(TABLES.users),
    fetchAll<Student>(TABLES.students),
    fetchAll<Teacher>(TABLES.teachers),
    fetchAll<Parent>(TABLES.parents),
    fetchAll<Course>(TABLES.courses),
    fetchAll<Grade>(TABLES.grades),
    fetchAll<AttendanceRecord>(TABLES.attendance),
    fetchAll<Announcement>(TABLES.announcements),
    fetchAll<Event>(TABLES.events),
    fetchAll<Finance>(TABLES.finance),
    fetchAll<Lesson>(TABLES.lessons),
  ]);

  const users = Object.fromEntries(usersRaw.map((user) => [user.id, user]));
  return {
    users,
    students,
    teachers,
    parents,
    courses,
    grades,
    attendance,
    announcements,
    events,
    finances,
    lessons,
  };
}

const initialData = await bootstrap();

export const store: StoreShape = {
  ...initialData,
};

export async function getFinanceForStudent(studentId: string) {
  const record = await supabase
    .from(TABLES.finance)
    .select('*')
    .eq('studentId', studentId)
    .maybeSingle();
  if (record.error) throw record.error;
  const finance = record.data;
  return finance ?? null;
}

/** ---------- Finance ---------- */
export async function payFee(studentId: string, amount: number) {
  const fin = store.finances.find((f) => f.studentId === studentId);
  if (!fin) throw new Error('Finance record not found');
  const applied = Math.min(amount, fin.due);
  fin.paid += applied;
  fin.due = Math.max(0, fin.totalFee - fin.scholarship - fin.paid);
  await supabase
    .from(TABLES.finance)
    .update({ paid: fin.paid, due: fin.due })
    .eq('id', fin.id);
  return { ...fin };
}

/** ---------- Lessons ---------- */
export async function addLesson(input: Omit<Lesson, 'id'>) {
  const lesson: Lesson = { id: uuid(), ...input };
  await supabase.from(TABLES.lessons).insert(lesson);
  store.lessons.unshift(lesson);
  return lesson;
}

export function getLessonsByTeacher(teacherId?: string) {
  if (!teacherId) return [];
  return (store.lessons ?? []).filter((l) => l.teacherId === teacherId);
}

/** ---------- Exams / Grades (as Assessments) ---------- */
export async function addAssessment(
  grade: Omit<Grade, 'id' | 'date'> & { date?: string }
) {
  const record: Grade = {
    id: uuid(),
    date: grade.date ?? new Date().toISOString().slice(0, 10),
    ...grade,
  };
  await supabase.from(TABLES.grades).insert(record);
  store.grades.unshift(record);
  return record;
}

export async function addGrade(grade: Omit<Grade, 'id'>) {
  const record: Grade = { id: uuid(), date: new Date().toISOString().slice(0, 10), ...grade };
  await supabase.from(TABLES.grades).insert(record);
  store.grades.unshift(record);
  return record;
}

export async function updateGrade(id: string, patch: Partial<Omit<Grade, 'id'>>) {
  const idx = store.grades.findIndex((g) => g.id === id);
  if (idx === -1) throw new Error('Grade not found');
  const updated = { ...store.grades[idx], ...patch };
  await supabase.from(TABLES.grades).update(patch).eq('id', id);
  store.grades[idx] = updated;
  return updated;
}

/** ---------- Attendance ---------- */
export async function giveAttendance(
  entries: Array<{
    studentId: string;
    status: AttendanceRecord['status'];
    date?: string;
    courseId?: string;
  }>
) {
  const day = (d?: string) => d ?? new Date().toISOString().slice(0, 10);
  const newRecords: AttendanceRecord[] = entries.map((e) => ({
    id: uuid(),
    studentId: e.studentId,
    date: day(e.date),
    status: e.status,
    courseId: e.courseId ?? 'unknown',
  }));
  await supabase.from(TABLES.attendance).insert(newRecords);
  store.attendance.unshift(...newRecords);
  return newRecords;
}

export async function addAttendanceRecord(record: Omit<AttendanceRecord, 'id'>) {
  const entry: AttendanceRecord = { id: uuid(), ...record };
  await supabase.from(TABLES.attendance).insert(entry);
  store.attendance.unshift(entry);
  return entry;
}

export async function updateAttendanceRecord(
  id: string,
  patch: Partial<Omit<AttendanceRecord, 'id'>>
) {
  const idx = store.attendance.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('Attendance record not found');
  await supabase.from(TABLES.attendance).update(patch).eq('id', id);
  store.attendance[idx] = { ...store.attendance[idx], ...patch };
  return store.attendance[idx];
}

/** ---------- Users ---------- */
export async function addUser(user: Omit<User, 'id'>) {
  const id = uuid();
  const newUser: User = { id, ...user };
  await supabase.from(TABLES.users).insert(newUser);
  store.users[id] = newUser;

  if (newUser.role === 'student') {
    const studentRecord: Student = {
      id,
      name: newUser.name,
      email: newUser.email,
      role: 'student',
      gradeLevel: 'Unassigned',
      gpa: 0,
      attendance: 0,
    };
    await supabase.from(TABLES.students).insert(studentRecord);
    store.students.push(studentRecord);
  }
  return newUser;
}

/** ---------- Classes ---------- */
export async function addCourse(input: Omit<Course, 'id'>) {
  const course: Course = { id: uuid(), ...input };
  await supabase.from(TABLES.courses).insert(course);
  store.courses.unshift(course);
  return course;
}

export async function updateCourse(id: string, patch: Partial<Course>) {
  const idx = store.courses.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Course not found');
  const updated = { ...store.courses[idx], ...patch };
  await supabase.from(TABLES.courses).update(patch).eq('id', id);
  store.courses[idx] = updated;
  return updated;
}
