// Upload functionality

document.addEventListener('DOMContentLoaded', () => {
  // Initialize file upload functionality
  initializeFileUploads();
  
  // Setup form submissions
  setupFormSubmissions();
  
  // Load RFP data for bid upload
  loadRfpData();
  
  // Check for URL parameters
  checkUrlParameters();
});

/**
 * Initialize file upload UI interactions
 */
function initializeFileUploads() {
  // RFP file upload
  setupFileUpload('rfp-upload-area', 'rfp-file', 'rfp-browse-btn', 'rfp-file-info', 'rfp-filename', 'rfp-filesize', 'rfp-remove-file');
  
  // Bid file upload
  setupFileUpload('bid-upload-area', 'bid-file', 'bid-browse-btn', 'bid-file-info', 'bid-filename', 'bid-filesize', 'bid-remove-file');
}

/**
 * Setup file upload UI for a specific upload area
 * @param {string} uploadAreaId - ID of the upload area div
 * @param {string} fileInputId - ID of the file input element
 * @param {string} browseBtnId - ID of the browse button
 * @param {string} fileInfoId - ID of the file info container
 * @param {string} filenameId - ID of the filename display element
 * @param {string} filesizeId - ID of the filesize display element
 * @param {string} removeFileId - ID of the remove file button
 */
function setupFileUpload(uploadAreaId, fileInputId, browseBtnId, fileInfoId, filenameId, filesizeId, removeFileId) {
  const uploadArea = document.getElementById(uploadAreaId);
  const fileInput = document.getElementById(fileInputId);
  const browseBtn = document.getElementById(browseBtnId);
  const fileInfo = document.getElementById(fileInfoId);
  const filename = document.getElementById(filenameId);
  const filesize = document.getElementById(filesizeId);
  const removeFile = document.getElementById(removeFileId);
  
  // Browse button click
  browseBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  // File drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('border-primary');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('border-primary');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-primary');
    
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      updateFileInfo(fileInput.files[0], fileInfo, filename, filesize);
    }
  });
  
  // File selection change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      updateFileInfo(fileInput.files[0], fileInfo, filename, filesize);
    }
  });
  
  // Remove file button
  removeFile.addEventListener('click', () => {
    fileInput.value = '';
    fileInfo.classList.add('d-none');
  });
}

/**
 * Update file info display
 * @param {File} file - Selected file
 * @param {HTMLElement} fileInfo - File info container element
 * @param {HTMLElement} filename - Filename display element
 * @param {HTMLElement} filesize - Filesize display element
 */
