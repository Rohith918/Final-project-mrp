import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, Download, TrendingUp, TrendingDown, Users, BookOpen, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import * as api from '../lib/api';
import type { AttendanceRecord, Course, Finance, Student } from '../types';
import { calculateAttendanceStats } from '../lib/attendanceUtils';

export function AdminReports() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [studentTotal, setStudentTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [studentsData, coursesData, attendanceData, financeData, studentsCount] = await Promise.all([
          api.getStudents(),
          api.getCourses(),
          api.getAllAttendanceRecords(),
          api.getFinances(),
          api.getStudentsCount(),
        ]);
        setStudents(Array.isArray(studentsData) ? studentsData : studentsData?.students ?? []);
        setCourses(Array.isArray(coursesData) ? coursesData : coursesData?.courses ?? []);
        setAttendance(Array.isArray(attendanceData) ? attendanceData : attendanceData ?? []);
        setFinances(Array.isArray(financeData) ? financeData : finances ?? []);
        setStudentTotal(typeof studentsCount === 'number' ? studentsCount : 0);
      } catch (error) {
        console.error('Failed to load admin report data', error);
        setStudents([]);
        setCourses([]);
        setAttendance([]);
        setFinances([]);
        setStudentTotal(0);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleDownloadReport = (reportType: string) => {
    toast.success(`Downloading ${reportType} report...`);
  };

  const academicData = useMemo(() => {
    const totalStudents = studentTotal || students.length;
    const gpas = students
      .map((student) => student.gpa)
      .filter((value): value is number => typeof value === 'number');
    const averageGPA = gpas.length
      ? gpas.reduce((sum, gpa) => sum + gpa, 0) / gpas.length
      : 0;
    const attendanceRate = calculateAttendanceStats(attendance).rate;
    const courseCompletionRate = courses.length
      ? Math.round(
          (courses.filter((course) => (course.studentIds?.length ?? 0) > 0).length / courses.length) *
            100
        )
      : 0;
    const topPerformers = students.filter((student) => (student.gpa ?? 0) >= 3.8).length;
    const atRiskStudents = students.filter((student) => (student.gpa ?? 0) < 2.5).length;

    return {
      totalStudents,
      averageGPA,
      attendanceRate,
      courseCompletionRate,
      topPerformers,
      atRiskStudents,
    };
  }, [students, attendance, courses, studentTotal]);

  const financialData = useMemo(() => {
    const totals = finances.reduce(
      (acc, record) => {
        acc.totalFee += record.totalFee ?? 0;
        acc.totalCollected += record.paid ?? 0;
        acc.scholarships += record.scholarship ?? 0;
        acc.outstanding += record.due ?? Math.max(0, (record.totalFee ?? 0) - (record.paid ?? 0));
        return acc;
      },
      { totalFee: 0, totalCollected: 0, scholarships: 0, outstanding: 0 }
    );
    const collectionRate = totals.totalFee
      ? Math.round((totals.totalCollected / totals.totalFee) * 100)
      : 0;
    return { ...totals, collectionRate };
  }, [finances]);

  const enrollmentTrends = useMemo(() => {
    const distribution = new Map<string, number>();
    students.forEach((student) => {
      const key = student.gradeLevel || 'Unassigned';
      distribution.set(key, (distribution.get(key) ?? 0) + 1);
    });
    const entries = Array.from(distribution.entries()).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([grade, count], index) => {
      const prev = index === 0 ? count : entries[index - 1][1];
      const change = prev === 0 ? 0 : Number((((count - prev) / prev) * 100).toFixed(1));
      return {
        semester: grade,
        students: count,
        change,
      };
    });
  }, [students]);

  const enrollmentChart = useMemo(() => {
    if (!enrollmentTrends.length) return [];
    const maxStudents = Math.max(...enrollmentTrends.map((entry) => entry.students));
    return enrollmentTrends.map((entry) => ({
      ...entry,
      percent: maxStudents ? Math.round((entry.students / maxStudents) * 100) : 0,
    }));
  }, [enrollmentTrends]);

  const departmentPerformance = useMemo(() => {
    if (!courses.length) return [];
    const studentMap = new Map(students.map((student) => [student.id, student]));
    const deptMap = new Map<
      string,
      { studentIds: Set<string>; attendanceRecords: AttendanceRecord[] }
    >();

    courses.forEach((course) => {
      const dept = (course.code?.replace(/[^A-Za-z].*/, '') || 'GEN').toUpperCase();
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { studentIds: new Set(), attendanceRecords: [] });
      }
      const entry = deptMap.get(dept)!;
      (course.studentIds ?? []).forEach((id) => entry.studentIds.add(id));
      entry.attendanceRecords.push(
        ...attendance.filter((record) => record.courseName === course.name)
      );
    });

    return Array.from(deptMap.entries())
      .map(([dept, data]) => {
        const gpas = Array.from(data.studentIds)
          .map((id) => studentMap.get(id)?.gpa)
          .filter((value): value is number => typeof value === 'number');
        const avgGPA = gpas.length ? gpas.reduce((sum, gpa) => sum + gpa, 0) / gpas.length : 0;
        const attendanceRate = calculateAttendanceStats(data.attendanceRecords).rate;
        return {
          name: dept,
          students: data.studentIds.size,
          avgGPA,
          attendance: attendanceRate,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [courses, attendance, students]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading reports and analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="space-y-1">
          <h1>Reports & Analytics</h1>
          <p className="text-gray-600">Generate and view system-wide reports and analytics.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Students</CardTitle>
              <Users className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{academicData.totalStudents.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Average GPA</CardTitle>
              <BookOpen className="size-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{academicData.averageGPA.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Attendance Rate</CardTitle>
              <Calendar className="size-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{academicData.attendanceRate}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Collection Rate</CardTitle>
              <DollarSign className="size-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{financialData.collectionRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Tabs defaultValue="academic" className="w-full">
          <TabsList>
            <TabsTrigger value="academic">Academic Performance</TabsTrigger>
            <TabsTrigger value="financial">Financial Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="academic" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Academic Performance Overview</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-900 mb-1">Top Performers</p>
                    <p className="text-2xl text-green-900">{academicData.topPerformers}</p>
                    <p className="text-xs text-green-700 mt-1">GPA {'>'} 3.8</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-900 mb-1">At-Risk Students</p>
                    <p className="text-2xl text-orange-900">{academicData.atRiskStudents}</p>
                    <p className="text-xs text-orange-700 mt-1">GPA {'<'} 2.5</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900 mb-1">Completion Rate</p>
                    <p className="text-2xl text-blue-900">{academicData.courseCompletionRate}%</p>
                    <p className="text-xs text-blue-700 mt-1">Course completion</p>
                  </div>
                </div>

                {/* Department Performance */}
                <div>
                  <h3 className="mb-4">Department Performance</h3>
                  <div className="space-y-3">
                    {departmentPerformance.length === 0 ? (
                      <p className="text-gray-600 text-sm">No department data available yet.</p>
                    ) : (
                      departmentPerformance.map((dept) => (
                      <div key={dept.name} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <p>{dept.name}</p>
                          <span className="text-sm text-gray-600">{dept.students} students</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Avg GPA</p>
                            <p>{dept.avgGPA.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Attendance</p>
                            <p>{dept.attendance}%</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Students</p>
                            <p>{dept.students}</p>
                          </div>
                        </div>
                      </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Financial Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Financial Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border">
                    <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
                    <p className="text-3xl mb-2">${(financialData.totalFee / 1000000).toFixed(1)}M</p>
                    <p className="text-sm text-gray-500">Current semester</p>
                  </div>
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                    <p className="text-sm text-gray-600 mb-2">Collection Rate</p>
                    <p className="text-3xl mb-2">{financialData.collectionRate}%</p>
                    <p className="text-sm text-blue-600">
                      ${(financialData.totalCollected / 1000000).toFixed(1)}M collected
                    </p>
                  </div>
                </div>

                {/* Breakdown */}
                <div>
                  <h3 className="mb-4">Financial Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <span className="text-gray-600">Total Collected</span>
                      <span className="text-green-600">${(financialData.totalCollected / 1000000).toFixed(2)}M</span>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <span className="text-gray-600">Outstanding Payments</span>
                      <span className="text-orange-600">${(financialData.outstanding / 1000000).toFixed(2)}M</span>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <span className="text-gray-600">Scholarships Awarded</span>
                      <span className="text-blue-600">${(financialData.scholarships / 1000000).toFixed(2)}M</span>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                      <span>Net Revenue</span>
                      <span className="text-lg">${((financialData.totalCollected - financialData.scholarships) / 1000000).toFixed(2)}M</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enrollment" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Enrollment Trends</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {enrollmentTrends.length === 0 ? (
                    <p className="text-gray-600 text-sm">No enrollment data available.</p>
                  ) : (
                    enrollmentTrends.map((trend) => (
                      <div key={trend.semester} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p>{trend.semester}</p>
                          <div className="flex items-center gap-2">
                            {trend.change >= 0 ? (
                              <TrendingUp className="size-4 text-green-600" />
                            ) : (
                              <TrendingDown className="size-4 text-red-600" />
                            )}
                            <span className={trend.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {trend.change > 0 ? '+' : ''}
                              {trend.change}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-gray-400" />
                          <span className="text-2xl">{trend.students.toLocaleString()}</span>
                          <span className="text-sm text-gray-600">students enrolled</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Projections */}
                <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-blue-900 mb-2">Enrollment Projection</h3>
                  <p className="text-3xl text-blue-900 mb-2">1,270</p>
                  <p className="text-sm text-blue-700">Expected enrollment for Spring 2026</p>
                </div>

                {enrollmentChart.length > 0 && (
                  <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-gray-800">
                      <TrendingUp className="size-4 text-blue-600" />
                      Enrollment Distribution
                    </h3>
                    <div className="space-y-3">
                      {enrollmentChart.map((entry) => (
                        <div key={`${entry.semester}-chart`}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">{entry.semester}</span>
                            <span className="text-gray-900">{entry.students.toLocaleString()}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                              style={{ width: `${Math.max(entry.percent, 4)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
