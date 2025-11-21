import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../lib/authContext';
import { BookOpen, Users, ClipboardCheck, Calendar } from 'lucide-react';
import {
  getAnnouncements,
  getCourses,
  getGradesByCourseIds,
  getLessons,
} from '../lib/api';
import { Announcement, Course, Grade, Lesson } from '../types';

export function TeacherDashboard() {
  const { user } = useAuth();
  const teacherId = user?.role === 'teacher' ? user.id : null;

  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!teacherId) {
        setCourses([]);
        setLessons([]);
        setAnnouncements([]);
        setGrades([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [coursesRes, lessonsRes, announcementsRes] = await Promise.all([
          getCourses(),
          getLessons(teacherId),
          getAnnouncements(),
        ]);

        const allCourses = Array.isArray(coursesRes) ? coursesRes : coursesRes?.courses ?? [];
        const teacherCourses = allCourses.filter((course) => course.teacherId === teacherId);
        setCourses(teacherCourses);
        setLessons(lessonsRes?.lessons ?? []);
        const announcementList = Array.isArray(announcementsRes)
          ? announcementsRes
          : announcementsRes?.announcements ?? [];
        setAnnouncements(announcementList);

        if (teacherCourses.length) {
          const courseIds = teacherCourses.map((course) => course.id);
          const teacherGrades = await getGradesByCourseIds(courseIds);
          setGrades(teacherGrades ?? []);
        } else {
          setGrades([]);
        }
      } catch (error) {
        console.error('Failed to load teacher dashboard data:', error);
        setCourses([]);
        setLessons([]);
        setAnnouncements([]);
        setGrades([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [teacherId]);

  const { totalStudents, upcomingLessons, pendingGrades } = useMemo(() => {
    const rosterSet = new Set<string>();
    courses.forEach((course) => (course.studentIds || []).forEach((id: string) => rosterSet.add(id)));

    const upcoming = lessons
      .filter((lesson) => lesson.teacherId === teacherId)
      .filter((lesson) => new Date(lesson.date) >= new Date())
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
      .slice(0, 4);

    const gradeMap = grades.reduce<Map<string, Set<string>>>((map, grade) => {
      const set = map.get(grade.courseId) ?? new Set<string>();
      set.add(grade.studentId);
      map.set(grade.courseId, set);
      return map;
    }, new Map());

    const pending = courses.reduce((count, course) => {
      const roster = course.studentIds || [];
      if (!roster.length) return count;
      const gradedStudents = gradeMap.get(course.id) ?? new Set();
      const missing = roster.filter((id: string) => !gradedStudents.has(id)).length;
      return count + missing;
    }, 0);

    return {
      totalStudents: rosterSet.size,
      upcomingLessons: upcoming,
      pendingGrades: pending,
    };
  }, [courses, grades, lessons, teacherId]);

  const recentAnnouncements = announcements.slice(0, 2);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading teacher dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1>Teacher Dashboard</h1>
          <p className="text-gray-600">Manage your classes and track student progress.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Classes</CardTitle>
              <BookOpen className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{courses.length}</div>
              <p className="text-xs text-gray-600 mt-1">Active courses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Students</CardTitle>
              <Users className="size-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{totalStudents}</div>
              <p className="text-xs text-gray-600 mt-1">Across your classes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Pending Grading</CardTitle>
              <ClipboardCheck className="size-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{pendingGrades}</div>
              <p className="text-xs text-gray-600 mt-1">Student submissions pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Upcoming Lessons</CardTitle>
              <Calendar className="size-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{upcomingLessons.length}</div>
              <p className="text-xs text-gray-600 mt-1">Upcoming lessons</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Courses */}
          <Card>
            <CardHeader>
              <CardTitle>My Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p>{course.name}</p>
                      <p className="text-sm text-gray-600">{course.code} • {course.schedule}</p>
                    </div>
                    <Badge>{course.credits} credits</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Lessons */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingLessons.map((lesson) => (
                  <div key={lesson.id} className="flex gap-4 p-3 border rounded-lg">
                    <div className="flex flex-col items-center justify-center bg-blue-100 rounded-lg p-3 min-w-16">
                      <div className="text-blue-600">{new Date(lesson.date).getDate()}</div>
                      <div className="text-xs text-blue-600">
                        {new Date(lesson.date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="truncate">{lesson.title}</p>
                      <p className="text-sm text-gray-600">{lesson.courseName}</p>
                      <p className="text-sm text-gray-600">{lesson.time} • Room {lesson.room}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAnnouncements.map((announcement) => (
                <div key={announcement.id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <p>{announcement.title}</p>
                    <Badge>{announcement.priority}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{announcement.content}</p>
                  <p className="text-xs text-gray-500 mt-2">{announcement.date}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
