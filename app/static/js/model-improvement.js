document.addEventListener('DOMContentLoaded', function() {
    // Continuous model improvement visualization
    
    // Dataset growth visualization
    const datasetStats = {
        totalDocuments: 2543,
        documentsLastMonth: 423,
        governmentAgencies: 18,
        documentCategories: {
            'RFPs': 1200,
            'Vendor Bids': 1050,
            'Contract Awards': 180,
            'Amendments': 113
        },
        datasetGrowth: [
            { month: 'Jan', count: 1500 },
            { month: 'Feb', count: 1650 },
            { month: 'Mar', count: 1800 },
            { month: 'Apr', count: 1950 },
            { month: 'May', count: 2120 },
            { month: 'Jun', count: 2543 }
        ],
        performanceMetrics: {
            'Requirement Extraction': [78, 83, 85, 87, 90, 93],
            'Bid Evaluation': [72, 76, 82, 84, 88, 91],
            'Risk Assessment': [70, 75, 79, 82, 85, 89],
            'Security Analysis': [75, 78, 80, 83, 85, 88]
        },
        userFeedback: {
            'Helpful': 87,
            'Accurate': 82,
            'Clear': 79,
            'Actionable': 84
        }
    };

    function createModelImprovementViz(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clear any loading indicators
        container.innerHTML = '';

        // Create dataset statistics section
        const statsSection = document.createElement('div');
        statsSection.className = 'row mb-4';
        statsSection.innerHTML = `
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <i class="fas fa-database fa-3x mb-3 text-primary"></i>
                        <h3 class="display-5 fw-bold">${datasetStats.totalDocuments.toLocaleString()}</h3>
                        <p class="card-text">Total Documents</p>
                        <div class="text-success small">
                            <i class="fas fa-arrow-up me-1"></i> ${datasetStats.documentsLastMonth} new last month
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <i class="fas fa-building fa-3x mb-3 text-info"></i>
                        <h3 class="display-5 fw-bold">${datasetStats.governmentAgencies}</h3>
                        <p class="card-text">Gov Agencies</p>
                        <div class="text-info small">Diverse agency coverage</div>
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-3">
                <div class="card h-100">
                    <div class="card-header">
                        <h6 class="mb-0">Document Categories</h6>
                    </div>
                    <div class="card-body">
                        <canvas id="documentCategoriesChart" height="170"></canvas>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(statsSection);

        // Create performance improvement section
        const performanceSection = document.createElement('div');
        performanceSection.className = 'row mb-4';
        performanceSection.innerHTML = `
            <div class="col-md-8 mb-3">
                <div class="card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">Model Performance Improvements</h6>
                        <span class="badge bg-success">Continuous Learning</span>
                    </div>
                    <div class="card-body">
                        <canvas id="performanceImprovementChart" height="250"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <div class="card-header">
                        <h6 class="mb-0">User Feedback Metrics</h6>
                    </div>
                    <div class="card-body">
                        <canvas id="userFeedbackChart" height="250"></canvas>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(performanceSection);

        // Create dataset growth section
        const growthSection = document.createElement('div');
        growthSection.className = 'row mb-4';
        growthSection.innerHTML = `
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Dataset Growth Over Time</h6>
                    </div>
                    <div class="card-body">
                        <canvas id="datasetGrowthChart" height="200"></canvas>
                    </div>
                    <div class="card-footer text-center">
                        <div class="row">
                            <div class="col-md-4">
                                <div class="d-flex align-items-center justify-content-center">
                                    <i class="fas fa-brain text-primary me-2"></i>
                                    <div class="text-start">
                                        <span class="d-block small text-muted">Active Learning</span>
                                        <strong>Enabled</strong>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="d-flex align-items-center justify-content-center">
                                    <i class="fas fa-user-check text-info me-2"></i>
                                    <div class="text-start">
                                        <span class="d-block small text-muted">Human-in-the-loop</span>
                                        <strong>78 Verifications</strong>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="d-flex align-items-center justify-content-center">
                                    <i class="fas fa-sync text-success me-2"></i>
                                    <div class="text-start">
                                        <span class="d-block small text-muted">Last Update</span>
                                        <strong>Yesterday</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(growthSection);

        // Create call-to-action section
        const ctaSection = document.createElement('div');
        ctaSection.className = 'text-center p-3 bg-light rounded mb-3';
        ctaSection.innerHTML = `
            <h5>Help Improve the AI Model</h5>
            <p class="text-muted">Your feedback and reviews directly contribute to model accuracy and performance.</p>
            <button class="btn btn-primary me-2 feedback-modal-btn">
                <i class="fas fa-comment-alt me-1"></i> Provide Feedback
            </button>
            <button class="btn btn-outline-secondary review-analyses-btn">
                <i class="fas fa-user-check me-1"></i> Review AI Analyses
            </button>
        `;
        container.appendChild(ctaSection);

        // Initialize charts
        initializeModelImprovementCharts();

        // Add event listeners for buttons
        const feedbackBtn = container.querySelector('.feedback-modal-btn');
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', function() {
                showFeedbackModal();
            });
        }

        const reviewBtn = container.querySelector('.review-analyses-btn');
        if (reviewBtn) {
            reviewBtn.addEventListener('click', function() {
                // Simulate clicking a batch review button if it exists
                const batchReviewBtn = document.querySelector('.open-batch-review');
                if (batchReviewBtn) {
                    batchReviewBtn.click();
                } else {
                    showFeedbackModal();
                }
            });
        }
    }

    // Initialize model improvement charts
    function initializeModelImprovementCharts() {
        // Document categories pie chart
        const categoriesCtx = document.getElementById('documentCategoriesChart');
        if (categoriesCtx) {
            new Chart(categoriesCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(datasetStats.documentCategories),
                    datasets: [{
                        data: Object.values(datasetStats.documentCategories),
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.7)',
                            'rgba(75, 192, 192, 0.7)',
                            'rgba(255, 159, 64, 0.7)',
                            'rgba(153, 102, 255, 0.7)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }

        // Performance improvement line chart
        const performanceCtx = document.getElementById('performanceImprovementChart');
        if (performanceCtx) {
            const months = datasetStats.datasetGrowth.map(item => item.month);
            
            new Chart(performanceCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: Object.entries(datasetStats.performanceMetrics).map(([key, values], index) => {
                        const colors = [
                            'rgba(54, 162, 235, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 159, 64, 1)',
                            'rgba(153, 102, 255, 1)'
                        ];
                        
                        return {
                            label: key,
                            data: values,
                            borderColor: colors[index % colors.length],
                            backgroundColor: colors[index % colors.length].replace('1)', '0.1)'),
                            tension: 0.3,
                            fill: true
                        };
                    })
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 65,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Accuracy (%)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        }

        // User feedback radar chart
        const feedbackCtx = document.getElementById('userFeedbackChart');
        if (feedbackCtx) {
            new Chart(feedbackCtx, {
                type: 'radar',
                data: {
                    labels: Object.keys(datasetStats.userFeedback),
                    datasets: [{
                        label: 'User Ratings',
                        data: Object.values(datasetStats.userFeedback),
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                stepSize: 20
                            }
                        }
                    }
                }
            });
        }

        // Dataset growth bar chart
        const growthCtx = document.getElementById('datasetGrowthChart');
        if (growthCtx) {
            new Chart(growthCtx, {
                type: 'bar',
                data: {
                    labels: datasetStats.datasetGrowth.map(item => item.month),
                    datasets: [{
                        label: 'Total Documents',
                        data: datasetStats.datasetGrowth.map(item => item.count),
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Document Count'
                            }
                        }
                    }
                }
            });
        }
    }

    // Show feedback modal
    function showFeedbackModal() {
        const modalHTML = `
        <div class="modal fade" id="modelFeedbackModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">AI Model Feedback</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>Your feedback helps our AI models learn and improve over time.</p>
                        <form id="modelFeedbackForm">
                            <div class="mb-3">
                                <label class="form-label">How would you rate the AI model's accuracy?</label>
                                <div class="star-rating mb-2">
                                    <i class="fas fa-star star-rating-item" data-rating="1"></i>
                                    <i class="fas fa-star star-rating-item" data-rating="2"></i>
                                    <i class="fas fa-star star-rating-item" data-rating="3"></i>
                                    <i class="fas fa-star star-rating-item" data-rating="4"></i>
                                    <i class="fas fa-star star-rating-item" data-rating="5"></i>
                                </div>
                                <input type="hidden" id="accuracyRating" name="accuracyRating" value="0">
                            </div>
                            <div class="mb-3">
                                <label for="feedbackCategory" class="form-label">What aspect are you providing feedback on?</label>
                                <select class="form-select" id="feedbackCategory" name="feedbackCategory">
                                    <option value="">Select a category</option>
                                    <option value="requirement_extraction">Requirement Extraction</option>
                                    <option value="bid_evaluation">Bid Evaluation</option>
                                    <option value="risk_assessment">Risk Assessment</option>
                                    <option value="security_analysis">Security Analysis</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="feedbackDetails" class="form-label">Please describe your feedback</label>
                                <textarea class="form-control" id="feedbackDetails" name="feedbackDetails" rows="4" placeholder="What worked well? What could be improved?"></textarea>
                            </div>
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="improveModelConsent" name="improveModelConsent" checked>
                                <label class="form-check-label" for="improveModelConsent">
                                    Allow this feedback to be used for model improvement
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="submitFeedbackBtn">Submit Feedback</button>
                    </div>
                </div>
            </div>
        </div>
        `;

        // Add modal to DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        // Add CSS for star rating
        const ratingStyles = document.createElement('style');
        ratingStyles.textContent = `
            .star-rating {
                font-size: 1.5rem;
                display: flex;
                justify-content: center;
            }
            .star-rating-item {
                color: var(--bs-gray-400);
                cursor: pointer;
                padding: 0 5px;
                transition: color 0.2s;
            }
            .star-rating-item.active {
                color: var(--bs-warning);
            }
            .star-rating-item:hover {
                color: var(--bs-warning);
            }
        `;
        document.head.appendChild(ratingStyles);

        // Initialize and show modal
        const modal = new bootstrap.Modal(document.getElementById('modelFeedbackModal'));
        modal.show();

        // Add star rating functionality
        const stars = document.querySelectorAll('.star-rating-item');
        const ratingInput = document.getElementById('accuracyRating');
        
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.dataset.rating);
                ratingInput.value = rating;
                
                // Update star visuals
                stars.forEach(s => {
                    const starRating = parseInt(s.dataset.rating);
                    if (starRating <= rating) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
            });
        });

        // Add submit button functionality
        document.getElementById('submitFeedbackBtn').addEventListener('click', function() {
            const rating = parseInt(ratingInput.value);
            const category = document.getElementById('feedbackCategory').value;
            const details = document.getElementById('feedbackDetails').value;
            
            if (rating === 0) {
                alert('Please provide a rating.');
                return;
            }
            
            if (!category) {
                alert('Please select a feedback category.');
                return;
            }
            
            if (!details) {
                alert('Please provide feedback details.');
                return;
            }
            
            // Simulate submission
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Submitting...';
            
            setTimeout(() => {
                modal.hide();
                
                // Show success notification
                const toastHTML = `
                <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 9999">
                    <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                        <div class="toast-header">
                            <i class="fas fa-check-circle text-success me-2"></i>
                            <strong class="me-auto">Feedback Submitted</strong>
                            <small>Just now</small>
                            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                        </div>
                        <div class="toast-body">
                            Thank you for your feedback! It will be used to improve our AI models.
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
    }

    // Initialize model improvement visualization if it exists on the page
    const modelImprovementViz = document.getElementById('model-improvement-viz');
    if (modelImprovementViz) {
        createModelImprovementViz('model-improvement-viz');
    }
});
