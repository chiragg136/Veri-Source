document.addEventListener('DOMContentLoaded', function() {
    const achievementBadgesContainer = document.getElementById('achievement-badges');
    if (!achievementBadgesContainer) return;

    // Achievement data
    const achievements = [
        {
            id: 'upload_first_rfp',
            title: 'RFP Pioneer',
            description: 'Uploaded your first RFP document',
            icon: 'fa-file-upload',
            color: 'primary',
            completed: true,
            progress: 100
        },
        {
            id: 'upload_first_bid',
            title: 'Bid Evaluator',
            description: 'Analyzed your first vendor bid',
            icon: 'fa-file-signature',
            color: 'success',
            completed: true,
            progress: 100
        },
        {
            id: 'analyze_3_bids',
            title: 'Comparison Expert',
            description: 'Compared 3+ vendor bids for the same RFP',
            icon: 'fa-balance-scale',
            color: 'info',
            completed: false,
            progress: 66
        },
        {
            id: 'compliance_check',
            title: 'Security Guardian',
            description: 'Completed a security compliance assessment',
            icon: 'fa-shield-alt',
            color: 'warning',
            completed: true,
            progress: 100
        },
        {
            id: 'export_report',
            title: 'Report Maestro',
            description: 'Generated and exported a comprehensive report',
            icon: 'fa-file-pdf',
            color: 'danger',
            completed: false,
            progress: 50
        },
        {
            id: 'human_review',
            title: 'Human Validator',
            description: 'Completed human verification of AI analysis',
            icon: 'fa-user-check',
            color: 'secondary',
            completed: false,
            progress: 25
        },
        {
            id: 'power_user',
            title: 'Power User',
            description: 'Processed 10+ documents in the system',
            icon: 'fa-bolt',
            color: 'dark',
            completed: false,
            progress: 30
        },
        {
            id: 'risk_analyzer',
            title: 'Risk Detective',
            description: 'Identified high-risk items in a bid',
            icon: 'fa-exclamation-triangle',
            color: 'warning',
            completed: true,
            progress: 100
        }
    ];

    // Clear loading spinner
    achievementBadgesContainer.innerHTML = '';

    // Create achievement badges
    achievements.forEach(achievement => {
        const badgeCol = document.createElement('div');
        badgeCol.className = 'col-md-3 col-sm-6 mb-3';
        
        const badgeInner = document.createElement('div');
        badgeInner.className = `achievement-badge ${achievement.completed ? 'achievement-completed' : 'achievement-incomplete'}`;
        
        const badgeContent = `
            <div class="achievement-icon bg-${achievement.color} ${achievement.completed ? '' : 'achievement-locked'}">
                <i class="fas ${achievement.icon}"></i>
                ${achievement.completed ? '<i class="fas fa-check-circle achievement-check"></i>' : ''}
            </div>
            <div class="achievement-info">
                <h6>${achievement.title}</h6>
                <p class="small text-muted">${achievement.description}</p>
                <div class="progress" style="height: 5px;">
                    <div class="progress-bar bg-${achievement.color}" role="progressbar" style="width: ${achievement.progress}%"></div>
                </div>
                <small class="text-muted">${achievement.progress}% complete</small>
            </div>
        `;
        
        badgeInner.innerHTML = badgeContent;
        badgeCol.appendChild(badgeInner);
        achievementBadgesContainer.appendChild(badgeCol);
    });

    // Add CSS for achievements
    const achievementStyles = document.createElement('style');
    achievementStyles.textContent = `
        .achievement-badge {
            display: flex;
            padding: 1rem;
            border-radius: 0.5rem;
            background-color: var(--bs-body-bg);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .achievement-badge:hover {
            transform: translateY(-5px);
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
        }
        .achievement-icon {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
            position: relative;
        }
        .achievement-icon i {
            font-size: 1.5rem;
            color: white;
        }
        .achievement-info {
            flex: 1;
        }
        .achievement-locked {
            opacity: 0.5;
        }
        .achievement-check {
            position: absolute;
            bottom: -5px;
            right: -5px;
            background-color: white;
            border-radius: 50%;
            font-size: 1rem;
            color: var(--bs-success);
        }
        .achievement-incomplete {
            opacity: 0.8;
        }
        .achievement-completed {
            border-left: 3px solid var(--bs-success);
        }
    `;
    document.head.appendChild(achievementStyles);

    // Add confetti effect when completing an achievement (simulated)
    setTimeout(() => {
        // Simulate completing the "Export Report" achievement after 10 seconds
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-notification-content">
                <i class="fas fa-trophy text-warning me-2"></i>
                <span>Achievement Unlocked: Report Maestro</span>
            </div>
        `;
        document.body.appendChild(notification);

        // Add CSS for notification
        const notificationStyles = document.createElement('style');
        notificationStyles.textContent = `
            .achievement-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                animation: slide-in 0.5s forwards, fade-out 0.5s 4.5s forwards;
            }
            .achievement-notification-content {
                background-color: var(--bs-dark);
                color: white;
                padding: 1rem;
                border-radius: 0.5rem;
                box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
            }
            @keyframes slide-in {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
            @keyframes fade-out {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(notificationStyles);

        // Remove notification after 5 seconds
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 5000);
    }, 10000);
});
