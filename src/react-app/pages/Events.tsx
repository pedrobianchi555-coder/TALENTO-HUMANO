import { useAuth } from "@getmocha/users-service/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2, Calendar, Plus, MapPin, Clock, Users, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import EventFormModal from "@/react-app/components/EventFormModal";
import type { CorporateEvent, EventRsvp, EnhancedUser } from "@/shared/types";
import { formatDateShort } from "@/shared/date-utils";

interface EventWithRsvp extends CorporateEvent {
  rsvp_count?: number;
  user_rsvp?: EventRsvp | null;
}

export default function Events() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithRsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventWithRsvp | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchUserAndEvents = async () => {
      if (!authUser) return;

      try {
        // Get user profile first
        const userResponse = await fetch("/api/users/me");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        }

        // Get events
        const eventsResponse = await fetch("/api/events");
        if (eventsResponse.ok) {
          const data = await eventsResponse.json();
          setEvents(data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndEvents();
  }, [authUser]);

  const handleRsvp = async (eventId: number, status: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Update the events list
        setEvents(events.map(event => 
          event.id === eventId 
            ? { ...event, user_rsvp: { ...event.user_rsvp, status } as EventRsvp }
            : event
        ));
        
        if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent({
            ...selectedEvent,
            user_rsvp: { ...selectedEvent.user_rsvp, status } as EventRsvp
          });
        }
      }
    } catch (error) {
      console.error("Error updating RSVP:", error);
    }
  };

  const handleEventCreated = async () => {
    // Reload events after creating a new one
    try {
      const eventsResponse = await fetch("/api/events");
      if (eventsResponse.ok) {
        const data = await eventsResponse.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando eventos...</p>
      </div>
    );
  }

  const isHR = user?.profile?.role === 'HR';

  const getRsvpColor = (status: string) => {
    switch (status) {
      case 'ATTENDING':
        return 'bg-green-100 text-green-800';
      case 'NOT_ATTENDING':
        return 'bg-red-100 text-red-800';
      case 'MAYBE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRsvpIcon = (status: string) => {
    switch (status) {
      case 'ATTENDING':
        return <CheckCircle className="w-4 h-4" />;
      case 'NOT_ATTENDING':
        return <XCircle className="w-4 h-4" />;
      case 'MAYBE':
        return <HelpCircle className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getRsvpText = (status: string) => {
    switch (status) {
      case 'ATTENDING':
        return 'Asistirá';
      case 'NOT_ATTENDING':
        return 'No asistirá';
      case 'MAYBE':
        return 'Tal vez';
      default:
        return 'Sin respuesta';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Capacitación': 'bg-blue-100 text-blue-800',
      'Social': 'bg-green-100 text-green-800',
      'Reunión': 'bg-purple-100 text-purple-800',
      'Evento Corporativo': 'bg-orange-100 text-orange-800',
      'Celebración': 'bg-pink-100 text-pink-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const upcomingEvents = events.filter(e => new Date(e.start_date) >= new Date());
  const pastEvents = events.filter(e => new Date(e.start_date) < new Date());
  const myAttendingEvents = events.filter(e => e.user_rsvp?.status === 'ATTENDING');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <Calendar className="w-8 h-8 mr-3 text-blue-600" />
                {isHR ? 'Gestionar Eventos' : 'Calendario de Eventos'}
              </h1>
              <p className="text-gray-600">
                {isHR ? 'Planifica y gestiona eventos corporativos' : 'Consulta y confirma asistencia a eventos'}
              </p>
            </div>
            {isHR && (
              <button 
                onClick={() => setShowEventForm(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Evento
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Eventos Próximos</p>
                <p className="text-2xl font-bold text-gray-900">{upcomingEvents.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Confirmaré Asistencia</p>
                <p className="text-2xl font-bold text-gray-900">{myAttendingEvents.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Eventos Pasados</p>
                <p className="text-2xl font-bold text-gray-900">{pastEvents.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Eventos</p>
                <p className="text-2xl font-bold text-gray-900">{events.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Eventos Próximos ({upcomingEvents.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(event.category)}`}>
                        {event.category}
                      </span>
                      {event.user_rsvp && (
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getRsvpColor(event.user_rsvp.status)}`}>
                          {getRsvpIcon(event.user_rsvp.status)}
                          <span className="ml-1">{getRsvpText(event.user_rsvp.status)}</span>
                        </span>
                      )}
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>
                          {formatDateShort(event.start_date)}
                          {event.end_date !== event.start_date && 
                            ` - ${formatDateShort(event.end_date)}`
                          }
                        </span>
                      </div>
                      
                      {event.start_time && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{event.start_time}</span>
                        </div>
                      )}
                      
                      {event.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      {isHR && event.rsvp_count !== undefined && (
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          <span>{event.rsvp_count} confirmaciones</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <button 
                      onClick={() => setSelectedEvent(event)}
                      className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      Ver Detalle
                    </button>
                    
                    {!event.user_rsvp && (
                      <button 
                        onClick={() => handleRsvp(event.id, 'ATTENDING')}
                        className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                      >
                        Confirmar Asistencia
                      </button>
                    )}
                    
                    {isHR && (
                      <button className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {upcomingEvents.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay eventos próximos</h3>
              <p className="mt-1 text-sm text-gray-500">
                {isHR 
                  ? 'Crea el primer evento para la empresa.'
                  : 'Los próximos eventos aparecerán aquí.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Eventos Pasados ({pastEvents.length})
              </h2>
            </div>

            <div className="divide-y divide-gray-200">
              {pastEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors opacity-75">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(event.category)}`}>
                          {event.category}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{formatDateShort(event.start_date)}</span>
                        {event.location && (
                          <>
                            <MapPin className="w-4 h-4 ml-3 mr-1" />
                            <span>{event.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{selectedEvent.title}</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(selectedEvent.category)}`}>
                  {selectedEvent.category}
                </span>
                {selectedEvent.user_rsvp && (
                  <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${getRsvpColor(selectedEvent.user_rsvp.status)}`}>
                    {getRsvpIcon(selectedEvent.user_rsvp.status)}
                    <span className="ml-1">{getRsvpText(selectedEvent.user_rsvp.status)}</span>
                  </span>
                )}
              </div>
              
              {selectedEvent.description && (
                <p className="text-gray-700 mb-6">{selectedEvent.description}</p>
              )}
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium">Fecha</p>
                    <p className="text-sm text-gray-600">
                      {formatDateShort(selectedEvent.start_date)}
                      {selectedEvent.end_date !== selectedEvent.start_date && 
                        ` - ${formatDateShort(selectedEvent.end_date)}`
                      }
                    </p>
                  </div>
                </div>
                
                {selectedEvent.start_time && (
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium">Hora</p>
                      <p className="text-sm text-gray-600">{selectedEvent.start_time}</p>
                    </div>
                  </div>
                )}
                
                {selectedEvent.location && (
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium">Ubicación</p>
                      <p className="text-sm text-gray-600">{selectedEvent.location}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {!selectedEvent.user_rsvp && new Date(selectedEvent.start_date) >= new Date() && (
                <div className="border-t pt-6">
                  <p className="text-sm text-gray-600 mb-4">¿Asistirás a este evento?</p>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handleRsvp(selectedEvent.id, 'ATTENDING')}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                    >
                      Sí, asistiré
                    </button>
                    <button 
                      onClick={() => handleRsvp(selectedEvent.id, 'MAYBE')}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-yellow-100 rounded-md hover:bg-yellow-200 transition-colors"
                    >
                      Tal vez
                    </button>
                    <button 
                      onClick={() => handleRsvp(selectedEvent.id, 'NOT_ATTENDING')}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      No asistiré
                    </button>
                  </div>
                </div>
              )}
              
              {selectedEvent.user_rsvp && (
                <div className="border-t pt-6">
                  <p className="text-sm text-gray-600 mb-4">Cambiar tu respuesta:</p>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handleRsvp(selectedEvent.id, 'ATTENDING')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        selectedEvent.user_rsvp.status === 'ATTENDING'
                          ? 'text-white bg-green-600'
                          : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      Asistiré
                    </button>
                    <button 
                      onClick={() => handleRsvp(selectedEvent.id, 'MAYBE')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        selectedEvent.user_rsvp.status === 'MAYBE'
                          ? 'text-white bg-yellow-600'
                          : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      Tal vez
                    </button>
                    <button 
                      onClick={() => handleRsvp(selectedEvent.id, 'NOT_ATTENDING')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        selectedEvent.user_rsvp.status === 'NOT_ATTENDING'
                          ? 'text-white bg-red-600'
                          : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      No asistiré
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      <EventFormModal
        isOpen={showEventForm}
        onClose={() => setShowEventForm(false)}
        onEventCreated={handleEventCreated}
      />
    </div>
  );
}
