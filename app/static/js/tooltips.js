document.addEventListener('DOMContentLoaded', function() {
    const tooltipTerms = {
        'RFP': 'Request for Proposal - A document issued by an organization to solicit proposals from potential vendors for a product or service.',
        'BAFO': 'Best and Final Offer - The final bid submitted by vendors after negotiations in the procurement process.',
        'FISMA': 'Federal Information Security Management Act - A federal law that establishes information security standards for federal agencies.',
        'FEDRAMP': 'Federal Risk and Authorization Management Program - A government-wide program providing standardized security assessment for cloud services.',
        'CMMC': 'Cybersecurity Maturity Model Certification - A unified security standard for DoD acquisitions.',
        'SOW': 'Statement of Work - A document that defines project-specific activities, deliverables, and timeline for a vendor.',
        'KPI': 'Key Performance Indicator - Measurable values that demonstrate effectiveness in achieving key business objectives.',
        'COTS': 'Commercial Off-The-Shelf - Ready-made products available for sale to the general public.',
        'SLA': 'Service Level Agreement - A commitment between a service provider and a client, defining expected service levels.',
        'TCO': 'Total Cost of Ownership - Financial estimate intended to help buyers determine direct and indirect costs of a system or product.',
        'IDIQ': 'Indefinite Delivery/Indefinite Quantity - A type of contract that provides for an indefinite quantity of supplies or services.',
        'FAR': 'Federal Acquisition Regulation - The primary regulation used by federal agencies for purchasing goods and services.',
        'CPARS': 'Contractor Performance Assessment Reporting System - A web-enabled system for recording contractor performance.',
        'GWAC': 'Government-Wide Acquisition Contract - A pre-competed, multiple-award contract for IT products and services.',
        'SBIR': 'Small Business Innovation Research - A program encouraging domestic small businesses to engage in Federal Research/R&D.',
        'CUI': 'Controlled Unclassified Information - Information requiring safeguarding or dissemination controls by law or regulation.',
        'NIST': 'National Institute of Standards and Technology - A federal agency that develops standards and guidelines for federal systems.'
    };

    function createTooltipElement() {
        const tooltip = document.createElement('div');
        tooltip.id = 'terminology-tooltip';
        tooltip.className = 'tooltip-custom';
        tooltip.style.display = 'none';
        tooltip.style.position = 'absolute';
        tooltip.style.zIndex = '9999';
        tooltip.style.maxWidth = '300px';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    const tooltipElement = createTooltipElement();

    // Initialize Bootstrap tooltips for all elements with terminology-tooltip class
    document.querySelectorAll('.terminology-tooltip').forEach(element => {
        const term = element.dataset.term;
        if (term && tooltipTerms[term]) {
            element.style.borderBottom = '1px dotted';
            element.style.cursor = 'help';
            
            element.addEventListener('mouseenter', function(e) {
                const rect = this.getBoundingClientRect();
                tooltipElement.textContent = tooltipTerms[term];
                tooltipElement.className = 'tooltip-custom bg-dark text-white p-2 rounded';
                tooltipElement.style.display = 'block';
                tooltipElement.style.left = `${rect.left + window.scrollX}px`;
                tooltipElement.style.top = `${rect.bottom + window.scrollY + 5}px`;
            });
            
            element.addEventListener('mouseleave', function() {
                tooltipElement.style.display = 'none';
            });
        }
    });

    // Create a MutationObserver to monitor for newly added tooltip elements
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        const tooltips = node.querySelectorAll ? node.querySelectorAll('.terminology-tooltip') : [];
                        tooltips.forEach(element => {
                            const term = element.dataset.term;
                            if (term && tooltipTerms[term]) {
                                element.style.borderBottom = '1px dotted';
                                element.style.cursor = 'help';
                                
                                element.addEventListener('mouseenter', function(e) {
                                    const rect = this.getBoundingClientRect();
                                    tooltipElement.textContent = tooltipTerms[term];
                                    tooltipElement.className = 'tooltip-custom bg-dark text-white p-2 rounded';
                                    tooltipElement.style.display = 'block';
                                    tooltipElement.style.left = `${rect.left + window.scrollX}px`;
                                    tooltipElement.style.top = `${rect.bottom + window.scrollY + 5}px`;
                                });
                                
                                element.addEventListener('mouseleave', function() {
                                    tooltipElement.style.display = 'none';
                                });
                            }
                        });
                    }
                });
            }
        });
    });

    // Start observing the document body for additions
    observer.observe(document.body, { childList: true, subtree: true });
});
