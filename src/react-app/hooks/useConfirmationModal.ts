import { useState, useCallback } from 'react';

interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  type: 'info' | 'warning' | 'error' | 'success' | 'confirm';
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm?: () => void | Promise<void>;
  isLoading?: boolean;
}

export function useConfirmationModal() {
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = useCallback((
    title: string,
    message: string | React.ReactNode,
    type: 'info' | 'warning' | 'error' | 'success' = 'info'
  ) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      confirmButtonText: 'Entendido',
    });
  }, []);

  const showConfirm = useCallback((
    title: string,
    message: string | React.ReactNode,
    onConfirm: () => void | Promise<void>,
    options?: {
      type?: 'warning' | 'error' | 'confirm';
      confirmButtonText?: string;
      cancelButtonText?: string;
    }
  ) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: options?.type || 'confirm',
      confirmButtonText: options?.confirmButtonText || 'Confirmar',
      cancelButtonText: options?.cancelButtonText || 'Cancelar',
      onConfirm,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (modalConfig.onConfirm) {
      setModalConfig(prev => ({ ...prev, isLoading: true }));
      try {
        await modalConfig.onConfirm();
        setModalConfig(prev => ({ ...prev, isLoading: false, isOpen: false }));
      } catch (error) {
        console.error('Error in confirmation action:', error);
        setModalConfig(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      closeModal();
    }
  }, [modalConfig.onConfirm, closeModal]);

  return {
    modalConfig,
    showAlert,
    showConfirm,
    closeModal,
    handleConfirm,
  };
}
