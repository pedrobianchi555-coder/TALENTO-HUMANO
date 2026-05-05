import { useAuth } from "@getmocha/users-service/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  Loader2, Users, Plus, Search, 
  Eye, Calendar, FileText, Brain, Upload,
  Clock, CheckCircle, XCircle, AlertCircle, Edit
} from "lucide-react";
import type { Interview, EnhancedUser, CandidateWithInterviews } from "@/shared/types";
import InterviewFormModal from "@/react-app/components/InterviewFormModal";
import { formatDateShort } from "@/shared/date-utils";
import CandidateDetailModal from "@/react-app/components/CandidateDetailModal";
import CandidateEditModal from "@/react-app/components/CandidateEditModal";
import ConfirmationModal from "@/react-app/components/ConfirmationModal";
import { useConfirmationModal } from "@/react-app/hooks/useConfirmationModal";

export default function Recruitment() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<CandidateWithInterviews[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateWithInterviews[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [showCandidateDetail, setShowCandidateDetail] = useState(false);
  const [showCandidateEdit, setShowCandidateEdit] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithInterviews | null>(null);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [processingCandidateId, setProcessingCandidateId] = useState<number | null>(null);
  
  // Confirmation modal
  const { modalConfig, showAlert, showConfirm, closeModal, handleConfirm } = useConfirmationModal();

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!authUser) return;

      try {
        // Get user profile first
        const userResponse = await fetch("/api/users/me");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);

          if (userData.profile?.role !== 'HR') {
            navigate("/dashboard");
            return;
          }
        }

        // Get candidates with interviews
        const candidatesResponse = await fetch("/api/candidates");
        if (candidatesResponse.ok) {
          const candidatesData = await candidatesResponse.json();
          setCandidates(candidatesData);
          setFilteredCandidates(candidatesData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authUser, navigate]);

  useEffect(() => {
    filterCandidates();
  }, [candidates, searchTerm, filterStatus]);

  const filterCandidates = () => {
    let filtered = candidates;

    if (filterStatus !== "ALL") {
      filtered = filtered.filter(candidate => candidate.status === filterStatus);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(candidate => 
        candidate.first_name.toLowerCase().includes(searchLower) ||
        candidate.last_name.toLowerCase().includes(searchLower) ||
        candidate.position.toLowerCase().includes(searchLower) ||
        candidate.department?.toLowerCase().includes(searchLower) ||
        candidate.ai_profile?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredCandidates(filtered);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      showAlert('Archivo Inválido', 'Por favor selecciona un archivo PDF válido', 'warning');
      return;
    }

    setIsUploading(true);
    setUploadProgress("Subiendo archivo...");

    try {
      // Upload PDF file first
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'resumes');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Error al subir el archivo');
      }

      const uploadResult = await uploadResponse.json();
      setUploadProgress("Extrayendo texto del CV...");

      // Parse PDF to extract text
      const arrayBuffer = await file.arrayBuffer();
      
      // Extract text from PDF
      let resumeText = '';
      try {
        resumeText = await parsePdfText(arrayBuffer);
        console.log('Extracted text length:', resumeText.length);
        console.log('First 500 chars:', resumeText.substring(0, 500));
      } catch (pdfError) {
        console.error('PDF text extraction failed:', pdfError);
        showAlert('Error de Extracción', 'No se pudo extraer el texto del PDF. Por favor verifica que el archivo no esté dañado o protegido.', 'error');
        throw pdfError;
      }

      if (!resumeText || resumeText.length < 50) {
        showAlert('PDF Sin Texto', 'El PDF no contiene texto extraíble. Por favor usa un PDF que contenga texto seleccionable, no imágenes escaneadas.', 'warning');
        throw new Error('PDF sin texto extraíble');
      }

      setUploadProgress("Creando registro de candidato...");

      // Create candidate record without AI analysis
      const candidateData = {
        resume_url: uploadResult.url,
        resume_text: resumeText,
        application_date: new Date().toISOString().split('T')[0]
      };

      console.log('Sending candidate data to API:', candidateData);
      
      const createResponse = await fetch('/api/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(candidateData),
      });

      if (createResponse.ok) {
        const newCandidate = await createResponse.json();
        console.log('New candidate created:', newCandidate);
        setCandidates(prev => [newCandidate, ...prev]);
        setUploadProgress("");
        showAlert('CV Subido', 'CV subido exitosamente. Ahora puedes procesar con IA para extraer los datos del candidato.', 'success');
      } else {
        const errorData = await createResponse.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Error al crear el candidato');
      }
    } catch (error) {
      console.error('Error processing CV:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showAlert('Error al Procesar CV', `Error al procesar el CV: ${errorMessage}. Por favor intenta nuevamente o contacta soporte.`, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      // Reset file input
      event.target.value = '';
    }
  };

  const parsePdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      // Load PDF.js if not already loaded
      if (!(window as any).pdfjsLib) {
        await loadPdfJs();
      }

      // Verify PDF.js loaded successfully
      if (!(window as any).pdfjsLib) {
        throw new Error('PDF.js failed to load');
      }

      const loadingTask = (window as any).pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      if (!pdf || !pdf.numPages) {
        throw new Error('Invalid PDF document');
      }

      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .filter((str: string) => str.trim().length > 0)
            .join(' ');
          if (pageText.trim()) {
            fullText += pageText + '\n\n';
          }
        } catch (pageError) {
          console.warn(`Error extracting text from page ${i}:`, pageError);
        }
      }

      const cleanedText = fullText.trim();
      if (!cleanedText) {
        throw new Error('No text content found in PDF');
      }
      
      return cleanedText;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw error; // Re-throw to let caller handle it
    }
  };

  const loadPdfJs = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if ((window as any).pdfjsLib) {
        resolve();
        return;
      }

      // Set a timeout for loading
      const timeout = setTimeout(() => {
        reject(new Error('PDF.js loading timeout'));
      }, 10000); // 10 second timeout

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      
      script.onload = () => {
        clearTimeout(timeout);
        try {
          if ((window as any).pdfjsLib) {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
          } else {
            reject(new Error('PDF.js library not available after script load'));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load PDF.js script'));
      };
      
      document.head.appendChild(script);
    });
  };

  const handleProcessWithAI = async (candidateId: number) => {
    setProcessingCandidateId(candidateId);

    try {
      const response = await fetch(`/api/candidates/${candidateId}/process-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const updatedCandidate = await response.json();
        setCandidates(prev => prev.map(c => 
          c.id === candidateId ? updatedCandidate : c
        ));
        showAlert('Candidato Procesado', `Candidato procesado exitosamente: ${updatedCandidate.first_name} ${updatedCandidate.last_name}`, 'success');
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'No se pudo procesar el candidato con IA';
        
        // Show specific advice for rate limit errors
        if (errorMsg.includes('rate limit')) {
          showAlert('Límite de Velocidad', `${errorMsg}\n\nSugerencia: Espera 2-3 minutos entre procesamientos para evitar límites de velocidad.`, 'warning');
        } else if (errorMsg.includes('quota')) {
          showAlert('Cuota Excedida', `${errorMsg}\n\nSugerencia: Verifica tu facturación en Google AI Studio o usa edición manual.`, 'error');
        } else {
          showAlert('Error de Procesamiento', errorMsg, 'error');
        }
        
        // Refresh candidates to get updated status
        const candidatesResponse = await fetch("/api/candidates");
        if (candidatesResponse.ok) {
          const candidatesData = await candidatesResponse.json();
          setCandidates(candidatesData);
        }
      }
    } catch (error) {
      console.error('Error processing candidate with AI:', error);
      showAlert('Error de Conexión', 'Error de conexión. Intenta nuevamente o usa edición manual.', 'error');
    } finally {
      setProcessingCandidateId(null);
    }
  };

  const handleCandidateUpdate = (updatedCandidate: CandidateWithInterviews) => {
    setCandidates(prev => prev.map(c => 
      c.id === updatedCandidate.id ? updatedCandidate : c
    ));
    setSelectedCandidate(updatedCandidate);
  };

  const handleDeleteCandidate = async (candidateId: number) => {
    showConfirm(
      'Eliminar Candidato',
      '¿Estás seguro de que deseas eliminar este candidato? Esta acción no se puede deshacer.',
      async () => {
        try {
          const response = await fetch(`/api/candidates/${candidateId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            setCandidates(prev => prev.filter(c => c.id !== candidateId));
            showAlert('Candidato Eliminado', 'Candidato eliminado exitosamente.', 'success');
            
            // Close detail modal if this candidate was selected
            if (selectedCandidate?.id === candidateId) {
              setShowCandidateDetail(false);
              setSelectedCandidate(null);
            }
          } else {
            const errorData = await response.json();
            showAlert('Error', errorData.error || 'No se pudo eliminar el candidato', 'error');
          }
        } catch (error) {
          console.error('Error deleting candidate:', error);
          showAlert('Error de Conexión', 'Error de conexión. Intenta nuevamente.', 'error');
        }
      },
      { type: 'warning', confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar' }
    );
  };

  const handleAiSearch = async () => {
    if (!searchTerm.trim()) {
      showAlert('Término de Búsqueda Requerido', 'Por favor ingresa un término de búsqueda para usar la IA', 'warning');
      return;
    }

    setIsAiSearching(true);

    try {
      const response = await fetch('/api/ai/search-candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: searchTerm,
          candidates: candidates.map(c => ({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            position: c.position,
            ai_profile: c.ai_profile,
            resume_text: c.resume_text?.substring(0, 1000) // Limit text for AI processing
          }))
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Reorder candidates based on AI ranking
        const rankedCandidates = result.topCandidates.map((ranked: any) => {
          const candidate = candidates.find(c => c.id === ranked.id);
          return candidate ? { ...candidate, aiReason: ranked.reason } : null;
        }).filter(Boolean);

        setFilteredCandidates(rankedCandidates);
      } else {
        throw new Error('Error en búsqueda con IA');
      }
    } catch (error) {
      console.error('Error in AI search:', error);
      showAlert('Error en Búsqueda IA', 'Error en la búsqueda con IA. Intenta nuevamente.', 'error');
    } finally {
      setIsAiSearching(false);
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return <FileText className="w-4 h-4" />;
      case 'PHONE_SCREEN':
        return <Clock className="w-4 h-4" />;
      case 'INTERVIEW':
        return <Calendar className="w-4 h-4" />;
      case 'OFFER':
        return <AlertCircle className="w-4 h-4" />;
      case 'HIRED':
        return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const handleInterviewCreated = (interview: Interview) => {
    if (selectedCandidate) {
      setCandidates(prev => prev.map(c => 
        c.id === selectedCandidate.id 
          ? { ...c, interviews: [...(c.interviews || []), interview] }
          : c
      ));
      setSelectedCandidate(prev => prev ? {
        ...prev,
        interviews: [...(prev.interviews || []), interview]
      } : null);
    }
    setShowInterviewForm(false);
    setEditingInterview(null);
  };

  if (isPending || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando módulo de selección...</p>
      </div>
    );
  }

  if (user?.profile?.role !== 'HR') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
        <p className="text-lg text-gray-900">Acceso denegado</p>
        <p className="text-gray-600">Este módulo está disponible solo para personal de RRHH.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <Users className="w-8 h-8 mr-3 text-blue-600" />
                Selección de Personal
              </h1>
              <p className="text-gray-600">
                Gestiona candidatos y procesos de reclutamiento con IA
              </p>
            </div>
            <div className="flex space-x-3">
              <label className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Subir CV (PDF)
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Progress */}
        {isUploading && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center">
              <div className="animate-spin">
                <Loader2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Procesando CV...</p>
                <p className="text-xs text-gray-500">{uploadProgress}</p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Candidatos</p>
                <p className="text-2xl font-bold text-gray-900">{candidates.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En Proceso</p>
                <p className="text-2xl font-bold text-gray-900">
                  {candidates.filter(c => ['PHONE_SCREEN', 'INTERVIEW'].includes(c.status)).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Contratados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {candidates.filter(c => c.status === 'HIRED').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Entrevistas Programadas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {candidates.reduce((acc, c) => 
                    acc + (c.interviews?.filter(i => i.status === 'SCHEDULED').length || 0), 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar candidatos por nombre, posición, departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAiSearch}
                disabled={isAiSearching || !searchTerm.trim()}
                className="inline-flex items-center px-4 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAiSearching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4 mr-2" />
                )}
                Búsqueda con IA
              </button>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="APPLIED">Aplicado</option>
                <option value="PHONE_SCREEN">Filtro Telefónico</option>
                <option value="INTERVIEW">En Entrevista</option>
                <option value="OFFER">Oferta Realizada</option>
                <option value="HIRED">Contratado</option>
                <option value="REJECTED">Rechazado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Candidates List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Candidatos ({filteredCandidates.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredCandidates.map((candidate) => (
              <div key={candidate.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {candidate.first_name} {candidate.last_name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                        {getStatusIcon(candidate.status)}
                        <span className="ml-1">{getStatusText(candidate.status)}</span>
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {candidate.position}
                      </span>
                    </div>
                    
                    {candidate.department && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Departamento:</span> {candidate.department}
                      </p>
                    )}
                    
                    {candidate.ai_profile && (
                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {candidate.ai_profile}
                      </p>
                    )}

                    {(candidate as any).aiReason && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-purple-700">
                          <span className="font-medium">Coincidencia IA:</span> {(candidate as any).aiReason}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Aplicado: {formatDateShort(candidate.application_date)}</span>
                      {candidate.phone && <span>Tel: {candidate.phone}</span>}
                      {candidate.interviews && candidate.interviews.length > 0 && (
                        <span>{candidate.interviews.length} entrevista(s)</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <button 
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setShowCandidateDetail(true);
                      }}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver Perfil
                    </button>
                    
                    {(candidate.first_name === 'Pendiente' || candidate.first_name === 'Análisis') && (
                      <button 
                        onClick={() => handleProcessWithAI(candidate.id)}
                        disabled={processingCandidateId === candidate.id}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {processingCandidateId === candidate.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <Brain className="w-3 h-3 mr-1" />
                            Procesar con IA
                          </>
                        )}
                      </button>
                    )}
                    
                    <button 
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/ai/test');
                          const result = await response.json();
                          if (result.connected) {
                            showAlert('OpenAI Conectada', `OpenAI conectada correctamente!\n\nRespuesta: ${result.response}\n\nConsejo: ${result.advice}`, 'success');
                          } else {
                            showAlert('Error de Conexión', `${result.error}\n\n${result.advice}`, 'error');
                          }
                        } catch (error) {
                          showAlert('Error de Conexión', 'Error al probar la conexión de OpenAI. Verifica tu conexión a internet.', 'error');
                        }
                      }}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors"
                    >
                      <Brain className="w-3 h-3 mr-1" />
                      Test OpenAI
                    </button>
                    
                    <button 
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setShowCandidateEdit(true);
                      }}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200 transition-colors"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar Manual
                    </button>
                    
                    <button 
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setShowInterviewForm(true);
                      }}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      Programar Entrevista
                    </button>

                    <button 
                      onClick={() => handleDeleteCandidate(candidate.id)}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCandidates.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'No se encontraron candidatos' : 'No hay candidatos'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? 'Prueba con otros términos de búsqueda.'
                  : 'Los candidatos aparecerán aquí cuando subas CVs.'
                }
              </p>
              {!searchTerm && (
                <label className="mt-3 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Subir Primer CV
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showInterviewForm && selectedCandidate && (
        <InterviewFormModal
          isOpen={showInterviewForm}
          onClose={() => {
            setShowInterviewForm(false);
            setEditingInterview(null);
          }}
          onSave={handleInterviewCreated}
          candidate={selectedCandidate}
          editingInterview={editingInterview}
        />
      )}

      {showCandidateDetail && selectedCandidate && (
        <CandidateDetailModal
          isOpen={showCandidateDetail}
          onClose={() => {
            setShowCandidateDetail(false);
            setSelectedCandidate(null);
          }}
          candidate={selectedCandidate}
          onScheduleInterview={() => {
            setShowInterviewForm(true);
            setShowCandidateDetail(false);
          }}
          onEditInterview={(interview) => {
            setEditingInterview(interview);
            setShowInterviewForm(true);
            setShowCandidateDetail(false);
          }}
        />
      )}

      {showCandidateEdit && selectedCandidate && (
        <CandidateEditModal
          isOpen={showCandidateEdit}
          onClose={() => {
            setShowCandidateEdit(false);
            setSelectedCandidate(null);
          }}
          candidate={selectedCandidate}
          onSave={handleCandidateUpdate}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm ? handleConfirm : undefined}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmButtonText={modalConfig.confirmButtonText}
        cancelButtonText={modalConfig.cancelButtonText}
        isLoading={modalConfig.isLoading}
      />
    </div>
  );
}
