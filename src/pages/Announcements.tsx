import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import * as api from '../lib/api';
import { Bell, AlertCircle } from 'lucide-react';

export function Announcements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await api.getAnnouncements();
        const announcementsData = Array.isArray(response)
          ? response
          : response?.announcements ?? [];
        setAnnouncements(announcementsData);
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1>Announcements</h1>
            <p className="text-gray-600">Important updates and notifications.</p>
          </div>
          <Bell className="size-6 text-blue-600" />
        </div>

        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <AlertCircle className={`size-6 flex-shrink-0 mt-1 ${
                    announcement.priority === 'high' ? 'text-red-600' :
                    announcement.priority === 'medium' ? 'text-orange-600' :
                    'text-blue-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle>{announcement.title}</CardTitle>
                      <Badge variant={
                        announcement.priority === 'high' ? 'destructive' :
                        announcement.priority === 'medium' ? 'default' :
                        'secondary'
                      }>
                        {announcement.priority} priority
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-14">
                <p className="text-gray-600 mb-4">{announcement.content}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Posted by: {announcement.author}</span>
                  <span>•</span>
                  <span>{new Date(announcement.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
