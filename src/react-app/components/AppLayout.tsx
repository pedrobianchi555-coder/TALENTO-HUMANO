import { useAuth } from "@getmocha/users-service/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import Sidebar from "@/react-app/components/Sidebar";
import { useSessionTimeout } from "@/react-app/hooks/useSessionTimeout";
import SessionTimeoutModal from "@/react-app/components/SessionTimeoutModal";
import type { EnhancedUser } from "@/shared/types";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user: authUser, isPending } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Timeout de sesión por inactividad (30 minutos)
  const { 
    showWarningModal, 
    warningMinutes, 
    handleContinueSession, 
    handleLogoutNow 
  } = useSessionTimeout(30, 5);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (isPending) {
        return; // Wait for auth to complete
      }

      if (!authUser) {
        navigate("/");
        return;
      }

      try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          
          // If user doesn't have a profile, redirect to setup
          if (!userData.profile && window.location.pathname !== '/profile-setup') {
            navigate("/profile-setup");
            return;
          }
        } else {
          console.error("Failed to fetch user profile, status:", response.status);
          navigate("/");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [authUser, isPending, navigate]);

  if (isPending || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-gray-600">Cargando...</p>
      </div>
    );
  }

  // If no user at all, will redirect in useEffect
  if (!user) {
    return null;
  }

  if (!user.profile && window.location.pathname !== '/profile-setup') {
    return null; // Will redirect to profile setup
  }

  const isHR = user.profile?.role === 'HR';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={user} isHR={isHR} />
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:ml-72">
        <div className="min-h-full">
          {children}
        </div>
      </main>

      {/* Session Timeout Warning Modal */}
      <SessionTimeoutModal
        isOpen={showWarningModal}
        onContinue={handleContinueSession}
        onLogout={handleLogoutNow}
        remainingMinutes={warningMinutes}
      />
    </div>
  );
}
