document.addEventListener('DOMContentLoaded', function() {
    // Initialize chatbot if it exists
    initializeChatbot();
    
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Handle bid upload modal
    const uploadBidButtons = document.querySelectorAll('.upload-bid-btn');
    if (uploadBidButtons.length > 0) {
        uploadBidButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const rfpId = this.dataset.rfpId;
                const rfpTitle = this.dataset.rfpTitle;
                
                // Set values in the form
                document.getElementById('bid-rfp-id').value = rfpId;
                document.getElementById('bid-rfp-title').textContent = rfpTitle;
                
                // Show the modal
                const uploadBidModal = new bootstrap.Modal(document.getElementById('uploadBidModal'));
                uploadBidModal.show();
            });
        });
    }
    
    // Handle form submissions with AJAX
    const uploadForms = document.querySelectorAll('form.ajax-form');
    if (uploadForms.length > 0) {
        uploadForms.forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const submitButton = this.querySelector('button[type="submit"]');
                const formData = new FormData(this);
                const url = this.getAttribute('action');
                
                // Disable submit button and show loading state
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
                
                // Send AJAX request
                fetch(url, {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showAlert('error', data.error);
                    } else {
                        showAlert('success', data.message);
                        // Reset form
                        this.reset();
                        
                        // Hide modal if it exists
                        const modal = bootstrap.Modal.getInstance(this.closest('.modal'));
                        if (modal) {
                            modal.hide();
                        }
                        
                        // Redirect if needed
                        if (data.redirect) {
                            window.location.href = data.redirect;
                        } else if (data.rfp_id) {
                            window.location.href = `/reports?rfp_id=${data.rfp_id}`;
                        } else if (this.dataset.reloadOnSuccess === 'true') {
                            window.location.reload();
                        }
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showAlert('error', 'An unexpected error occurred. Please try again.');
                })
                .finally(() => {
                    // Re-enable submit button
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Upload';
                });
            });
        });
    }
    
    // Initialize all one-click report buttons
    const oneClickReportButtons = document.querySelectorAll('.one-click-report-btn');
    if (oneClickReportButtons.length > 0) {
        oneClickReportButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const rfpId = this.dataset.rfpId;
                generateOneClickReport(rfpId);
            });
        });
    }
});

// Show alert message
function showAlert(type, message) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        console.warn('Alert container not found');
        return;
    }
    
    const alertHTML = `
        <div class="alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertContainer.innerHTML = alertHTML;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = alertContainer.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Initialize chatbot UI
function initializeChatbot() {
    const chatbotContainer = document.getElementById('chatbot-container');
    if (!chatbotContainer) return;
    
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.querySelector('.chat-send-button');
    
    // Initialize chat history
    let chatHistory = [];
    
    // Function to add a message to the chat
    window.addChatMessage = function(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user-message' : 'ai-message'}`;
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add to chat history
        chatHistory.push({
            role: isUser ? 'user' : 'assistant',
            content: message
        });
        
        // Keep chat history to a reasonable size
        if (chatHistory.length > 10) {
            chatHistory = chatHistory.slice(chatHistory.length - 10);
        }
    };
    
    // Handle send button click
    chatSendButton.addEventListener('click', function() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addChatMessage(message, true);
        
        // Clear input
        chatInput.value = '';
        
        // Determine context from URL
        const urlParams = new URLSearchParams(window.location.search);
        const rfpId = urlParams.get('rfp_id');
        const bidId = urlParams.get('bid_id');
        
        // Send to API
        fetch('/api/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                rfp_id: rfpId,
                bid_id: bidId,
                chat_history: chatHistory
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                addChatMessage('Sorry, I encountered an error: ' + data.error);
            } else {
                // Add AI response to chat
                addChatMessage(data.response);
                
                // Log provider info for debugging
                console.log('Chatbot provider info:', data.provider_info);
            }
        })
        .catch(error => {
            console.error('Chatbot error:', error);
            addChatMessage('Sorry, I encountered an error while processing your request.');
        });
    });
    
    // Handle Enter key in input
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            chatSendButton.click();
        }
    });
    
    // Add initial message
    addChatMessage('Hello! I\'m your UniSphere assistant. How can I help you with RFPs, vendor bids, or procurement processes today?');
}

