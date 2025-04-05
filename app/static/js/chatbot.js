document.addEventListener('DOMContentLoaded', () => {
  // Get elements
  const openChatbotBtn = document.getElementById('openChatbot');
  const chatbotModal = document.getElementById('chatbotModal');
  const chatbotForm = document.getElementById('chatbotForm');
  const userMessageInput = document.getElementById('userMessage');
  const chatbotMessages = document.getElementById('chatbotMessages');
  
  // Create bootstrap modal instance
  const modal = new bootstrap.Modal(chatbotModal);
  
  // Open chatbot when button is clicked
  if (openChatbotBtn) {
    openChatbotBtn.addEventListener('click', () => {
      modal.show();
      userMessageInput.focus();
    });
  }
  
  // Handle form submission
  if (chatbotForm) {
    chatbotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const userMessage = userMessageInput.value.trim();
      if (!userMessage) return;
      
      // Add user message to chat
      addMessage(userMessage, 'user');
      
      // Clear input
      userMessageInput.value = '';
      
      // Show loading indicator
      const loadingMessage = addLoadingMessage();
      
      try {
        // Send message to API
        const response = await fetch('/api/chatbot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: userMessage }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to get response from chatbot');
        }
        
        const data = await response.json();
        
        // Remove loading indicator
        chatbotMessages.removeChild(loadingMessage);
        
        // Add assistant response to chat
        addMessage(data.response, 'assistant');
      } catch (error) {
        console.error('Chatbot error:', error);
        
        // Remove loading indicator
        chatbotMessages.removeChild(loadingMessage);
        
        // Show error message
        addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
      }
      
      // Scroll to bottom
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    });
  }
  
  /**
   * Add a message to the chat UI
   * @param {string} message - Message content
   * @param {string} sender - 'user' or 'assistant'
   */
  function addMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `d-flex mb-3 ${sender === 'user' ? 'justify-content-end' : ''}`;
    
    if (sender === 'user') {
      messageDiv.innerHTML = `
        <div class="message user-message p-3 rounded-3 shadow-sm">
          <p class="mb-0">${message}</p>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="avatar bg-primary text-white rounded-circle p-2 me-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
          <i class="fas fa-robot"></i>
        </div>
        <div class="message bot-message p-3 rounded-3 shadow-sm">
          <p class="mb-0">${message}</p>
        </div>
      `;
    }
    
    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    return messageDiv;
  }
  
  /**
   * Add a loading indicator to the chat
   * @returns {HTMLElement} - The loading message element
   */
  function addLoadingMessage() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'd-flex mb-3';
    loadingDiv.innerHTML = `
      <div class="avatar bg-primary text-white rounded-circle p-2 me-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
        <i class="fas fa-robot"></i>
      </div>
      <div class="message bot-message p-3 rounded-3 shadow-sm">
        <p class="mb-0">
          <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Thinking...
        </p>
      </div>
    `;
    
    chatbotMessages.appendChild(loadingDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    return loadingDiv;
  }
});
