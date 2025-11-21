import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../lib/authContext';
import * as api from '../lib/api';
import { Student, Grade, AttendanceRecord, Parent } from '../types';
import { TrendingUp, Award } from 'lucide-react';
import { calculateAttendanceStats } from '../lib/attendanceUtils';

export function Performance() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [childGrades, setChildGrades] = useState<Grade[]>([]);
  const [childAttendance, setChildAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    const loadChildren = async () => {
      if (!user || user.role !== 'parent') {
        setChildren([]);
        setSelectedChild('');
        setLoadingChildren(false);
        return;
      }

      setLoadingChildren(true);
      try {
        let childIds = (user as Parent)?.children ?? [];
        if (!childIds.length) {
          const parentRecord = await api.getParent(user.id);
          childIds = parentRecord?.children ?? [];
        }

        if (!childIds.length) {
          setChildren([]);
          setSelectedChild('');
          return;
        }

        const students = await api.getStudentsByIds(childIds);
        setChildren(students ?? []);
        setSelectedChild((current) =>
          current && childIds.includes(current) ? current : students[0]?.id ?? ''
        );
      } catch (error) {
        console.error('Failed to load children for performance view', error);
        setChildren([]);
        setSelectedChild('');
      } finally {
        setLoadingChildren(false);
      }
    };

    loadChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChild) {
      const loadRecords = async () => {
        try {
          setLoadingRecords(true);
          const [grades, attendance] = await Promise.all([
            api.getGradesByStudent(selectedChild),
            api.getAttendanceByStudent(selectedChild),
          ]);
          setChildGrades(grades ?? []);
          setChildAttendance(attendance ?? []);
        } catch (error) {
          console.error('Failed to load performance records', error);
          setChildGrades([]);
          setChildAttendance([]);
        } finally {
          setLoadingRecords(false);
        }
      };
      loadRecords();
    } else {
      setChildGrades([]);
      setChildAttendance([]);
    }
  }, [selectedChild]);

  const calculateAverageGrade = () => {
    if (childGrades.length === 0) return 0;
    const total = childGrades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 100, 0);
    return (total / childGrades.length).toFixed(1);
  };

  const attendanceStats = calculateAttendanceStats(childAttendance);

  const selectedChildData = children.find(c => c.id === selectedChild);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1>Academic Performance</h1>
          <p className="text-gray-600">Track your child's academic progress and achievements.</p>
        </div>

        {loadingChildren ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">Loading children...</p>
            </CardContent>
          </Card>
        ) : children.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">No children found.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Child Selector */}
            {children.length > 1 && (
              <div className="flex gap-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChild(child.id)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      selectedChild === child.id 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            )}

            {selectedChildData && (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm">Current GPA</CardTitle>
                      <Award className="size-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl">{selectedChildData.gpa.toFixed(2)}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm">Average Grade</CardTitle>
                      <TrendingUp className="size-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl">{calculateAverageGrade()}%</div>
                      <p className="text-xs text-gray-600 mt-1">Based on {childGrades.length} assessments</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm">Attendance Rate</CardTitle>
                      <TrendingUp className="size-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl">{attendanceStats.rate}%</div>
                      <p className="text-xs text-gray-600 mt-1">
                        {attendanceStats.present} present, {attendanceStats.late} late, {attendanceStats.absent} absent
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Tabs */}
                <Tabs defaultValue="grades" className="w-full">
                  <TabsList>
                    <TabsTrigger value="grades">Grades & Assessments</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="grades" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Grades</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loadingRecords ? (
                          <p className="text-gray-600 text-center py-8">Loading grades...</p>
                        ) : childGrades.length === 0 ? (
                          <p className="text-gray-600 text-center py-8">No grades available yet.</p>
                        ) : (
                          <div className="space-y-4">
                            {childGrades.map((grade) => (
                              <div key={grade.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                  <p>{grade.courseName}</p>
                                  <p className="text-sm text-gray-600">{grade.examType}</p>
                                </div>
                                <div className="text-right">
                                  <Badge 
                                    variant={
                                      (grade.score / grade.maxScore * 100) >= 90 ? 'default' : 
                                      (grade.score / grade.maxScore * 100) >= 80 ? 'secondary' : 
                                      'outline'
                                    }
                                  >
                                    {grade.score}/{grade.maxScore} ({((grade.score / grade.maxScore) * 100).toFixed(0)}%)
                                  </Badge>
                                  <p className="text-xs text-gray-600 mt-1">{grade.date}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="attendance" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Attendance Records</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loadingRecords ? (
                          <p className="text-gray-600 text-center py-8">Loading attendance...</p>
                        ) : childAttendance.length === 0 ? (
                          <p className="text-gray-600 text-center py-8">No attendance records available yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {childAttendance.map((record) => (
                              <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                  <p>{record.courseName}</p>
                                  <p className="text-sm text-gray-600">{record.date}</p>
                                </div>
                                <Badge 
                                  variant={
                                    record.status === 'present' ? 'default' :
                                    record.status === 'late' ? 'secondary' :
                                    'destructive'
                                  }
                                >
                                  {record.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
