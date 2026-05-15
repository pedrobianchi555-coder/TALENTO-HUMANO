import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

/**
 * Hook para manejar el timeout de sesión por inactividad
 * 
 * @param timeoutMinutes - Minutos de inactividad antes de cerrar sesión (default: 30)
 * @param warningMinutes - Minutos antes del timeout para mostrar advertencia (default: 5)
 */
export function useSessionTimeout(
  timeoutMinutes: number = 30,
  warningMinutes: number = 5
) {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Eventos que cuentan como actividad
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  const logout = useCallback(async () => {
    try {
      // Llamar al endpoint de logout
      await fetch('/api/logout');
      
      // Limpiar localStorage
      localStorage.removeItem('sessionTimeout');
      
      // Redirigir a home
      navigate('/', { replace: true });
      
      // Recargar para limpiar estado
      window.location.reload();
    } catch (error) {
      console.error('Error during logout:', error);
      // Redirigir de todas formas
      navigate('/', { replace: true });
      window.location.reload();
    }
  }, [navigate]);

  const showWarning = useCallback(() => {
    setShowWarningModal(true);
  }, []);

  const handleContinueSession = useCallback(() => {
    setShowWarningModal(false);
    resetTimeout();
  }, []);

  const handleLogoutNow = useCallback(() => {
    setShowWarningModal(false);
    logout();
  }, [logout]);

  const resetTimeout = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    
    // Guardar timestamp en localStorage para persistencia entre pestañas
    localStorage.setItem('sessionTimeout', now.toString());

    // Limpiar temporizadores existentes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Configurar advertencia
    const warningTime = (timeoutMinutes - warningMinutes) * 60 * 1000;
    warningTimeoutRef.current = setTimeout(showWarning, warningTime);

    // Configurar logout automático
    const logoutTime = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(logout, logoutTime);
  }, [timeoutMinutes, warningMinutes, showWarning, logout]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Solo reiniciar si ha pasado al menos 1 segundo desde la última actividad
    // Esto evita reiniciar el temporizador demasiado frecuentemente
    if (timeSinceLastActivity > 1000) {
      resetTimeout();
    }
  }, [resetTimeout]);

  // Sincronizar entre pestañas
  const handleStorageChange = useCallback((e: StorageEvent) => {
    if (e.key === 'sessionTimeout' && e.newValue) {
      const timestamp = parseInt(e.newValue);
      if (!isNaN(timestamp)) {
        lastActivityRef.current = timestamp;
        resetTimeout();
      }
    }
  }, [resetTimeout]);

  useEffect(() => {
    // Configurar listeners de actividad
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Listener para sincronización entre pestañas
    window.addEventListener('storage', handleStorageChange);

    // Iniciar temporizador
    resetTimeout();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [handleActivity, handleStorageChange, resetTimeout]);

  return {
    resetTimeout,
    logout,
    showWarningModal,
    warningMinutes,
    handleContinueSession,
    handleLogoutNow
  };
}
