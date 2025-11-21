import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getCourses, getGradesByCourseIds } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { Plus, FileText, Calendar, Award } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Course, Grade } from '../types';

interface Exam {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  type: 'exam' | 'assignment' | 'quiz' | 'project';
  date: string;
  totalPoints: number;
  description: string;
  status: 'upcoming' | 'active' | 'completed';
}

export function TeacherExams() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    type: 'exam' as Exam['type'],
    date: '',
    totalPoints: '',
    description: '',
  });

  const teacherCourses = useMemo(
    () => courses.filter((course) => course.teacherId === user?.id),
    [courses, user?.id]
  );

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const coursesResponse = await getCourses();
        const allCourses = Array.isArray(coursesResponse)
          ? coursesResponse
          : coursesResponse?.courses ?? [];
        const teacherSpecific = allCourses.filter((course: Course) => course.teacherId === user.id);
        setCourses(teacherSpecific);

        if (teacherSpecific.length === 0) {
          setExams([]);
          return;
        }

        const grades = await getGradesByCourseIds(teacherSpecific.map((course) => course.id));
        const mapType = (value?: string): Exam['type'] => {
          const normalized = value?.toLowerCase();
          switch (normalized) {
            case 'assignment':
              return 'assignment';
            case 'quiz':
              return 'quiz';
            case 'project':
              return 'project';
            default:
              return 'exam';
          }
        };

        const mapped = ((grades as Grade[]) ?? []).map((grade) => {
          const examDate = grade.date ? new Date(grade.date) : new Date();
          const today = new Date();
          let status: Exam['status'] = 'completed';
          if (examDate.toDateString() === today.toDateString()) {
            status = 'active';
          } else if (examDate > today) {
            status = 'upcoming';
          }
          return {
            id: grade.id,
            courseId: grade.courseId,
            courseName: grade.courseName,
            title: grade.examType || 'Assessment',
            type: mapType(grade.examType),
            date: grade.date,
            totalPoints: grade.maxScore ?? 100,
            description: 'Grade recorded in Supabase',
            status,
          } satisfies Exam;
        });
        setExams(mapped);
      } catch (error) {
        console.error('Failed to load teacher assessments:', error);
        toast.error('Unable to load exams for your courses.');
        setExams([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedCourse = teacherCourses.find(c => c.id === formData.courseId);
    if (!selectedCourse) return;

    const newExam: Exam = {
      id: `exam${Date.now()}`,
      courseId: formData.courseId,
      courseName: selectedCourse.name,
      title: formData.title,
      type: formData.type,
      date: formData.date,
      totalPoints: parseInt(formData.totalPoints),
      description: formData.description,
      status: new Date(formData.date) > new Date() ? 'upcoming' : 'active',
    };

    setExams([...exams, newExam]);
    toast.info('Assessment added locally. Connect backend endpoint to persist definitions.');
    setDialogOpen(false);
    setFormData({
      courseId: '',
      title: '',
      type: 'exam',
      date: '',
      totalPoints: '',
      description: '',
    });
  };

  const upcomingExams = exams.filter(e => e.status === 'upcoming');
  const activeExams = exams.filter(e => e.status === 'active');
  const completedExams = exams.filter(e => e.status === 'completed');

  const getTypeColor = (type: Exam['type']) => {
    switch (type) {
      case 'exam': return 'bg-red-100 text-red-800';
      case 'assignment': return 'bg-blue-100 text-blue-800';
      case 'quiz': return 'bg-green-100 text-green-800';
      case 'project': return 'bg-purple-100 text-purple-800';
    }
  };

  const ExamCard = ({ exam }: { exam: Exam }) => (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="mb-1">{exam.title}</h3>
          <p className="text-sm text-gray-600">{exam.courseName}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(exam.type)}`}>
          {exam.type}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{exam.description}</p>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="size-4" />
            <span>{new Date(exam.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Award className="size-4" />
            <span>{exam.totalPoints} points</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading assessments...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1>Exams & Assignments</h1>
            <p className="text-gray-600">Create and manage assessments for your courses.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Create Assessment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Assessment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="course">Course</Label>
                    <Select 
                      value={formData.courseId} 
                      onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherCourses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: Exam['type']) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exam">Exam</SelectItem>
                        <SelectItem value="assignment">Assignment</SelectItem>
                        <SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Midterm Examination"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Due Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="points">Total Points</Label>
                    <Input
                      id="points"
                      type="number"
                      value={formData.totalPoints}
                      onChange={(e) => setFormData({ ...formData, totalPoints: e.target.value })}
                      placeholder="100"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the assessment..."
                    rows={4}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Assessment</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Upcoming</CardTitle>
              <FileText className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{upcomingExams.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Active</CardTitle>
              <FileText className="size-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{activeExams.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Completed</CardTitle>
              <FileText className="size-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{completedExams.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Exams List */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingExams.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-600">No upcoming assessments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingExams.map(exam => <ExamCard key={exam.id} exam={exam} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {activeExams.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-600">No active assessments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeExams.map(exam => <ExamCard key={exam.id} exam={exam} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedExams.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-600">No completed assessments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedExams.map(exam => <ExamCard key={exam.id} exam={exam} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
