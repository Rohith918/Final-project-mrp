import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../lib/authContext';
import { getLessons, createLesson, getCourses } from '../lib/api';
import { Lesson, Course } from '../types';
import { Calendar, Clock, MapPin, Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function TeacherLessons() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    date: '',
    time: '',
    room: '',
  });

  useEffect(() => {
    if (!user?.id) {
      setLessons([]);
      return;
    }
    loadCourses();
    loadLessons(user.id);
  }, [user?.id]);

  const loadCourses = async () => {
    try {
      const data = await getCourses();
      setCourses(Array.isArray(data) ? data : data?.courses ?? []);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const loadLessons = async (teacherId: string) => {
    try {
      setLoading(true);
      const { lessons: data } = await getLessons(teacherId);
      setLessons(data ?? []);
    } catch (error) {
      console.error('Error loading lessons:', error);
      toast.error('Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedCourse = courses.find(c => c.id === formData.courseId);
    if (!selectedCourse) return;
    if (!user?.id) {
      toast.error('User context missing');
      return;
    }

    try {
      const { lesson: created } = await createLesson({
        courseId: formData.courseId,
        courseName: selectedCourse.name,
        title: formData.title,
        description: formData.description,
        date: formData.date,
        room: formData.room,
        teacherId: user.id,
      });
      setLessons([created, ...lessons]);
      toast.success('Lesson created successfully');

      setDialogOpen(false);
      setFormData({ courseId: '', title: '', description: '', date: '', time: '', room: '' });
    } catch (error) {
      console.error('Error creating lesson:', error);
      toast.error('Failed to create lesson');
    }
  };

  const teacherCourses = courses.filter(c => c.teacherId === user?.id);

  const upcomingLessons = lessons.filter(l => new Date(l.date) >= new Date());
  const pastLessons = lessons.filter(l => new Date(l.date) < new Date());

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1>My Lessons</h1>
            <p className="text-gray-600">Manage your class schedule and lessons.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Create Lesson
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Lesson</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="course">Course</Label>
                  <Select
                    value={formData.courseId}
                    onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                    disabled={teacherCourses.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={teacherCourses.length ? 'Select a course' : 'No courses available'} />
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
                  <Label htmlFor="title">Lesson Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Introduction to Arrays"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      placeholder="10:00 AM"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="room">Room</Label>
                    <Input
                      id="room"
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      placeholder="CS-101"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief overview or resources for the lesson"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!formData.courseId}>
                    Create Lesson
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">Loading lessons...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Lessons</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingLessons.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="size-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No upcoming lessons</p>
                    <p className="text-sm text-gray-500">Create a new lesson to get started.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingLessons.map((lesson) => (
                      <div key={lesson.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="mb-1">{lesson.title}</h3>
                            <p className="text-sm text-gray-600">{lesson.courseName}</p>
                          </div>
                          <Badge>Upcoming</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="size-4" />
                            <span>{new Date(lesson.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="size-4" />
                            <span>{lesson.time}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="size-4" />
                            <span>{lesson.room}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Past Lessons</CardTitle>
              </CardHeader>
              <CardContent>
                {pastLessons.length === 0 ? (
                  <p className="text-gray-600 text-center py-6">No past lessons recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {pastLessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-start justify-between border rounded-lg p-4">
                        <div>
                          <h3 className="mb-1">{lesson.title}</h3>
                          <p className="text-sm text-gray-600">{lesson.courseName}</p>
                          <p className="text-sm text-gray-500 mt-1">{lesson.description}</p>
                        </div>
                        <div className="text-sm text-right text-gray-600">
                          <div className="flex items-center gap-1 justify-end">
                            <Calendar className="size-4" />
                            <span>{new Date(lesson.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1 justify-end">
                            <Clock className="size-4" />
                            <span>{lesson.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
