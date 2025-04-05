document.addEventListener('DOMContentLoaded', function() {
    // Advanced risk prediction and sentiment analysis functionality
    
    // This would be populated with actual data from the API
    const riskSentimentData = {
        bidId: 123,
        riskAssessment: {
            overallRiskScore: 65, // 0-100 scale
            riskCategories: [
                { name: 'Financial Stability', score: 75, level: 'medium', description: 'Vendor shows adequate financial resources with some liquidity concerns' },
                { name: 'Technical Capability', score: 85, level: 'low', description: 'Strong technical expertise demonstrated in proposal' },
                { name: 'Schedule Risk', score: 55, level: 'high', description: 'Timeline appears aggressive with potential bottlenecks in deployment phase' },
                { name: 'Resource Allocation', score: 60, level: 'medium', description: 'Adequate staffing levels but limited expertise in some key areas' },
                { name: 'Compliance Risk', score: 80, level: 'low', description: 'Good understanding of regulatory requirements with minor gaps' }
            ],
            keyRiskIndicators: [
                { type: 'warning', text: 'Proposed timeline does not account for potential procurement delays' },
                { type: 'danger', text: 'Limited redundancy in project staffing for critical roles' },
                { type: 'warning', text: 'Dependency on third-party services with unclear SLAs' }
            ]
        },
        sentimentAnalysis: {
            overallSentiment: 78, // 0-100 scale
            confidenceScore: 0.85,
            sentimentCategories: [
                { name: 'Commitment', score: 85, level: 'high', description: 'Strong language demonstrating dedication to project success' },
                { name: 'Certainty', score: 65, level: 'medium', description: 'Some qualifiers and conditionals present in technical sections' },
                { name: 'Responsibility', score: 80, level: 'high', description: 'Clear ownership of deliverables and accountability' },
                { name: 'Enthusiasm', score: 75, level: 'medium', description: 'Positive language throughout with moderate engagement indicators' }
            ],
            languagePatterns: [
                { type: 'positive', text: 'Frequent use of definitive commitment language ("will deliver", "guarantees")' },
                { type: 'neutral', text: 'Balanced presentation of capabilities and limitations' },
                { type: 'positive', text: 'Consistent references to quality assurance and verification processes' }
            ]
        }
    };

    // Create risk assessment visualization
    function createRiskAssessmentViz(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clear any loading indicators
        container.innerHTML = '';

        // Create risk score gauge
        const gaugeContainer = document.createElement('div');
        gaugeContainer.className = 'text-center mb-4';
        gaugeContainer.innerHTML = `
            <h5>Overall Risk Assessment</h5>
            <div class="risk-gauge-container">
                <canvas id="riskGaugeChart" width="200" height="200"></canvas>
                <div class="risk-gauge-label ${getRiskLevelClass(data.overallRiskScore)}">
                    ${data.overallRiskScore}%
                </div>
            </div>
            <div class="risk-level-indicator mt-2">
                ${getRiskLevelBadge(data.overallRiskScore)}
            </div>
        `;
        container.appendChild(gaugeContainer);

        // Create risk categories
        const categoriesContainer = document.createElement('div');
        categoriesContainer.className = 'risk-categories-container mb-4';
        categoriesContainer.innerHTML = `
            <h5>Risk Categories</h5>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Risk Level</th>
                            <th>Score</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.riskCategories.map(category => `
                            <tr>
                                <td>${category.name}</td>
                                <td>${getRiskLevelBadge(category.score)}</td>
                                <td>${category.score}%</td>
                                <td>${category.description}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(categoriesContainer);

        // Create key risk indicators
        const indicatorsContainer = document.createElement('div');
        indicatorsContainer.className = 'risk-indicators-container';
        indicatorsContainer.innerHTML = `
            <h5>Key Risk Indicators</h5>
            ${data.keyRiskIndicators.map(indicator => `
                <div class="alert alert-${indicator.type} d-flex align-items-start">
                    <i class="fas ${indicator.type === 'danger' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'} mt-1 me-2"></i>
                    <div>${indicator.text}</div>
                </div>
            `).join('')}
        `;
        container.appendChild(indicatorsContainer);

        // Initialize risk gauge chart
        const gaugeCtx = document.getElementById('riskGaugeChart');
        if (gaugeCtx) {
            new Chart(gaugeCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [data.overallRiskScore, 100 - data.overallRiskScore],
                        backgroundColor: [
                            getRiskGaugeColor(data.overallRiskScore),
                            'rgba(200, 200, 200, 0.2)'
                        ],
                        borderWidth: 0,
                        circumference: 180,
                        rotation: 270
                    }]
                },
                options: {
                    cutout: '75%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: false
                        }
                    }
                }
            });
        }
    }

    // Create sentiment analysis visualization
    function createSentimentAnalysisViz(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clear any loading indicators
        container.innerHTML = '';

        // Create sentiment score card
        const scoreContainer = document.createElement('div');
        scoreContainer.className = 'text-center mb-4';
        scoreContainer.innerHTML = `
            <h5>Overall Language Sentiment</h5>
            <div class="sentiment-gauge-container">
                <canvas id="sentimentGaugeChart" width="200" height="200"></canvas>
                <div class="sentiment-gauge-label ${getSentimentLevelClass(data.overallSentiment)}">
                    ${data.overallSentiment}%
                </div>
            </div>
            <div class="mt-2">
                <span class="badge bg-info">Confidence: ${Math.round(data.confidenceScore * 100)}%</span>
            </div>
        `;
        container.appendChild(scoreContainer);

        // Create sentiment categories
        const categoriesContainer = document.createElement('div');
        categoriesContainer.className = 'sentiment-categories-container mb-4';
        categoriesContainer.innerHTML = `
            <h5>Sentiment Categories</h5>
            ${data.sentimentCategories.map(category => `
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span>${category.name}</span>
                        <span class="badge ${getSentimentBadgeClass(category.score)}">${category.level}</span>
                    </div>
                    <div class="progress" style="height: 10px;">
                        <div class="progress-bar ${getSentimentProgressClass(category.score)}" role="progressbar" style="width: ${category.score}%" aria-valuenow="${category.score}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <small class="text-muted">${category.description}</small>
                </div>
            `).join('')}
        `;
        container.appendChild(categoriesContainer);

        // Create language patterns section
        const patternsContainer = document.createElement('div');
        patternsContainer.className = 'language-patterns-container';
        patternsContainer.innerHTML = `
            <h5>Key Language Patterns</h5>
            <ul class="list-group">
                ${data.languagePatterns.map(pattern => `
                    <li class="list-group-item d-flex">
                        <i class="fas ${pattern.type === 'positive' ? 'fa-arrow-up text-success' : pattern.type === 'negative' ? 'fa-arrow-down text-danger' : 'fa-minus text-secondary'} me-2 mt-1"></i>
                        <span>${pattern.text}</span>
                    </li>
                `).join('')}
            </ul>
        `;
        container.appendChild(patternsContainer);

        // Initialize sentiment gauge chart
        const gaugeCtx = document.getElementById('sentimentGaugeChart');
        if (gaugeCtx) {
            new Chart(gaugeCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [data.overallSentiment, 100 - data.overallSentiment],
                        backgroundColor: [
                            getSentimentGaugeColor(data.overallSentiment),
                            'rgba(200, 200, 200, 0.2)'
                        ],
                        borderWidth: 0,
                        circumference: 180,
                        rotation: 270
                    }]
                },
                options: {
                    cutout: '75%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: false
                        }
                    }
                }
            });
        }
    }

    // Helper functions for risk assessment
    function getRiskLevelClass(score) {
        if (score >= 75) return 'risk-low';
        if (score >= 50) return 'risk-medium';
        return 'risk-high';
    }

    function getRiskLevelBadge(score) {
        if (score >= 75) return '<span class="badge bg-success">Low Risk</span>';
        if (score >= 50) return '<span class="badge bg-warning">Medium Risk</span>';
        return '<span class="badge bg-danger">High Risk</span>';
    }

    function getRiskGaugeColor(score) {
        if (score >= 75) return 'rgba(40, 167, 69, 0.8)'; // Green
        if (score >= 50) return 'rgba(255, 193, 7, 0.8)'; // Yellow
        return 'rgba(220, 53, 69, 0.8)'; // Red
    }

    // Helper functions for sentiment analysis
    function getSentimentLevelClass(score) {
        if (score >= 75) return 'sentiment-high';
        if (score >= 50) return 'sentiment-medium';
        return 'sentiment-low';
    }

    function getSentimentBadgeClass(score) {
        if (score >= 75) return 'bg-success';
        if (score >= 50) return 'bg-info';
        return 'bg-secondary';
    }

    function getSentimentProgressClass(score) {
        if (score >= 75) return 'bg-success';
        if (score >= 50) return 'bg-info';
        return 'bg-secondary';
    }

    function getSentimentGaugeColor(score) {
        if (score >= 75) return 'rgba(40, 167, 69, 0.8)'; // Green
        if (score >= 50) return 'rgba(13, 202, 240, 0.8)'; // Blue
        return 'rgba(108, 117, 125, 0.8)'; // Gray
    }

    // Add CSS for visualizations
    const vizStyles = document.createElement('style');
    vizStyles.textContent = `
        .risk-gauge-container, .sentiment-gauge-container {
            position: relative;
            width: 200px;
            height: 100px;
            margin: 0 auto;
        }
        .risk-gauge-label, .sentiment-gauge-label {
            position: absolute;
            top: 70%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.5rem;
            font-weight: bold;
        }
        .risk-high {
            color: var(--bs-danger);
        }
        .risk-medium {
            color: var(--bs-warning);
        }
        .risk-low {
            color: var(--bs-success);
        }
        .sentiment-high {
            color: var(--bs-success);
        }
        .sentiment-medium {
            color: var(--bs-info);
        }
        .sentiment-low {
            color: var(--bs-secondary);
        }
    `;
    document.head.appendChild(vizStyles);

    // Initialize risk and sentiment visualizations if they exist on the page
    const riskContainer = document.getElementById('riskAssessmentViz');
    const sentimentContainer = document.getElementById('sentimentAnalysisViz');

    if (riskContainer && sentimentContainer) {
        // Simulate loading data from API
        setTimeout(() => {
            createRiskAssessmentViz('riskAssessmentViz', riskSentimentData.riskAssessment);
            createSentimentAnalysisViz('sentimentAnalysisViz', riskSentimentData.sentimentAnalysis);
        }, 1000);
    }

    // Add risk assessment and sentiment analysis to reports page if available
    const reportContainer = document.querySelector('.report-container');
    if (reportContainer) {
        const riskSentimentSection = document.createElement('div');
        riskSentimentSection.className = 'card mb-4';
        riskSentimentSection.innerHTML = `
            <div class="card-header">
                <ul class="nav nav-tabs card-header-tabs" id="riskSentimentTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="risk-tab" data-bs-toggle="tab" data-bs-target="#risk-tab-pane" type="button" role="tab" aria-controls="risk-tab-pane" aria-selected="true">
                            <i class="fas fa-exclamation-triangle me-1"></i> Risk Assessment
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="sentiment-tab" data-bs-toggle="tab" data-bs-target="#sentiment-tab-pane" type="button" role="tab" aria-controls="sentiment-tab-pane" aria-selected="false">
                            <i class="fas fa-comment-alt me-1"></i> Sentiment Analysis
                        </button>
                    </li>
                </ul>
            </div>
            <div class="card-body">
                <div class="tab-content" id="riskSentimentTabContent">
                    <div class="tab-pane fade show active" id="risk-tab-pane" role="tabpanel" aria-labelledby="risk-tab" tabindex="0">
                        <div id="riskAssessmentViz">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading risk assessment...</span>
                                </div>
                                <p class="mt-2">Loading risk assessment...</p>
                            </div>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="sentiment-tab-pane" role="tabpanel" aria-labelledby="sentiment-tab" tabindex="0">
                        <div id="sentimentAnalysisViz">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading sentiment analysis...</span>
                                </div>
                                <p class="mt-2">Loading sentiment analysis...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add the section after any existing content
        reportContainer.appendChild(riskSentimentSection);
        
        // Initialize the visualizations after a delay
        setTimeout(() => {
            createRiskAssessmentViz('riskAssessmentViz', riskSentimentData.riskAssessment);
            createSentimentAnalysisViz('sentimentAnalysisViz', riskSentimentData.sentimentAnalysis);
        }, 1500);
    }
});
