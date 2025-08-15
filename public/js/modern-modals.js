/**
 * Modern Modal Enhancement Script
 * Provides consistent behavior for all modals across the app
 */

class ModernModal {
  constructor(modalElement) {
    this.modal = modalElement;
    this.init();
  }

  init() {
    if (!this.modal) return;
    
    // Ensure proper structure
    this.ensureStructure();
    
    // Add modern classes
    this.addModernClasses();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Handle backdrop clicks
    this.setupBackdropClick();
    
    // Handle ESC key
    this.setupEscapeKey();
    
    // Prevent body scroll when modal is open
    this.setupScrollLock();
  }

  ensureStructure() {
    // Ensure modal has proper backdrop structure
    if (!this.modal.classList.contains('modal-backdrop')) {
      this.modal.classList.add('modal-backdrop');
    }
  }

  addModernClasses() {
    // Add modern styling classes if not present
    const content = this.modal.querySelector('.modal-content, .image-picker-content');
    if (content && !content.classList.contains('modern-modal-content')) {
      content.classList.add('modern-modal-content');
    }
  }

  setupEventListeners() {
    // Find all close buttons
    const closeButtons = this.modal.querySelectorAll(
      '.close-button, #closeModalBtn, [id*="close"], [class*="close"]'
    );
    
    closeButtons.forEach(btn => {
      if (btn && !btn.dataset.modernModalListener) {
        btn.addEventListener('click', () => this.hide());
        btn.dataset.modernModalListener = 'true';
      }
    });
  }

  setupBackdropClick() {
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });
  }

  setupEscapeKey() {
    if (!this.modal.dataset.escapeListener) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isVisible()) {
          this.hide();
        }
      });
      this.modal.dataset.escapeListener = 'true';
    }
  }

  setupScrollLock() {
    this.modal.addEventListener('transitionstart', (e) => {
      if (e.target === this.modal && this.isVisible()) {
        document.body.style.overflow = 'hidden';
      }
    });
    
    this.modal.addEventListener('transitionend', (e) => {
      if (e.target === this.modal && !this.isVisible()) {
        document.body.style.overflow = '';
      }
    });
  }

  show() {
    this.modal.style.display = 'flex';
    // Force reflow for animation
    this.modal.offsetHeight;
    this.modal.classList.add('show');
    this.modal.classList.remove('hidden');
    
    // Focus management for accessibility
    const firstFocusable = this.modal.querySelector(
      'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 100);
    }
    
    // Dispatch custom event
    this.modal.dispatchEvent(new CustomEvent('modal:show'));
  }

  hide() {
    this.modal.classList.remove('show');
    this.modal.classList.add('hidden');
    
    setTimeout(() => {
      this.modal.style.display = 'none';
    }, 200);
    
    // Dispatch custom event
    this.modal.dispatchEvent(new CustomEvent('modal:hide'));
  }

  isVisible() {
    return this.modal.classList.contains('show') || 
           (this.modal.style.display === 'flex' && !this.modal.classList.contains('hidden'));
  }

  toggle() {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Auto-initialize modals when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeModernModals();
});

// Function to initialize all modals
function initializeModernModals() {
  const modalSelectors = [
    '#blockModal',
    '#editor-modal',
    '#preview-modal', 
    '#upload-modal',
    '#image-picker-modal',
    '#new-shared-block-modal',
    '#create-folder-modal',
    '.modal',
    '.modal-backdrop'
  ];
  
  modalSelectors.forEach(selector => {
    const modals = document.querySelectorAll(selector);
    modals.forEach(modal => {
      if (!modal.modernModal) {
        modal.modernModal = new ModernModal(modal);
      }
    });
  });
}

// Utility function to show modal by ID
window.showModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal && modal.modernModal) {
    modal.modernModal.show();
  } else if (modal) {
    // Fallback for modals not yet initialized
    modal.style.display = 'flex';
    modal.classList.add('show');
    modal.classList.remove('hidden');
  }
};

// Utility function to hide modal by ID
window.hideModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal && modal.modernModal) {
    modal.modernModal.hide();
  } else if (modal) {
    // Fallback for modals not yet initialized
    modal.classList.remove('show');
    modal.classList.add('hidden');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 200);
  }
};

// Enhanced modal functions for backward compatibility
window.openModal = window.showModal;
window.closeModal = window.hideModal;

// Re-initialize modals if new ones are added dynamically
window.reinitializeModals = initializeModernModals;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ModernModal, initializeModernModals };
}