import { CheckCircle, AlertTriangle, Info, HelpCircle, Loader2, XCircle } from "lucide-react";
import React from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  type?: 'info' | 'warning' | 'error' | 'success' | 'confirm';
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = "Confirmar",
  cancelButtonText = "Cancelar",
  type = 'confirm',
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-600" />;
      case 'confirm':
      default:
        return <HelpCircle className="h-6 w-6 text-gray-500" />;
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case 'success': return 'bg-green-100';
      case 'warning': return 'bg-yellow-100';
      case 'error': return 'bg-red-100';
      case 'info': return 'bg-blue-100';
      case 'confirm':
      default: return 'bg-gray-100';
    }
  };

  const getConfirmButtonColor = () => {
    switch (type) {
      case 'success': return 'bg-green-600 hover:bg-green-700';
      case 'error': return 'bg-red-600 hover:bg-red-700';
      case 'warning': return 'bg-yellow-600 hover:bg-yellow-700';
      case 'info': 
      case 'confirm':
      default: return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const showCancelButton = type === 'confirm' || type === 'warning' || type === 'error';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 mx-4 shadow-xl">
        <div className="text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${getIconBgColor()} mb-4`}>
            {getIcon()}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {title}
          </h3>
          <div className="text-sm text-gray-500 mb-6">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>
          
          <div className={`flex ${showCancelButton ? 'justify-center space-x-3' : 'justify-center'}`}>
            {showCancelButton && onConfirm && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {cancelButtonText}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                isLoading ? 'bg-gray-400' : getConfirmButtonColor()
              }`}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {confirmButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
