import { useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { addUser, store } from '../lib/store';
import { User, UserRole } from '../types';
import { Search, Plus, Mail, Phone, UserPlus, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student' as UserRole,
    phone: '',
    address: '',
  });

  const allUsers = useMemo<User[]>(() => {
    const baseUsers = Object.values(store.users);
    const unattachedStudents = store.students.filter(student => !store.users[student.id]);
    return [...baseUsers, ...unattachedStudents];
  }, []);

  const [users, setUsers] = useState<User[]>(allUsers);

  const filteredUsers = searchQuery
    ? users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const usersByRole = {
    student: filteredUsers.filter(u => u.role === 'student'),
    teacher: filteredUsers.filter(u => u.role === 'teacher'),
    parent: filteredUsers.filter(u => u.role === 'parent'),
    admin: filteredUsers.filter(u => u.role === 'admin'),
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      addUser(formData);
      setUsers([
        ...Object.values(store.users),
        ...store.students.filter(student => !store.users[student.id]),
      ]);
      toast.success('User created successfully');
      setDialogOpen(false);
      setFormData({
        name: '',
        email: '',
        role: 'student',
        phone: '',
        address: '',
      });
    } catch (error:any) {
      toast.error(error?.message || 'Failed to create user');
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'student': return 'default';
      case 'teacher': return 'secondary';
      case 'parent': return 'outline';
      case 'admin': return 'destructive';
    }
  };

  const [viewUser, setViewUser] = useState<User | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const openViewDialog = (user: User) => {
    setViewUser(user);
    setViewDialogOpen(true);
  };

  const UserCard = ({ user }: { user: User }) => (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
      <Avatar className="size-12">
        <AvatarImage src={user.avatar} />
        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="truncate">{user.name}</p>
          <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
        </div>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Mail className="size-3" />
            <span className="truncate">{user.email}</span>
          </div>
          {user.phone && (
            <div className="flex items-center gap-2">
              <Phone className="size-3" />
              <span>{user.phone}</span>
            </div>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => openViewDialog(user)}>View</Button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1>User Management</h1>
            <p className="text-gray-600">Manage all users in the system.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="555-0123"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address (Optional)</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create User</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Students</CardTitle>
              <UsersIcon className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{usersByRole.student.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Teachers</CardTitle>
              <UsersIcon className="size-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{usersByRole.teacher.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Parents</CardTitle>
              <UsersIcon className="size-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{usersByRole.parent.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Admins</CardTitle>
              <UsersIcon className="size-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{usersByRole.admin.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Users ({allUsers.length})</TabsTrigger>
            <TabsTrigger value="student">Students ({usersByRole.student.length})</TabsTrigger>
            <TabsTrigger value="teacher">Teachers ({usersByRole.teacher.length})</TabsTrigger>
            <TabsTrigger value="parent">Parents ({usersByRole.parent.length})</TabsTrigger>
            <TabsTrigger value="admin">Admins ({usersByRole.admin.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {filteredUsers.map(user => <UserCard key={user.id} user={user} />)}
          </TabsContent>

          <TabsContent value="student" className="space-y-3">
            {usersByRole.student.map(user => <UserCard key={user.id} user={user} />)}
          </TabsContent>

          <TabsContent value="teacher" className="space-y-3">
            {usersByRole.teacher.map(user => <UserCard key={user.id} user={user} />)}
          </TabsContent>

          <TabsContent value="parent" className="space-y-3">
            {usersByRole.parent.map(user => <UserCard key={user.id} user={user} />)}
          </TabsContent>

          <TabsContent value="admin" className="space-y-3">
            {usersByRole.admin.map(user => <UserCard key={user.id} user={user} />)}
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-14">
                  <AvatarImage src={viewUser.avatar} />
                  <AvatarFallback>{viewUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h2>{viewUser.name}</h2>
                    <Badge variant={getRoleBadgeVariant(viewUser.role)}>{viewUser.role}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{viewUser.email}</p>
                </div>
              </div>
              {viewUser.phone && (
                <p className="text-sm"><strong>Phone:</strong> {viewUser.phone}</p>
              )}
              {viewUser.address && (
                <p className="text-sm"><strong>Address:</strong> {viewUser.address}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
