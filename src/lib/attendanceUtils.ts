// src/lib/attendanceUtils.ts

export type AttendanceRecord = {
  id: string;
  studentId: string;
  lessonId?: string;
  courseName?: string;
  date: string;
  status: 'present' | 'late' | 'absent';
};

type NormalizedStatus = AttendanceRecord['status'];
type RawStatus = NormalizedStatus | string | null | undefined;

const STATUS_MAP: Record<string, NormalizedStatus> = {
  present: 'present',
  attended: 'present',
  'on-time': 'present',
  ontime: 'present',
  p: 'present',
  '1': 'present',
  'true': 'present',
  late: 'late',
  tardy: 'late',
  l: 'late',
  absent: 'absent',
  missed: 'absent',
  excused: 'absent',
  a: 'absent',
  '0': 'absent',
  'false': 'absent',
};

export function normalizeAttendanceStatus(status: RawStatus): NormalizedStatus | null {
  if (status == null) return null;
  const normalized = `${status}`.trim().toLowerCase();
  if (!normalized) return null;
  return STATUS_MAP[normalized] ?? null;
}

/**
 * Returns summary stats for a list of attendance records
 * Used in Student Dashboard, Teacher Dashboard, etc.
 */
export function calculateAttendanceStats(records: AttendanceRecord[]) {
  if (!records || records.length === 0) {
    return {
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      percentage: 0,
      rate: 0,
    };
  }

  const stats = {
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
  };

  for (const record of records) {
    const status = normalizeAttendanceStatus(record.status);
    if (!status) continue;
    stats.total++;
    if (status === 'present') stats.present++;
    else if (status === 'late') stats.late++;
    else if (status === 'absent') stats.absent++;
  }

  if (!stats.total) {
    return {
      ...stats,
      percentage: 0,
      rate: 0,
    };
  }

  // Weighted score: present=100%, late=75%, absent=0%
  const weightedScore =
    stats.present * 1 + stats.late * 0.75 + stats.absent * 0;

  const percentage = Math.round((weightedScore / stats.total) * 100);

  return { ...stats, percentage, rate: percentage };
}

/**
 * Groups all attendance records by course name.
 * Useful for analytics, course dashboards, charts, etc.
 */
export function groupAttendanceByCourse(records: AttendanceRecord[]) {
  const grouped: Record<string, AttendanceRecord[]> = {};

  records.forEach((rec) => {
    if (!rec.courseName) return;
    if (!grouped[rec.courseName]) grouped[rec.courseName] = [];
    grouped[rec.courseName].push(rec);
  });

  return grouped;
}

/**
 * Returns attendance percentage for a single student across all lessons.
 */
export function calculateStudentAttendance(records: AttendanceRecord[]) {
  return calculateAttendanceStats(records).percentage;
}
