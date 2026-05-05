import { useState } from "react";
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface ImportEmployeesModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

export default function ImportEmployeesModal({ onClose, onSuccess }: ImportEmployeesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [companyName, setCompanyName] = useState("Hacienda San José C.A.");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        alert("Por favor selecciona un archivo CSV válido");
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setResult(null);

    try {
      // Read file content
      const text = await file.text();
      
      // Send to backend
      const response = await fetch("/api/employees/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csv_content: text,
          company_name: companyName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        if (data.imported > 0) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 3000);
        }
      } else {
        const error = await response.json();
        setResult({
          success: false,
          imported: 0,
          skipped: 0,
          errors: [error.error || "Error al importar empleados"],
        });
      }
    } catch (error) {
      console.error("Error importing CSV:", error);
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: ["Error de conexión al importar empleados"],
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Importar Empleados desde CSV</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isImporting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Company selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Empresa *
            </label>
            <select
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isImporting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Cacao San Jose, C.A.">Cacao San Jose, C.A.</option>
              <option value="Hacienda San José C.A.">Hacienda San José C.A.</option>
              <option value="Agropecuaria Santa Ana, C.A.">Agropecuaria Santa Ana, C.A.</option>
            </select>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo CSV
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Seleccionar archivo CSV
                  </label>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={isImporting}
                    className="hidden"
                  />
                </div>
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Archivo seleccionado: <strong>{file.name}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CSV format info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Formato del CSV</h4>
            <p className="text-sm text-blue-800 mb-2">
              El archivo CSV debe tener las siguientes columnas (en orden):
            </p>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li><strong>CEDULA</strong>: Cédula de identidad</li>
              <li><strong>APELLIDO</strong>: Apellido del empleado</li>
              <li><strong>NOMBRE</strong>: Nombre del empleado</li>
              <li><strong>CARGO</strong>: Posición o cargo</li>
              <li><strong>DEPARTAMENTO</strong>: Departamento</li>
              <li><strong>NOMINA</strong>: Tipo de nómina (OPERARIO, EMPLEADO, CONFIDENCIAL)</li>
            </ul>
          </div>

          {/* Import result */}
          {result && (
            <div className={`border rounded-lg p-4 ${
              result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className={`text-sm font-medium ${
                    result.success ? "text-green-900" : "text-red-900"
                  }`}>
                    {result.success ? "Importación completada" : "Error en la importación"}
                  </h4>
                  <div className="mt-2 text-sm space-y-1">
                    <p className={result.success ? "text-green-800" : "text-red-800"}>
                      Empleados importados: <strong>{result.imported}</strong>
                    </p>
                    {result.skipped > 0 && (
                      <p className={result.success ? "text-green-800" : "text-red-800"}>
                        Empleados omitidos (ya existían): <strong>{result.skipped}</strong>
                      </p>
                    )}
                    {result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-900 font-medium">Errores:</p>
                        <ul className="list-disc list-inside text-red-800 space-y-1 mt-1">
                          {result.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={!file || isImporting}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                !file || isImporting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isImporting ? (
                <span className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </span>
              ) : (
                "Importar Empleados"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
