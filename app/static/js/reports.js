// Reports functionality

document.addEventListener('DOMContentLoaded', () => {
  // Only load report data if we have an RFP ID
  if (rfpId) {
    loadReportData(rfpId);
  }
  
  // Setup event listeners
  setupEventListeners();
});

/**
 * Load report data for the given RFP
 * @param {number} rfpId - ID of the RFP
 */
async function loadReportData(rfpId) {
  try {
    // First, fetch RFP details
    const rfpResponse = await fetch(`/api/rfp/${rfpId}`);
    if (!rfpResponse.ok) {
      throw new Error('Failed to fetch RFP details');
    }
    const rfpData = await rfpResponse.json();
    
    // Then, fetch bid comparison data
    const comparisonResponse = await fetch(`/api/reports/comparison/${rfpId}`);
    if (!comparisonResponse.ok) {
      throw new Error('Failed to fetch comparison data');
    }
    const comparisonData = await comparisonResponse.json();
    
    // Update the UI with the fetched data
    updateRequirementsUI(rfpData);
    updateBidSummaryUI(comparisonData);
    updateBidComparisonUI(comparisonData);
    renderBidComparisonChart(comparisonData);
    
  } catch (error) {
    console.error('Error loading report data:', error);
    showToast('Failed to load report data. Please try again.', 'danger');
  }
}

/**
 * Update the requirements UI with RFP data
 * @param {Object} rfpData - RFP data from the API
 */
