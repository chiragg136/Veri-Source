// Dashboard functionality

document.addEventListener('DOMContentLoaded', () => {
  // Fetch dashboard data
  fetchDashboardData();
  
  // Setup event listeners
  setupEventListeners();
});

/**
 * Fetch dashboard data from the API
 */
async function fetchDashboardData() {
  try {
    // Fetch all RFPs
    const rfps = document.querySelectorAll('#rfp-list .rfp-card');
    
    // If there are no RFPs, don't fetch any additional data
    if (rfps.length === 0) {
      return;
    }
    
    // Collect all RFP IDs
    const rfpIds = Array.from(rfps).map(rfp => {
      const uploadBidBtn = rfp.querySelector('.upload-bid-btn');
      return uploadBidBtn ? uploadBidBtn.getAttribute('data-rfp-id') : null;
    }).filter(id => id !== null);
    
    // Fetch stats for each RFP
    const statsPromises = rfpIds.map(rfpId => 
      fetch(`/api/rfp/${rfpId}/bids`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch bids for RFP ${rfpId}`);
          }
          return response.json();
        })
    );
    
    const allStats = await Promise.all(statsPromises);
    
    // Process stats and update UI
    updateDashboardStats(allStats);
    updateDashboardCharts(allStats);
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    showToast('Failed to load dashboard data. Please try again.', 'danger');
  }
}

/**
 * Update dashboard statistics based on API data
 * @param {Array} statsData - Array of stats data for each RFP
 */
function updateDashboardStats(statsData) {
  let totalBids = 0;
  let totalScores = 0;
  let totalRequirements = 0;
  
  // Process all stats data
  statsData.forEach(data => {
    if (data.bids) {
      totalBids += data.bids.length;
      
      // Sum up scores for average calculation
      data.bids.forEach(bid => {
        if (bid.total_score) {
          totalScores += bid.total_score;
        }
      });
    }
    
    // Count requirements (for a real app, we'd fetch this separately)
    // This is a rough estimate based on our data structure
    totalRequirements += 8; // Assuming average of 8 requirements per RFP
  });
  
  // Update stats in the UI
  document.getElementById('total-bids').textContent = totalBids;
  
  const avgScore = totalBids > 0 ? Math.round(totalScores / totalBids) : 0;
  document.getElementById('avg-score').textContent = avgScore;
  
  document.getElementById('total-requirements').textContent = totalRequirements;
}

/**
 * Update dashboard charts based on API data
 * @param {Array} statsData - Array of stats data for each RFP
 */
function updateDashboardCharts(statsData) {
  // Collect data for charts
  const bidScoresData = {
    labels: [],
    datasets: [{
      label: 'Bid Score',
      data: [],
      backgroundColor: [],
      borderColor: [],
      borderWidth: 1
    }]
  };
  
  const requirementData = {
    labels: ['Technical', 'Security', 'Operational', 'Financial'],
    datasets: [{
      label: 'Requirements by Category',
      data: [40, 25, 20, 15], // Sample distribution, would be calculated from real data
      backgroundColor: [
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 159, 64, 0.7)'
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 159, 64, 1)'
      ],
      borderWidth: 1
    }]
  };
  
  // Process all stats data for charts
  statsData.forEach(data => {
    if (data.bids && data.bids.length > 0) {
      data.bids.forEach(bid => {
        bidScoresData.labels.push(bid.vendor_name);
        bidScoresData.datasets[0].data.push(bid.total_score || 0);
        
        const colorIndex = bidScoresData.datasets[0].data.length - 1;
        const color = getChartColor(colorIndex);
        bidScoresData.datasets[0].backgroundColor.push(color);
        bidScoresData.datasets[0].borderColor.push(color.replace('0.7', '1'));
      });
    }
  });
  
  // If we have bid data, render the chart
  if (bidScoresData.labels.length > 0) {
    renderBidScoresChart(bidScoresData);
  } else {
    document.getElementById('no-bid-data').classList.remove('d-none');
  }
  
  // Render the requirements distribution chart
  renderRequirementComplianceChart(requirementData);
}

/**
 * Render the bid scores chart
 * @param {Object} chartData - Data for the chart
 */
function renderBidScoresChart(chartData) {
  const ctx = document.getElementById('bidScoresChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: {
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
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Score: ${context.raw}/100`;
            }
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

/**
 * Render the requirement compliance chart
 * @param {Object} chartData - Data for the chart
 */
function renderRequirementComplianceChart(chartData) {
  const ctx = document.getElementById('requirementComplianceChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'doughnut',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${percentage}% (${value})`;
            }
          }
        }
      }
    }
  });
}

/**
 * Setup event listeners for dashboard interactions
 */
function setupEventListeners() {
  // Handle "Upload Bid" button clicks
  const uploadBidButtons = document.querySelectorAll('.upload-bid-btn');
  uploadBidButtons.forEach(button => {
    button.addEventListener('click', function() {
      const rfpId = this.getAttribute('data-rfp-id');
      const rfpTitle = this.getAttribute('data-rfp-title');
      
      // Redirect to upload page with RFP ID pre-selected
      window.location.href = `/upload?rfp_id=${rfpId}&rfp_title=${encodeURIComponent(rfpTitle)}`;
    });
  });
}
