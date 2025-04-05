// Common utility functions

/**
 * Format a date string in a user-friendly format
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Format a number as a percentage
 * @param {number} value - Value to format (0-100)
 * @returns {string} - Formatted percentage
 */
function formatPercentage(value) {
  if (value === undefined || value === null) return 'N/A';
  return `${Math.round(value)}%`;
}

/**
 * Get color class based on score value
 * @param {number} score - Score value (0-100)
 * @returns {string} - Bootstrap color class
 */
function getScoreColorClass(score) {
  if (score >= 80) return 'bg-success';
  if (score >= 60) return 'bg-info';
  if (score >= 40) return 'bg-warning';
  return 'bg-danger';
}

/**
 * Get color for chart based on index
 * @param {number} index - Index in the data array
 * @returns {string} - CSS color
 */
function getChartColor(index) {
  const colors = [
    'rgba(75, 192, 192, 0.7)',
    'rgba(54, 162, 235, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
    'rgba(255, 99, 132, 0.7)',
    'rgba(201, 203, 207, 0.7)'
  ];
  return colors[index % colors.length];
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Bootstrap context (success, danger, etc.)
 */
function showToast(message, type = 'success') {
  // Create toast container if it doesn't exist
  if (!document.getElementById('toast-container')) {
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '5';
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toastId = `toast-${Date.now()}`;
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  
  // Add toast to container
  document.getElementById('toast-container').innerHTML += toastHtml;
  
  // Initialize and show toast
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
  toast.show();
  
  // Remove toast after it's hidden
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

/**
 * Format file size in a human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Handle API errors and display appropriate messages
 * @param {Error} error - Error object
 */
function handleApiError(error) {
  console.error('API Error:', error);
  
  if (error.response) {
    // Server responded with an error status
    const message = error.response.data?.detail || 'An error occurred. Please try again.';
    showToast(message, 'danger');
  } else if (error.request) {
    // Request was made but no response received
    showToast('Network error. Please check your connection.', 'danger');
  } else {
    // Error in setting up the request
    showToast('An error occurred. Please try again.', 'danger');
  }
}

// Initialize popovers and tooltips when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize any popovers
  const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
  });
  
  // Initialize any tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});
