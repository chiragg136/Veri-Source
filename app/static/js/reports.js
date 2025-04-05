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
  // Handle Export Report button click
  const exportReportBtn = document.getElementById("exportReportBtn");
  if (exportReportBtn) {
    exportReportBtn.addEventListener("click", function() {
      exportReportToPDF();
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