function updateRequirementsUI(rfpData) {
  const requirementsList = document.getElementById('requirements-list');
  const specificationslist = document.getElementById('specifications-list');
  const requirementsStats = document.getElementById('requirements-stats');
  
  // Process requirements
  if (rfpData.requirements && rfpData.requirements.length > 0) {
    // Hide the no requirements message
    document.getElementById('no-requirements-list').classList.add('d-none');
    
    // Clear existing content
    requirementsList.innerHTML = '';
    
    // Group requirements by category
    const categories = {};
    rfpData.requirements.forEach(req => {
      if (!categories[req.category]) {
        categories[req.category] = [];
      }
      categories[req.category].push(req);
    });
    
    // Build the UI
    Object.keys(categories).forEach(category => {
      // Create category heading
      const categoryHeading = document.createElement('h5');
      categoryHeading.className = 'mb-3 mt-4';
      categoryHeading.textContent = category;
      requirementsList.appendChild(categoryHeading);
      
      // Create requirements table
      const table = document.createElement('table');
      table.className = 'table table-hover';
      
      // Create table header
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th scope="col" style="width: 60%">Requirement</th>
          <th scope="col">Priority</th>
          <th scope="col">Section</th>
        </tr>
      `;
      table.appendChild(thead);
      
      // Create table body
      const tbody = document.createElement('tbody');
      categories[category].forEach(req => {
        const row = document.createElement('tr');
        row.dataset.category = req.category.toLowerCase();
        
        const priorityClass = req.priority === 'Must-have' ? 'bg-danger' : 
                             (req.priority === 'Should-have' ? 'bg-warning' : 'bg-info');
        
        row.innerHTML = `
          <td>${req.description}</td>
          <td><span class="badge ${priorityClass}">${req.priority}</span></td>
          <td>${req.section}</td>
        `;
        
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      requirementsList.appendChild(table);
    });
    
    // Update requirements stats
    updateRequirementsStats(rfpData.requirements);
  }
  
  // Process technical specifications
  if (rfpData.technical_specifications && rfpData.technical_specifications.length > 0) {
    // Hide the no specifications message
    document.getElementById('no-specifications-list').classList.add('d-none');
    
    // Clear existing content
    specificationslist.innerHTML = '';
    
    // Group specifications by category
    const categories = {};
    rfpData.technical_specifications.forEach(spec => {
      if (!categories[spec.category]) {
        categories[spec.category] = [];
      }
      categories[spec.category].push(spec);
    });
    
    // Build the UI
    Object.keys(categories).forEach(category => {
      // Create category heading
      const categoryHeading = document.createElement('h5');
      categoryHeading.className = 'mb-3 mt-4';
      categoryHeading.textContent = category;
      specificationslist.appendChild(categoryHeading);
      
      // Create specifications table
      const table = document.createElement('table');
      table.className = 'table table-hover';
      
      // Create table header
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Description</th>
          <th scope="col">Requirements</th>
          <th scope="col">Mandatory</th>
        </tr>
      `;
      table.appendChild(thead);
      
      // Create table body
      const tbody = document.createElement('tbody');
      categories[category].forEach(spec => {
        const row = document.createElement('tr');
        
        let requirements = '';
        if (spec.min_value) {
          requirements += `Min: ${spec.min_value}`;
          if (spec.measurement_unit) {
            requirements += ` ${spec.measurement_unit}`;
          }
        }
        if (spec.max_value) {
          if (requirements) requirements += ', ';
          requirements += `Max: ${spec.max_value}`;
          if (spec.measurement_unit) {
            requirements += ` ${spec.measurement_unit}`;
          }
        }
        if (!requirements && spec.measurement_unit) {
          requirements = spec.measurement_unit;
        }
        
        row.innerHTML = `
          <td>${spec.name}</td>
          <td>${spec.description}</td>
          <td>${requirements || 'N/A'}</td>
          <td><span class="badge ${spec.is_mandatory ? 'bg-danger' : 'bg-secondary'}">${spec.is_mandatory ? 'Yes' : 'No'}</span></td>
        `;
        
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      specificationslist.appendChild(table);
    });
  }
}

/**
 * Update requirements statistics display
 * @param {Array} requirements - Requirements data from the API
 */
function updateRequirementsStats(requirements) {
  const requirementsStats = document.getElementById('requirements-stats');
  
  // Hide the no requirements stats message
  document.getElementById('no-requirements-stats').classList.add('d-none');
  
  // Clear existing content
  requirementsStats.innerHTML = '';
  
  // Count categories and priorities
  const categories = {};
  const priorities = {
    'Must-have': 0,
    'Should-have': 0,
    'Nice-to-have': 0
  };
  
  requirements.forEach(req => {
    // Count categories
    if (!categories[req.category]) {
      categories[req.category] = 0;
    }
    categories[req.category]++;
    
    // Count priorities
    if (priorities[req.priority] !== undefined) {
      priorities[req.priority]++;
    }
  });
  
  // Create category breakdown
  const categoryList = document.createElement('div');
  categoryList.className = 'mb-3';
  categoryList.innerHTML = '<h6 class="mb-2">Requirements by Category</h6>';
  
  const categoryChart = document.createElement('div');
  categoryChart.className = 'd-flex flex-wrap gap-2 mb-3';
  
  Object.keys(categories).forEach(category => {
    const percentage = Math.round((categories[category] / requirements.length) * 100);
    
    const categoryItem = document.createElement('div');
    categoryItem.className = 'me-2';
    categoryItem.innerHTML = `
      <div class="mb-1">${category}: ${categories[category]}</div>
      <div class="progress" style="width: 100px; height: 10px;">
        <div class="progress-bar" role="progressbar" style="width: ${percentage}%" 
             aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    `;
    
    categoryChart.appendChild(categoryItem);
  });
  
  categoryList.appendChild(categoryChart);
  requirementsStats.appendChild(categoryList);
  
  // Create priority breakdown
  const priorityList = document.createElement('div');
  priorityList.className = 'mb-3';
  priorityList.innerHTML = '<h6 class="mb-2">Requirements by Priority</h6>';
  
  const totalPriorities = Object.values(priorities).reduce((sum, val) => sum + val, 0);
  
  Object.keys(priorities).forEach(priority => {
    const count = priorities[priority];
    const percentage = totalPriorities > 0 ? Math.round((count / totalPriorities) * 100) : 0;
    
    const priorityClass = priority === 'Must-have' ? 'bg-danger' : 
                          (priority === 'Should-have' ? 'bg-warning' : 'bg-info');
    
    const priorityItem = document.createElement('div');
    priorityItem.className = 'mb-2';
    priorityItem.innerHTML = `
      <div class="d-flex justify-content-between mb-1">
        <span>${priority}</span>
        <span>${count} (${percentage}%)</span>
      </div>
      <div class="progress">
        <div class="progress-bar ${priorityClass}" role="progressbar" style="width: ${percentage}%" 
             aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    `;
    
    priorityList.appendChild(priorityItem);
  });
  
  requirementsStats.appendChild(priorityList);
}

/**
 * Update bid summary UI
 * @param {Object} comparisonData - Comparison data from the API
 */
function updateBidSummaryUI(comparisonData) {
  const bidSummaryContent = document.getElementById('bid-summary-content');
  
  if (!comparisonData.bids || comparisonData.bids.length === 0) {
    document.getElementById('no-bid-summary').classList.remove('d-none');
    return;
  }
  
  // Hide the no bids message
  document.getElementById('no-bid-summary').classList.add('d-none');
  
  // Clear existing content
  bidSummaryContent.innerHTML = '';
  
  // Sort bids by total score (descending)
  const bids = [...comparisonData.bids].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  
  // Create a list group for the bids
  const bidList = document.createElement('div');
  bidList.className = 'list-group';
  
  bids.forEach((bid, index) => {
    const scoreClass = getScoreColorClass(bid.total_score || 0);
    const rank = index + 1;
    
    const bidItem = document.createElement('a');
    bidItem.href = `#bid-details-${bid.id}`;
    bidItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
    bidItem.dataset.bsToggle = 'collapse';
    bidItem.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
    
    bidItem.innerHTML = `
      <div>
        <div class="d-flex align-items-center">
          <span class="badge bg-secondary me-2">#${rank}</span>
          <strong>${bid.vendor_name}</strong>
        </div>
      </div>
      <div class="badge ${scoreClass} score-badge">${Math.round(bid.total_score || 0)}</div>
    `;
    
    bidList.appendChild(bidItem);
    
    // Create collapsible details section
    const detailsSection = document.createElement('div');
    detailsSection.id = `bid-details-${bid.id}`;
    detailsSection.className = `collapse ${index === 0 ? 'show' : ''}`;
    
    // Create strengths and weaknesses lists
    let detailsContent = '<div class="p-3 border-top">';
    
    if (bid.strengths && bid.strengths.length > 0) {
      detailsContent += '<h6 class="mb-2">Key Strengths</h6>';
      detailsContent += '<ul class="list-group mb-3">';
      
      bid.strengths.slice(0, 3).forEach(strength => {
        detailsContent += `<li class="list-group-item strength-item">${strength}</li>`;
      });
      
      detailsContent += '</ul>';
    }
    
    if (bid.weaknesses && bid.weaknesses.length > 0) {
      detailsContent += '<h6 class="mb-2">Key Weaknesses</h6>';
      detailsContent += '<ul class="list-group">';
      
      bid.weaknesses.slice(0, 3).forEach(weakness => {
        detailsContent += `<li class="list-group-item weakness-item">${weakness}</li>`;
      });
      
      detailsContent += '</ul>';
    }
    
    detailsContent += '</div>';
    detailsSection.innerHTML = detailsContent;
    
    bidList.appendChild(detailsSection);
  });
  
  bidSummaryContent.appendChild(bidList);
}

/**
 * Update bid comparison UI
 * @param {Object} comparisonData - Comparison data from the API
 */
function updateBidComparisonUI(comparisonData) {
  const bidComparisonContent = document.getElementById('bid-comparison-content');
  const gapAnalysisContent = document.getElementById('gap-analysis-content');
  
  if (!comparisonData.bids || comparisonData.bids.length === 0) {
    document.getElementById('no-bids-comparison').classList.remove('d-none');
    document.getElementById('no-gaps-analysis').classList.remove('d-none');
    return;
  }
  
  // Hide the no bids message
  document.getElementById('no-bids-comparison').classList.add('d-none');
  document.getElementById('no-gaps-analysis').classList.add('d-none');
  
  // Clear existing content
  bidComparisonContent.innerHTML = '';
  gapAnalysisContent.innerHTML = '';
  
  // Sort bids by total score (descending)
  const bids = [...comparisonData.bids].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  
  // Create requirement comparison tables
  if (comparisonData.requirement_categories) {
    Object.keys(comparisonData.requirement_categories).forEach(category => {
      const requirements = comparisonData.requirement_categories[category];
      
      // Create category heading
      const categoryHeading = document.createElement('h5');
      categoryHeading.className = 'mb-3 mt-4';
      categoryHeading.textContent = `${category} Requirements`;
      bidComparisonContent.appendChild(categoryHeading);
      
      // Create comparison table
      const table = document.createElement('table');
      table.className = 'table table-striped comparison-table';
      
      // Create table header
      const thead = document.createElement('thead');
      let headerRow = '<tr><th>Requirement</th>';
      
      bids.forEach(bid => {
        headerRow += `<th class="text-center">${bid.vendor_name}</th>`;
      });
      
      headerRow += '</tr>';
      thead.innerHTML = headerRow;
      table.appendChild(thead);
      
      // Create table body
      const tbody = document.createElement('tbody');
      
      requirements.forEach(req => {
        const row = document.createElement('tr');
        
        // Add requirement description
        let rowHtml = `<td>${req.description}`;
        
        if (req.priority === 'Must-have') {
          rowHtml += ' <span class="badge bg-danger">Must-have</span>';
        } else if (req.priority === 'Should-have') {
          rowHtml += ' <span class="badge bg-warning">Should-have</span>';
        }
        
        rowHtml += '</td>';
        
        // Add scores for each bid
        bids.forEach(bid => {
          const reqCompliance = bid.requirement_compliance || {};
          const reqScore = reqCompliance[req.id] ? reqCompliance[req.id].score : null;
          
          if (reqScore !== null) {
            const scoreClass = getScoreCellClass(reqScore);
            rowHtml += `<td class="text-center"><div class="score-cell ${scoreClass} mx-auto">${Math.round(reqScore)}</div></td>`;
          } else {
            rowHtml += '<td class="text-center text-muted">N/A</td>';
          }
        });
        
        row.innerHTML = rowHtml;
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      bidComparisonContent.appendChild(table);
    });
  }
  
  // Create technical specification comparison tables
  if (comparisonData.technical_categories) {
    Object.keys(comparisonData.technical_categories).forEach(category => {
      const specs = comparisonData.technical_categories[category];
      
      // Create category heading
      const categoryHeading = document.createElement('h5');
      categoryHeading.className = 'mb-3 mt-4';
      categoryHeading.textContent = `${category} Specifications`;
      bidComparisonContent.appendChild(categoryHeading);
      
      // Create comparison table
      const table = document.createElement('table');
      table.className = 'table table-striped comparison-table';
      
      // Create table header
      const thead = document.createElement('thead');
      let headerRow = '<tr><th>Specification</th>';
      
      bids.forEach(bid => {
        headerRow += `<th class="text-center">${bid.vendor_name}</th>`;
      });
      
      headerRow += '</tr>';
      thead.innerHTML = headerRow;
      table.appendChild(thead);
      
      // Create table body
      const tbody = document.createElement('tbody');
      
      specs.forEach(spec => {
        const row = document.createElement('tr');
        
        // Add spec description
        let rowHtml = `<td>${spec.name}: ${spec.description}`;
        
        if (spec.is_mandatory) {
          rowHtml += ' <span class="badge bg-danger">Mandatory</span>';
        }
        
        rowHtml += '</td>';
        
        // Add scores for each bid
        bids.forEach(bid => {
          const techCompliance = bid.technical_compliance || {};
          const specScore = techCompliance[spec.id] ? techCompliance[spec.id].score : null;
          
          if (specScore !== null) {
            const scoreClass = getScoreCellClass(specScore);
            rowHtml += `<td class="text-center"><div class="score-cell ${scoreClass} mx-auto">${Math.round(specScore)}</div></td>`;
          } else {
            rowHtml += '<td class="text-center text-muted">N/A</td>';
          }
        });
        
        row.innerHTML = rowHtml;
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      bidComparisonContent.appendChild(table);
    });
  }
  
  // Create gap analysis section
  if (bids.length > 0) {
    // Loop through bids
    bids.forEach(bid => {
      if (bid.weaknesses && bid.weaknesses.length > 0) {
        // Create vendor heading
        const vendorHeading = document.createElement('h5');
        vendorHeading.className = 'mb-3 mt-4';
        vendorHeading.textContent = `${bid.vendor_name} - Identified Gaps`;
        gapAnalysisContent.appendChild(vendorHeading);
        
        // Create gap list
        const gapList = document.createElement('div');
        gapList.className = 'list-group mb-4';
        
        bid.weaknesses.forEach(weakness => {
          const gapItem = document.createElement('div');
          gapItem.className = 'list-group-item gap-item';
          gapItem.textContent = weakness;
          gapList.appendChild(gapItem);
        });
        
        gapAnalysisContent.appendChild(gapList);
      }
    });
  }
}

/**
 * Render bid comparison chart
 * @param {Object} comparisonData - Comparison data from the API
 */
function renderBidComparisonChart(comparisonData) {
  const chartCanvas = document.getElementById('bidComparisonChart');
  
  if (!comparisonData.bids || comparisonData.bids.length === 0) {
    document.getElementById('no-bids-message').classList.remove('d-none');
    return;
  }
  
  // Hide the no bids message
  document.getElementById('no-bids-message').classList.add('d-none');
  
  // Prepare data for the chart
  const chartData = {
    labels: [],
    datasets: [
      {
        label: 'Overall Score',
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        data: []
      },
      {
        label: 'Technical Compliance',
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        data: []
      },
      {
        label: 'Requirement Compliance',
        backgroundColor: 'rgba(255, 159, 64, 0.7)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
        data: []
      }
    ]
  };
  
  // Sort bids by total score (descending)
  const bids = [...comparisonData.bids].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  
  // Calculate average technical and requirement compliance scores for each bid
  bids.forEach(bid => {
    chartData.labels.push(bid.vendor_name);
    chartData.datasets[0].data.push(bid.total_score || 0);
    
    // Calculate average technical compliance
    let techTotal = 0;
    let techCount = 0;
    
    if (bid.technical_compliance) {
      for (const key in bid.technical_compliance) {
        if (bid.technical_compliance[key].score) {
          techTotal += bid.technical_compliance[key].score;
          techCount++;
        }
      }
    }
    
    const techAvg = techCount > 0 ? techTotal / techCount : 0;
    chartData.datasets[1].data.push(Math.round(techAvg));
    
    // Calculate average requirement compliance
    let reqTotal = 0;
    let reqCount = 0;
    
    if (bid.requirement_compliance) {
      for (const key in bid.requirement_compliance) {
        if (bid.requirement_compliance[key].score) {
          reqTotal += bid.requirement_compliance[key].score;
          reqCount++;
        }
      }
    }
    
    const reqAvg = reqCount > 0 ? reqTotal / reqCount : 0;
    chartData.datasets[2].data.push(Math.round(reqAvg));
  });
  
  // Create the chart
  new Chart(chartCanvas, {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Score'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.raw}/100`;
            }
          }
        }
      }
    }
  });
}

/**
 * Get color class for score cell
 * @param {number} score - Score value (0-100)
 * @returns {string} - CSS class
 */
function getScoreCellClass(score) {
  if (score >= 80) return 'bg-success';
  if (score >= 60) return 'bg-info';
  if (score >= 40) return 'bg-warning';
  return 'bg-danger';
}

/**
 * Setup event listeners for the reports page
 */
function setupEventListeners() {
  // Handle "View All Requirements" button click
  const viewRequirementsBtn = document.getElementById('view-all-requirements-btn');
  if (viewRequirementsBtn) {
    viewRequirementsBtn.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('requirements-tab').click();
    });
  }
  
  // Handle Export Report button click
  const exportReportBtn = document.getElementById("exportReportBtn");
  if (exportReportBtn) {
    exportReportBtn.addEventListener("click", function() {
      exportReportToPDF();
    });
  }
  
  // Handle Generate Report button click (One-Click Summary)
  const generateReportBtn = document.getElementById("generateReportBtn");
  if (generateReportBtn) {
    generateReportBtn.addEventListener("click", function() {
      const modal = new bootstrap.Modal(document.getElementById("infographicReportModal"));
      modal.show();
      generateInfographicReport(rfpId);
    });
  }
  
  // Handle Print Report button click
  const printReportBtn = document.getElementById("printReportBtn");
  if (printReportBtn) {
    printReportBtn.addEventListener("click", function() {
      window.print();
    });
  }
  const exportReportBtn = document.getElementById("exportReportBtn");
  if (exportReportBtn) {
    exportReportBtn.addEventListener("click", function() {
      exportReportToPDF();
    });
  }
  
  // Handle Generate Report button click (One-Click Summary)
  const generateReportBtn = document.getElementById("generateReportBtn");
  if (generateReportBtn) {
    generateReportBtn.addEventListener("click", function() {
      const modal = new bootstrap.Modal(document.getElementById('infographicReportModal'));
      modal.show();
      generateInfographicReport(rfpId);
    });
  }
  
  // Handle Print Report button click
  const printReportBtn = document.getElementById("printReportBtn");
  if (printReportBtn) {
    printReportBtn.addEventListener("click", function() {
      window.print();
    });
  }
  
  // Handle requirement filtering
  const filterButtons = document.querySelectorAll('[data-filter]');
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      const filter = this.getAttribute('data-filter');
      
      // Filter requirements
      const requirements = document.querySelectorAll('#requirements-list tbody tr');
      requirements.forEach(req => {
        if (filter === 'all' || req.dataset.category === filter) {
          req.style.display = '';
        } else {
          req.style.display = 'none';
        }
      });
    });
  });
}

