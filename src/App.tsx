import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/authContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentCourses } from './pages/StudentCourses';
import { StudentResults } from './pages/StudentResults';
import { StudentFinance } from './pages/StudentFinance';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { TeacherLessons } from './pages/TeacherLessons';
import { TeacherStudents } from './pages/TeacherStudents';
import { TeacherExams } from './pages/TeacherExams';
import { ParentDashboard } from './pages/ParentDashboard';
import { TeacherGrades } from './pages/TeacherGrades';
import { Children } from './pages/Children';
import { Performance } from './pages/Performance';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminFinance } from './pages/AdminFinance';
import { AdminCourses } from './pages/AdminCourses';
import { AdminUsers } from './pages/AdminUsers';
import { AdminClasses } from './pages/AdminClasses';
import { AdminReports } from './pages/AdminReports';
import { Attendance } from './pages/Attendance';
import { TeacherAttendance } from './pages/TeacherAttendance';
import { Events } from './pages/Events';
import { Announcements } from './pages/Announcements';
import { Settings } from './pages/Settings';
import { Toaster } from './components/ui/sonner';
import type { UserRole } from './types';

function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function DashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'parent':
      return <ParentDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <Navigate to="/login" />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute roles={['student']}>
                <StudentCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedRoute roles={['student']}>
                <StudentResults />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance"
            element={
              <ProtectedRoute roles={['student']}>
                <StudentFinance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute roles={['student']}>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <Events />
              </ProtectedRoute>
            }
          />
          <Route
            path="/announcements"
            element={
              <ProtectedRoute>
                <Announcements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          {/* Teacher Routes */}
          <Route
            path="/lessons"
            element={
              <ProtectedRoute roles={['teacher']}>
                <TeacherLessons />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute roles={['teacher']}>
                <TeacherStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exams"
            element={
              <ProtectedRoute roles={['teacher']}>
                <TeacherExams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher-attendance"
            element={
              <ProtectedRoute roles={['teacher']}>
                <TeacherAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grades"
            element={
              <ProtectedRoute roles={['teacher']}>
                <TeacherGrades />
              </ProtectedRoute>
            }
          />
          {/* Parent Routes */}
          <Route
            path="/children"
            element={
              <ProtectedRoute roles={['parent']}>
                <Children />
              </ProtectedRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedRoute roles={['parent']}>
                <Performance />
              </ProtectedRoute>
            }
          />
          {/* Admin Routes */}
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminClasses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminCourses />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
          {/* Catch-all route for any unmatched paths including preview_page.html */}
          <Route
            path="/admin/finance"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminFinance />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}
