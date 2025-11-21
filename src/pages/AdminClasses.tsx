import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import * as api from '../lib/api';
import { Student, Course } from '../types';
import { Mail, Search } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

type GradeRow = {
  id: string;
  student: Student;
  course: Course;
  cumulative: number;
};

export function AdminClasses() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState<'all' | '90' | '80' | '70' | 'below'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [studentsRes, coursesRes, gradesRes] = await Promise.all([
          api.getStudents(),
          api.getCourses(),
          api.getAllGrades(),
        ]);

        const normalizedStudents = Array.isArray(studentsRes) ? studentsRes : studentsRes?.students ?? [];
        const normalizedCourses = Array.isArray(coursesRes) ? coursesRes : coursesRes?.courses ?? [];
        const normalizedGrades = Array.isArray(gradesRes) ? gradesRes : gradesRes ?? [];

        const gradeStudentIds = Array.from(new Set(normalizedGrades.map((grade) => grade.studentId)));
        const missingStudentIds = gradeStudentIds.filter((id) => !normalizedStudents.some((student) => student.id === id));
        const fetchedStudents = missingStudentIds.length ? await api.getStudentsByIds(missingStudentIds) : [];
        const combinedStudents = [...normalizedStudents, ...fetchedStudents];

        setStudents(combinedStudents);
        setCourses(normalizedCourses);

        const studentMap = new Map(combinedStudents.map((s) => [s.id, s]));
        const courseMap = new Map(normalizedCourses.map((c) => [c.id, c]));
        const fallbackStudent = (id: string): Student => ({
          id,
          name: 'Unknown Student',
          email: 'N/A',
          role: 'student',
          gradeLevel: 'N/A',
          gpa: 0,
          attendance: 0,
        });
        const fallbackCourse = (id: string, name?: string): Course => ({
          id,
          name: name ?? 'Unnamed Course',
          code: id ? id.slice(0, 6).toUpperCase() : 'NOCODE',
          teacherId: 'unknown',
          teacherName: '—',
          credits: 0,
          schedule: '—',
        });
        const aggregate = new Map<string, { total: number; max: number; courseName?: string }>();

        normalizedGrades.forEach((grade) => {
          const student = studentMap.get(grade.studentId) ?? fallbackStudent(grade.studentId);
          const course = courseMap.get(grade.courseId) ?? fallbackCourse(grade.courseId, grade.courseName);
          if (!studentMap.has(student.id)) studentMap.set(student.id, student);
          if (!courseMap.has(course.id)) courseMap.set(course.id, course);
          const key = `${grade.studentId}|${grade.courseId}`;
          if (!aggregate.has(key)) aggregate.set(key, { total: 0, max: 0, courseName: grade.courseName });
          const bucket = aggregate.get(key)!;
          bucket.total += grade.score;
          bucket.max += grade.maxScore;
          if (!bucket.courseName && grade.courseName) {
            bucket.courseName = grade.courseName;
          }
        });

        const compiled = Array.from(aggregate.entries()).reduce<GradeRow[]>((acc, [key, bucket]) => {
          const [studentId, courseId] = key.split('|');
          const student = studentMap.get(studentId) ?? fallbackStudent(studentId);
          const course = courseMap.get(courseId) ?? fallbackCourse(courseId, bucket.courseName);
          const cumulative = bucket.max ? Math.round((bucket.total / bucket.max) * 100) : 0;
          acc.push({ id: key, student, course, cumulative });
          return acc;
        }, []);

        setRows(compiled);
      } catch (error) {
        console.error('Failed to load grades table', error);
        toast.error('Unable to load grade records');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search, courseFilter, gradeFilter, rows.length]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        row.student.name.toLowerCase().includes(term) ||
        row.student.email.toLowerCase().includes(term) ||
        row.course.name.toLowerCase().includes(term);

      const matchesCourse =
        courseFilter === 'all' ? true : row.course.name.toLowerCase() === courseFilter;

      const matchesGrade =
        gradeFilter === 'all'
          ? true
          : gradeFilter === '90'
          ? row.cumulative >= 90
          : gradeFilter === '80'
          ? row.cumulative >= 80 && row.cumulative < 90
          : gradeFilter === '70'
          ? row.cumulative >= 70 && row.cumulative < 80
          : row.cumulative < 70;

      return matchesSearch && matchesCourse && matchesGrade;
    });
  }, [rows, search, courseFilter, gradeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filteredRows.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const getTheme = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' };
    if (score >= 80) return { label: 'Strong', color: 'text-sky-600', badge: 'bg-sky-100 text-sky-700' };
    if (score >= 70) return { label: 'Watchlist', color: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' };
    return { label: 'At Risk', color: 'text-rose-600', badge: 'bg-rose-100 text-rose-700' };
  };

  const handleMail = (row: GradeRow) => {
    toast.success(`Opening mail client for ${row.student.name}`);
    window.location.href = `mailto:${row.student.email}?subject=${encodeURIComponent(`${row.course.name} Progress`)}`;
  };

  const stats = [
    { label: 'Total Grade Records', value: rows.length.toLocaleString() },
    { label: 'Distinct Courses', value: new Set(rows.map((row) => row.course.id)).size.toLocaleString() },
    {
      label: 'Average Grade',
      value: `${(
        rows.reduce((sum, row) => sum + row.cumulative, 0) / (rows.length || 1)
      ).toFixed(1)}%`,
    },
  ];

  const dataView = (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pageRows.map((row) => {
          const theme = getTheme(row.cumulative);
          return (
            <Card key={row.id} className="h-full border border-slate-100 shadow-sm">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
                  <p className="text-lg font-semibold text-slate-900">{row.student.name}</p>
                  <p className="text-sm text-slate-500 truncate">{row.student.email}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Course</p>
                      <p className="text-sm font-medium text-slate-800">{row.course.name}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {row.course.teacherName ?? '—'}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Cumulative Grade</span>
                      <span>{row.cumulative}%</span>
                    </div>
                    <Progress value={row.cumulative} className="mt-2 h-2" />
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
                      <span className={`size-2 rounded-full ${theme.badge}`} />
                      <span className={theme.color}>{theme.label}</span>
                    </div>
                  </div>
                </div>
                    <Button variant="outline" className="w-full" onClick={() => handleMail(row)}>
                      <Mail className="mr-2 size-4" />
                      Email
                    </Button>
                 </CardContent>
               </Card>
             );
           })}
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white px-5 py-4 text-sm text-gray-600 shadow-sm md:flex-row md:items-center md:justify-between">
        <p>
          Showing {filteredRows.length === 0 ? 0 : currentPage * pageSize + 1}-
          {Math.min((currentPage + 1) * pageSize, filteredRows.length)} of {filteredRows.length}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );

  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => {
      const key = row.course.name.toLowerCase();
      if (!map.has(key)) map.set(key, row.course.name);
    });
    return Array.from(map.entries()).map(([key, name]) => [key, name] as [string, string]);
  }, [rows]);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <h1>Grades Overview</h1>
          <p className="text-gray-600">
            Live snapshot of every student/course grade combination.
          </p>
        </div>

        <Card className="shadow">
          <CardHeader>
            <CardTitle>Quick Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search by student, email, or course"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Course</p>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                  {courseOptions.map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Grade band</p>
                <Select value={gradeFilter} onValueChange={(val) => setGradeFilter(val as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Grade band" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All grades</SelectItem>
                    <SelectItem value="90">90%+</SelectItem>
                    <SelectItem value="80">80-89%</SelectItem>
                    <SelectItem value="70">70-79%</SelectItem>
                    <SelectItem value="below">Below 70%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-600">Loading grade records...</CardContent>
          </Card>
        ) : filteredRows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-600">
              No grade records match your search.
            </CardContent>
          </Card>
        ) : (
          dataView
        )}
      </div>
    </DashboardLayout>
  );
}
