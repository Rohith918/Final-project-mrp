import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { useAuth } from '../lib/authContext';
import { getStudents, getCourses, createAttendance, getStudentsByIds, getGradesByCourseIds } from '../lib/api';
import { Student, Course, AttendanceRecord, Grade } from '../types';
import { Search, Mail, Phone, TrendingUp } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { normalizeStudentIds } from '../lib/rosterUtils';

const todayISO = () => new Date().toISOString().slice(0, 10);

export function TeacherStudents() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseRosters, setCourseRosters] = useState<Record<string, Student[]>>({});
  const [courseAverages, setCourseAverages] = useState<Record<string, Record<string, number>>>({});
  const [selectedCourseId, setSelectedCourseId] = useState<'all' | string>('all');
  const [attendanceDate] = useState(todayISO());
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'all' | '90' | '80' | '70' | 'below70'>('all');
  const [loading, setLoading] = useState(true);
  const [markingKey, setMarkingKey] = useState<string | null>(null);

  const selectedCourse = selectedCourseId === 'all' ? null : courses.find((course) => course.id === selectedCourseId) ?? null;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (selectedCourseId === 'all') return;
    const exists = courses.some((course) => course.id === selectedCourseId);
    if (!exists) {
      setSelectedCourseId('all');
    }
  }, [courses, selectedCourseId]);

  const loadData = async () => {
    if (!user?.id) {
      setStudents([]);
      setCourses([]);
      setCourseRosters({});
      setCourseAverages({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [studentsRes, coursesRes] = await Promise.all([getStudents(), getCourses()]);
      const allStudents = Array.isArray(studentsRes) ? studentsRes : studentsRes?.students ?? [];
      const courseList = Array.isArray(coursesRes) ? coursesRes : coursesRes?.courses ?? [];
      const normalizedCourses = courseList.map((course) => ({
        ...course,
        studentIds: normalizeStudentIds(course.studentIds),
      }));

      if (isTeacher) {
        const ownedCourses = normalizedCourses.filter((course) => course.teacherId === user.id);
        const effectiveCourses = ownedCourses.length ? ownedCourses : normalizedCourses;
        setCourses(effectiveCourses);
        const teacherCourseIds = effectiveCourses.map((course) => course.id);
        const teacherGradesRes = teacherCourseIds.length ? await getGradesByCourseIds(teacherCourseIds) : [];
        const teacherGrades = Array.isArray(teacherGradesRes) ? (teacherGradesRes as Grade[]) : [];

        const rosterEntries: Record<string, string[]> = {};
        effectiveCourses.forEach((course) => {
          rosterEntries[course.id] = course.studentIds ?? [];
        });

        const gradeTotals: Record<
          string,
          Record<string, { sum: number; count: number }>
        > = {};

        teacherGrades.forEach((grade) => {
          if (!grade.courseId || !grade.studentId) return;
          if (!rosterEntries[grade.courseId]) {
            rosterEntries[grade.courseId] = [];
          }
          if (!rosterEntries[grade.courseId].includes(grade.studentId)) {
            rosterEntries[grade.courseId].push(grade.studentId);
          }
          if (!gradeTotals[grade.studentId]) {
            gradeTotals[grade.studentId] = {};
          }
          if (!gradeTotals[grade.studentId][grade.courseId]) {
            gradeTotals[grade.studentId][grade.courseId] = { sum: 0, count: 0 };
          }
          const percent = grade.maxScore ? (grade.score / grade.maxScore) * 100 : grade.score;
          gradeTotals[grade.studentId][grade.courseId].sum += percent;
          gradeTotals[grade.studentId][grade.courseId].count += 1;
        });

        const averages: Record<string, Record<string, number>> = {};
        Object.entries(gradeTotals).forEach(([studentId, courseStats]) => {
          averages[studentId] = {};
          Object.entries(courseStats).forEach(([courseId, stats]) => {
            averages[studentId][courseId] =
              stats.count > 0 ? stats.sum / stats.count : 0;
          });
        });

        const allowedIds = new Set<string>();
        Object.values(rosterEntries).forEach((ids) => ids.forEach((id) => allowedIds.add(id)));
        const missingIds = Array.from(allowedIds).filter((id) => !allStudents.some((student) => student.id === id));
        const fetchedStudents = missingIds.length ? await getStudentsByIds(missingIds) : [];
        const combinedStudents = [...allStudents, ...fetchedStudents];
        const studentLookup = new Map(combinedStudents.map((student) => [student.id, student]));
        const rosterStudentMap: Record<string, Student[]> = {};
        Object.entries(rosterEntries).forEach(([courseId, ids]) => {
          rosterStudentMap[courseId] = ids
            .map((id) => studentLookup.get(id))
            .filter(Boolean) as Student[];
        });
        const teacherStudents = Array.from(
          new Map(
            Object.values(rosterStudentMap)
              .flat()
              .map((student) => [student.id, student])
          ).values()
        );
        setCourseRosters(rosterStudentMap);
        setStudents(teacherStudents);
        setCourseAverages(averages);
        return;
      }

      setCourses(normalizedCourses);
      const rosterStudentMap = normalizedCourses.reduce<Record<string, Student[]>>((acc, course) => {
        const ids = course.studentIds ?? [];
        acc[course.id] = ids
          .map((id) => allStudents.find((student) => student.id === id))
          .filter(Boolean) as Student[];
        return acc;
      }, {});
      setCourseRosters(rosterStudentMap);
      setCourseAverages({});
      setStudents(allStudents);
    } catch (error) {
      console.error('Error loading teacher data:', error);
      toast.error('Failed to load students or courses');
    } finally {
      setLoading(false);
    }
  };

  const getCumulativeGrade = (studentId: string) => {
    const courseGrades = courseAverages[studentId];
    if (!courseGrades) return null;
    if (selectedCourseId !== 'all') {
      const target = courseGrades[selectedCourseId];
      if (typeof target === 'number') return target;
    }
    const values = Object.values(courseGrades);
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const visibleStudents = useMemo(() => {
    let list = selectedCourseId === 'all'
      ? [...students]
      : [...(courseRosters[selectedCourseId]?.length ? courseRosters[selectedCourseId] : [])];
    if (searchQuery.trim()) {
      const term = searchQuery.trim().toLowerCase();
      list = list.filter((student) =>
        student.name.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        student.gradeLevel.toLowerCase().includes(term)
      );
    }
    if (gradeFilter !== 'all') {
      list = list.filter((student) => {
        const grade = getCumulativeGrade(student.id);
        if (grade == null) return false;
        if (gradeFilter === '90') return grade >= 90;
        if (gradeFilter === '80') return grade >= 80 && grade < 90;
        if (gradeFilter === '70') return grade >= 70 && grade < 80;
        return grade < 70;
      });
    }
    return list;
  }, [students, selectedCourseId, courseRosters, searchQuery, gradeFilter]);

  const getPerformanceBadge = (grade?: number | null) => {
    if (typeof grade !== 'number') return { variant: 'outline' as const, label: 'No grades yet' };
    if (grade >= 90) return { variant: 'default' as const, label: 'Excellent' };
    if (grade >= 80) return { variant: 'secondary' as const, label: 'Strong' };
    if (grade >= 70) return { variant: 'outline' as const, label: 'Watchlist' };
    return { variant: 'destructive' as const, label: 'At Risk' };
  };

  const handleAttendance = async (studentId: string, status: AttendanceRecord['status']) => {
    if (!selectedCourse) {
      toast.error('Please select a class before marking attendance');
      return;
    }
    if (!attendanceDate) {
      toast.error('Select a date before marking attendance');
      return;
    }

    const key = `${studentId}-${status}`;
    setMarkingKey(key);
    try {
      await createAttendance({
        studentId,
        lessonId: `${selectedCourse.id}-${attendanceDate}`,
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        date: attendanceDate,
        status,
      });
      toast.success(`Marked ${status} for ${selectedCourse.name}`);
    } catch (error) {
      console.error('Failed to save attendance:', error);
      toast.error('Could not save attendance');
    } finally {
      setMarkingKey(null);
    }
  };

  const disableMarking = !selectedCourse || !attendanceDate;

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1>My Students</h1>
            <p className="text-gray-600">Take attendance by class and keep student records in sync.</p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            Refresh Data
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search students by name, email, or grade level..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select
                  value={selectedCourseId}
                  onValueChange={(value) => setSelectedCourseId(value)}
                  disabled={!courses.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={courses.length ? 'Select a class' : 'No classes assigned'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code} • {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cumulative Grade</Label>
                <Select value={gradeFilter} onValueChange={(value) => setGradeFilter(value as typeof gradeFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All grades</SelectItem>
                    <SelectItem value="90">90% and above</SelectItem>
                    <SelectItem value="80">80% - 89%</SelectItem>
                    <SelectItem value="70">70% - 79%</SelectItem>
                    <SelectItem value="below70">Below 70%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Attendance entries are stored via the shared API. Students see updates instantly on their pages.
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">Loading students...</p>
            </CardContent>
          </Card>
        ) : visibleStudents.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">
                {courses.length
                  ? 'No students match your filters.'
                  : 'No classes or students are assigned to your account yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visibleStudents.map((student) => {
              const cumulativeGrade = getCumulativeGrade(student.id);
              const performanceBadge = getPerformanceBadge(cumulativeGrade);
              return (
                <Card key={student.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-4">
                      <Avatar className="size-12">
                        <AvatarImage src={student.avatar} alt={student.name} />
                        <AvatarFallback>{student.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg">{student.name}</h3>
                        <div className="flex gap-2 text-xs text-gray-600">
                          <span>{student.gradeLevel}</span>
                          <Badge variant="secondary">{student.gradeLevel}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Academic Performance</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">
                            Cumulative Grade{selectedCourseId === 'all' ? ' (avg)' : ''}
                          </p>
                          <div className="flex items-center gap-2">
                            <span>
                              {typeof cumulativeGrade === 'number' ? `${cumulativeGrade.toFixed(1)}%` : 'N/A'}
                            </span>
                            <TrendingUp className="size-3 text-green-600" />
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Attendance</p>
                          <span>{student.attendance ?? '--'}%</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Badge variant={performanceBadge.variant}>{performanceBadge.label}</Badge>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="size-4 flex-shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </div>
                      {student.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="size-4 flex-shrink-0" />
                          <span>{student.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {(['present', 'late', 'absent'] as AttendanceRecord['status'][]).map((status) => {
                        const key = `${student.id}-${status}`;
                        const statusConfig = {
                          present: { label: 'Mark Present', className: 'bg-green-600 hover:bg-green-700' },
                          late: { label: 'Mark Late', className: 'bg-amber-600 hover:bg-amber-700' },
                          absent: { label: 'Mark Absent', className: 'bg-red-600 hover:bg-red-700' },
                        }[status];
                        return (
                          <button
                            key={status}
                            className={`text-xs px-3 py-2 rounded text-white transition ${statusConfig.className} disabled:opacity-60`}
                            disabled={disableMarking || markingKey === key}
                            onClick={() => handleAttendance(student.id, status)}
                          >
                            {markingKey === key ? 'Saving...' : statusConfig.label}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
