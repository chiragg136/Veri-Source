document.addEventListener('DOMContentLoaded', function() {
    // Apply animations to dashboard elements
    const statCards = document.querySelectorAll('.stats-card');
    const chartCards = document.querySelectorAll('.card h-100');
    const rfpCards = document.querySelectorAll('.rfp-card');

    // Fade-in animation for stat cards with delay between each
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });

    // Scale animation for chart cards
    chartCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        }, 300 + (150 * index));
    });

    // Staggered entrance for RFP cards
    rfpCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateX(-20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateX(0)';
        }, 500 + (100 * index));
    });

    // Animated counters for dashboard statistics
    function animateCounter(element, target) {
        if (!element) return;
        
        const duration = 1500;
        const startValue = 0;
        const startTime = performance.now();
        
        function updateCounter(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            // Easing function for smooth counter animation
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            const currentValue = Math.floor(startValue + (target - startValue) * easedProgress);
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target;
            }
        }
        
        requestAnimationFrame(updateCounter);
    }

    // Get counter elements
    const totalRfps = document.getElementById('total-rfps');
    const totalBids = document.getElementById('total-bids');
    const avgScore = document.getElementById('avg-score');
    const totalRequirements = document.getElementById('total-requirements');

    // Set target values (would come from actual data in production)
    const rfpTarget = parseInt(totalRfps.textContent) || 3;
    const bidsTarget = 5;
    const scoreTarget = 85;
    const requirementsTarget = 24;

    // Start animations after a delay to ensure elements are visible
    setTimeout(() => {
        animateCounter(totalRfps, rfpTarget);
        animateCounter(totalBids, bidsTarget);
        animateCounter(avgScore, scoreTarget);
        animateCounter(totalRequirements, requirementsTarget);
        
        // Update the actual values in the HTML too
        totalBids.textContent = "0"; // Will be animated to 5
        avgScore.textContent = "0"; // Will be animated to 85
        totalRequirements.textContent = "0"; // Will be animated to 24
    }, 800);

    // Real-time data freshness indicators
    const freshnessIndicators = document.querySelectorAll('.data-freshness');
    
    function updateFreshnessIndicator() {
        freshnessIndicators.forEach(indicator => {
            const icon = indicator.querySelector('i');
            icon.classList.add('fa-spin');
            
            setTimeout(() => {
                icon.classList.remove('fa-spin');
                
                // Add a "updated" class briefly
                indicator.classList.add('just-updated');
                setTimeout(() => {
                    indicator.classList.remove('just-updated');
                }, 2000);
            }, 1000);
        });
    }
    
    // Simulate data updates every 30 seconds
    setInterval(updateFreshnessIndicator, 30000);
    
    // Initial update
    setTimeout(updateFreshnessIndicator, 2000);

    // Add CSS for the data freshness indicators
    const freshnessStyles = document.createElement('style');
    freshnessStyles.textContent = `
        .data-freshness {
            font-size: 0.8rem;
            color: var(--bs-secondary);
        }
        .just-updated {
            color: var(--bs-success);
            transition: color 0.5s ease;
        }
    `;
    document.head.appendChild(freshnessStyles);

    // Risk assessment and security compliance charts
    const riskCtx = document.getElementById('riskAssessmentChart');
    const securityCtx = document.getElementById('securityComplianceChart');
    
    if (riskCtx) {
        new Chart(riskCtx, {
            type: 'radar',
            data: {
                labels: [
                    'Financial Stability',
                    'Schedule Risk',
                    'Resource Risk',
                    'Technical Risk',
                    'Compliance Risk',
                    'Quality Risk'
                ],
                datasets: [{
                    label: 'Vendor A',
                    data: [85, 72, 65, 78, 90, 80],
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderWidth: 2
                }, {
                    label: 'Vendor B',
                    data: [60, 85, 80, 65, 75, 70],
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderWidth: 2
                }]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
    
    if (securityCtx) {
        new Chart(securityCtx, {
            type: 'bar',
            data: {
                labels: ['FISMA', 'FedRAMP', 'NIST 800-53', 'CMMC', 'PCI DSS'],
                datasets: [{
                    label: 'Compliance Score (%)',
                    data: [95, 88, 75, 60, 85],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(255, 99, 132, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                },
                animation: {
                    delay: function(context) {
                        return context.dataIndex * 300;
                    },
                    duration: 1000
                }
            }
        });
    }

    // Add CSS for risk indicators
    const riskStyles = document.createElement('style');
    riskStyles.textContent = `
        .risk-indicator {
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.85rem;
        }
        .risk-indicator-high {
            color: var(--bs-danger);
        }
        .risk-indicator-medium {
            color: var(--bs-warning);
        }
        .risk-indicator-low {
            color: var(--bs-success);
        }
        .compliance-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
            font-size: 0.9rem;
        }
        .compliance-indicator .icon {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
        }
        .compliance-certified {
            color: var(--bs-success);
        }
        .compliance-pending {
            color: var(--bs-warning);
        }
    `;
    document.head.appendChild(riskStyles);

    // Human-in-the-loop review modal simulation
    const reviewButtons = document.querySelectorAll('.open-batch-review');
    if (reviewButtons.length > 0) {
        reviewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const reviewType = button.dataset.reviewType;
                
                // Create a simple modal for demonstration
                const modalHTML = `
                <div class="modal fade" id="reviewModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Human Review - ${reviewType.charAt(0).toUpperCase() + reviewType.slice(1)}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p class="mb-3">Please review and verify the AI-generated analysis below:</p>
                                <div class="review-items-container">
                                    <div class="review-item">
                                        <div class="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <h6>Security Requirement Assessment</h6>
                                                <p class="text-muted small">AI analyzed Vendor A's compliance with FISMA control AC-2</p>
                                            </div>
                                            <span class="badge bg-warning">Pending Review</span>
                                        </div>
                                        <div class="card mb-3">
                                            <div class="card-body">
                                                <p><strong>AI Assessment:</strong> Vendor demonstrates partial compliance with FISMA AC-2 (Account Management). The proposal addresses user account management procedures but lacks details on privileged account monitoring.</p>
                                                <div class="progress mb-2" style="height: 10px;">
                                                    <div class="progress-bar bg-warning" role="progressbar" style="width: 65%;" aria-valuenow="65" aria-valuemin="0" aria-valuemax="100"></div>
                                                </div>
                                                <p class="text-muted small">Compliance Score: 65%</p>
                                            </div>
                                        </div>
                                        <div class="review-actions d-flex justify-content-between">
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="radio" name="review1" id="approve1" value="approve">
                                                <label class="form-check-label" for="approve1">Approve</label>
                                            </div>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="radio" name="review1" id="modify1" value="modify">
                                                <label class="form-check-label" for="modify1">Modify</label>
                                            </div>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="radio" name="review1" id="reject1" value="reject">
                                                <label class="form-check-label" for="reject1">Reject</label>
                                            </div>
                                            <button class="btn btn-sm btn-outline-primary">Add Comment</button>
                                        </div>
                                    </div>
                                    <hr>
                                    <div class="review-item">
                                        <div class="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <h6>Risk Assessment</h6>
                                                <p class="text-muted small">AI detected potential financial risk in Vendor B's proposal</p>
                                            </div>
                                            <span class="badge bg-warning">Pending Review</span>
                                        </div>
                                        <div class="card mb-3">
                                            <div class="card-body">
                                                <p><strong>AI Assessment:</strong> High risk detected in financial stability. The vendor's proposal indicates potential resource constraints and insufficient capital reserves for a project of this scale.</p>
                                                <div class="alert alert-danger">
                                                    <i class="fas fa-exclamation-triangle me-2"></i> High Risk: Financial Stability
                                                </div>
                                            </div>
                                        </div>
                                        <div class="review-actions d-flex justify-content-between">
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="radio" name="review2" id="approve2" value="approve">
                                                <label class="form-check-label" for="approve2">Approve</label>
                                            </div>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="radio" name="review2" id="modify2" value="modify">
                                                <label class="form-check-label" for="modify2">Modify</label>
                                            </div>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="radio" name="review2" id="reject2" value="reject">
                                                <label class="form-check-label" for="reject2">Reject</label>
                                            </div>
                                            <button class="btn btn-sm btn-outline-primary">Add Comment</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="submitReviews">Submit Reviews</button>
                            </div>
                        </div>
                    </div>
                </div>
                `;
                
                // Add modal to the page
                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHTML;
                document.body.appendChild(modalContainer);
                
                // Initialize and show the modal
                const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
                modal.show();
                
                // Add event listener for the submit button
                document.getElementById('submitReviews').addEventListener('click', () => {
                    // Simulate submission
                    modal.hide();
                    setTimeout(() => {
                        // Show success toast
                        const toastHTML = `
                        <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 9999">
                            <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                                <div class="toast-header">
                                    <i class="fas fa-check-circle text-success me-2"></i>
                                    <strong class="me-auto">Review Submitted</strong>
                                    <small>Just now</small>
                                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                                </div>
                                <div class="toast-body">
                                    Your review has been submitted successfully and will be incorporated into the analysis.
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
                        
                        // Clean up the modal
                        document.body.removeChild(modalContainer);
                    }, 500);
                });
            });
        });
    }

    // Model improvement visualization
    const modelImprovementContainer = document.getElementById('model-improvement-viz');
    if (modelImprovementContainer) {
        setTimeout(() => {
            modelImprovementContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="mb-3">Model Accuracy Improvement</h6>
                        <canvas id="modelAccuracyChart" height="250"></canvas>
                    </div>
                    <div class="col-md-6">
                        <h6 class="mb-3">Domain Knowledge Growth</h6>
                        <canvas id="domainKnowledgeChart" height="250"></canvas>
                    </div>
                </div>
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="d-flex align-items-center justify-content-between">
                            <h6 class="mb-0">Model Training Status</h6>
                            <span class="badge bg-success">Active Learning Enabled</span>
                        </div>
                        <div class="progress mt-2" style="height: 25px;">
                            <div class="progress-bar progress-bar-striped progress-bar-animated bg-info" role="progressbar" style="width: 78%">78% - Next update in 3 days</div>
                        </div>
                        <div class="d-flex justify-content-between mt-2">
                            <small class="text-muted">Last updated: Yesterday</small>
                            <small class="text-muted">2,543 documents processed</small>
                        </div>
                    </div>
                </div>
            `;
            
            // Create the model accuracy chart
            const accuracyCtx = document.getElementById('modelAccuracyChart');
            if (accuracyCtx) {
                new Chart(accuracyCtx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                            label: 'RFP Understanding',
                            data: [75, 78, 80, 85, 87, 90],
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            tension: 0.3,
                            fill: true
                        }, {
                            label: 'Security Compliance',
                            data: [70, 72, 75, 80, 85, 88],
                            borderColor: 'rgba(54, 162, 235, 1)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            tension: 0.3,
                            fill: true
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: false,
                                min: 65,
                                max: 100
                            }
                        },
                        animation: {
                            duration: 2000
                        }
                    }
                });
            }
            
            // Create the domain knowledge chart
            const knowledgeCtx = document.getElementById('domainKnowledgeChart');
            if (knowledgeCtx) {
                new Chart(knowledgeCtx, {
                    type: 'radar',
                    data: {
                        labels: ['Technical', 'Financial', 'Legal', 'Security', 'Compliance', 'Project Management'],
                        datasets: [{
                            label: 'Initial Model',
                            data: [60, 55, 65, 70, 75, 60],
                            borderColor: 'rgba(255, 99, 132, 0.8)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            borderWidth: 2
                        }, {
                            label: 'Current Model',
                            data: [80, 75, 85, 90, 85, 80],
                            borderColor: 'rgba(54, 162, 235, 0.8)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        scales: {
                            r: {
                                beginAtZero: true,
                                max: 100
                            }
                        },
                        animation: {
                            duration: 2000
                        }
                    }
                });
            }
        }, 1500);
    }
});
