
import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { store, addCourse, updateCourse } from '../lib/store';
import { BookOpen, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Course } from '../types';

export function AdminCourses() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([...store.courses]);
  const [formData, setFormData] = useState<Partial<Course>>({ name: '', code: '', teacherName: '', schedule: '', credits: 3 });
  const [deptFilter, setDeptFilter] = useState<'all' | 'cs' | 'is' | 'da' | 'other'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 9;

  const openCreate = () => { setEditing(null); setFormData({ name: '', code: '', teacherName: '', schedule: '', credits: 3 }); setDialogOpen(true); };
  const openEdit = (c: Course) => { setEditing(c); setFormData(c); setDialogOpen(true); };

  const save = () => {
    try {
      if (editing) {
        const updated = updateCourse(editing.id, formData);
        setCourses(courses.map(c => c.id === updated.id ? updated : c));
        toast.success('Course updated');
      } else {
        const created = addCourse(formData as any);
        setCourses([created, ...courses]);
        toast.success('Course created');
      }
      setDialogOpen(false);
    } catch (e:any) { toast.error(e?.message || 'Failed'); }
  };

  const filteredCourses = courses.filter((course) => {
    if (deptFilter === 'all') return true;
    const prefix = course.code?.slice(0, 2).toLowerCase() || '';
    if (deptFilter === 'cs') return prefix === 'cs';
    if (deptFilter === 'is') return prefix === 'is';
    if (deptFilter === 'da') return prefix === 'da';
    return prefix !== 'cs' && prefix !== 'is' && prefix !== 'da';
  });

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filteredCourses.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2"><BookOpen className="size-5" /> Courses</h1>
        </div>

        <div className="flex justify-end">
          <Select value={deptFilter} onValueChange={(val) => { setDeptFilter(val as any); setPage(0); }}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              <SelectItem value="cs">Computer Science (CS)</SelectItem>
              <SelectItem value="is">Information Systems (IS)</SelectItem>
              <SelectItem value="da">Data Analysis (DA)</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageRows.map(c => {
            const studentCount = c.studentIds?.length ?? 0;
            return (
              <Card key={c.id} className="h-full border border-slate-100 shadow-sm">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Course</p>
                      <p className="text-lg font-semibold text-slate-900">{c.name}</p>
                      <p className="text-sm text-slate-500">{c.code} • {c.credits} credits</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                      <Pencil className="mr-2 size-4" /> Edit
                    </Button>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Instructor</span>
                      <span className="font-medium text-slate-800">{c.teacherName || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Schedule</span>
                      <span className="font-medium text-slate-800">{c.schedule || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Students</span>
                      <span className="font-medium text-blue-700">{studentCount.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 text-sm text-gray-600 border rounded-md p-4 md:flex-row md:items-center md:justify-between">
          <p>
            Showing {filteredCourses.length === 0 ? 0 : currentPage * pageSize + 1}-
            {Math.min((currentPage + 1) * pageSize, filteredCourses.length)} of {filteredCourses.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(0, prev - 1))} disabled={currentPage === 0}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))} disabled={currentPage >= totalPages - 1}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AdminCourses;