function updateFileInfo(file, fileInfo, filename, filesize) {
  if (!file) return;
  
  // Check file extension
  const extension = file.name.split('.').pop().toLowerCase();
  const allowedExtensions = ['pdf', 'docx', 'txt'];
  
  if (!allowedExtensions.includes(extension)) {
    showToast(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`, 'danger');
    return;
  }
  
  filename.textContent = file.name;
  filesize.textContent = formatFileSize(file.size);
  fileInfo.classList.remove('d-none');
}

/**
 * Setup form submission handlers
 */
function setupFormSubmissions() {
  // RFP upload form
  const rfpForm = document.getElementById('rfp-upload-form');
  rfpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmit(rfpForm, '/api/upload/rfp', 'rfp-upload-progress', 'rfp-upload-progress-container');
  });
  
  // Bid upload form
  const bidForm = document.getElementById('bid-upload-form');
  bidForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmit(bidForm, '/api/upload/bid', 'bid-upload-progress', 'bid-upload-progress-container');
  });
}

/**
 * Handle form submission
 * @param {HTMLFormElement} form - Form element
 * @param {string} endpoint - API endpoint
 * @param {string} progressBarId - ID of progress bar element
 * @param {string} progressContainerId - ID of progress container element
 */
async function handleFormSubmit(form, endpoint, progressBarId, progressContainerId) {
  // Validate file is selected
  const fileInput = form.querySelector('input[type="file"]');
  if (!fileInput.files.length) {
    showToast('Please select a file to upload', 'warning');
    return;
  }
  
  try {
    // Show progress bar
    const progressContainer = document.getElementById(progressContainerId);
    const progressBar = document.getElementById(progressBarId);
    progressContainer.classList.remove('d-none');
    progressBar.style.width = '0%';
    
    // Create FormData and append all form fields
    const formData = new FormData(form);
    
    // Make POST request with progress tracking
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percentComplete + '%';
        progressBar.setAttribute('aria-valuenow', percentComplete);
      }
    });
    
    // Create a Promise to handle the XHR response
    const uploadPromise = new Promise((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.detail || 'Upload failed'));
          } catch (error) {
            reject(new Error('Upload failed'));
          }
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });
    });
    
    // Send the request
    xhr.open('POST', endpoint);
    xhr.send(formData);
    
    // Wait for the upload to complete
    const response = await uploadPromise;
    
    // Hide progress bar
    progressContainer.classList.add('d-none');
    
    // Show success message
    const successModal = new bootstrap.Modal(document.getElementById('uploadSuccessModal'));
    const successMessage = document.getElementById('success-message');
    
    if (endpoint.includes('rfp')) {
      successMessage.textContent = 'RFP uploaded successfully! Our AI is now analyzing the document.';
    } else {
      successMessage.textContent = 'Vendor bid uploaded successfully! Our AI is now evaluating the bid against the RFP.';
    }
    
    successModal.show();
    
    // Reset form
    form.reset();
    
    // Hide file info
    const fileInfo = form.querySelector('[id$="-file-info"]');
    if (fileInfo) {
      fileInfo.classList.add('d-none');
    }
    
  } catch (error) {
    // Hide progress bar
    document.getElementById(progressContainerId).classList.add('d-none');
    
    // Show error message
    const errorModal = new bootstrap.Modal(document.getElementById('uploadErrorModal'));
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = error.message || 'There was an error uploading your document.';
    errorModal.show();
    
    console.error('Upload error:', error);
  }
}

/**
 * Load RFP data for bid upload dropdown
 */
async function loadRfpData() {
  try {
    // Fetch all RFPs from the API
    const response = await fetch('/api/rfp');
    
    if (!response.ok) {
      throw new Error('Failed to fetch RFPs');
    }
    
    const data = await response.json();
    const rfpSelect = document.getElementById('bid-rfp');
    
    // Clear existing options except the first placeholder
    while (rfpSelect.options.length > 1) {
      rfpSelect.remove(1);
    }
    
    // Add options for each RFP
    data.forEach(rfp => {
      const option = document.createElement('option');
      option.value = rfp.id;
      option.textContent = rfp.title;
      rfpSelect.appendChild(option);
    });
    
  } catch (error) {
    console.error('Error loading RFP data:', error);
    // For demo purposes, add some sample RFPs if the API fails
    const rfpSelect = document.getElementById('bid-rfp');
    
    // Clear existing options except the first placeholder
    while (rfpSelect.options.length > 1) {
      rfpSelect.remove(1);
    }
    
    // Add sample options
    const sampleRfps = [
      { id: 1, title: 'Network Infrastructure Upgrade' },
      { id: 2, title: 'Rural Broadband Expansion' },
      { id: 3, title: 'Government Cloud Services' }
    ];
    
    sampleRfps.forEach(rfp => {
      const option = document.createElement('option');
      option.value = rfp.id;
      option.textContent = rfp.title;
      rfpSelect.appendChild(option);
    });
  }
}

/**
 * Check URL parameters for pre-selected RFP
 */
function checkUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const rfpId = urlParams.get('rfp_id');
  const rfpTitle = urlParams.get('rfp_title');
  
  if (rfpId) {
    // Switch to the bid tab
    const bidTab = document.getElementById('bid-tab');
    bidTab.click();
    
    // Select the RFP in the dropdown
    const rfpSelect = document.getElementById('bid-rfp');
    for (let i = 0; i < rfpSelect.options.length; i++) {
      if (rfpSelect.options[i].value === rfpId) {
        rfpSelect.selectedIndex = i;
        break;
      }
    }
    
    // If the RFP isn't in the dropdown yet, add it
    if (rfpSelect.value !== rfpId && rfpTitle) {
      const option = document.createElement('option');
      option.value = rfpId;
      option.textContent = rfpTitle;
      rfpSelect.appendChild(option);
      rfpSelect.value = rfpId;
    }
  }
}