/**
 * Export the current report to PDF
 */
function exportReportToPDF() {
  try {
    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Show loading toast
    showToast('Generating PDF report...', 'info');
    
    // Get RFP title
    const rfpTitle = document.querySelector('h2').innerText;
    const rfpAgency = document.querySelector('.lead.text-muted').innerText.split('|')[0].trim();
    
    // Set fonts
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(60, 120, 216); // Primary blue color
    
    // Add title
    doc.text('UniSphere Analysis Report', 15, 20);
    
    // Add RFP details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(rfpTitle, 15, 30);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Agency: ${rfpAgency}`, 15, 40);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 45);
    
    // Add divider
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 50, 195, 50);
    
    // Add bid summary section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Bid Summary', 15, 60);
    
    // Get bid data
    const bidSummary = document.querySelector('#bid-summary-content');
    let yPos = 70;
    
    if (bidSummary && !bidSummary.querySelector('#no-bid-summary').classList.contains('d-none')) {
      // Get all bid items
      const bidItems = bidSummary.querySelectorAll('.list-group-item');
      
      bidItems.forEach((item, index) => {
        const vendorName = item.querySelector('strong').innerText;
        const score = item.querySelector('.badge').innerText;
        const rank = index + 1;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(`${rank}. ${vendorName}`, 20, yPos);
        
        // Score with color
        const scoreNumber = parseInt(score, 10);
        if (scoreNumber >= 80) {
          doc.setTextColor(40, 167, 69); // success green
        } else if (scoreNumber >= 60) {
          doc.setTextColor(255, 193, 7); // warning yellow
        } else {
          doc.setTextColor(220, 53, 69); // danger red
        }
        
        doc.text(`Score: ${score}`, 150, yPos);
        doc.setTextColor(0, 0, 0); // reset color
        
        yPos += 10;
        
        // Add details if expanded
        const detailsId = item.getAttribute('href');
        const details = document.querySelector(detailsId);
        
        if (details && details.classList.contains('show')) {
          // Add strengths
          const strengths = details.querySelectorAll('.strength-item');
          if (strengths.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Strengths:', 25, yPos);
            yPos += 5;
            
            doc.setFont('helvetica', 'normal');
            strengths.forEach(strength => {
              // Check if we need a new page
              if (yPos > 270) {
                doc.addPage();
                yPos = 20;
              }
              
              const strengthText = strength.innerText;
              // Limit text length and add ellipsis if too long
              const truncatedText = strengthText.length > 70 ? strengthText.substring(0, 70) + '...' : strengthText;
              
              doc.text(`• ${truncatedText}`, 30, yPos);
              yPos += 5;
            });
            yPos += 5;
          }
          
          // Add weaknesses
          const weaknesses = details.querySelectorAll('.weakness-item');
          if (weaknesses.length > 0) {
            // Check if we need a new page
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            
            doc.setFont('helvetica', 'bold');
            doc.text('Weaknesses:', 25, yPos);
            yPos += 5;
            
            doc.setFont('helvetica', 'normal');
            weaknesses.forEach(weakness => {
              // Check if we need a new page
              if (yPos > 270) {
                doc.addPage();
                yPos = 20;
              }
              
              const weaknessText = weakness.innerText;
              // Limit text length and add ellipsis if too long
              const truncatedText = weaknessText.length > 70 ? weaknessText.substring(0, 70) + '...' : weaknessText;
              
              doc.text(`• ${truncatedText}`, 30, yPos);
              yPos += 5;
            });
            yPos += 5;
          }
        }
        
        yPos += 5;
      });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.text('No bids available', 20, yPos);
      yPos += 10;
    }
    
    // Get chart as image
    const bidComparisonChart = document.getElementById('bidComparisonChart');
    if (bidComparisonChart) {
      // Check if we need a new page
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      
      // Add chart title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Bid Score Comparison', 15, yPos);
      yPos += 10;
      
      // Convert chart to image and add to PDF
      html2canvas(bidComparisonChart).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        
        // Add the chart image
        doc.addImage(imgData, 'PNG', 15, yPos, 180, 90);
        
        // Save the PDF
        doc.save(`UniSphere_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
        // Show success toast
        showToast('Report successfully exported as PDF', 'success');
      }).catch(err => {
        console.error('Error generating chart image:', err);
        // Save the PDF without the chart
        doc.save(`UniSphere_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Report exported as PDF (without chart visualization)', 'warning');
      });
    } else {
      // Save the PDF without the chart
      doc.save(`UniSphere_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Report successfully exported as PDF', 'success');
    }
  } catch (error) {
    console.error('Error exporting PDF:', error);
    showToast('Failed to export PDF. Please try again.', 'danger');
  }
}

/**
 * Generate an infographic report for the given RFP
 * @param {number} rfpId - ID of the RFP
 */
async function generateInfographicReport(rfpId) {
  try {
    const reportContent = document.getElementById('infographicReportContent');
    const loadingIndicator = document.getElementById('infographic-loading');
    
    // Show loading indicator
    loadingIndicator.classList.remove('d-none');
    
    // Fetch the report data
    const response = await fetch(`/api/reports/generate-summary/${rfpId}`);
    if (!response.ok) {
      throw new Error('Failed to generate infographic report');
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Unknown error generating report');
    }
    
    // Hide loading indicator
    loadingIndicator.classList.add('d-none');
    
    // Build and display the report
    const report = data.report;
    
    // Create the report HTML content
    let reportHTML = `
      <div class="container-fluid py-4">
        <div class="row mb-4">
          <div class="col-12">
            <div class="infographic-section">
              <h2 class="text-center mb-4">${report.rfp.title}</h2>
              <h5 class="text-center text-muted mb-4">${report.rfp.agency} | Project ID: ${report.rfp.project_id}</h5>
              <div class="row text-center">
                <div class="col-md-4 mb-4">
                  <div class="stat-circle stat-circle-primary mx-auto">
                    <div class="stat-number">${report.summary.total_bids}</div>
                    <div class="stat-label">Vendor Bids</div>
                  </div>
                </div>
                <div class="col-md-4 mb-4">
                  <div class="stat-circle stat-circle-info mx-auto">
                    <div class="stat-number">${report.summary.total_requirements}</div>
                    <div class="stat-label">Requirements</div>
                  </div>
                </div>
                <div class="col-md-4 mb-4">
                  <div class="stat-circle stat-circle-warning mx-auto">
                    <div class="stat-number">${report.summary.total_specifications}</div>
                    <div class="stat-label">Tech Specs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="row mb-4">
          <div class="col-md-6">
            <div class="infographic-section h-100">
              <h4 class="mb-4">Requirements by Category</h4>
              <div class="row">`;
    
    // Add requirement categories
    for (const [category, count] of Object.entries(report.summary.requirement_categories)) {
      const percentage = Math.round((count / report.summary.total_requirements) * 100);
      reportHTML += `
        <div class="col-md-6 mb-3">
          <h6>${category}</h6>
          <div class="progress" style="height: 25px;">
            <div class="progress-bar bg-primary" role="progressbar" style="width: ${percentage}%;" 
                aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
              ${count} (${percentage}%)
            </div>
          </div>
        </div>`;
    }
    
    reportHTML += `
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="infographic-section h-100">
              <h4 class="mb-4">Requirements by Priority</h4>
              <div class="row">`;
    
    // Add priority distribution
    const priorityColors = {
      'Must-have': 'bg-danger',
      'Should-have': 'bg-warning',
      'Nice-to-have': 'bg-info'
    };
    
    for (const [priority, count] of Object.entries(report.summary.priority_distribution)) {
      const percentage = Math.round((count / report.summary.total_requirements) * 100);
      reportHTML += `
        <div class="col-12 mb-3">
          <div class="d-flex justify-content-between">
            <h6>${priority}</h6>
            <span>${count} (${percentage}%)</span>
          </div>
          <div class="progress" style="height: 25px;">
            <div class="progress-bar ${priorityColors[priority] || 'bg-secondary'}" role="progressbar" 
                style="width: ${percentage}%;" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
            </div>
          </div>
        </div>`;
    }
    
    reportHTML += `
              </div>
            </div>
          </div>
        </div>
        
        <!-- Bidder Comparison Section -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="infographic-section">
              <h4 class="mb-4">Vendor Bid Comparison</h4>
              <div class="row">`;
    
    // Add bidder cards
    if (report.bids && report.bids.length > 0) {
      report.bids.forEach(bid => {
        const isTopVendor = report.top_vendor && report.top_vendor.id === bid.id;
        reportHTML += `
          <div class="col-md-4 mb-3">
            <div class="bidder-card ${isTopVendor ? 'top-vendor-card' : ''}">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">${bid.vendor_name}</h5>
                ${isTopVendor ? '<span class="badge bg-warning">Top Vendor</span>' : ''}
              </div>
              
              <div class="d-flex justify-content-center mb-4">
                <div class="stat-circle ${getScoreCircleClass(bid.total_score || 0)}">
                  <div class="stat-number">${Math.round(bid.total_score || 0)}</div>
                  <div class="stat-label">Overall Score</div>
                </div>
              </div>
              
              <div class="mb-3">
                <h6>Risk Level</h6>
                <div class="d-flex align-items-center">
                  <span class="risk-indicator risk-${bid.risk.level.toLowerCase()}"></span>
                  <span class="text-capitalize">${bid.risk.level}</span>
                </div>
              </div>
              
              <div class="mb-3">
                <h6>Sentiment</h6>
                <div class="d-flex align-items-center">
                  <div class="progress flex-grow-1 me-2" style="height: 15px;">
                    <div class="progress-bar ${getSentimentBarClass(bid.sentiment.score || 0)}" 
                        role="progressbar" style="width: ${(bid.sentiment.score || 0) * 20}%;">
                    </div>
                  </div>
                  <span>${bid.sentiment.score ? bid.sentiment.score.toFixed(1) : 'N/A'}</span>
                </div>
              </div>
              
              <div class="mb-3">
                <h6>Key Strengths</h6>
                <ul class="list-unstyled">
                  ${bid.strengths.slice(0, 2).map(strength => `<li><small>• ${strength}</small></li>`).join('')}
                </ul>
              </div>
              
              <div>
                <h6>Key Weaknesses</h6>
                <ul class="list-unstyled">
                  ${bid.weaknesses.slice(0, 2).map(weakness => `<li><small>• ${weakness}</small></li>`).join('')}
                </ul>
              </div>
            </div>
          </div>`;
      });
    } else {
      reportHTML += `
        <div class="col-12 text-center py-4">
          <i class="fas fa-file-signature fa-3x text-muted mb-3"></i>
          <h5>No Bids Available</h5>
          <p class="text-muted">Upload vendor bids to enable comparison</p>
        </div>`;
    }
    
    reportHTML += `
              </div>
            </div>
          </div>
        </div>
        
        <!-- Security & Compliance Section -->
        <div class="row mb-4">
          <div class="col-md-6">
            <div class="infographic-section h-100">
              <h4 class="mb-4">Framework Compliance</h4>`;
    
    if (Object.keys(report.security.framework_compliance).length > 0) {
      reportHTML += `<div class="row">`;
      
      for (const [framework, data] of Object.entries(report.security.framework_compliance)) {
        reportHTML += `
          <div class="col-md-6 mb-3">
            <h6>${framework.toUpperCase()}</h6>
            <div class="progress" style="height: 25px;">
              <div class="progress-bar bg-success" role="progressbar" 
                  style="width: ${data.average_score}%;" aria-valuenow="${data.average_score}" 
                  aria-valuemin="0" aria-valuemax="100">
                ${data.average_score.toFixed(1)}%
              </div>
            </div>
          </div>`;
      }
      
      reportHTML += `</div>`;
    } else {
      reportHTML += `
        <div class="text-center py-4">
          <i class="fas fa-shield-alt fa-3x text-muted mb-3"></i>
          <p>No framework compliance data available yet</p>
        </div>`;
    }
    
    reportHTML += `
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="infographic-section h-100">
              <h4 class="mb-4">Risk Assessment</h4>
              <div class="row text-center">
                <div class="col-md-4 mb-3">
                  <div class="stat-circle stat-circle-danger mx-auto">
                    <div class="stat-number">${report.security.risk_levels.high}</div>
                    <div class="stat-label">High Risk</div>
                  </div>
                </div>
                <div class="col-md-4 mb-3">
                  <div class="stat-circle stat-circle-warning mx-auto">
                    <div class="stat-number">${report.security.risk_levels.medium}</div>
                    <div class="stat-label">Medium Risk</div>
                  </div>
                </div>
                <div class="col-md-4 mb-3">
                  <div class="stat-circle stat-circle-success mx-auto">
                    <div class="stat-number">${report.security.risk_levels.low}</div>
                    <div class="stat-label">Low Risk</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Sentiment & Recommendations Section -->
        <div class="row mb-4">
          <div class="col-md-6">
            <div class="infographic-section h-100">
              <h4 class="mb-4">Sentiment Analysis</h4>
              <div class="row mb-4">
                <div class="col-12 text-center">
                  <div class="stat-circle stat-circle-info stat-circle-large mx-auto">
                    <div class="stat-number">${report.sentiment.average_score.toFixed(1)}</div>
                    <div class="stat-label">Average Score</div>
                  </div>
                  <div class="mt-2 text-muted small">
                    Confidence: ${report.sentiment.confidence.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <h6 class="mb-3">Key Indicators</h6>
              <div>`;
    
    if (report.sentiment.keyword_indicators && report.sentiment.keyword_indicators.length > 0) {
      report.sentiment.keyword_indicators.forEach(indicator => {
        reportHTML += `<span class="sentiment-indicator">${indicator}</span>`;
      });
    } else {
      reportHTML += `<p class="text-muted">No key indicators available</p>`;
    }
    
    reportHTML += `
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="infographic-section h-100">
              <h4 class="mb-4">Recommendations</h4>`;
    
    if (report.recommendations && report.recommendations.length > 0) {
      report.recommendations.forEach(recommendation => {
        reportHTML += `<div class="recommendation-item mb-3">${recommendation}</div>`;
      });
    } else {
      reportHTML += `
        <div class="text-center py-4">
          <i class="fas fa-lightbulb fa-3x text-muted mb-3"></i>
          <p>No recommendations available yet</p>
        </div>`;
    }
    
    reportHTML += `
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Insert the report HTML into the modal
    reportContent.innerHTML = reportHTML;
    
  } catch (error) {
    console.error('Error generating infographic report:', error);
    const reportContent = document.getElementById('infographicReportContent');
    const loadingIndicator = document.getElementById('infographic-loading');
    
    // Hide loading indicator
    loadingIndicator.classList.add('d-none');
    
    // Show error message
    reportContent.innerHTML = `
      <div class="text-center py-5">
        <div class="mb-3 text-danger">
          <i class="fas fa-exclamation-triangle fa-3x"></i>
        </div>
        <h5>Failed to Generate Report</h5>
        <p class="text-muted">${error.message || 'Unknown error occurred'}</p>
      </div>
    `;
    
    showToast('Failed to generate infographic report. Please try again.', 'danger');
  }
}

/**
 * Get the CSS class for a score circle based on score value
 * @param {number} score - Score value
 * @returns {string} CSS class
 */
function getScoreCircleClass(score) {
  if (score >= 80) return 'stat-circle-success';
  if (score >= 60) return 'stat-circle-primary';
  if (score >= 40) return 'stat-circle-warning';
  return 'stat-circle-danger';
}

/**
 * Get the CSS class for a sentiment progress bar based on sentiment score
 * @param {number} score - Sentiment score (0-5)
 * @returns {string} CSS class
 */
function getSentimentBarClass(score) {
  if (score >= 4) return 'bg-success';
  if (score >= 3) return 'bg-info';
  if (score >= 2) return 'bg-warning';
  return 'bg-danger';
}
