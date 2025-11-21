import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Users, BookOpen, Building, DollarSign, UserCheck } from 'lucide-react';
import * as api from '../lib/api';
import type { Announcement, Course, Finance, Student, Teacher } from '../types';

export function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [studentTotal, setStudentTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [studentsData, teachersData, coursesData, financesData, announcementsData, studentsCount] =
          await Promise.all([
            api.getStudents(),
            api.getTeachers(),
            api.getCourses(),
            api.getFinances(),
            api.getAnnouncements(),
            api.getStudentsCount(),
          ]);

        setStudents(Array.isArray(studentsData) ? studentsData : studentsData?.students ?? []);
        setTeachers(Array.isArray(teachersData) ? teachersData : teachersData?.teachers ?? []);
        setCourses(Array.isArray(coursesData) ? coursesData : coursesData?.courses ?? []);
        setFinances(Array.isArray(financesData) ? financesData : financesData ?? []);
        setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
        setStudentTotal(typeof studentsCount === 'number' ? studentsCount : 0);
      } catch (error) {
        console.error('Failed to load admin dashboard data', error);
        setStudents([]);
        setTeachers([]);
        setCourses([]);
        setFinances([]);
        setAnnouncements([]);
        setStudentTotal(0);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const stats = useMemo(() => {
    const studentCount = studentTotal || students.length;
    const teacherCount = new Set(teachers.map(teacher => teacher.id)).size;
    const courseCount = courses.length;

    const totalCollected = finances.reduce((sum, fin) => sum + (fin?.paid ?? 0), 0);
    const outstanding = finances.reduce((sum, fin) => sum + (fin?.due ?? 0), 0);
    const totalScholarship = finances.reduce((sum, fin) => sum + (fin?.scholarship ?? 0), 0);

    const departments = courses.reduce<
      Record<string, { students: Set<string>; teachers: Set<string>; courses: number }>
    >((acc, course) => {
      const dept = course.code.slice(0, 2);
      if (!acc[dept]) acc[dept] = { students: new Set(), teachers: new Set(), courses: 0 };
      course.studentIds?.forEach(id => acc[dept].students.add(id));
      acc[dept].teachers.add(course.teacherId);
      acc[dept].courses += 1;
      return acc;
    }, {});

    const departmentSummary = Object.entries(departments).map(([name, data]) => ({
      name,
      students: data.students.size,
      teachers: data.teachers.size,
      courses: data.courses,
    }));

    return {
      studentCount,
      teacherCount,
      courseCount,
      totalCollected,
      outstanding,
      totalScholarship,
      departmentSummary,
    };
  }, [students, teachers, courses, finances, studentTotal]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading admin dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="text-gray-600">System overview and management.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Students</CardTitle>
              <Users className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.studentCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Teachers</CardTitle>
              <UserCheck className="size-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.teacherCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Active Courses</CardTitle>
              <BookOpen className="size-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.courseCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Outstanding Balance</CardTitle>
              <DollarSign className="size-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">${stats.outstanding.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.departmentSummary.map(dept => (
                  <div key={dept.name} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="size-5 text-blue-600" />
                      <p>{dept.name}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Students</p>
                        <p>{dept.students}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Teachers</p>
                        <p>{dept.teachers}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Courses</p>
                        <p>{dept.courses}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {announcements.slice(0, 4).map(announcement => (
                  <div key={announcement.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm">{announcement.title}</p>
                      <p className="text-xs text-gray-600">{announcement.author}</p>
                    </div>
                    <Badge
                      variant={
                        announcement.priority === 'high'
                          ? 'destructive'
                          : announcement.priority === 'medium'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {announcement.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-900 mb-1">Total Collected</p>
                <p className="text-2xl text-green-900">${stats.totalCollected.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-900 mb-1">Outstanding</p>
                <p className="text-2xl text-orange-900">${stats.outstanding.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 mb-1">Scholarships</p>
                <p className="text-2xl text-blue-900">${stats.totalScholarship.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-900 mb-1">Net Revenue</p>
                <p className="text-2xl text-purple-900">
                  ${(stats.totalCollected - stats.totalScholarship).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
