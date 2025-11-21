export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  address?: string;
}

export interface Student extends User {
  role: 'student';
  gradeLevel: string;
  gpa: number;
  attendance: number;
  parentId?: string;
}

export interface Teacher extends User {
  role: 'teacher';
  department: string;
  subjects: string[];
}

export interface Parent extends User {
  role: 'parent';
  children: string[];
}

export interface Admin extends User {
  role: 'admin';
  department: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  teacherName: string;
  credits: number;
  schedule: string;
  studentIds?: string[];
}

export interface Lesson {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  room?: string;
  teacherId: string;
  studentIds?: string[];
}

export interface Grade {
  id: string;
  studentId: string;
  courseId: string;
  courseName: string;
  examType: string;
  score: number;
  maxScore: number;
  date: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  courseId?: string;
  lessonId: string;
  courseName: string;
  date: string;
  status: 'present' | 'absent' | 'late';
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
  targetRole?: UserRole;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: 'exam' | 'assignment' | 'event' | 'holiday';
}

export interface Finance {
  id: string;
  studentId: string;
  totalFee: number;
  scholarship: number;
  paid: number;
  due: number;
  semester: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  method: string;
  status: 'completed' | 'pending' | 'failed';
}
