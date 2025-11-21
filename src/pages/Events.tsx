import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import * as api from '../lib/api';
import { Calendar, Clock, MapPin } from 'lucide-react';

export function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.getEvents();
        const eventsData = Array.isArray(response) ? response : response?.events ?? [];
        setEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
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
        <div>
          <h1>Events & Calendar</h1>
          <p className="text-gray-600">Stay updated with upcoming events and important dates.</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    <div className="flex flex-col items-center justify-center bg-blue-100 rounded-lg p-4 min-w-20">
                      <div className="text-2xl text-blue-600">{new Date(event.date).getDate()}</div>
                      <div className="text-sm text-blue-600">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-xs text-blue-600">
                        {new Date(event.date).getFullYear()}
                      </div>
                    </div>
                    <div className="flex-1">
                      <CardTitle>{event.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                    </div>
                  </div>
                  <Badge variant={
                    event.type === 'exam' ? 'destructive' :
                    event.type === 'assignment' ? 'default' :
                    event.type === 'holiday' ? 'secondary' :
                    'outline'
                  }>
                    {event.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    <span>{new Date(event.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4" />
                    <span>{event.location}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
