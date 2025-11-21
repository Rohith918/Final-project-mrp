import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../lib/authContext';
import * as api from '../lib/api';
import { calculateAttendanceStats } from '../lib/attendanceUtils';
import {
  GraduationCap,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

export function StudentDashboard() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [finance, setFinance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  const gpa = studentProfile?.gpa ?? 0;
  const attendance = attendanceRate || studentProfile?.attendance || 0;

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [
          gradesData,
          eventsData,
          announcementsData,
          financeData,
          attendanceData,
          studentData,
        ] = await Promise.all([
          api.getGrades(user.id),
          api.getEvents(),
          api.getAnnouncements(),
          api.getFinance(user.id),
          api.getAttendance(user.id),
          api.getStudent?.(user.id) ?? Promise.resolve(null),
        ]);

        setGrades(gradesData.grades || []);
        setEvents(Array.isArray(eventsData) ? eventsData : eventsData?.events || []);
        setAnnouncements(
          Array.isArray(announcementsData)
            ? announcementsData
            : announcementsData?.announcements || []
        );
        setFinance(financeData.finance);
        setAttendanceRate(calculateAttendanceStats(attendanceData.attendance || []).rate);
        setStudentProfile(studentData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  const upcomingEvents = events.slice(0, 3);
  const recentGrades = grades.slice(0, 3);
  const latestAnnouncements = announcements.slice(0, 2);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1>Student Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's your academic overview.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Current GPA</CardTitle>
              <GraduationCap className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{gpa.toFixed(2)}</div>
              <p className="text-xs text-gray-600 mt-1">
                <TrendingUp className="inline size-3 text-green-600" /> +0.2 from last semester
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Attendance Rate</CardTitle>
              <CheckCircle className="size-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{attendance}%</div>
              <Progress value={attendance} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Upcoming Events</CardTitle>
              <Calendar className="size-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{events.length}</div>
              <p className="text-xs text-gray-600 mt-1">Next: {events[0]?.title || 'None'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Outstanding Balance</CardTitle>
              <DollarSign className="size-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">${finance?.due?.toLocaleString() || '0'}</div>
              <p className="text-xs text-gray-600 mt-1">Due by Dec 15, 2025</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Grades */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Grades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentGrades.map((grade) => (
                  <div key={grade.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="truncate">{grade.courseName}</p>
                      <p className="text-sm text-gray-600">{grade.examType}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={grade.score >= 90 ? 'default' : grade.score >= 80 ? 'secondary' : 'outline'}>
                        {grade.score}/{grade.maxScore}
                      </Badge>
                      <p className="text-xs text-gray-600 mt-1">{grade.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center justify-center bg-blue-100 rounded-lg p-3 min-w-16">
                      <div className="text-blue-600">{new Date(event.date).getDate()}</div>
                      <div className="text-xs text-blue-600">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="truncate">{event.title}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock className="size-3" />
                        {event.time} • {event.location}
                      </p>
                    </div>
                    <Badge variant={
                      event.type === 'exam' ? 'destructive' :
                      event.type === 'assignment' ? 'default' :
                      'secondary'
                    }>
                      {event.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Announcements */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {latestAnnouncements.map((announcement) => (
                <div key={announcement.id} className="flex gap-4 p-4 border rounded-lg">
                  <AlertCircle className={`size-5 flex-shrink-0 ${
                    announcement.priority === 'high' ? 'text-red-600' :
                    announcement.priority === 'medium' ? 'text-orange-600' :
                    'text-blue-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p>{announcement.title}</p>
                      <Badge variant={
                        announcement.priority === 'high' ? 'destructive' :
                        announcement.priority === 'medium' ? 'default' :
                        'secondary'
                      }>
                        {announcement.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{announcement.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {announcement.author} • {announcement.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
