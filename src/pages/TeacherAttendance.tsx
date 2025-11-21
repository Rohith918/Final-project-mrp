import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../lib/authContext';
import { AttendanceRecord, Course, Student } from '../types';
import { CalendarCheck, ClipboardList, FileEdit } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  getCourses,
  getStudents,
  createAttendance,
  updateAttendanceRecord as updateAttendanceEntry,
  getAllAttendanceRecords,
  getStudentsByIds,
} from '../lib/api';
import { normalizeStudentIds } from '../lib/rosterUtils';

type AttendanceForm = {
  courseId: string;
  studentId: string;
  status: AttendanceRecord['status'] | '';
  date: string;
  notes: string;
};

const defaultForm: AttendanceForm = {
  courseId: '',
  studentId: '',
  status: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

export function TeacherAttendance() {
  const { user } = useAuth();
  const [form, setForm] = useState<AttendanceForm>(defaultForm);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courseRosters, setCourseRosters] = useState<Record<string, Student[]>>({});
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const roster = useMemo(() => {
    if (!form.courseId) return [];
    const list = courseRosters[form.courseId] ?? [];
    if (form.studentId && !list.some((student) => student.id === form.studentId)) {
      const extra = studentMap.get(form.studentId);
      if (extra) {
        return [extra, ...list];
      }
    }
    return list;
  }, [form.courseId, form.studentId, courseRosters, studentMap]);

  const recentRecords = useMemo(() => {
    return records
      .filter((record) =>
        courses.some(
          (course) => course.id === record.courseId || course.name === record.courseName
        )
      )
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 10);
  }, [records, courses]);

  const loadAttendanceData = async () => {
    if (!user?.id) {
      setCourses([]);
      setStudents([]);
      setRecords([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [coursesRes, studentsRes, attendanceRes] = await Promise.all([
        getCourses(),
        getStudents(),
        getAllAttendanceRecords(),
      ]);
      const allCourses = Array.isArray(coursesRes) ? coursesRes : coursesRes?.courses ?? [];
      const normalizedCourses = allCourses.map((course) => ({
        ...course,
        studentIds: normalizeStudentIds(course.studentIds),
      }));
      const teacherCourses = normalizedCourses.filter((course: Course) => course.teacherId === user.id);

      if (!teacherCourses.length) {
        setCourses([]);
        setCourseRosters({});
        setStudents([]);
        setRecords([]);
        return;
      }

      const initialStudents = Array.isArray(studentsRes) ? studentsRes : studentsRes ?? [];
      const attendanceRecords = Array.isArray(attendanceRes) ? attendanceRes : attendanceRes ?? [];
      const courseNames = new Set(teacherCourses.map((course) => course.name));
      const relevantRecords = attendanceRecords.filter((record) => {
        if (record.courseId) {
          return teacherCourses.some((course) => course.id === record.courseId);
        }
        return courseNames.has(record.courseName);
      });

      const rosterEntries: Record<string, string[]> = {};
      teacherCourses.forEach((course) => {
        rosterEntries[course.id] = [...(course.studentIds ?? [])];
      });
      relevantRecords.forEach((record) => {
        const courseIdFromRecord =
          record.courseId && rosterEntries[record.courseId] !== undefined
            ? record.courseId
            : teacherCourses.find((course) => course.name === record.courseName)?.id;
        if (!courseIdFromRecord) return;
        if (!rosterEntries[courseIdFromRecord]) {
          rosterEntries[courseIdFromRecord] = [];
        }
        if (!rosterEntries[courseIdFromRecord].includes(record.studentId)) {
          rosterEntries[courseIdFromRecord].push(record.studentId);
        }
      });

      const rosterStudentIds = new Set<string>();
      Object.values(rosterEntries).forEach((ids) => ids.forEach((id) => id && rosterStudentIds.add(id)));
      const missingStudentIds = Array.from(rosterStudentIds).filter(
        (id) => !initialStudents.some((student) => student.id === id)
      );
      const fetchedStudents = missingStudentIds.length ? await getStudentsByIds(missingStudentIds) : [];
      const combinedStudents = Array.from(
        new Map(
          [...initialStudents, ...fetchedStudents].map((student) => [student.id, student])
        ).values()
      );
      const lookup = new Map(combinedStudents.map((student) => [student.id, student]));

      const rosterMap: Record<string, Student[]> = {};
      Object.entries(rosterEntries).forEach(([courseId, ids]) => {
        const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
        rosterMap[courseId] = uniqueIds
          .map((id) => lookup.get(id))
          .filter(Boolean) as Student[];
      });

      const teacherStudents = Array.from(
        new Map(
          Object.values(rosterMap)
            .flat()
            .map((student) => [student.id, student])
        ).values()
      );

      setCourses(teacherCourses);
      setCourseRosters(rosterMap);
      setStudents(teacherStudents);
      setRecords(relevantRecords);
    } catch (error) {
      console.error('Failed to load attendance data', error);
      toast.error('Unable to load attendance records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId || !form.studentId || !form.status) {
      toast.error('Please complete the form.');
      return;
    }
    const course = courseMap.get(form.courseId);
    if (!course) {
      toast.error('Course not found');
      return;
    }

    setSubmitting(true);
    try {
      const record: Omit<AttendanceRecord, 'id'> = {
        studentId: form.studentId,
        lessonId: `${form.courseId}-${form.date}`,
        courseId: course.id,
        courseName: course.name,
        date: form.date,
        status: form.status,
      };
      if (editing) {
        await updateAttendanceEntry(editing.id, record);
        toast.success('Attendance updated.');
      } else {
        await createAttendance(record);
        toast.success('Attendance recorded.');
      }
      await loadAttendanceData();
      setForm({ ...defaultForm, courseId: form.courseId, studentId: form.studentId });
      setEditing(null);
    } catch (error) {
      console.error(error);
      toast.error('Unable to save attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading attendance...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1>Attendance Manager</h1>
            <p className="text-gray-600">Record or edit attendance for your classes.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{editing ? 'Edit Attendance' : 'Record Attendance'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <label>Course</label>
                  <Select
                    value={form.courseId}
                    onValueChange={(value) => setForm({ ...form, courseId: value, studentId: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} • {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <label>Student</label>
                  <Select
                    value={form.studentId}
                    onValueChange={(value) => setForm({ ...form, studentId: value })}
                    disabled={!form.courseId || roster.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={form.courseId ? 'Select a student' : 'Choose a course first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {roster.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <label>Date</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <label>Status</label>
                  <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as AttendanceRecord['status'] })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <label>Notes</label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional notes"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  {editing && (
                    <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(defaultForm); }}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={submitting || !form.courseId || !form.studentId || !form.status}>
                    {editing ? (
                      <>
                        <FileEdit className="mr-2 size-4" /> Update Attendance
                      </>
                    ) : (
                      <>
                        <ClipboardList className="mr-2 size-4" /> Save Attendance
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Records</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentRecords.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No attendance records yet.</p>
              ) : (
                recentRecords.map(record => (
                  <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p>{record.courseName}</p>
                      <p className="text-sm text-gray-600">{record.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          record.status === 'present'
                            ? 'default'
                            : record.status === 'late'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {record.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(record);
                          const course = courses.find(
                            (c) =>
                              c.id === record.courseId ||
                              c.studentIds?.includes(record.studentId) ||
                              c.name === record.courseName
                          );
                          setForm({
                            courseId: course?.id || '',
                            studentId: record.studentId,
                            status: record.status,
                            date: record.date,
                            notes: '',
                          });
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
