import { useAuth } from "@/react-app/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2, Package, Plus, Search, Filter, Settings, Monitor, User, Wrench, MapPin, CheckCircle, AlertTriangle, Clock, History, Edit, Upload, FileText } from "lucide-react";
import type { Asset, AssetCategory, EnhancedUser, UserProfile } from "@/shared/types";
import AssetHistoryModal from "@/react-app/components/AssetHistoryModal";
import AssetEditModal from "@/react-app/components/AssetEditModal";
import AssetReportModal from "@/react-app/components/AssetReportModal";
import { formatDateShort } from "@/shared/date-utils";

interface AssetWithDetails extends Asset {
  category_name?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  assignment_count?: number;
  maintenance_count?: number;
}

export default function Assets() {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetWithDetails[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithDetails | null>(null);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [assetToAssign, setAssetToAssign] = useState<AssetWithDetails | null>(null);
  const [assetToMaintain, setAssetToMaintain] = useState<AssetWithDetails | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [assetForHistory, setAssetForHistory] = useState<AssetWithDetails | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<AssetWithDetails | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    user_id: "",
    assignment_notes: ""
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_type: "",
    description: "",
    maintenance_date: "",
    cost: "",
    performed_by: "",
    next_maintenance_date: "",
    notes: ""
  });
  const [newAsset, setNewAsset] = useState({
    asset_code: "",
    name: "",
    description: "",
    category_id: "",
    brand: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    purchase_cost: "",
    location: "",
    warranty_expiry_date: "",
    notes: "",
    invoice_url: ""
  });
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'invoices');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setNewAsset(prev => ({ ...prev, invoice_url: data.url }));
      } else {
        console.error('Failed to upload invoice');
      }
    } catch (error) {
      console.error('Error uploading invoice:', error);
    } finally {
      setUploadingInvoice(false);
    }
  };

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
        let userData = null;
        if (userResponse.ok) {
          userData = await userResponse.json();
          setUser(userData);
        }

        // Get asset categories
        const categoriesResponse = await fetch("/api/asset-categories");
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
        }

        // Get assets
        const assetsResponse = await fetch("/api/assets");
        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json();
          setAssets(assetsData);
          setFilteredAssets(assetsData);
        }

        // Get employees if HR
        if (userData?.profile?.role === 'HR') {
          const employeesResponse = await fetch("/api/employees");
          if (employeesResponse.ok) {
            const employeesData = await employeesResponse.json();
            console.log('Loaded employees:', employeesData); // Debug log
            setEmployees(employeesData);
          } else {
            console.error('Failed to fetch employees:', employeesResponse.statusText);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authUser]);

  useEffect(() => {
    let filtered = assets;
    
    if (searchTerm) {
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.asset_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== "ALL") {
      filtered = filtered.filter(asset => asset.status === filterStatus);
    }

    if (filterCategory !== "ALL") {
      filtered = filtered.filter(asset => asset.category_id.toString() === filterCategory);
    }

    setFilteredAssets(filtered);
  }, [searchTerm, filterStatus, filterCategory, assets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newAsset,
          category_id: parseInt(newAsset.category_id),
          purchase_cost: newAsset.purchase_cost ? parseFloat(newAsset.purchase_cost) : null,
        }),
      });

      if (response.ok) {
        const newAssetData = await response.json();
        setAssets([newAssetData, ...assets]);
        setNewAsset({
          asset_code: "",
          name: "",
          description: "",
          category_id: "",
          brand: "",
          model: "",
          serial_number: "",
          purchase_date: "",
          purchase_cost: "",
          location: "",
          warranty_expiry_date: "",
          notes: "",
          invoice_url: ""
        });
        setShowForm(false);
        // Refresh the data to get updated counts
        window.location.reload();
      }
    } catch (error) {
      console.error("Error creating asset:", error);
    }
  };

  const handleAssignAsset = async (assetId: number, userId: number) => {
    try {
      const response = await fetch("/api/asset-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asset_id: assetId,
          user_id: userId,
          assigned_date: new Date().toISOString().split('T')[0],
          assignment_notes: assignmentForm.assignment_notes
        }),
      });

      if (response.ok) {
        // Refresh assets data
        const assetsResponse = await fetch("/api/assets");
        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json();
          setAssets(assetsData);
          setFilteredAssets(assetsData);
        }
        // Close modal and reset state
        setShowAssignModal(false);
        setAssetToAssign(null);
        setAssignmentForm({ user_id: "", assignment_notes: "" });
      }
    } catch (error) {
      console.error("Error assigning asset:", error);
    }
  };

  const handleAssetUpdated = (updatedAsset: AssetWithDetails) => {
    // Update the assets in state
    const updatedAssets = assets.map(asset => 
      asset.id === updatedAsset.id ? updatedAsset : asset
    );
    setAssets(updatedAssets);
    setFilteredAssets(updatedAssets);
    
    // If the selected asset is the one being updated, update it too
    if (selectedAsset && selectedAsset.id === updatedAsset.id) {
      setSelectedAsset(updatedAsset);
    }
  };

  const handleReturnAsset = async (assetId: number) => {
    try {
      const response = await fetch(`/api/assets/${assetId}/return`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_date: new Date().toISOString().split('T')[0],
          return_notes: ""
        }),
      });

      if (response.ok) {
        // Refresh assets data
        const assetsResponse = await fetch("/api/assets");
        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json();
          setAssets(assetsData);
          setFilteredAssets(assetsData);
        }
        setSelectedAsset(null);
      }
    } catch (error) {
      console.error("Error returning asset:", error);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando activos...</p>
      </div>
    );
  }

  const isHR = user?.profile?.role === 'HR';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETIRED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <CheckCircle className="w-4 h-4" />;
      case 'ASSIGNED':
        return <User className="w-4 h-4" />;
      case 'MAINTENANCE':
        return <Wrench className="w-4 h-4" />;
      case 'RETIRED':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Disponible';
      case 'ASSIGNED':
        return 'Asignado';
      case 'MAINTENANCE':
        return 'Mantenimiento';
      case 'RETIRED':
        return 'Retirado';
      default:
        return status;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return 'bg-emerald-100 text-emerald-800';
      case 'GOOD':
        return 'bg-green-100 text-green-800';
      case 'FAIR':
        return 'bg-yellow-100 text-yellow-800';
      case 'POOR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return 'Excelente';
      case 'GOOD':
        return 'Bueno';
      case 'FAIR':
        return 'Regular';
      case 'POOR':
        return 'Malo';
      default:
        return condition;
    }
  };

  

  const totalAssets = assets.length;
  const availableAssets = assets.filter(a => a.status === 'AVAILABLE').length;
  const assignedAssets = assets.filter(a => a.status === 'ASSIGNED').length;
  const maintenanceAssets = assets.filter(a => a.status === 'MAINTENANCE').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <Package className="w-8 h-8 mr-3 text-blue-600" />
                {isHR ? 'Gestión de Activos' : 'Activos Asignados'}
              </h1>
              <p className="text-gray-600">
                {isHR ? 'Administra el inventario de activos y equipamiento' : 'Consulta los activos asignados a tu nombre'}
              </p>
            </div>
            {isHR && (
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors shadow-sm"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Generar Reporte
                </button>
                <button 
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Activo
                </button>
              </div>
            )}
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
                  placeholder="Buscar activos por nombre, código, marca, modelo o serie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {isHR ? (
                    <>
                      <option value="ALL">Todos los estados</option>
                      <option value="AVAILABLE">Disponibles</option>
                      <option value="ASSIGNED">Asignados</option>
                      <option value="MAINTENANCE">En Mantenimiento</option>
                      <option value="RETIRED">Retirados</option>
                    </>
                  ) : (
                    <>
                      <option value="ALL">Todos mis equipos</option>
                      <option value="ASSIGNED">En uso</option>
                      <option value="MAINTENANCE">En Mantenimiento</option>
                    </>
                  )}
                </select>
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id.toString()}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {isHR ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Activos</p>
                  <p className="text-2xl font-bold text-gray-900">{totalAssets}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Disponibles</p>
                  <p className="text-2xl font-bold text-gray-900">{availableAssets}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Asignados</p>
                  <p className="text-2xl font-bold text-gray-900">{assignedAssets}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Wrench className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Mantenimiento</p>
                  <p className="text-2xl font-bold text-gray-900">{maintenanceAssets}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Mis Equipos</p>
                  <p className="text-2xl font-bold text-gray-900">{totalAssets}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En Buen Estado</p>
                  <p className="text-2xl font-bold text-gray-900">{assets.filter(a => a.condition_status === 'GOOD' || a.condition_status === 'EXCELLENT').length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Wrench className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En Mantenimiento</p>
                  <p className="text-2xl font-bold text-gray-900">{assets.filter(a => a.status === 'MAINTENANCE').length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6 flex flex-col h-full min-h-[400px]">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2 flex-wrap">
                        <Monitor className="w-5 h-5 text-gray-400" />
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          {asset.asset_code}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {asset.category_name}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {asset.name}
                      </h3>
                      {(asset.brand || asset.model) && (
                        <p className="text-sm text-gray-600 mb-2">
                          {asset.brand} {asset.model}
                        </p>
                      )}
                      {asset.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {asset.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(asset.status)}`}>
                        {getStatusIcon(asset.status)}
                        <span className="ml-1">{getStatusText(asset.status)}</span>
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(asset.condition_status)}`}>
                        {getConditionText(asset.condition_status)}
                      </span>
                    </div>
                    
                    {asset.location && (
                      <div className="flex items-center text-xs text-gray-500">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span>{asset.location}</span>
                      </div>
                    )}
                    
                    {asset.assigned_to_name && isHR && (
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="w-3 h-3 mr-1" />
                        <span>Asignado a: {asset.assigned_to_name}</span>
                      </div>
                    )}
                    
                    {!isHR && asset.assigned_date && (
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="w-3 h-3 mr-1" />
                        <span>Asignado desde: {formatDateShort(asset.assigned_date)}</span>
                      </div>
                    )}
                    
                    {asset.purchase_date && (
                      <div className="text-xs text-gray-500">
                        <p>Comprado: {formatDateShort(asset.purchase_date)}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Botones en la parte inferior */}
                <div className="border-t pt-4 mt-auto">
                  <div className="flex flex-col space-y-2">
                    <button 
                      onClick={() => setSelectedAsset(asset)}
                      className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      Ver Detalle
                    </button>
                    {isHR && (
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => {
                            setAssetToEdit(asset);
                            setShowEditModal(true);
                          }}
                          className="inline-flex items-center justify-center px-2 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200 transition-colors"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </button>
                        <button 
                          onClick={() => {
                            setAssetForHistory(asset);
                            setShowHistoryModal(true);
                          }}
                          className="inline-flex items-center justify-center px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors"
                        >
                          <History className="w-3 h-3 mr-1" />
                          Historial
                        </button>
                        <button 
                          onClick={() => setSelectedAsset(asset)}
                          className="inline-flex items-center justify-center px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Gestionar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredAssets.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || filterStatus !== "ALL" || filterCategory !== "ALL" 
                ? 'No se encontraron activos' 
                : isHR 
                  ? 'No hay activos registrados'
                  : 'No tienes equipos asignados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== "ALL" || filterCategory !== "ALL" 
                ? 'Prueba con otros términos de búsqueda o filtros.'
                : isHR 
                  ? 'Comienza registrando el primer activo.' 
                  : 'Los equipos tecnológicos asignados a tu nombre aparecerán aquí. Contacta a RRHH si necesitas algún equipo.'
              }
            </p>
          </div>
        )}
      </div>

      {/* New Asset Modal */}
      {showForm && isHR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Registrar Nuevo Activo</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código del Activo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAsset.asset_code}
                    onChange={(e) => setNewAsset({ ...newAsset, asset_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ACT-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Activo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Laptop Dell Inspiron"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    value={newAsset.description}
                    onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción detallada del activo..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría *
                  </label>
                  <select
                    required
                    value={newAsset.category_id}
                    onChange={(e) => setNewAsset({ ...newAsset, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={newAsset.brand}
                    onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dell, HP, Lenovo..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={newAsset.model}
                    onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Inspiron 3000, ThinkPad T480..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Serie
                  </label>
                  <input
                    type="text"
                    value={newAsset.serial_number}
                    onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ABC123XYZ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Compra
                  </label>
                  <input
                    type="date"
                    value={newAsset.purchase_date}
                    onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo de Compra (USD $)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAsset.purchase_cost}
                    onChange={(e) => setNewAsset({ ...newAsset, purchase_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="500.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={newAsset.location}
                    onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Oficina Central, Almacén..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vencimiento de Garantía
                  </label>
                  <input
                    type="date"
                    value={newAsset.warranty_expiry_date}
                    onChange={(e) => setNewAsset({ ...newAsset, warranty_expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas Adicionales
                  </label>
                  <textarea
                    rows={3}
                    value={newAsset.notes}
                    onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Observaciones adicionales sobre el activo..."
                  />
                </div>

                {/* Factura */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factura de Compra
                  </label>
                  {newAsset.invoice_url ? (
                    <div className="flex items-center space-x-3">
                      <a
                        href={newAsset.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Ver Factura
                      </a>
                      <button
                        type="button"
                        onClick={() => setNewAsset({ ...newAsset, invoice_url: "" })}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <label className="cursor-pointer inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingInvoice ? 'Subiendo...' : 'Subir Factura'}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleInvoiceUpload}
                          disabled={uploadingInvoice}
                          className="hidden"
                        />
                      </label>
                      <span className="ml-3 text-xs text-gray-500">PDF, JPG o PNG</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Registrar Activo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && assetToAssign && isHR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Asignar Activo: {assetToAssign.name}</h3>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleAssignAsset(assetToAssign.id, parseInt(assignmentForm.user_id));
            }} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Empleado *
                  </label>
                  <select
                    required
                    value={assignmentForm.user_id}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, user_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar empleado</option>
                    {employees.filter(emp => emp.status === 'ACTIVE').map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} - {employee.position || 'Sin posición'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas de Asignación
                  </label>
                  <textarea
                    rows={3}
                    value={assignmentForm.assignment_notes}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, assignment_notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Notas adicionales sobre la asignación..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssetToAssign(null);
                    setAssignmentForm({ user_id: "", assignment_notes: "" });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Asignar Activo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenanceModal && assetToMaintain && isHR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Programar Mantenimiento: {assetToMaintain.name}</h3>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const response = await fetch("/api/asset-maintenance", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    asset_id: assetToMaintain.id,
                    ...maintenanceForm,
                    cost: maintenanceForm.cost ? parseFloat(maintenanceForm.cost) : null,
                  }),
                });

                if (response.ok) {
                  setShowMaintenanceModal(false);
                  setAssetToMaintain(null);
                  setMaintenanceForm({
                    maintenance_type: "",
                    description: "",
                    maintenance_date: "",
                    cost: "",
                    performed_by: "",
                    next_maintenance_date: "",
                    notes: ""
                  });
                  // Refresh assets data
                  const assetsResponse = await fetch("/api/assets");
                  if (assetsResponse.ok) {
                    const assetsData = await assetsResponse.json();
                    setAssets(assetsData);
                    setFilteredAssets(assetsData);
                  }
                }
              } catch (error) {
                console.error("Error scheduling maintenance:", error);
              }
            }} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Mantenimiento *
                  </label>
                  <select
                    required
                    value={maintenanceForm.maintenance_type}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenance_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="PREVENTIVO">Mantenimiento Preventivo</option>
                    <option value="CORRECTIVO">Mantenimiento Correctivo</option>
                    <option value="REVISION">Revisión General</option>
                    <option value="ACTUALIZACION">Actualización/Upgrade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={maintenanceForm.description}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción del mantenimiento a realizar..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Mantenimiento *
                    </label>
                    <input
                      type="date"
                      required
                      value={maintenanceForm.maintenance_date}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenance_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Costo (USD $)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={maintenanceForm.cost}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Realizado por
                  </label>
                  <input
                    type="text"
                    value={maintenanceForm.performed_by}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performed_by: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Técnico o empresa responsable"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Próximo Mantenimiento
                  </label>
                  <input
                    type="date"
                    value={maintenanceForm.next_maintenance_date}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, next_maintenance_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas Adicionales
                  </label>
                  <textarea
                    rows={2}
                    value={maintenanceForm.notes}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Observaciones adicionales..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowMaintenanceModal(false);
                    setAssetToMaintain(null);
                    setMaintenanceForm({
                      maintenance_type: "",
                      description: "",
                      maintenance_date: "",
                      cost: "",
                      performed_by: "",
                      next_maintenance_date: "",
                      notes: ""
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                >
                  Programar Mantenimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalle del Activo: {selectedAsset.name}
                </h3>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Código</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedAsset.asset_code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Categoría</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedAsset.category_name}</p>
                </div>
              </div>
              
              {selectedAsset.description && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2">Descripción</p>
                  <p className="text-gray-700">{selectedAsset.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                {selectedAsset.brand && (
                  <div>
                    <p className="text-gray-500">Marca</p>
                    <p className="font-medium">{selectedAsset.brand}</p>
                  </div>
                )}
                {selectedAsset.model && (
                  <div>
                    <p className="text-gray-500">Modelo</p>
                    <p className="font-medium">{selectedAsset.model}</p>
                  </div>
                )}
                {selectedAsset.serial_number && (
                  <div>
                    <p className="text-gray-500">Número de Serie</p>
                    <p className="font-medium">{selectedAsset.serial_number}</p>
                  </div>
                )}
                {selectedAsset.location && (
                  <div>
                    <p className="text-gray-500">Ubicación</p>
                    <p className="font-medium">{selectedAsset.location}</p>
                  </div>
                )}
                {selectedAsset.purchase_date && (
                  <div>
                    <p className="text-gray-500">Fecha de Compra</p>
                    <p className="font-medium">{formatDateShort(selectedAsset.purchase_date)}</p>
                  </div>
                )}
                {selectedAsset.warranty_expiry_date && (
                  <div>
                    <p className="text-gray-500">Garantía hasta</p>
                    <p className="font-medium">{formatDateShort(selectedAsset.warranty_expiry_date)}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedAsset.status)}`}>
                    {getStatusIcon(selectedAsset.status)}
                    <span className="ml-1">{getStatusText(selectedAsset.status)}</span>
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getConditionColor(selectedAsset.condition_status)}`}>
                    {getConditionText(selectedAsset.condition_status)}
                  </span>
                </div>
                
                
              </div>

              {selectedAsset.assigned_to_name && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-blue-400 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Actualmente Asignado</h4>
                      <p className="text-sm text-blue-700">
                        {selectedAsset.assigned_to_name}
                        {selectedAsset.assigned_date && (
                          <span> - Desde {formatDateShort(selectedAsset.assigned_date)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedAsset.notes && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2">Notas</p>
                  <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">{selectedAsset.notes}</p>
                </div>
              )}

              {isHR && (
                <div className="border-t pt-6">
                  <div className="flex space-x-3 mb-3">
                    <button 
                      onClick={() => {
                        setAssetForHistory(selectedAsset);
                        setShowHistoryModal(true);
                        setSelectedAsset(null); // Close detail modal
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
                    >
                      <History className="w-4 h-4 mr-2 inline" />
                      Ver Historial Completo
                    </button>
                  </div>
                  <div className="flex space-x-3">
                    {selectedAsset.status === 'AVAILABLE' ? (
                      <button 
                        onClick={() => {
                          setAssetToAssign(selectedAsset);
                          setShowAssignModal(true);
                          setSelectedAsset(null); // Close detail modal
                        }}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Asignar Empleado
                      </button>
                    ) : selectedAsset.status === 'ASSIGNED' ? (
                      <button 
                        onClick={() => handleReturnAsset(selectedAsset.id)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors"
                      >
                        Marcar como Devuelto
                      </button>
                    ) : null}
                    
                    <button 
                      onClick={() => {
                        setAssetToMaintain(selectedAsset);
                        setShowMaintenanceModal(true);
                        setSelectedAsset(null); // Close detail modal
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                    >
                      Programar Mantenimiento
                    </button>
                    <button 
                      onClick={() => {
                        setAssetToEdit(selectedAsset);
                        setShowEditModal(true);
                        setSelectedAsset(null); // Close detail modal
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-1 inline" />
                      Editar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Asset History Modal */}
      {assetForHistory && (
        <AssetHistoryModal
          asset={assetForHistory}
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setAssetForHistory(null);
          }}
        />
      )}

      {/* Asset Edit Modal */}
      <AssetEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setAssetToEdit(null);
        }}
        onSave={handleAssetUpdated}
        asset={assetToEdit}
        categories={categories}
      />

      {/* Asset Report Modal */}
      {isHR && (
        <AssetReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          categories={categories}
          employees={employees}
        />
      )}
    </div>
  );
}
