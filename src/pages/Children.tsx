import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../lib/authContext';
import * as api from '../lib/api';
import { AttendanceRecord, Parent, Student } from '../types';
import { GraduationCap, Mail, Phone, MapPin, TrendingUp } from 'lucide-react';
import { calculateAttendanceStats } from '../lib/attendanceUtils';

export function Children() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [childIds, setChildIds] = useState<string[]>([]);
  const [attendanceByStudent, setAttendanceByStudent] = useState<
    Record<string, AttendanceRecord[]>
  >({});
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
    const loadChildren = async () => {
      try {
        setLoading(true);
        if (!childIds.length) {
          setChildren([]);
          setAttendanceByStudent({});
          return;
        }
        const [studentsData, attendanceLists] = await Promise.all([
          api.getStudentsByIds(childIds),
          Promise.all(childIds.map(id => api.getAttendanceByStudent(id))),
        ]);
        setChildren(studentsData ?? []);
        const map: Record<string, AttendanceRecord[]> = {};
        childIds.forEach((id, idx) => {
          map[id] = attendanceLists[idx] ?? [];
        });
        setAttendanceByStudent(map);
      } catch (error) {
        console.error('Failed to load children data', error);
        setChildren([]);
        setAttendanceByStudent({});
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, [childIds]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading children...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1>My Children</h1>
          <p className="text-gray-600">View and manage your children's information.</p>
        </div>

        {children.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <GraduationCap className="size-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-gray-600 mb-2">No children found</h3>
              <p className="text-sm text-gray-500">Contact the administration to link your child's account.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {children.map((child) => {
              const stats = calculateAttendanceStats(
                attendanceByStudent[child.id] ?? []
              );
              const attendanceRate = stats.rate || child.attendance;
              return (
              <Card key={child.id} className="overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b">
                  <div className="flex items-start gap-4">
                    <Avatar className="size-20">
                      <AvatarImage src={child.avatar} />
                      <AvatarFallback>{child.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="mb-1">{child.name}</h2>
                      <Badge>{child.gradeLevel}</Badge>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Academic Performance */}
                  <div>
                    <h3 className="mb-4">Academic Performance</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <GraduationCap className="size-4 text-blue-600" />
                          <span className="text-sm text-gray-600">GPA</span>
                        </div>
                        <div className="text-2xl">{child.gpa.toFixed(2)}</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-600">Attendance</span>
                        </div>
                        <div className="text-2xl">{attendanceRate}%</div>
                        <Progress value={attendanceRate} className="mt-2" />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="size-4 text-gray-400" />
                        <span className="text-gray-600">{child.email}</span>
                      </div>
                      {child.phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="size-4 text-gray-400" />
                          <span className="text-gray-600">{child.phone}</span>
                        </div>
                      )}
                      {child.address && (
                        <div className="flex items-center gap-3 text-sm">
                          <MapPin className="size-4 text-gray-400" />
                          <span className="text-gray-600">{child.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
