import { useState, useEffect } from "react";
import { X, Calendar, Clock, User, MapPin, Link, FileText, Star } from "lucide-react";
import type { Interview, CandidateWithInterviews, InterviewType, InterviewStatus } from "@/shared/types";

interface InterviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (interview: Interview) => void;
  candidate: CandidateWithInterviews;
  editingInterview?: Interview | null;
}

export default function InterviewFormModal({ 
  isOpen, 
  onClose, 
  onSave, 
  candidate,
  editingInterview 
}: InterviewFormModalProps) {
  const [formData, setFormData] = useState({
    type: 'Filtro Telefónico' as InterviewType,
    date: '',
    time: '',
    duration_minutes: 60,
    interviewer: '',
    location: '',
    meeting_link: '',
    notes: '',
    feedback: '',
    rating: undefined as number | undefined,
    status: 'SCHEDULED' as InterviewStatus
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingInterview) {
      setFormData({
        type: editingInterview.type,
        date: editingInterview.date,
        time: editingInterview.time,
        duration_minutes: editingInterview.duration_minutes || 60,
        interviewer: editingInterview.interviewer,
        location: editingInterview.location || '',
        meeting_link: editingInterview.meeting_link || '',
        notes: editingInterview.notes || '',
        feedback: editingInterview.feedback || '',
        rating: editingInterview.rating || undefined,
        status: editingInterview.status
      });
    } else {
      // Reset form for new interview
      setFormData({
        type: 'Filtro Telefónico',
        date: '',
        time: '',
        duration_minutes: 60,
        interviewer: '',
        location: '',
        meeting_link: '',
        notes: '',
        feedback: '',
        rating: undefined,
        status: 'SCHEDULED'
      });
    }
    setErrors({});
  }, [editingInterview, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) newErrors.date = 'La fecha es obligatoria';
    if (!formData.time) newErrors.time = 'La hora es obligatoria';
    if (!formData.interviewer.trim()) newErrors.interviewer = 'El entrevistador es obligatorio';

    // Validate future date for new interviews
    if (!editingInterview && formData.date) {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.date = 'La fecha debe ser hoy o en el futuro';
      }
    }

    // For completed interviews, require feedback
    if (formData.status === 'COMPLETED') {
      if (!formData.feedback.trim()) {
        newErrors.feedback = 'El feedback es obligatorio para entrevistas completadas';
      }
      if (!formData.rating) {
        newErrors.rating = 'La calificación es obligatoria para entrevistas completadas';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      const interviewData = {
        candidate_id: candidate.id,
        type: formData.type,
        date: formData.date,
        time: formData.time,
        duration_minutes: formData.duration_minutes,
        interviewer: formData.interviewer,
        location: formData.location || null,
        meeting_link: formData.meeting_link || null,
        notes: formData.notes || null,
        feedback: formData.feedback || null,
        rating: formData.rating || null,
        status: formData.status
      };

      const url = editingInterview 
        ? `/api/interviews/${editingInterview.id}`
        : '/api/interviews';
      
      const method = editingInterview ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interviewData),
      });

      if (response.ok) {
        const savedInterview = await response.json();
        onSave(savedInterview);
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'No se pudo guardar la entrevista'}`);
      }
    } catch (error) {
      console.error('Error saving interview:', error);
      alert('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const interviewTypes: InterviewType[] = [
    'Filtro Telefónico',
    'Técnica', 
    'RRHH',
    'Final',
    'Seguimiento'
  ];

  const interviewStatuses: { value: InterviewStatus; label: string }[] = [
    { value: 'SCHEDULED', label: 'Programada' },
    { value: 'IN_PROGRESS', label: 'En Progreso' },
    { value: 'COMPLETED', label: 'Completada' },
    { value: 'CANCELLED', label: 'Cancelada' },
    { value: 'RESCHEDULED', label: 'Reprogramada' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {editingInterview ? 'Editar Entrevista' : 'Programar Entrevista'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Candidato: {candidate.first_name} {candidate.last_name} - {candidate.position}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Interview Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Entrevista *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as InterviewType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {interviewTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as InterviewStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {interviewStatuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Hora *
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.time ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración (min)
                </label>
                <input
                  type="number"
                  min="15"
                  max="240"
                  step="15"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Interviewer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Entrevistador *
              </label>
              <input
                type="text"
                value={formData.interviewer}
                onChange={(e) => setFormData({ ...formData, interviewer: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.interviewer ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Nombre del entrevistador"
              />
              {errors.interviewer && <p className="text-red-500 text-xs mt-1">{errors.interviewer}</p>}
            </div>

            {/* Location and Meeting Link */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Ubicación
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Sala de reuniones, dirección, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Link className="w-4 h-4 inline mr-1" />
                  Enlace de Reunión
                </label>
                <input
                  type="url"
                  value={formData.meeting_link}
                  onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://meet.google.com/..."
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Notas de la Entrevista
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Temas a cubrir, información adicional, etc."
              />
            </div>

            {/* Feedback Section (for completed interviews) */}
            {(formData.status === 'COMPLETED' || editingInterview?.status === 'COMPLETED') && (
              <>
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Feedback de la Entrevista</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Star className="w-4 h-4 inline mr-1" />
                        Calificación (1-5) *
                      </label>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => setFormData({ ...formData, rating })}
                            className={`w-10 h-10 rounded-lg border-2 font-medium transition-colors ${
                              formData.rating === rating
                                ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                      {errors.rating && <p className="text-red-500 text-xs mt-1">{errors.rating}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Feedback Detallado *
                      </label>
                      <textarea
                        rows={4}
                        value={formData.feedback}
                        onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.feedback ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Fortalezas, debilidades, impresiones generales, recomendaciones..."
                      />
                      {errors.feedback && <p className="text-red-500 text-xs mt-1">{errors.feedback}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Guardando...' : editingInterview ? 'Actualizar' : 'Programar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
