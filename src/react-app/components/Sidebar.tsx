import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "@/react-app/contexts/AuthContext";
import {
  Users,
  FileText,
  ClipboardList,
  CreditCard,
  BarChart,
  Calendar,
  MessageSquare,
  Package,
  Cake,
  LogOut,
  Menu,
  X,
  Home,
  AlertCircle,
  UserPlus,
  User,
  Settings,
  Receipt,
  Send,
  Database,
} from "lucide-react";
import type { EnhancedUser } from "@/shared/types";
import usePermissions, { PERMISSIONS } from "@/react-app/hooks/usePermissions";

interface SidebarProps {
  user: EnhancedUser | null;
  isHR: boolean;
}

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  color: string;
}

export default function Sidebar({ user, isHR }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { can } = usePermissions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const employeeMenuItems: MenuItem[] = [
    { icon: Home, label: "Inicio", href: "/dashboard", color: "text-gray-600" },
    { icon: User, label: "Mi Perfil", href: "/profile", color: "text-purple-600" },
    { icon: MessageSquare, label: "Chat con RRHH", href: "/chat", color: "text-blue-600" },
    { icon: ClipboardList, label: "Mis Solicitudes", href: "/requests", color: "text-green-600" },
    { icon: FileText, label: "Documentos", href: "/documents", color: "text-purple-600" },
    { icon: CreditCard, label: "Mis Préstamos", href: "/loans", color: "text-orange-600" },
    { icon: Receipt, label: "Recibos de Pago", href: "/payslips", color: "text-indigo-600" },
    { icon: Package, label: "Mis Equipos", href: "/assets", color: "text-yellow-600" },
    { icon: BarChart, label: "Evaluaciones", href: "/evaluations", color: "text-teal-600" },
    { icon: Calendar, label: "Eventos", href: "/events", color: "text-indigo-600" },
    { icon: Cake, label: "Cumpleañeros", href: "/birthdays", color: "text-pink-600" },
    { icon: AlertCircle, label: "Buzón de Quejas", href: "/complaints", color: "text-red-600" },
  ];

  const hrMenuItems: MenuItem[] = [
    { icon: Home, label: "Inicio", href: "/dashboard", color: "text-gray-600" },
    { icon: User, label: "Mi Perfil", href: "/profile", color: "text-purple-600" },
    ...(can(PERMISSIONS.CHAT_VIEW_ALL_CONVERSATIONS) ? [{ icon: MessageSquare, label: "Chat General", href: "/chat", color: "text-blue-600" }] : []),
    ...(can(PERMISSIONS.EMPLOYEE_VIEW) ? [{ icon: Users, label: "Empleados", href: "/employees", color: "text-green-600" }] : []),
    ...(isHR ? [{ icon: UserPlus, label: "Selección Personal", href: "/recruitment", color: "text-purple-600" }] : []),
    ...(can(PERMISSIONS.REQUEST_VIEW_ALL) ? [{ icon: ClipboardList, label: "Solicitudes", href: "/requests", color: "text-blue-600" }] : []),
    ...(can(PERMISSIONS.REQUEST_VIEW_REPORTS) ? [{ icon: BarChart, label: "Tiempos de Respuesta", href: "/request-reports", color: "text-indigo-600" }] : []),
    ...(can(PERMISSIONS.DOCUMENT_VIEW_ALL) ? [{ icon: FileText, label: "Documentos", href: "/documents", color: "text-orange-600" }] : []),
    ...(can(PERMISSIONS.LOAN_VIEW_ALL) ? [{ icon: CreditCard, label: "Préstamos", href: "/loans", color: "text-teal-600" }] : []),
    ...(can(PERMISSIONS.PAYSLIP_VIEW_ALL) ? [{ icon: Receipt, label: "Recibos de Pago", href: "/payslips", color: "text-indigo-600" }] : []),
    ...(can(PERMISSIONS.EVALUATION_VIEW_ALL) ? [{ icon: BarChart, label: "Evaluaciones", href: "/evaluations", color: "text-indigo-600" }] : []),
    ...(can(PERMISSIONS.EVENT_VIEW_ALL) ? [{ icon: Calendar, label: "Eventos", href: "/events", color: "text-pink-600" }] : []),
    { icon: Cake, label: "Cumpleañeros", href: "/birthdays", color: "text-pink-500" },
    ...(can(PERMISSIONS.COMPLAINT_VIEW_ALL) ? [{ icon: AlertCircle, label: "Quejas", href: "/complaints", color: "text-red-600" }] : []),
    ...(can(PERMISSIONS.ASSET_VIEW_ALL) ? [{ icon: Package, label: "Activos", href: "/assets", color: "text-yellow-600" }] : []),
    ...(isHR ? [{ icon: Send, label: "WhatsApp", href: "/whatsapp-settings", color: "text-green-600" }] : []),
    ...(can(PERMISSIONS.HR_ADMIN) ? [{ icon: Database, label: "Copias de Seguridad", href: "/backups", color: "text-cyan-600" }] : []),
    ...(can(PERMISSIONS.HR_ADMIN) ? [{ icon: Settings, label: "Permisos", href: "/permissions", color: "text-gray-600" }] : []),
  ].filter(Boolean) as MenuItem[];

  const menuItems = isHR ? hrMenuItems : employeeMenuItems;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isActive = (href: string) => location.pathname === href;

  const SidebarContent = () => (
    <>
      {/* Logo and Title */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Portal RRHH</h1>
            {isHR && (
              <span className="text-xs text-blue-600 font-medium">Administrador</span>
            )}
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <img
            src={user?.google_user_data?.picture || '/default-avatar.png'}
            alt="Avatar"
            className="w-12 h-12 rounded-full border-2 border-gray-200"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.profile?.first_name} {user?.profile?.last_name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.profile?.position || 'Empleado'}
            </p>
            {user?.profile?.department && (
              <p className="text-xs text-gray-400 truncate">
                {user?.profile?.department}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => {
                navigate(item.href);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                active
                  ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? 'text-blue-600' : item.color}`} />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-600" />
        ) : (
          <Menu className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 shadow-sm flex flex-col z-40 transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
