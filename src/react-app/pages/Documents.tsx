import { useAuth } from "@getmocha/users-service/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  Loader2, FileText, Plus, Search,
  Download, Calendar, User, Filter,
  Building, Globe, Lock
} from "lucide-react";
import type { Document, EnhancedUser } from "@/shared/types";
import usePermissions, { PERMISSIONS } from "@/react-app/hooks/usePermissions";
import { formatDateShort } from "@/shared/date-utils";

interface DocumentWithUploader extends Document {
  uploader_name?: string;
}

export default function Documents() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const { can, isHR, loading: permissionsLoading } = usePermissions();
  const [documents, setDocuments] = useState<DocumentWithUploader[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentWithUploader[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setUser] = useState<EnhancedUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: "",
    description: "",
    category: "",
    department: "",
    is_public: true
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isPending && !authUser) {
      navigate("/");
    }
  }, [authUser, isPending, navigate]);

  useEffect(() => {
    const fetchUserAndDocuments = async () => {
      if (!authUser) return;

      try {
        // Get user profile first
        const userResponse = await fetch("/api/users/me");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        }

        // Get documents
        const documentsResponse = await fetch("/api/documents");
        if (documentsResponse.ok) {
          const data = await documentsResponse.json();
          setDocuments(data);
          setFilteredDocuments(data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndDocuments();
  }, [authUser]);

  useEffect(() => {
    let filtered = documents;
    
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterCategory !== "ALL") {
      filtered = filtered.filter(doc => doc.category === filterCategory);
    }

    setFilteredDocuments(filtered);
  }, [searchTerm, filterCategory, documents]);

  if (isPending || loading || permissionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando documentos...</p>
      </div>
    );
  }

  const categories = ['Políticas', 'Manuales', 'Formularios', 'Procedimientos', 'Comunicados'];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Políticas': 'bg-blue-100 text-blue-800',
      'Manuales': 'bg-green-100 text-green-800',
      'Formularios': 'bg-purple-100 text-purple-800',
      'Procedimientos': 'bg-orange-100 text-orange-800',
      'Comunicados': 'bg-red-100 text-red-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert("Por favor selecciona un archivo antes de continuar.");
      return;
    }

    setUploading(true);
    
    try {
      // Upload file to R2 storage
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', 'documents');

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Error al subir el archivo");
      }

      const uploadResult = await uploadResponse.json();
      const fileUrl = uploadResult.url;

      // Create document record
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newDocument,
          file_url: fileUrl
        }),
      });

      if (response.ok) {
        // Refresh documents list
        const documentsResponse = await fetch("/api/documents");
        if (documentsResponse.ok) {
          const data = await documentsResponse.json();
          setDocuments(data);
          setFilteredDocuments(data);
        }
        
        setNewDocument({
          title: "",
          description: "",
          category: "",
          department: "",
          is_public: true
        });
        setSelectedFile(null);
        setShowForm(false);
        alert("Documento subido exitosamente");
      } else {
        throw new Error("Error al crear el registro del documento");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Error al subir el documento: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert("Tipo de archivo no permitido. Solo se aceptan documentos PDF, Word, Excel y PowerPoint.");
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("El archivo es demasiado grande. Tamaño máximo permitido: 10MB");
        return;
      }
      
      setSelectedFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <FileText className="w-8 h-8 mr-3 text-blue-600" />
                Gestión de Documentos
              </h1>
              <p className="text-gray-600">
                Administra documentos y políticas de la empresa
              </p>
            </div>
            <div className="flex space-x-3">
              {isHR && can(PERMISSIONS.DOCUMENT_UPLOAD) && (
                <button 
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Subir Documento
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar documentos por título, descripción o categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Documentos</p>
                <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
              </div>
            </div>
          </div>

          {categories.slice(0, 3).map(category => (
            <div key={category} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{category}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {documents.filter(d => d.category === category).length}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <div key={document.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(document.category)}`}>
                        {document.category}
                      </span>
                      {document.is_public ? (
                        <Globe className="w-4 h-4 text-green-500" />
                      ) : (
                        <Lock className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {document.title}
                    </h3>
                    {document.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {document.description}
                      </p>
                    )}
                    {document.department && (
                      <div className="flex items-center text-xs text-gray-500 mb-2">
                        <Building className="w-3 h-3 mr-1" />
                        <span>{document.department}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>{formatDateShort(document.created_at)}</span>
                    </div>
                    {document.uploader_name && (
                      <div className="flex items-center mt-1">
                        <User className="w-3 h-3 mr-1" />
                        <span>{document.uploader_name}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => window.open(document.file_url, '_blank')}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Abrir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || filterCategory !== "ALL" ? 'No se encontraron documentos' : 'No hay documentos disponibles'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterCategory !== "ALL" 
                ? 'Prueba con otros términos de búsqueda o filtros.'
                : isHR 
                  ? 'Comienza subiendo el primer documento.' 
                  : 'Los documentos aparecerán aquí cuando estén disponibles.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showForm && can(PERMISSIONS.DOCUMENT_UPLOAD) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Subir Documento</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título del Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDocument.title}
                    onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Manual de Inducción, Política de Vacaciones, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría *
                  </label>
                  <select
                    required
                    value={newDocument.category}
                    onChange={(e) => setNewDocument({ ...newDocument, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows={4}
                    value={newDocument.description}
                    onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción del contenido del documento..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento Específico
                  </label>
                  <select
                    value={newDocument.department}
                    onChange={(e) => setNewDocument({ ...newDocument, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos los departamentos</option>
                    <option value="Recursos Humanos">Recursos Humanos</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Ventas">Ventas</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finanzas">Finanzas</option>
                    <option value="Operaciones">Operaciones</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    id="is_public"
                    type="checkbox"
                    checked={newDocument.is_public}
                    onChange={(e) => setNewDocument({ ...newDocument, is_public: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_public" className="ml-2 text-sm text-gray-700">
                    Documento público (visible para todos los empleados)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Archivo *
                  </label>
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center ${selectedFile ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}>
                    <FileText className={`mx-auto h-8 w-8 ${selectedFile ? 'text-green-600' : 'text-gray-400'}`} />
                    {selectedFile ? (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-green-700">Archivo seleccionado:</p>
                        <p className="text-sm text-green-600">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          Tamaño: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-600">
                        Arrastra y suelta tu archivo aquí, o haz clic para seleccionar
                      </p>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      onChange={handleFileChange}
                      className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Formatos permitidos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX (máx. 10MB)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    'Subir Documento'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
