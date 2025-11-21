import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import * as api from '../lib/api';
import { BookOpen, Clock, User } from 'lucide-react';
import { useAuth } from '../lib/authContext';

export function StudentCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCourses, setAllCourses] = useState<any[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const [coursesResponse, { grades }] = await Promise.all([
          api.getCourses(),
          api.getGrades(user.id),
        ]);
        const coursesData = Array.isArray(coursesResponse)
          ? coursesResponse
          : coursesResponse?.courses ?? [];
        setAllCourses(coursesData);
        const enrolledIds = new Set((grades || []).map((g: any) => g.courseId));
        const filtered = coursesData.filter((course: any) => enrolledIds.has(course.id));
        setCourses(filtered.length ? filtered : coursesData);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user?.id]);

  const subtitle = useMemo(() => {
    if (!user?.id) return 'Log in to view your course list.';
    if (courses.length === 0 && allCourses.length) return 'No enrolled courses found yet. Showing catalog instead.';
    return 'View your enrolled courses and schedules.';
  }, [courses.length, allCourses.length, user?.id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1>My Courses</h1>
          <p className="text-gray-600">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{course.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{course.code}</p>
                  </div>
                  <Badge>{course.credits} Credits</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="size-4" />
                  <span>{course.teacherName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="size-4" />
                  <span>{course.schedule}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen className="size-4" />
                  <span>Computer Science Department</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
