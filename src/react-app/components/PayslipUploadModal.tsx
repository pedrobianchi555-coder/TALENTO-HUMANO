import { useState, useEffect } from "react";
import { X, Upload, Loader2, AlertCircle, FileText, CheckCircle } from "lucide-react";
import type { UserProfile } from "@/shared/types";

interface PayslipUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface BatchUploadResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors: { filename: string; reason: string }[];
}

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export default function PayslipUploadModal({ onClose, onSuccess }: PayslipUploadModalProps) {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [selectedUploadMode, setSelectedUploadMode] = useState<'single' | 'batch'>('single');
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [title, setTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [batchResult, setBatchResult] = useState<BatchUploadResult | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    // Auto-generate title for single mode
    if (selectedUploadMode === 'single' && selectedEmployee && selectedMonth && selectedYear) {
      const employee = employees.find(e => e.id.toString() === selectedEmployee);
      const monthName = MONTHS.find(m => m.value === selectedMonth)?.label;
      if (employee && monthName) {
        setTitle(`Recibo de Pago ${monthName} ${selectedYear} - ${employee.first_name} ${employee.last_name}`);
      }
    } else if (selectedUploadMode === 'batch') {
      setTitle(""); // Clear title in batch mode
    }
  }, [selectedUploadMode, selectedEmployee, selectedMonth, selectedYear, employees]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      } else {
        setError("Error al cargar la lista de empleados");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setError("Error al cargar la lista de empleados");
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    let currentError = "";

    files.forEach(file => {
      if (file.type !== 'application/pdf') {
        currentError += `Solo se permiten archivos PDF. Archivo "${file.name}" omitido.\n`;
      } else if (file.size > 10 * 1024 * 1024) {
        currentError += `Archivo "${file.name}" es demasiado grande (máx. 10MB). Omitido.\n`;
      } else {
        validFiles.push(file);
      }
    });

    setSelectedFiles(validFiles);
    setError(currentError.trim());
    setBatchResult(null); // Clear previous results
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBatchResult(null);

    if (selectedFiles.length === 0) {
      setError("Por favor selecciona al menos un archivo PDF");
      return;
    }

    if (selectedUploadMode === 'single') {
      if (!selectedEmployee) {
        setError("Por favor selecciona un empleado");
        return;
      }
      if (selectedFiles.length !== 1) {
        setError("En modo individual, solo puedes subir un archivo a la vez.");
        return;
      }
    }

    setUploading(true);

    try {
      if (selectedUploadMode === 'single') {
        const file = selectedFiles[0];
        
        // Step 1: Upload file to R2
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'payslips');

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Error al subir el archivo");
        }

        const uploadResult = await uploadResponse.json();
        const fileUrl = uploadResult.url;

        // Step 2: Create payslip record
        const response = await fetch("/api/payslips", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: parseInt(selectedEmployee),
            month: selectedMonth,
            year: selectedYear,
            title: title,
            file_url: fileUrl,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al crear el registro del recibo");
        }

        onSuccess();
        onClose();
      } else {
        // Batch upload mode
        const formData = new FormData();
        formData.append('month', selectedMonth.toString());
        formData.append('year', selectedYear.toString());
        selectedFiles.forEach(file => {
          formData.append('file', file);
        });

        const batchUploadResponse = await fetch("/api/payslips/batch-upload", {
          method: "POST",
          body: formData,
        });

        if (!batchUploadResponse.ok) {
          const errorData = await batchUploadResponse.json();
          throw new Error(errorData.error || "Error en la carga masiva de recibos");
        }

        const result: BatchUploadResult = await batchUploadResponse.json();
        setBatchResult(result);
        if (result.importedCount > 0) {
          onSuccess(); // Refresh payslips list on success
        }
        setSelectedFiles([]); // Clear selected files after batch upload
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido al subir el recibo.";
      setError(msg);
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Subir Recibo(s) de Pago</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={uploading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700 whitespace-pre-line">{error}</span>
            </div>
          )}

          {/* Upload Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Modo de Carga *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                selectedUploadMode === 'single' 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  value="single"
                  checked={selectedUploadMode === 'single'}
                  onChange={() => {
                    setSelectedUploadMode('single');
                    setSelectedFiles([]);
                    setBatchResult(null);
                    setError("");
                  }}
                  disabled={uploading}
                  className="sr-only"
                />
                <div className="flex flex-col">
                  <span className="block text-sm font-medium text-gray-900">Carga Individual</span>
                  <span className="mt-1 text-sm text-gray-500">
                    Sube un recibo para un empleado específico
                  </span>
                </div>
              </label>
              <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                selectedUploadMode === 'batch' 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  value="batch"
                  checked={selectedUploadMode === 'batch'}
                  onChange={() => {
                    setSelectedUploadMode('batch');
                    setSelectedEmployee("");
                    setTitle("");
                    setSelectedFiles([]);
                    setBatchResult(null);
                    setError("");
                  }}
                  disabled={uploading}
                  className="sr-only"
                />
                <div className="flex flex-col">
                  <span className="block text-sm font-medium text-gray-900">Carga Masiva</span>
                  <span className="mt-1 text-sm text-gray-500">
                    Sube múltiples recibos usando la cédula en el nombre del archivo
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-6">
            {selectedUploadMode === 'single' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empleado *
                </label>
                {loadingEmployees ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="ml-2 text-sm text-gray-600">Cargando empleados...</span>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={uploading}
                  >
                    <option value="">Selecciona un empleado</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} - {employee.ci}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mes *
                </label>
                <select
                  required
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                >
                  {MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Año *
                </label>
                <select
                  required
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                >
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedUploadMode === 'single' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Se generará automáticamente si se deja vacío"
                  disabled={uploading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo(s) PDF *
              </label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                selectedFiles.length > 0 ? 'border-green-300 bg-green-50' : 'border-gray-300'
              }`}>
                {selectedFiles.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded-md shadow-sm">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-green-600 mr-2" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-green-700">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        {selectedUploadMode === 'batch' && (
                          <div className="flex items-center">
                            {file.name.match(/^(\d+)/) ? (
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                CI: {file.name.match(/^(\d+)/)![1]}
                              </span>
                            ) : (
                              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                Sin CI
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Arrastra y suelta tus archivos aquí, o haz clic para seleccionar
                    </p>
                    {selectedUploadMode === 'batch' && (
                      <p className="mt-1 text-xs text-blue-600">
                        💡 En carga masiva, los archivos deben nombrarse con la cédula (ej: 12345678.pdf)
                      </p>
                    )}
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  multiple={selectedUploadMode === 'batch'}
                  className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                  disabled={uploading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Solo archivos PDF (máx. 10MB por archivo)
                  {selectedUploadMode === 'batch' && '. Los nombres de archivo deben empezar con la cédula (ej: 12345678.pdf)'}
                </p>
              </div>
            </div>
          </div>

          {/* Batch Upload Result Summary */}
          {batchResult && (
            <div className={`mt-6 p-4 rounded-lg border ${
              batchResult.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center mb-3">
                <CheckCircle className={`w-5 h-5 mr-2 ${batchResult.success ? 'text-green-600' : 'text-yellow-600'}`} />
                <h4 className="font-medium text-gray-900">
                  Resultado de la Carga Masiva
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="bg-white p-3 rounded-md">
                  <p className="text-xs text-gray-600">Archivos importados</p>
                  <p className="text-lg font-bold text-green-600">{batchResult.importedCount}</p>
                </div>
                <div className="bg-white p-3 rounded-md">
                  <p className="text-xs text-gray-600">Archivos omitidos</p>
                  <p className="text-lg font-bold text-yellow-600">{batchResult.skippedCount}</p>
                </div>
              </div>
              {batchResult.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Problemas encontrados ({batchResult.errors.length}):
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {batchResult.errors.slice(0, 10).map((err, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-white p-2 rounded border-l-4 border-red-300">
                        <span className="font-medium">{err.filename}:</span> {err.reason}
                      </div>
                    ))}
                    {batchResult.errors.length > 10 && (
                      <p className="text-xs text-gray-500 italic">
                        ... y {batchResult.errors.length - 10} problemas más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={uploading}
            >
              {batchResult ? 'Cerrar' : 'Cancelar'}
            </button>
            {!batchResult && (
              <button
                type="submit"
                disabled={uploading || selectedFiles.length === 0 || (selectedUploadMode === 'single' && !selectedEmployee)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {selectedUploadMode === 'single' ? 'Subir Recibo' : `Subir ${selectedFiles.length} Recibo${selectedFiles.length !== 1 ? 's' : ''}`}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
