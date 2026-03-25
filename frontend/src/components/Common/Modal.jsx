// components/Common/Modal.jsx - COMPLETE PRODUCTION-READY VERSION
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

/**
 * Modal component with animations and accessibility features
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnClickOutside = true,
  closeOnEsc = true,
  footer,
  animation = 'slideUp',
  className = '',
  overlayClassName = '',
  contentClassName = '',
}) => {
  const [isClosing, setIsClosing] = useState(false);

  // Animation class maps
  const animations = {
    fade: {
      overlay: 'animate-fadeIn',
      content: 'animate-fadeIn',
    },
    slideUp: {
      overlay: 'animate-fadeIn',
      content: 'animate-slideUp',
    },
    slideDown: {
      overlay: 'animate-fadeIn',
      content: 'animate-slideDown',
    },
    slideLeft: {
      overlay: 'animate-fadeIn',
      content: 'animate-slideLeft',
    },
    slideRight: {
      overlay: 'animate-fadeIn',
      content: 'animate-slideRight',
    },
    scale: {
      overlay: 'animate-fadeIn',
      content: 'animate-scaleIn',
    },
    rotate: {
      overlay: 'animate-fadeIn',
      content: 'animate-rotateIn',
    },
    flip: {
      overlay: 'animate-fadeIn',
      content: 'animate-flipIn',
    },
  };

  const exitAnimations = {
    fade: {
      overlay: 'animate-fadeOut',
      content: 'animate-fadeOut',
    },
    slideUp: {
      overlay: 'animate-fadeOut',
      content: 'animate-slideDownOut',
    },
    slideDown: {
      overlay: 'animate-fadeOut',
      content: 'animate-slideUpOut',
    },
    slideLeft: {
      overlay: 'animate-fadeOut',
      content: 'animate-slideRightOut',
    },
    slideRight: {
      overlay: 'animate-fadeOut',
      content: 'animate-slideLeftOut',
    },
    scale: {
      overlay: 'animate-fadeOut',
      content: 'animate-scaleOut',
    },
    rotate: {
      overlay: 'animate-fadeOut',
      content: 'animate-rotateOut',
    },
    flip: {
      overlay: 'animate-fadeOut',
      content: 'animate-flipOut',
    },
  };

  const sizes = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-[90vw] w-full',
  };

  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closeOnEsc]);

  // Close with animation guard
  const handleClose = () => {
    if (isClosing) return; // prevent multiple close calls during animation
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200); // match animation duration
  };

  // Click outside handler
  const handleOverlayClick = (e) => {
    if (closeOnClickOutside && e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Don't render if not open and not closing
  if (!isOpen && !isClosing) return null;

  // Get animation classes based on state
  const getAnimationClasses = () => {
    if (isClosing) {
      return {
        overlay: exitAnimations[animation]?.overlay || 'animate-fadeOut',
        content: exitAnimations[animation]?.content || 'animate-fadeOut',
      };
    }
    return {
      overlay: animations[animation]?.overlay || 'animate-fadeIn',
      content: animations[animation]?.content || 'animate-slideUp',
    };
  };

  const animClasses = getAnimationClasses();

  return createPortal(
    <div
      className={`fixed inset-0 z-50 overflow-y-auto ${overlayClassName}`}
      onClick={handleOverlayClick}
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className={`fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 ${animClasses.overlay}`}
          aria-hidden="true"
        />

        {/* Modal panel */}
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div
          className={`
            inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl
            transform transition-all sm:my-8 sm:align-middle sm:w-full ${sizes[size]}
            ${animClasses.content}
            ${contentClassName}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className={`px-6 py-4 ${className}`}>{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node,
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', 'full']),
  showCloseButton: PropTypes.bool,
  closeOnClickOutside: PropTypes.bool,
  closeOnEsc: PropTypes.bool,
  footer: PropTypes.node,
  animation: PropTypes.oneOf([
    'fade',
    'slideUp',
    'slideDown',
    'slideLeft',
    'slideRight',
    'scale',
    'rotate',
    'flip',
  ]),
  className: PropTypes.string,
  overlayClassName: PropTypes.string,
  contentClassName: PropTypes.string,
};

// ==================== CONFIRMATION MODAL ====================
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  size = 'sm',
  ...props
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : confirmVariant === 'success'
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      }
      {...props}
    >
      <p className="text-gray-600">{message}</p>
    </Modal>
  );
};

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  confirmVariant: PropTypes.oneOf(['danger', 'success', 'primary']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', 'full']),
};

// ==================== DRAWER MODAL ====================
export const DrawerModal = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
  className = '',
  ...props
}) => {
  const positions = {
    left: 'left-0 top-0 h-full transform -translate-x-full',
    right: 'right-0 top-0 h-full transform translate-x-full',
    top: 'top-0 left-0 w-full transform -translate-y-full',
    bottom: 'bottom-0 left-0 w-full transform translate-y-full',
  };

  const sizes = {
    xs: 'w-64',
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[32rem]',
    xl: 'w-[40rem]',
    full: 'w-full',
  };

  const getPositionClasses = () => {
    if (!isOpen) return positions[position];

    switch (position) {
      case 'left':
        return 'left-0 top-0 h-full translate-x-0';
      case 'right':
        return 'right-0 top-0 h-full translate-x-0';
      case 'top':
        return 'top-0 left-0 w-full translate-y-0';
      case 'bottom':
        return 'bottom-0 left-0 w-full translate-y-0';
      default:
        return '';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity ${
          isOpen ? 'animate-fadeIn' : 'animate-fadeOut'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed bg-white shadow-xl transition-transform duration-300 ease-in-out
          ${sizes[size]}
          ${getPositionClasses()}
          ${className}
        `}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

DrawerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  position: PropTypes.oneOf(['left', 'right', 'top', 'bottom']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', 'full']),
  className: PropTypes.string,
};

export default Modal;