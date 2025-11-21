import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Calendar,
  DollarSign,
  Bell,
  Users,
  Settings,
  LogOut,
  GraduationCap,
  FileText,
  Building,
  UserCog,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const roleNavItems = {
  student: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Courses', path: '/courses' },
    { icon: FileText, label: 'Results', path: '/results' },
    { icon: ClipboardList, label: 'Attendance', path: '/attendance' },
    { icon: DollarSign, label: 'Finance', path: '/finance' },
    { icon: Calendar, label: 'Events', path: '/events' },
    { icon: Bell, label: 'Announcements', path: '/announcements' },
  ],
  teacher: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Lessons', path: '/lessons' },
    { icon: FileText, label: 'Exams & Assignments', path: '/exams' },
    { icon: ClipboardList, label: 'Grades', path: '/grades' },
    { icon: ClipboardList, label: 'Attendance Manager', path: '/teacher-attendance' },
    { icon: Users, label: 'Students', path: '/students' },
    { icon: Bell, label: 'Announcements', path: '/announcements' },
  ],
  parent: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: GraduationCap, label: 'Children', path: '/children' },
    { icon: FileText, label: 'Performance', path: '/performance' },
    { icon: Calendar, label: 'Events', path: '/events' },
    { icon: Bell, label: 'Announcements', path: '/announcements' },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Building, label: 'Classes & Grades', path: '/classes' },
    /*{ icon: BookOpen, label: 'Courses', path: '/courses' },
    { icon: DollarSign, label: 'Finance', path: '/finance' },*/
    { icon: FileText, label: 'Reports', path: '/reports' },
  ],
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = roleNavItems[user.role] || [];

  return (
    <div className="flex flex-col h-screen w-64 bg-white border-r">
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-8 text-blue-600" />
          <div>
            <h1 className="text-blue-600">HSU Portal</h1>
            <p className="text-sm text-gray-500">{user.role.charAt(0).toUpperCase() + user.role.slice(1)} Portal</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate">{user.name}</p>
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  className="w-full justify-start"
                >
                  <Icon className="mr-2 size-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
        {user?.role === 'admin' && (
          <>
            <Link to="/admin/courses">
              <Button variant="ghost" className="w-full justify-start">
                <BookOpen className="mr-2 size-4" /> Courses
              </Button>
            </Link>
            <Link to="/admin/finance">
              <Button variant="ghost" className="w-full justify-start">
                <DollarSign className="mr-2 size-4" /> Finance
              </Button>
            </Link>
          </>
        )}
        </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t space-y-1">
        {/* <Link to="/settings">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 size-4" />
            Settings
          </Button>
        </Link> */}
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={logout}
        >
          <LogOut className="mr-2 size-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
