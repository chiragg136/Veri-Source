document.addEventListener('DOMContentLoaded', function() {
    // Enhanced security features for government compliance
    
    // Security frameworks compliance data
    const securityFrameworks = {
        FISMA: {
            name: 'FISMA',
            description: 'Federal Information Security Management Act',
            status: 'Compliant',
            complianceLevel: 95,
            lastCertified: '2023-09-15',
            icon: 'fa-shield-alt',
            details: 'The system meets all FISMA moderate controls with continuous monitoring enabled.'
        },
        FedRAMP: {
            name: 'FedRAMP',
            description: 'Federal Risk and Authorization Management Program',
            status: 'Compliant',
            complianceLevel: 92,
            lastCertified: '2023-10-20',
            icon: 'fa-check-circle',
            details: 'FedRAMP Moderate authorized with all required security controls implemented.'
        },
        NIST: {
            name: 'NIST 800-53',
            description: 'National Institute of Standards and Technology Special Publication 800-53',
            status: 'Compliant',
            complianceLevel: 89,
            lastCertified: '2023-11-05',
            icon: 'fa-clipboard-check',
            details: 'NIST 800-53 Rev 5 controls implemented with continuous assessment procedures.'
        },
        CMMC: {
            name: 'CMMC',
            description: 'Cybersecurity Maturity Model Certification',
            status: 'Partial',
            complianceLevel: 78,
            lastCertified: 'In Progress',
            icon: 'fa-shield',
            details: 'CMMC Level 3 certification in progress, with 78% of controls currently implemented.'
        }
    };

    // Create security compliance widget
    function createSecurityComplianceWidget(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Create widget content
        const widgetHTML = `
            <div class="security-compliance-widget">
                <div class="row">
                    ${Object.values(securityFrameworks).map(framework => `
                        <div class="col-md-6 mb-3">
                            <div class="card h-100 ${framework.status === 'Compliant' ? 'border-success' : 'border-warning'}">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h6 class="mb-0">
                                        <i class="fas ${framework.icon} me-2"></i> ${framework.name}
                                    </h6>
                                    <span class="badge ${framework.status === 'Compliant' ? 'bg-success' : 'bg-warning'}">
                                        ${framework.status}
                                    </span>
                                </div>
                                <div class="card-body">
                                    <p class="small text-muted mb-2">${framework.description}</p>
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <span>Compliance:</span>
                                        <span>${framework.complianceLevel}%</span>
                                    </div>
                                    <div class="progress mb-3" style="height: 8px;">
                                        <div class="progress-bar ${framework.complianceLevel >= 90 ? 'bg-success' : framework.complianceLevel >= 70 ? 'bg-info' : 'bg-warning'}" 
                                            role="progressbar" style="width: ${framework.complianceLevel}%" 
                                            aria-valuenow="${framework.complianceLevel}" aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                    <p class="small mb-0">${framework.details}</p>
                                </div>
                                <div class="card-footer text-muted small">
                                    Last certified: ${framework.lastCertified}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="text-center mt-3">
                    <button class="btn btn-outline-primary btn-sm view-security-details-btn">
                        <i class="fas fa-lock me-1"></i> View Detailed Security Report
                    </button>
                </div>
            </div>
        `;

        // Add widget to container
        container.innerHTML = widgetHTML;

        // Add event listener for security details button
        const securityDetailsBtn = container.querySelector('.view-security-details-btn');
        if (securityDetailsBtn) {
            securityDetailsBtn.addEventListener('click', function() {
                showSecurityDetailsModal();
            });
        }
    }

    // Create security details modal
    function showSecurityDetailsModal() {
        const modalHTML = `
            <div class="modal fade" id="securityDetailsModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Security Compliance Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <ul class="nav nav-tabs" id="securityFrameworkTabs" role="tablist">
                                ${Object.keys(securityFrameworks).map((key, index) => `
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link ${index === 0 ? 'active' : ''}" 
                                            id="${key.toLowerCase()}-tab" 
                                            data-bs-toggle="tab" 
                                            data-bs-target="#${key.toLowerCase()}-tab-pane" 
                                            type="button" 
                                            role="tab" 
                                            aria-controls="${key.toLowerCase()}-tab-pane" 
                                            aria-selected="${index === 0 ? 'true' : 'false'}">
                                            ${securityFrameworks[key].name}
                                        </button>
                                    </li>
                                `).join('')}
                            </ul>
                            <div class="tab-content pt-3" id="securityFrameworkTabContent">
                                ${Object.keys(securityFrameworks).map((key, index) => `
                                    <div class="tab-pane fade ${index === 0 ? 'show active' : ''}" 
                                        id="${key.toLowerCase()}-tab-pane" 
                                        role="tabpanel" 
                                        aria-labelledby="${key.toLowerCase()}-tab" 
                                        tabindex="0">
                                        <div class="compliance-details">
                                            <div class="d-flex align-items-center mb-3">
                                                <div class="display-4 me-3">
                                                    <i class="fas ${securityFrameworks[key].icon} ${securityFrameworks[key].status === 'Compliant' ? 'text-success' : 'text-warning'}"></i>
                                                </div>
                                                <div>
                                                    <h4>${securityFrameworks[key].name}</h4>
                                                    <p class="text-muted mb-0">${securityFrameworks[key].description}</p>
                                                </div>
                                            </div>
                                            <div class="alert ${securityFrameworks[key].status === 'Compliant' ? 'alert-success' : 'alert-warning'}">
                                                <strong>Status: ${securityFrameworks[key].status}</strong>
                                                <p class="mb-0">${securityFrameworks[key].details}</p>
                                            </div>
                                            <h5>Compliance Breakdown</h5>
                                            <div class="table-responsive">
                                                <table class="table table-hover">
                                                    <thead>
                                                        <tr>
                                                            <th>Control Family</th>
                                                            <th>Status</th>
                                                            <th>Compliance</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${getSecurityControlFamilies(key).map(control => `
                                                            <tr>
                                                                <td>${control.name}</td>
                                                                <td>
                                                                    <span class="badge ${control.status === 'Compliant' ? 'bg-success' : control.status === 'Partial' ? 'bg-warning' : 'bg-danger'}">
                                                                        ${control.status}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <div class="progress" style="height: 8px;">
                                                                        <div class="progress-bar ${control.compliance >= 90 ? 'bg-success' : control.compliance >= 70 ? 'bg-info' : 'bg-warning'}" 
                                                                            role="progressbar" style="width: ${control.compliance}%" 
                                                                            aria-valuenow="${control.compliance}" aria-valuemin="0" aria-valuemax="100"></div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        `).join('')}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <h5>Certification Timeline</h5>
                                            <div class="certification-timeline mb-3">
                                                <div class="timeline-item">
                                                    <div class="timeline-marker bg-success"></div>
                                                    <div class="timeline-content">
                                                        <div class="timeline-date">June 2023</div>
                                                        <div class="timeline-title">Assessment Initiated</div>
                                                    </div>
                                                </div>
                                                <div class="timeline-item">
                                                    <div class="timeline-marker bg-success"></div>
                                                    <div class="timeline-content">
                                                        <div class="timeline-date">August 2023</div>
                                                        <div class="timeline-title">Controls Implementation</div>
                                                    </div>
                                                </div>
                                                <div class="timeline-item">
                                                    <div class="timeline-marker ${securityFrameworks[key].status === 'Compliant' ? 'bg-success' : 'bg-warning'}"></div>
                                                    <div class="timeline-content">
                                                        <div class="timeline-date">${securityFrameworks[key].lastCertified}</div>
                                                        <div class="timeline-title">${securityFrameworks[key].status === 'Compliant' ? 'Certification Completed' : 'In Progress'}</div>
                                                    </div>
                                                </div>
                                                <div class="timeline-item">
                                                    <div class="timeline-marker bg-light"></div>
                                                    <div class="timeline-content">
                                                        <div class="timeline-date">Ongoing</div>
                                                        <div class="timeline-title">Continuous Monitoring</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="text-end">
                                                <button class="btn btn-sm btn-outline-primary export-compliance-report-btn" data-framework="${key}">
                                                    <i class="fas fa-download me-1"></i> Export Compliance Report
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to the page
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        // Add CSS for timeline
        const timelineStyles = document.createElement('style');
        timelineStyles.textContent = `
            .certification-timeline {
                position: relative;
                padding-left: 30px;
                margin-bottom: 20px;
            }
            .certification-timeline:before {
                content: '';
                position: absolute;
                left: 10px;
                top: 0;
                bottom: 0;
                width: 2px;
                background: var(--bs-gray-300);
            }
            .timeline-item {
                position: relative;
                margin-bottom: 20px;
            }
            .timeline-marker {
                position: absolute;
                left: -30px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 2px solid white;
            }
            .timeline-content {
                padding: 0 0 0 10px;
            }
            .timeline-date {
                font-size: 0.8rem;
                color: var(--bs-gray-600);
            }
            .timeline-title {
                font-weight: 500;
            }
        `;
        document.head.appendChild(timelineStyles);

        // Initialize and show modal
        const modal = new bootstrap.Modal(document.getElementById('securityDetailsModal'));
        modal.show();

        // Add event listeners for export buttons
        document.querySelectorAll('.export-compliance-report-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const framework = this.dataset.framework;
                simulateReportExport(framework);
            });
        });
    }

    // Helper function to generate security control families for each framework
    function getSecurityControlFamilies(framework) {
        // This would typically come from an API
        const controlFamilies = {
            FISMA: [
                { name: 'Access Control', status: 'Compliant', compliance: 96 },
                { name: 'Audit and Accountability', status: 'Compliant', compliance: 92 },
                { name: 'Identification and Authentication', status: 'Compliant', compliance: 95 },
                { name: 'System and Communications Protection', status: 'Compliant', compliance: 93 },
                { name: 'System and Information Integrity', status: 'Compliant', compliance: 91 }
            ],
            FedRAMP: [
                { name: 'Access Control', status: 'Compliant', compliance: 94 },
                { name: 'Audit and Accountability', status: 'Compliant', compliance: 90 },
                { name: 'Risk Assessment', status: 'Compliant', compliance: 92 },
                { name: 'System and Communications Protection', status: 'Compliant', compliance: 89 },
                { name: 'Configuration Management', status: 'Partial', compliance: 85 }
            ],
            NIST: [
                { name: 'Access Control', status: 'Compliant', compliance: 93 },
                { name: 'Awareness and Training', status: 'Compliant', compliance: 90 },
                { name: 'Contingency Planning', status: 'Partial', compliance: 82 },
                { name: 'Identification and Authentication', status: 'Compliant', compliance: 91 },
                { name: 'System and Communications Protection', status: 'Compliant', compliance: 88 }
            ],
            CMMC: [
                { name: 'Access Control', status: 'Compliant', compliance: 85 },
                { name: 'Asset Management', status: 'Partial', compliance: 76 },
                { name: 'Audit and Accountability', status: 'Partial', compliance: 72 },
                { name: 'Configuration Management', status: 'Partial', compliance: 70 },
                { name: 'Identification and Authentication', status: 'Compliant', compliance: 88 }
            ]
        };
        
        return controlFamilies[framework] || [];
    }

    // Simulate export of compliance report
    function simulateReportExport(framework) {
        const btn = document.querySelector(`.export-compliance-report-btn[data-framework="${framework}"]`);
        const originalText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Generating...';
        
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-check me-1"></i> Report Generated';
            
            // Show toast notification
            const toastHTML = `
            <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 9999">
                <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header">
                        <i class="fas fa-check-circle text-success me-2"></i>
                        <strong class="me-auto">Report Generated</strong>
                        <small>Just now</small>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                    <div class="toast-body">
                        ${securityFrameworks[framework].name} compliance report has been generated and is ready for download.
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
                btn.disabled = false;
                btn.innerHTML = originalText;
            }, 5000);
        }, 2000);
    }

    // Initialize security features section on settings page if available
    const securityFeaturesContainer = document.getElementById('security-features-container');
    if (securityFeaturesContainer) {
        createSecurityComplianceWidget('security-features-container');
    }
});