// Generate one-click report
function generateOneClickReport(rfpId) {
    // Show loading state
    const reportBtn = document.querySelector(`.one-click-report-btn[data-rfp-id="${rfpId}"]`);
    if (reportBtn) {
        reportBtn.disabled = true;
        reportBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
    }
    
    // Fetch report data
    fetch(`/api/reports/infographic/${rfpId}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showAlert('error', data.error);
            } else {
                // Display report in modal
                showReportModal(data);
            }
        })
        .catch(error => {
            console.error('Error generating report:', error);
            showAlert('error', 'An error occurred while generating the report.');
        })
        .finally(() => {
            // Restore button state
            if (reportBtn) {
                reportBtn.disabled = false;
                reportBtn.innerHTML = '<i class="fas fa-chart-pie me-1"></i> One-Click Summary';
            }
        });
}

// Show report modal
function showReportModal(reportData) {
    // Create modal HTML
    const modalHTML = `
    <div class="modal fade" id="oneClickReportModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${reportData.title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <!-- Overview Section -->
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">RFP Overview</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>RFP Details</h6>
                                    <ul class="list-group">
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            Title
                                            <span class="badge bg-primary rounded-pill">${reportData.sections.overview.rfp_title}</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            Agency
                                            <span class="badge bg-secondary rounded-pill">${reportData.sections.overview.agency}</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            Project ID
                                            <span class="badge bg-info rounded-pill">${reportData.sections.overview.project_id}</span>
                                        </li>
                                    </ul>
                                </div>
                                <div class="col-md-6">
                                    <h6>Summary Statistics</h6>
                                    <ul class="list-group">
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            Total Bids
                                            <span class="badge bg-success rounded-pill">${reportData.sections.overview.total_bids}</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            Requirements
                                            <span class="badge bg-warning rounded-pill">${reportData.sections.overview.requirement_count}</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            Technical Specifications
                                            <span class="badge bg-danger rounded-pill">${reportData.sections.overview.tech_spec_count}</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Vendor Comparison Section -->
                    <div class="card mb-4">
                        <div class="card-header bg-success text-white">
                            <h5 class="mb-0">Vendor Comparison</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Vendor</th>
                                            <th>Overall Score</th>
                                            <th>Security Score</th>
                                            <th>Risk Score</th>
                                            <th>Sentiment Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${reportData.sections.vendor_comparison.scores.map((vendor, index) => `
                                            <tr>
                                                <td>${vendor.vendor}</td>
                                                <td>
                                                    <div class="progress">
                                                        <div class="progress-bar bg-primary" role="progressbar" style="width: ${vendor.score}%" 
                                                            aria-valuenow="${vendor.score}" aria-valuemin="0" aria-valuemax="100">
                                                            ${vendor.score}%
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="progress">
                                                        <div class="progress-bar bg-info" role="progressbar" 
                                                            style="width: ${reportData.sections.security_compliance.vendors[index]?.score || 0}%" 
                                                            aria-valuenow="${reportData.sections.security_compliance.vendors[index]?.score || 0}" 
                                                            aria-valuemin="0" aria-valuemax="100">
                                                            ${reportData.sections.security_compliance.vendors[index]?.score || 0}%
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="progress">
                                                        <div class="progress-bar bg-warning" role="progressbar" 
                                                            style="width: ${reportData.sections.risk_assessment.vendors[index]?.score || 0}%" 
                                                            aria-valuenow="${reportData.sections.risk_assessment.vendors[index]?.score || 0}" 
                                                            aria-valuemin="0" aria-valuemax="100">
                                                            ${reportData.sections.risk_assessment.vendors[index]?.score || 0}%
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="progress">
                                                        <div class="progress-bar bg-danger" role="progressbar" 
                                                            style="width: ${reportData.sections.sentiment_analysis.vendors[index]?.score || 0}%" 
                                                            aria-valuenow="${reportData.sections.sentiment_analysis.vendors[index]?.score || 0}" 
                                                            aria-valuemin="0" aria-valuemax="100">
                                                            ${reportData.sections.sentiment_analysis.vendors[index]?.score || 0}%
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Recommendation Section -->
                    <div class="card mb-4">
                        <div class="card-header bg-warning text-dark">
                            <h5 class="mb-0">Recommendations</h5>
                        </div>
                        <div class="card-body">
                            <h6>Top Vendors</h6>
                            <div class="row mb-4">
                                ${reportData.sections.recommendation.top_vendors.map((vendor, index) => `
                                    <div class="col-md-4 mb-3">
                                        <div class="card h-100 ${index === 0 ? 'border-success' : ''}">
                                            <div class="card-header ${index === 0 ? 'bg-success text-white' : ''}">
                                                <h6 class="mb-0">${index === 0 ? '🏆 ' : ''}${vendor.vendor}</h6>
                                            </div>
                                            <div class="card-body">
                                                <p class="card-text">Overall Score: <strong>${vendor.overall_score}%</strong></p>
                                                <p class="card-text">Security Score: <strong>${vendor.security_score}%</strong></p>
                                                <p class="card-text">Risk Score: <strong>${vendor.risk_score}%</strong></p>
                                                
                                                <h6 class="mt-3">Key Strengths:</h6>
                                                <ul class="small">
                                                    ${vendor.key_strengths.map(strength => `<li>${strength}</li>`).join('')}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            
                            <h6>Key Considerations</h6>
                            <ul class="list-group mb-3">
                                ${reportData.sections.recommendation.key_considerations.map(consideration => `
                                    <li class="list-group-item">
                                        <i class="fas fa-check-circle text-success me-2"></i> 
                                        ${consideration}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="downloadReportBtn">
                        <i class="fas fa-download me-1"></i> Download Report
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Add modal to DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Initialize and show modal
    const modal = new bootstrap.Modal(document.getElementById('oneClickReportModal'));
    modal.show();
    
    // Add event listener for download button
    document.getElementById('downloadReportBtn').addEventListener('click', function() {
        // Here you would generate a PDF or other report format
        alert('Report download functionality will be implemented in a future update.');
    });
    
    // Remove modal from DOM when hidden
    document.getElementById('oneClickReportModal').addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modalContainer);
    });
}
