import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { useAuth } from '../lib/authContext';
import { Course, Grade, Student } from '../types';
import { toast } from 'sonner@2.0.3';
import { ClipboardCheck, FilePlus } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import {
  getCourses,
  getGradesByCourseIds,
  getStudents,
  getStudent,
  getStudentsByIds,
  createGradeRecord,
  updateGradeRecord,
} from '../lib/api';
import { normalizeStudentIds } from '../lib/rosterUtils';

type FormState = {
  courseId: string;
  studentId: string;
  examType: string;
  score: string;
  maxScore: string;
  notes: string;
};

const defaultForm: FormState = {
  courseId: '',
  studentId: '',
  examType: '',
  score: '',
  maxScore: '100',
  notes: '',
};

export function TeacherGrades() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courseRosters, setCourseRosters] = useState<Record<string, Student[]>>({});
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentNameCache, setStudentNameCache] = useState<Record<string, string>>({});

  const myCourses = useMemo(() => {
    if (!user?.id) return [];
    return courses;
  }, [courses, user?.id]);

  const courseMap = useMemo(() => new Map(myCourses.map(c => [c.id, c])), [myCourses]);
  const studentsLookup = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const roster = useMemo(() => {
    if (!form.courseId) return [];
    const list = courseRosters[form.courseId] ?? [];
    if (form.studentId && !list.some((student) => student.id === form.studentId)) {
      const selectedStudent = studentsLookup.get(form.studentId);
      if (selectedStudent) {
        return [selectedStudent, ...list];
      }
    }
    return list;
  }, [form.courseId, form.studentId, courseRosters, studentsLookup]);

  const existingGrades = useMemo(() => {
    if (!user?.id) return [];
    return grades
      .filter((grade) => myCourses.some((course) => course.id === grade.courseId))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 10);
  }, [grades, myCourses, user?.id]);

  useEffect(() => {
    const missing = new Set<string>();
    existingGrades.forEach((grade) => {
      if (!studentsLookup.get(grade.studentId) && !studentNameCache[grade.studentId]) {
        missing.add(grade.studentId);
      }
    });
    if (!missing.size) return;

    let cancelled = false;
    (async () => {
      const entries: Array<[string, string]> = [];
      for (const studentId of missing) {
        try {
          const student = await getStudent(studentId);
          if (student?.name) {
            entries.push([studentId, student.name]);
          }
        } catch (error) {
          console.error('Failed to fetch student name', studentId, error);
        }
      }
      if (!cancelled && entries.length) {
        setStudentNameCache((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [existingGrades, studentsLookup, studentNameCache]);

  const loadGradeData = async () => {
    if (!user?.id) {
      setCourses([]);
      setStudents([]);
      setGrades([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [coursesRes, studentsRes] = await Promise.all([getCourses(), getStudents()]);
      const allCourses = Array.isArray(coursesRes) ? coursesRes : coursesRes?.courses ?? [];
      const normalizedCourses = allCourses.map((course) => ({
        ...course,
        studentIds: normalizeStudentIds(course.studentIds),
      }));
      const teacherCourses = normalizedCourses.filter((course: Course) => course.teacherId === user.id);
      const teacherCourseIds = teacherCourses.map((course) => course.id);

      if (!teacherCourses.length) {
        setCourses([]);
        setStudents([]);
        setCourseRosters({});
        setGrades([]);
        return;
      }

      const initialStudents = Array.isArray(studentsRes) ? studentsRes : studentsRes ?? [];
      const teacherGradesRes = await getGradesByCourseIds(teacherCourseIds);
      const teacherGrades = Array.isArray(teacherGradesRes) ? (teacherGradesRes as Grade[]) : [];

      const rosterEntries: Record<string, string[]> = {};
      teacherCourses.forEach((course) => {
        rosterEntries[course.id] = [...(course.studentIds ?? [])];
      });
      teacherGrades.forEach((grade) => {
        if (!grade.courseId) return;
        if (!rosterEntries[grade.courseId]) {
          rosterEntries[grade.courseId] = [];
        }
        if (!rosterEntries[grade.courseId].includes(grade.studentId)) {
          rosterEntries[grade.courseId].push(grade.studentId);
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
      const studentLookup = new Map(combinedStudents.map((student) => [student.id, student]));

      const rosterMap: Record<string, Student[]> = {};
      Object.entries(rosterEntries).forEach(([courseId, ids]) => {
        const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
        rosterMap[courseId] = uniqueIds
          .map((id) => studentLookup.get(id))
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
      setGrades(teacherGrades ?? []);
    } catch (error) {
      console.error('Failed to load grade data', error);
      toast.error('Unable to load gradebook data');
      setGrades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGradeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!editing) return;
    setForm({
      courseId: editing.courseId,
      studentId: editing.studentId,
      examType: editing.examType,
      score: String(editing.score),
      maxScore: String(editing.maxScore),
      notes: '',
    });
  }, [editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId || !form.studentId || !form.examType) {
      toast.error('Please fill in all required fields');
      return;
    }
    const course = courseMap.get(form.courseId);
    if (!course) {
      toast.error('Course not found');
      return;
    }
    setSubmitting(true);
    try {
      const grade: Omit<Grade, 'id'> = {
        studentId: form.studentId,
        courseId: form.courseId,
        courseName: course.name,
        examType: form.examType,
        score: Number(form.score),
        maxScore: Number(form.maxScore),
        date: editing?.date ?? new Date().toISOString().slice(0, 10),
      };
      if (editing) {
        await updateGradeRecord(editing.id, grade);
        toast.success('Grade updated successfully');
      } else {
        await createGradeRecord(grade);
        toast.success('Grade saved successfully');
      }
      await loadGradeData();
      setForm(defaultForm);
      setEditing(null);
    } catch (error) {
      console.error('Failed to save grade', error);
      toast.error('Failed to save grade');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading gradebook...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1>Gradebook</h1>
            <p className="text-gray-600">Record assessments and keep student performance up to date.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Enter Grade</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <label>Course</label>
                  <Select value={form.courseId} onValueChange={(value) => setForm({ ...form, courseId: value, studentId: '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {myCourses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} • {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <label>Student</label>
                  <Select value={form.studentId} onValueChange={(value) => setForm({ ...form, studentId: value })} disabled={!form.courseId || roster.length === 0}>
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
                  <label>Assessment Type</label>
                  <Input
                    value={form.examType}
                    onChange={(e) => setForm({ ...form, examType: e.target.value })}
                    placeholder="e.g., Midterm, Project"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label>Score</label>
                    <Input
                      type="number"
                      value={form.score}
                      onChange={(e) => setForm({ ...form, score: e.target.value })}
                      min={0}
                      max={Number(form.maxScore) || 100}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label>Max Score</label>
                    <Input
                      type="number"
                      value={form.maxScore}
                      onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
                      min={1}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label>Notes (optional)</label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Add instructions or grading notes"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  {editing && (
                    <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(defaultForm); }}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={submitting || !form.courseId || !form.studentId}>
                    <FilePlus className="mr-2 size-4" />
                    {submitting ? 'Saving...' : editing ? 'Update Grade' : 'Save Grade'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Grades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingGrades.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No grades recorded yet.</p>
              ) : (
                existingGrades.map(grade => {
                  const percentage = grade.maxScore ? Math.round((grade.score / grade.maxScore) * 100) : grade.score;
                  const student = studentsLookup.get(grade.studentId);
                  const studentName = student?.name ?? studentNameCache[grade.studentId] ?? grade.studentId;
                  return (
                    <div key={grade.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p>{grade.courseName}</p>
                        <p className="text-sm text-gray-600">
                          Student: {studentName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {grade.examType} • {grade.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={percentage >= 90 ? 'default' : percentage >= 80 ? 'secondary' : 'outline'}>
                          {grade.score}/{grade.maxScore}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => setEditing(grade)}>
                          Edit
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
