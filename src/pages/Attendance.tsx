import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../lib/authContext';
import { getAttendance } from '../lib/api';
import { AttendanceRecord } from '../types';
import { Calendar, CheckCircle, XCircle, Clock, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { calculateAttendanceStats, normalizeAttendanceStatus } from '../lib/attendanceUtils';

export function Attendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceRecord['status']>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const courses = useMemo(() => {
    const names = new Set(
      records
        .map((record) => record.courseName)
        .filter((name): name is string => Boolean(name))
    );
    return Array.from(names).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (courseFilter !== 'all' && record.courseName !== courseFilter) return false;
      if (statusFilter !== 'all') {
        const normalized = normalizeAttendanceStatus(record.status);
        if (normalized !== statusFilter) return false;
      }
      if (startDate && new Date(record.date) < new Date(startDate)) return false;
      if (endDate && new Date(record.date) > new Date(endDate)) return false;
      return true;
    });
  }, [records, courseFilter, statusFilter, startDate, endDate]);

  const stats = useMemo(() => calculateAttendanceStats(filteredRecords), [filteredRecords]);

  const loadAttendance = async (studentId: string) => {
    try {
      setLoading(true);
      const { attendance } = await getAttendance(studentId);
      setRecords(attendance || []);
    } catch (error) {
      console.error('Failed to load attendance:', error);
      toast.error('Unable to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadAttendance(user.id);
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const handleRefresh = () => {
    if (user?.id) {
      loadAttendance(user.id);
    }
  };

  const resetFilters = () => {
    setCourseFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1>Attendance Tracker</h1>
            <p className="text-gray-600">View your attendance records and statistics.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={!user?.id || loading}
          >
            <RefreshCcw className="size-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Course</p>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course} value={course}>
                        {course}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as 'all' | AttendanceRecord['status'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">From</p>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">To</p>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={resetFilters} disabled={
                courseFilter === 'all' && statusFilter === 'all' && !startDate && !endDate
              }>
                Clear filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Attendance Rate</CardTitle>
              <Calendar className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.rate}%</div>
              <p className="text-xs text-gray-600 mt-1">Overall rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Present</CardTitle>
              <CheckCircle className="size-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-green-600">{stats.present}</div>
              <p className="text-xs text-gray-600 mt-1">Classes attended</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Late</CardTitle>
              <Clock className="size-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-orange-600">{stats.late}</div>
              <p className="text-xs text-gray-600 mt-1">Late arrivals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Absent</CardTitle>
              <XCircle className="size-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-red-600">{stats.absent}</div>
              <p className="text-xs text-gray-600 mt-1">Classes missed</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Records */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      Loading attendance...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      No attendance records match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => {
                    const normalizedStatus = normalizeAttendanceStatus(record.status);
                    const badgeVariant =
                      normalizedStatus === 'present'
                        ? 'default'
                        : normalizedStatus === 'late'
                        ? 'secondary'
                        : normalizedStatus === 'absent'
                        ? 'destructive'
                        : 'secondary';
                    const label = normalizedStatus
                      ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
                      : (record.status ?? 'Unknown');
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.courseName}</TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant}>
                            {normalizedStatus === 'present' && <CheckCircle className="size-3 mr-1" />}
                            {normalizedStatus === 'late' && <Clock className="size-3 mr-1" />}
                            {normalizedStatus === 'absent' && <XCircle className="size-3 mr-1" />}
                            {label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
