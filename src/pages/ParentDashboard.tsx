import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../lib/authContext';
import * as api from '../lib/api';
import { calculateAttendanceStats } from '../lib/attendanceUtils';
import { GraduationCap, CheckCircle, DollarSign, TrendingUp, Users } from 'lucide-react';
import type { Announcement, Finance, Grade, Parent, Student } from '../types';

export function ParentDashboard() {
  const { user } = useAuth();
  const [childIds, setChildIds] = useState<string[]>([]);
  const [children, setChildren] = useState<Student[]>([]);
  const [attendanceRates, setAttendanceRates] = useState<Map<string, number>>(new Map());
  const [childFinances, setChildFinances] = useState<Finance[]>([]);
  const [recentGrades, setRecentGrades] = useState<Grade[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveChildLinks = async () => {
      if (!user || user.role !== 'parent') {
        setChildIds([]);
        return;
      }
      const inlineChildren = (user as Parent)?.children;
      if (inlineChildren && inlineChildren.length) {
        setChildIds(inlineChildren);
        return;
      }
      try {
        const parentRecord = await api.getParent(user.id);
        setChildIds(parentRecord?.children ?? []);
      } catch (error) {
        console.error('Failed to load parent record', error);
        setChildIds([]);
      }
    };
    resolveChildLinks();
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const announcementsPromise = api.getAnnouncements();

        if (!childIds.length) {
          const announcementsData = await announcementsPromise;
          setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
          setChildren([]);
          setAttendanceRates(new Map());
          setChildFinances([]);
          setRecentGrades([]);
          return;
        }

        const [studentsData, announcementsData, financeData, attendanceLists, gradeLists] =
          await Promise.all([
            api.getStudentsByIds(childIds),
            announcementsPromise,
            Promise.all(childIds.map(id => api.getFinanceByStudent(id))),
            Promise.all(childIds.map(id => api.getAttendanceByStudent(id))),
            Promise.all(childIds.map(id => api.getGradesByStudent(id))),
          ]);

        setChildren(studentsData ?? []);
        setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
        setChildFinances(financeData.filter(Boolean) as Finance[]);

        const rateMap = new Map<string, number>();
        childIds.forEach((id, index) => {
          const stats = calculateAttendanceStats(attendanceLists[index] ?? []);
          rateMap.set(id, stats.rate);
        });
        setAttendanceRates(rateMap);

        const flattenedGrades = gradeLists.flat();
        flattenedGrades.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setRecentGrades(flattenedGrades.slice(0, 4));
      } catch (error) {
        console.error('Failed to load parent dashboard data', error);
        setChildren([]);
        setAttendanceRates(new Map());
        setChildFinances([]);
        setAnnouncements([]);
        setRecentGrades([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [childIds]);

  const averageGpa = children.length
    ? children.reduce((sum, child) => sum + (child.gpa ?? 0), 0) / children.length
    : 0;

  const averageAttendance = attendanceRates.size
    ? Array.from(attendanceRates.values()).reduce((sum, rate) => sum + rate, 0) /
      attendanceRates.size
    : 0;

  const outstandingBalance = childFinances.reduce((sum, fin) => sum + fin.due, 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading parent dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1>Parent Dashboard</h1>
          <p className="text-gray-600">Track all of your children's progress in one place.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Children Linked</CardTitle>
              <Users className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{children.length}</div>
              <p className="text-xs text-gray-600 mt-1">Connections to your account</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Average GPA</CardTitle>
              <GraduationCap className="size-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{averageGpa.toFixed(2)}</div>
              <p className="text-xs text-gray-600 mt-1">Across all children</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Average Attendance</CardTitle>
              <CheckCircle className="size-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{averageAttendance.toFixed(0)}%</div>
              <Progress value={averageAttendance} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Outstanding Balance</CardTitle>
              <DollarSign className="size-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">${outstandingBalance.toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-1">Combined for all children</p>
            </CardContent>
          </Card>
        </div>

        {/* Children Overview */}
        {children.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">No children are linked to your account.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {children.map(child => {
              const attendanceRate =
                attendanceRates.get(child.id) ?? child.attendance ?? 0;
              return (
                <Card key={child.id}>
                  <CardHeader>
                    <CardTitle>{child.name}</CardTitle>
                    <p className="text-sm text-gray-600">{child.gradeLevel}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <GraduationCap className="size-4 text-blue-600" />
                        <span className="text-sm text-gray-600">GPA</span>
                      </div>
                      <p className="text-2xl">{child.gpa.toFixed(2)}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="size-4 text-green-600" />
                        <span className="text-sm text-gray-600">Attendance</span>
                      </div>
                      <p className="text-2xl">{attendanceRate}%</p>
                      <Progress value={attendanceRate} className="mt-2" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <TrendingUp className="size-4 text-green-600" />
                      <span>Improving performance</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {recentGrades.length === 0 ? (
                <p className="text-gray-600 text-center py-6">No grades available yet.</p>
              ) : (
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
              )}
            </CardContent>
          </Card>

          {/* Finance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Finance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {childFinances.length === 0 ? (
                <p className="text-gray-600 text-center py-6">No finance data for your children.</p>
              ) : (
                childFinances.map((fin) => {
                  const student = children.find((child) => child.id === fin.studentId);
                  return (
                    <div key={fin.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <p>{student?.name || fin.studentId}</p>
                        <Badge variant={fin.due > 0 ? 'destructive' : 'default'}>
                          {fin.due > 0 ? 'Due' : 'Paid'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-2 space-y-1">
                        <div className="flex justify-between">
                          <span>Total Fee</span>
                          <span>${fin.totalFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Scholarship</span>
                          <span className="text-green-600">-${fin.scholarship.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Paid</span>
                          <span className="text-green-600">${fin.paid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Balance</span>
                          <span className="text-red-600">${fin.due.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Announcements */}
        <Card>
          <CardHeader>
            <CardTitle>School Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
