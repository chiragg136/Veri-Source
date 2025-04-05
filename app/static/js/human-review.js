document.addEventListener('DOMContentLoaded', function() {
    // Human-in-the-loop review functionality
    const openBatchReviewButtons = document.querySelectorAll('.open-batch-review');
    
    // Review item template
    function createReviewItem(item) {
        return `
        <div class="review-item mb-4 p-3 border rounded">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <h6>${item.title}</h6>
                    <p class="text-muted small">${item.description}</p>
                </div>
                <span class="badge ${item.statusBadge}">${item.status}</span>
            </div>
            <div class="card mb-3">
                <div class="card-body">
                    <p><strong>AI Assessment:</strong> ${item.assessment}</p>
                    ${item.visualization}
                </div>
            </div>
            <div class="review-actions d-flex justify-content-between">
                <div class="btn-group" role="group">
                    <button type="button" class="btn btn-sm btn-outline-success review-action" data-action="approve" data-item-id="${item.id}">
                        <i class="fas fa-check me-1"></i> Approve
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-warning review-action" data-action="modify" data-item-id="${item.id}">
                        <i class="fas fa-edit me-1"></i> Modify
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger review-action" data-action="reject" data-item-id="${item.id}">
                        <i class="fas fa-times me-1"></i> Reject
                    </button>
                </div>
                <button class="btn btn-sm btn-outline-primary add-comment-btn" data-item-id="${item.id}">
                    <i class="fas fa-comment me-1"></i> Add Comment
                </button>
            </div>
            <div class="comment-container mt-3" id="comment-container-${item.id}" style="display: none;">
                <textarea class="form-control mb-2" placeholder="Enter your feedback here..."></textarea>
                <div class="d-flex justify-content-end">
                    <button class="btn btn-sm btn-secondary me-2 cancel-comment-btn">Cancel</button>
                    <button class="btn btn-sm btn-primary save-comment-btn" data-item-id="${item.id}">Save Comment</button>
                </div>
            </div>
        </div>`;
    }

    // Sample review items for each type
    const reviewItems = {
        requirements: [
            {
                id: 'req1',
                title: 'Technical Requirement Analysis',
                description: 'AI identified requirement: "System must support at least 10,000 concurrent users"',
                status: 'Pending Review',
                statusBadge: 'bg-warning',
                assessment: 'High priority requirement detected in Section 3.2 of the RFP. The system must be capable of supporting at least 10,000 concurrent users with response times under 2 seconds.',
                visualization: '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i> Classified as: Technical Infrastructure Requirement</div>'
            },
            {
                id: 'req2',
                title: 'Security Requirement Analysis',
                description: 'AI identified requirement: "System must comply with all FISMA moderate controls"',
                status: 'Pending Review',
                statusBadge: 'bg-warning',
                assessment: 'Critical security requirement detected in Section 5.1 of the RFP. The system must implement all applicable FISMA moderate security controls and provide documentation of compliance.',
                visualization: '<div class="alert alert-danger"><i class="fas fa-shield-alt me-2"></i> Classified as: Mandatory Security Requirement</div>'
            }
        ],
        compliance: [
            {
                id: 'comp1',
                title: 'FISMA Control AC-2 Assessment',
                description: 'AI analyzed Vendor A\'s compliance with Account Management requirements',
                status: 'Pending Review',
                statusBadge: 'bg-warning',
                assessment: 'Vendor demonstrates partial compliance with FISMA AC-2 (Account Management). The proposal addresses user account management procedures but lacks details on privileged account monitoring and audit processes.',
                visualization: '<div class="progress mb-2"><div class="progress-bar bg-warning" role="progressbar" style="width: 65%;" aria-valuenow="65" aria-valuemin="0" aria-valuemax="100"></div></div><p class="text-muted small">Compliance Score: 65%</p>'
            },
            {
                id: 'comp2',
                title: 'NIST 800-53 IA-2 Assessment',
                description: 'AI analyzed Vendor B\'s compliance with Identification and Authentication requirements',
                status: 'Pending Review',
                statusBadge: 'bg-warning',
                assessment: 'Vendor demonstrates strong compliance with NIST 800-53 IA-2 (Identification and Authentication). The proposal includes comprehensive multi-factor authentication implementation plans with detailed procedures.',
                visualization: '<div class="progress mb-2"><div class="progress-bar bg-success" role="progressbar" style="width: 92%;" aria-valuenow="92" aria-valuemin="0" aria-valuemax="100"></div></div><p class="text-muted small">Compliance Score: 92%</p>'
            }
        ],
        risks: [
            {
                id: 'risk1',
                title: 'Financial Stability Risk Assessment',
                description: 'AI detected potential financial risk in Vendor C\'s proposal',
                status: 'Pending Review',
                statusBadge: 'bg-warning',
                assessment: 'High risk detected in financial stability. The vendor\'s proposal indicates potential resource constraints and insufficient capital reserves for a project of this scale based on their financial statements and project staffing plan.',
                visualization: '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i> High Risk: Financial Stability</div>'
            },
            {
                id: 'risk2',
                title: 'Schedule Risk Assessment',
                description: 'AI detected potential timeline issues in Vendor A\'s proposal',
                status: 'Pending Review',
                statusBadge: 'bg-warning',
                assessment: 'Medium risk detected in project schedule. The vendor\'s proposed timeline contains potential bottlenecks in the testing phase that could delay final deployment by 2-3 weeks based on resource allocation patterns.',
                visualization: '<div class="alert alert-warning"><i class="fas fa-exclamation-circle me-2"></i> Medium Risk: Schedule Feasibility</div>'
            }
        ],
        all: [] // Will be populated with all items
    };
    
    // Combine all items into the "all" category
    reviewItems.all = [
        ...reviewItems.requirements,
        ...reviewItems.compliance,
        ...reviewItems.risks
    ];

    // Add event listeners to open batch review buttons
    openBatchReviewButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const reviewType = button.dataset.reviewType;
            
            // Create modal HTML
            const modalHTML = `
            <div class="modal fade" id="humanReviewModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Human Review - ${reviewType.charAt(0).toUpperCase() + reviewType.slice(1)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <p class="mb-0">Please review and verify the AI-generated analysis below:</p>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="showOnlyPending">
                                    <label class="form-check-label" for="showOnlyPending">Show only pending</label>
                                </div>
                            </div>
                            <div class="review-items-container" id="reviewItemsContainer">
                                <!-- Review items will be inserted here -->
                                <div class="text-center py-3">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading items...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="submitBatchReview">Submit All Reviews</button>
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
            const modal = new bootstrap.Modal(document.getElementById('humanReviewModal'));
            modal.show();
            
            // Populate review items
            const itemsContainer = document.getElementById('reviewItemsContainer');
            setTimeout(() => {
                let itemsHTML = '';
                reviewItems[reviewType].forEach(item => {
                    itemsHTML += createReviewItem(item);
                });
                
                if (itemsHTML === '') {
                    itemsHTML = '<p class="text-center">No items available for review.</p>';
                }
                
                itemsContainer.innerHTML = itemsHTML;
                
                // Add event listeners to action buttons
                document.querySelectorAll('.review-action').forEach(actionBtn => {
                    actionBtn.addEventListener('click', function() {
                        const action = this.dataset.action;
                        const itemId = this.dataset.itemId;
                        const reviewItem = this.closest('.review-item');
                        const statusBadge = reviewItem.querySelector('.badge');
                        
                        // Update status based on action
                        if (action === 'approve') {
                            statusBadge.className = 'badge bg-success';
                            statusBadge.textContent = 'Approved';
                        } else if (action === 'modify') {
                            statusBadge.className = 'badge bg-info';
                            statusBadge.textContent = 'Modified';
                            // Show comment field automatically for modifications
                            const commentContainer = reviewItem.querySelector('.comment-container');
                            commentContainer.style.display = 'block';
                        } else if (action === 'reject') {
                            statusBadge.className = 'badge bg-danger';
                            statusBadge.textContent = 'Rejected';
                            // Show comment field automatically for rejections
                            const commentContainer = reviewItem.querySelector('.comment-container');
                            commentContainer.style.display = 'block';
                        }
                        
                        // Highlight the selected action button
                        reviewItem.querySelectorAll('.review-action').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        this.classList.add('active');
                    });
                });
                
                // Add event listeners for comment buttons
                document.querySelectorAll('.add-comment-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const itemId = this.dataset.itemId;
                        const commentContainer = document.getElementById(`comment-container-${itemId}`);
                        commentContainer.style.display = 'block';
                        this.style.display = 'none';
                    });
                });
                
                document.querySelectorAll('.cancel-comment-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const commentContainer = this.closest('.comment-container');
                        const addCommentBtn = commentContainer.parentElement.querySelector('.add-comment-btn');
                        commentContainer.style.display = 'none';
                        addCommentBtn.style.display = 'block';
                    });
                });
                
                document.querySelectorAll('.save-comment-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const commentContainer = this.closest('.comment-container');
                        const textarea = commentContainer.querySelector('textarea');
                        const comment = textarea.value.trim();
                        
                        if (comment) {
                            // Create a comment element
                            const commentElement = document.createElement('div');
                            commentElement.className = 'mt-3 p-2 bg-light rounded';
                            commentElement.innerHTML = `
                                <div class="d-flex">
                                    <div class="me-2"><i class="fas fa-comment-alt text-primary"></i></div>
                                    <div>
                                        <p class="mb-1 small"><strong>Your Comment:</strong></p>
                                        <p class="mb-0">${comment}</p>
                                    </div>
                                </div>
                            `;
                            
                            // Insert it before the comment container
                            commentContainer.parentNode.insertBefore(commentElement, commentContainer);
                            
                            // Hide the comment form
                            commentContainer.style.display = 'none';
                        }
                    });
                });
                
                // Filter functionality for pending items
                document.getElementById('showOnlyPending').addEventListener('change', function() {
                    const showOnlyPending = this.checked;
                    document.querySelectorAll('.review-item').forEach(item => {
                        const statusBadge = item.querySelector('.badge');
                        if (showOnlyPending && !statusBadge.classList.contains('bg-warning')) {
                            item.style.display = 'none';
                        } else {
                            item.style.display = 'block';
                        }
                    });
                });
            }, 1000);
            
            // Submit button handler
            document.getElementById('submitBatchReview').addEventListener('click', () => {
                // Simulate submission process
                const submitBtn = document.getElementById('submitBatchReview');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Submitting...';
                
                setTimeout(() => {
                    modal.hide();
                    
                    // Show success notification
                    const toastHTML = `
                    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 9999">
                        <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                            <div class="toast-header">
                                <i class="fas fa-check-circle text-success me-2"></i>
                                <strong class="me-auto">Reviews Submitted</strong>
                                <small>Just now</small>
                                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                            </div>
                            <div class="toast-body">
                                Your reviews have been submitted successfully and will be incorporated into the AI model for continuous improvement.
                            </div>
                        </div>
                    </div>
                    `;
                    
                    const toastContainer = document.createElement('div');
                    toastContainer.innerHTML = toastHTML;
                    document.body.appendChild(toastContainer);
                    
                    // Remove toast after 5 seconds
                    setTimeout(() => {
                        document.body.removeChild(toastContainer);
                    }, 5000);
                    
                    // Clean up modal
                    document.body.removeChild(modalContainer);
                }, 1500);
            });
        });
    });
});
