/**
 * Human Review JavaScript functionality
 * This file contains client-side functionality for the human review dashboard and review tasks.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    
    // Handle review status change
    const reviewStatusSelect = document.getElementById('reviewStatus');
    const modificationFields = document.getElementById('modificationFields');
    
    if (reviewStatusSelect && modificationFields) {
        reviewStatusSelect.addEventListener('change', function() {
            if (this.value === 'modified') {
                modificationFields.classList.remove('d-none');
            } else {
                modificationFields.classList.add('d-none');
            }
        });
    }
    
    // Update range slider displays
    const agreementLevel = document.getElementById('agreementLevel');
    const agreementValue = document.getElementById('agreementValue');
    const confidenceScore = document.getElementById('confidenceScore');
    const confidenceValue = document.getElementById('confidenceValue');
    
    if (agreementLevel && agreementValue) {
        agreementLevel.addEventListener('input', function() {
            agreementValue.textContent = this.value + '%';
        });
    }
    
    if (confidenceScore && confidenceValue) {
        confidenceScore.addEventListener('input', function() {
            confidenceValue.textContent = this.value + '%';
        });
    }
    
    // Form validation for review submission
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', function(event) {
            if (!validateReviewForm()) {
                event.preventDefault();
            }
        });
    }
    
    // Review dashboard filter collapse toggle
    const filterBtn = document.querySelector('[data-bs-toggle="collapse"][data-bs-target="#filterCollapse"]');
    if (filterBtn) {
        const filterCollapse = document.getElementById('filterCollapse');
        const bsCollapse = new bootstrap.Collapse(filterCollapse, {
            toggle: false
        });
        
        // Check URL params to see if we should show filters
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('type') || urlParams.has('priority') || urlParams.has('assigned_to')) {
            bsCollapse.show();
        }
    }
});

/**
 * Validate the review submission form
 * @returns {boolean} True if form is valid, false otherwise
 */
function validateReviewForm() {
    const reviewStatus = document.getElementById('reviewStatus');
    if (!reviewStatus || !reviewStatus.value) {
        alert('Please select a review decision.');
        return false;
    }
    
    // If status is "modified", validate modified fields
    if (reviewStatus.value === 'modified') {
        // Check JSON fields
        const jsonFields = document.querySelectorAll('textarea[name$="_data"], textarea[name$="_findings"], textarea[name="key_phrases"]');
        for (const field of jsonFields) {
            if (field && field.value) {
                try {
                    JSON.parse(field.value);
                } catch (e) {
                    alert(`Invalid JSON in ${field.name}. Please check the format.`);
                    field.focus();
                    return false;
                }
            }
        }
        
        // Score validations
        const scoreFields = document.querySelectorAll('input[type="number"][name$="_score"]');
        for (const field of scoreFields) {
            if (field && (isNaN(field.value) || field.value < 0 || field.value > 100)) {
                alert(`Score must be a number between 0 and 100.`);
                field.focus();
                return false;
            }
        }
    }
    
    return true;
}

/**
 * Format a JSON string with proper indentation
 * @param {string} jsonString - The JSON string to format
 * @returns {string} Formatted JSON string
 */
function formatJson(jsonString) {
    try {
        const obj = JSON.parse(jsonString);
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        return jsonString; // Return original if not valid JSON
    }
}

/**
 * Update the modification fields based on the original assessment data
 * @param {object} assessmentData - The original assessment data
 */
function populateModificationFields(assessmentData) {
    // This function would be used to populate fields with existing data
    // Implementation would depend on specific review types
    console.log('Populating fields with:', assessmentData);
}
