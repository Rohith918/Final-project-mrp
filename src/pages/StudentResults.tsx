import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useAuth } from '../lib/authContext';
import * as api from '../lib/api';
import { TrendingUp, Award } from 'lucide-react';

export function StudentResults() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const { grades: data } = await api.getGrades(user.id);
        setGrades(data || []);
      } catch (error) {
        console.error('Failed to load grades', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const averageScore = useMemo(() => {
    if (!grades.length) return 0;
    const total = grades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 100, 0);
    return total / grades.length;
  }, [grades]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading results...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1>Results & Exams</h1>
          <p className="text-gray-600">View your grades and exam results.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Overall Average</CardTitle>
              <Award className="size-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{averageScore.toFixed(1)}%</div>
              <p className="text-xs text-gray-600 mt-1">
                <TrendingUp className="inline size-3 text-green-600" /> Excellent performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Assessments</CardTitle>
              <Award className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{grades.length}</div>
              <p className="text-xs text-gray-600 mt-1">Completed this semester</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Grade Distribution</CardTitle>
              <Award className="size-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">
                {averageScore >= 90 ? 'A' : averageScore >= 80 ? 'B' : averageScore >= 70 ? 'C' : averageScore >= 60 ? 'D' : 'F'}
              </div>
              <p className="text-xs text-gray-600 mt-1">Current grade average</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Assessment Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                  <TableHead className="text-right">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No assessments recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  grades.map((grade) => {
                    const percentage = (grade.score / grade.maxScore) * 100;
                    const letterGrade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F';

                    return (
                      <TableRow key={grade.id}>
                        <TableCell>{grade.courseName}</TableCell>
                        <TableCell>{grade.examType}</TableCell>
                        <TableCell>{grade.date}</TableCell>
                        <TableCell className="text-right">{grade.score}/{grade.maxScore}</TableCell>
                        <TableCell className="text-right">{percentage.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={
                            letterGrade === 'A' ? 'default' :
                            letterGrade === 'B' ? 'secondary' :
                            'outline'
                          }>
                            {letterGrade}
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
