import { useState } from "react";
import { 
  X, User, Phone, Mail, MapPin, Calendar, 
  FileText, Clock, CheckCircle, XCircle, 
  AlertCircle, Star, Edit, Plus, Download
} from "lucide-react";
import type { CandidateWithInterviews, Interview } from "@/shared/types";
import { formatDate, formatDateShort } from "@/shared/date-utils";

interface CandidateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateWithInterviews;
  onScheduleInterview: () => void;
  onEditInterview: (interview: Interview) => void;
}

export default function CandidateDetailModal({ 
  isOpen, 
  onClose, 
  candidate,
  onScheduleInterview,
  onEditInterview
}: CandidateDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'cv' | 'interviews'>('profile');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return 'bg-blue-100 text-blue-800';
      case 'PHONE_SCREEN':
        return 'bg-yellow-100 text-yellow-800';
      case 'INTERVIEW':
        return 'bg-purple-100 text-purple-800';
      case 'OFFER':
        return 'bg-orange-100 text-orange-800';
      case 'HIRED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return 'Aplicado';
      case 'PHONE_SCREEN':
        return 'Filtro Telefónico';
      case 'INTERVIEW':
        return 'En Entrevista';
      case 'OFFER':
        return 'Oferta Realizada';
      case 'HIRED':
        return 'Contratado';
      case 'REJECTED':
        return 'Rechazado';
      default:
        return status;
    }
  };

  const getInterviewStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'RESCHEDULED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInterviewStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'Programada';
      case 'IN_PROGRESS':
        return 'En Progreso';
      case 'COMPLETED':
        return 'Completada';
      case 'CANCELLED':
        return 'Cancelada';
      case 'RESCHEDULED':
        return 'Reprogramada';
      default:
        return status;
    }
  };

  const getInterviewStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Clock className="w-4 h-4" />;
      case 'IN_PROGRESS':
        return <AlertCircle className="w-4 h-4" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4" />;
      case 'RESCHEDULED':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const handleDownloadCV = () => {
    try {
      if (candidate.resume_url) {
        // For URL-based resumes, create a download link
        const link = document.createElement('a');
        link.href = candidate.resume_url;
        link.download = `CV_${candidate.first_name}_${candidate.last_name}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (candidate.resume_pdf_base64) {
        // For base64-encoded resumes, convert to blob and download
        const byteCharacters = atob(candidate.resume_pdf_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `CV_${candidate.first_name}_${candidate.last_name}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } else {
        alert('No hay archivo de CV disponible para descargar');
      }
    } catch (error) {
      console.error('Error downloading CV:', error);
      alert('Error al descargar el CV. Intenta nuevamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {candidate.first_name} {candidate.last_name}
                </h2>
                <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                  {getStatusText(candidate.status)}
                </span>
              </div>
              <p className="text-lg text-gray-600 mb-1">{candidate.position}</p>
              {candidate.department && (
                <p className="text-gray-500">{candidate.department}</p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onScheduleInterview}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Programar Entrevista
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                Perfil
              </button>
              <button
                onClick={() => setActiveTab('cv')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'cv'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Curriculum
              </button>
              <button
                onClick={() => setActiveTab('interviews')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'interviews'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Entrevistas ({candidate.interviews?.length || 0})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'profile' && (
            <div className="p-6 overflow-y-auto h-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Información de Contacto
                  </h3>
                  <div className="space-y-4">
                    {candidate.email && (
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Email</p>
                          <a 
                            href={`mailto:${candidate.email}`}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {candidate.email}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {candidate.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Teléfono</p>
                          <a 
                            href={`tel:${candidate.phone}`}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {candidate.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Fecha de Aplicación</p>
                        <p className="text-gray-900">
                          {formatDate(candidate.application_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Profile */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Perfil Profesional (IA)
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    {candidate.ai_profile ? (
                      <p className="text-gray-700 leading-relaxed">
                        {candidate.ai_profile}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic">
                        No hay perfil generado por IA disponible
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {candidate.notes && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notas</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{candidate.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cv' && (
            <div className="h-full p-6">
              {/* CV Header with Download Button */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Currículum Vitae
                </h3>
                {(candidate.resume_url || candidate.resume_pdf_base64) && (
                  <button
                    onClick={handleDownloadCV}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Descargar CV"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar CV
                  </button>
                )}
              </div>

              <div className="h-full border border-gray-200 rounded-lg overflow-hidden">
                {candidate.resume_url ? (
                  <iframe
                    src={candidate.resume_url}
                    className="w-full h-full"
                    title="Curriculum Vitae"
                    onError={() => {
                      console.error('Error loading PDF from URL:', candidate.resume_url);
                    }}
                  />
                ) : candidate.resume_pdf_base64 ? (
                  <iframe
                    src={`data:application/pdf;base64,${candidate.resume_pdf_base64}`}
                    className="w-full h-full"
                    title="Curriculum Vitae"
                    onError={() => {
                      console.error('Error loading PDF from base64 data');
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-50">
                    <div className="text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No hay CV disponible
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        El archivo del currículum no está disponible.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Fallback text view if PDF doesn't load */}
                {candidate.resume_text && (
                  <div className="absolute bottom-4 right-4 flex space-x-2">
                    <button
                      onClick={() => {
                        // Create a simple text view modal or expand section
                        const textWindow = window.open('', '_blank');
                        if (textWindow) {
                          textWindow.document.write(`
                            <html>
                              <head><title>CV - ${candidate.first_name} ${candidate.last_name}</title></head>
                              <body style="font-family: Arial, sans-serif; margin: 20px; line-height: 1.6;">
                                <h1>${candidate.first_name} ${candidate.last_name}</h1>
                                <pre style="white-space: pre-wrap; font-family: inherit;">${candidate.resume_text}</pre>
                              </body>
                            </html>
                          `);
                        }
                      }}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      title="Ver texto del CV"
                    >
                      Ver Texto
                    </button>
                    {(candidate.resume_url || candidate.resume_pdf_base64) && (
                      <button
                        onClick={handleDownloadCV}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                        title="Descargar CV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'interviews' && (
            <div className="p-6 overflow-y-auto h-full">
              <div className="space-y-6">
                {candidate.interviews && candidate.interviews.length > 0 ? (
                  candidate.interviews
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((interview) => (
                      <div
                        key={interview.id}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-medium text-gray-900">
                                {interview.type}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getInterviewStatusColor(interview.status)}`}>
                                {getInterviewStatusIcon(interview.status)}
                                <span className="ml-1">{getInterviewStatusText(interview.status)}</span>
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                {formatDateShort(interview.date)}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="w-4 h-4 mr-2" />
                                {interview.time} ({interview.duration_minutes || 60} min)
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <User className="w-4 h-4 mr-2" />
                                {interview.interviewer}
                              </div>
                              {interview.location && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  {interview.location}
                                </div>
                              )}
                            </div>

                            {interview.meeting_link && (
                              <div className="mb-4">
                                <a
                                  href={interview.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                  🔗 Enlace de reunión
                                </a>
                              </div>
                            )}

                            {interview.notes && (
                              <div className="mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-1">Notas:</p>
                                <p className="text-sm text-gray-600">{interview.notes}</p>
                              </div>
                            )}

                            {interview.status === 'COMPLETED' && (
                              <div className="border-t pt-4 mt-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="text-sm font-medium text-gray-900">Feedback</h5>
                                  {interview.rating && (
                                    <div className="flex items-center space-x-1">
                                      {renderStars(interview.rating)}
                                      <span className="text-sm text-gray-600 ml-1">
                                        ({interview.rating}/5)
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {interview.feedback ? (
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {interview.feedback}
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">
                                    Sin feedback registrado
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => onEditInterview(interview)}
                            className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Editar entrevista"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No hay entrevistas programadas
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Programa la primera entrevista para este candidato.
                    </p>
                    <button
                      onClick={onScheduleInterview}
                      className="mt-3 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Programar Primera Entrevista
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
