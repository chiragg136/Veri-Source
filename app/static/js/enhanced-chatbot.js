document.addEventListener('DOMContentLoaded', function() {
    // Enhanced chatbot with recommended questions
    const chatbotContainer = document.getElementById('chatbot-container');
    if (!chatbotContainer) return;

    const recommendedQuestions = [
        "What security requirements are in this RFP?",
        "How does Vendor A compare to Vendor B?",
        "Summarize the key requirements in this RFP",
        "What are the risks associated with Vendor C's bid?",
        "Does this bid comply with FISMA requirements?",
        "What are the strengths and weaknesses of this proposal?",
        "How many technical requirements are in this RFP?",
        "What is the sentiment analysis of this vendor's bid?",
        "Are there any gaps between this RFP and the vendor's proposal?",
        "What is the overall compliance score for this bid?"
    ];

    // Create the recommended questions section
    const recommendedSection = document.createElement('div');
    recommendedSection.className = 'recommended-questions mb-3';
    recommendedSection.innerHTML = `
        <h6 class="mb-2">Recommended Questions:</h6>
        <div class="recommended-questions-container"></div>
    `;
    chatbotContainer.prepend(recommendedSection);

    const questionsContainer = recommendedSection.querySelector('.recommended-questions-container');
    
    // Add each recommended question as a clickable button
    recommendedQuestions.forEach(question => {
        const questionBtn = document.createElement('button');
        questionBtn.className = 'btn btn-sm btn-outline-secondary me-2 mb-2';
        questionBtn.textContent = question;
        questionBtn.addEventListener('click', () => {
            // Add the question to the chat input and simulate sending
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.value = question;
                // Trigger the send button
                const sendButton = document.querySelector('.chat-send-button');
                if (sendButton) {
                    sendButton.click();
                }
            }
        });
        questionsContainer.appendChild(questionBtn);
    });

    // Enhanced chatbot typing animation
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        const originalAddMessage = window.addChatMessage || function() {};
        
        window.addChatMessage = function(message, isUser = false) {
            if (!isUser) {
                // For AI responses, add typing animation
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'chat-message ai-message typing-indicator';
                typingIndicator.innerHTML = `
                    <div class="typing-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
                `;
                chatMessages.appendChild(typingIndicator);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // Simulate typing and then show the message
                setTimeout(() => {
                    chatMessages.removeChild(typingIndicator);
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `chat-message ${isUser ? 'user-message' : 'ai-message'}`;
                    
                    // Process message for markdown-like formatting
                    let formattedMessage = message
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/`(.*?)`/g, '<code>$1</code>')
                        .replace(/\n/g, '<br>');
                    
                    messageDiv.innerHTML = formattedMessage;
                    chatMessages.appendChild(messageDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 1500); // Simulate typing for 1.5 seconds
            } else {
                // User messages are added immediately without animation
                originalAddMessage(message, isUser);
            }
        };
    }
});
