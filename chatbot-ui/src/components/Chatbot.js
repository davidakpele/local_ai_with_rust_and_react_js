import React, { useState, useRef, useEffect } from 'react';
import "./Chatbot.css"
import AppManager from '../utils/appManager';
import appManager from '../utils/appManager';
import markdownStyles from "./MarkdownStyle";
import { FormatMessageAdvanced } from '../utils/FormatMessageAdvanced';

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const currentStreamIndexRef = useRef(null);
  const [input, setInput] = useState('');
  const chatDisplayRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiTyping, setAiTyping] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const socketRef = useRef(null);
  const [history, setHistory] = useState([]);
  const streamingMessageRef = useRef('');
  const shouldScrollRef = useRef(true); 
 
  const [activeState, setActivateState] = useState({
    title:'New Chat'
  });
  
  // New states for dropdown and modals
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const dropdownRef = useRef(null);

  // States for message editing
  const [showMessageDeleteModal, setShowMessageDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  const { token, username } = AppManager.get({
      keys: ['token', 'username'],
      type: 'local'
  });
  
  // Close dropdown when clicking outside
  useEffect(() => {
     Prism.highlightAll();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initial welcome message
  useEffect(() => {
    setMessages([]);
  }, []);


  // Scroll to bottom function with conditional logic
  const scrollToBottom = () => {
    if (shouldScrollRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Handle user scroll behavior
  useEffect(() => {
    const chatContainer = chatDisplayRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      // Check if user is near the bottom
      const isNearBottom = 
        chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
      
      // if user is near the bottom
      shouldScrollRef.current = isNearBottom;
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Update scroll effect
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadHistory =()=>{
     const sidebarPayload = JSON.stringify({
        type: 'fetch_sidebar_history',
        user_id: 13,
      });
      socketRef.current.send(sidebarPayload);
  }
  
  const loadNewSessionPage =()=>{
    // Step 1: send start_connection
      const startPayload = JSON.stringify({
        token: token,
        user_id:13,
        type: 'start_new_session'
      });
      socketRef.current.send(startPayload);
  }

  const loadContent =(conversationId)=>{
    const loadConversationPayload = JSON.stringify({
      type: "fetch_conversation",
      conversation_id: conversationId
    });

    socketRef.current.send(loadConversationPayload);
    loadHistory();
  }

  const loadMessages=()=>{
     const loadContentPayload = JSON.stringify({
      type: "fetch_all_messages",
    });

    socketRef.current.send(loadContentPayload);
    setActivateState(prev => ({
      ...prev,
      title: 'New Chat'
    }));
  }

  useEffect(() => {
    if (!token) {
      console.warn('Token missing. WebSocket not connected.');
      return;
    }

    const wsUrl = `ws://localhost:9001/ws/chat`;

    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      // Step 1: send start_connection
      const startPayload = JSON.stringify({
        token: token,
        type: 'start_connection'
      });
      socketRef.current.send(startPayload);

      // Step 2: immediately fetch sidebar history
      const sidebarPayload = JSON.stringify({
        type: 'fetch_sidebar_history',
        user_id: 13,
      });
      socketRef.current.send(sidebarPayload);
    };

    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'session_created':
            AppManager.saveUserSession({
              session_id: data.session_id,
              user_id: data.user_id,
              current_session: data.session_id,
              created_at: new Date().toISOString()
            });
            break;
          
          case 'MessageCreated':
            setAiTyping(false);
            break;

          case 'user_message':
            saveConversationMessage({
              user_id: data.user_id,
              conversation_id: data.conversation_id,
              conversation_title: data.conversation_title,
              message: {
                message_id: `msg_${crypto.randomUUID()}`,
                role: "user",
                content: data.prompt,
              }
            });
            break;

          case 'stream_chunk':
            if (!data.chunk || data.chunk.trim() === "") break;

            streamingMessageRef.current += data.chunk;

            setMessages(prev => {
              let newMessages = [...prev];

              if (currentStreamIndexRef.current === null) {
                // First chunk → push new message
                currentStreamIndexRef.current = newMessages.length;
                newMessages.push({
                  id: Date.now(),
                  text: streamingMessageRef.current,
                  sender: 'ai',
                  isStreaming: true
                });
              } else if (newMessages[currentStreamIndexRef.current]) {
                // Subsequent chunks → append to existing message only if it exists
                newMessages[currentStreamIndexRef.current] = {
                  ...newMessages[currentStreamIndexRef.current],
                  text: streamingMessageRef.current
                };
              } else {
                // index missing → push as new message
                currentStreamIndexRef.current = newMessages.length;
                newMessages.push({
                  id: Date.now(),
                  text: streamingMessageRef.current,
                  sender: 'ai',
                  isStreaming: true
                });
              }

              // Update Ollama data
              AppManager.updateOllamaMessages(newMessages);

              return newMessages;
            });
            break;

          case 'stream_end':
            if (data.status === "success") {
              setIsLoading(false);
              setAiTyping(false);
              setMessages(prev => {
                const newMessages = [...prev];
                if (currentStreamIndexRef.current !== null &&
                  currentStreamIndexRef.current < newMessages.length) {
                  newMessages[currentStreamIndexRef.current] = {
                    ...newMessages[currentStreamIndexRef.current],
                    text: streamingMessageRef.current,
                    isStreaming: false
                  };

                  // Save final AI message to ollama_data
                  saveConversationMessage({
                    user_id: data.user_id,
                    conversation_id: data.conversation_id,
                    conversation_title: data.conversation_title,
                    message: {
                      message_id: `msg_${crypto.randomUUID()}`,
                      role: "ai",
                      content: streamingMessageRef.current,
                    }
                  });
                }

                AppManager.updateOllamaMessages(newMessages);
                return newMessages;
              });

              // Fetch sidebar after success
              if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                loadHistory()
              }
            }

            setIsLoading(false);
            streamingMessageRef.current = '';
            currentStreamIndexRef.current = null;
            break;

          case 'sidebar_history':
            if (data.status === "ok") {
              AppManager.updateOllamaSidebarHistory(data);
              setHistory(data.conversations)
            }
            break 
          
          case 'conversation_history':
            if (data.status === "ok" && Array.isArray(data.messages)) {
              const formattedMessages = data.messages.map(msg => ({
                id: msg.message_id,
                text: msg.content,
                sender: msg.role === 'user' ? 'user' : 'ai',
                isStreaming: false
              }));
              setMessages(formattedMessages);
            }
            break;
          
          case 'content_title_edited':
            loadHistory();

          case 'deleted':
            loadMessages();
            
          case 'all_messages':
            loadHistory();

            setIsLoading(false);
            streamingMessageRef.current = '';
            currentStreamIndexRef.current = null;
            break;

          default:
            console.log('Unknown message type:', data);
        }
           
      } catch (error) {
        console.error('Error parsing WebSocket message:', error, event.data);
      }
    };

    socketRef.current.onerror = (error) => {
      setIsLoading(false);
      streamingMessageRef.current = '';
      currentStreamIndexRef.current = null;
    };

    socketRef.current.onclose = () => {
      console.log('WebSocket connection closed');
      setIsLoading(false);
      streamingMessageRef.current = '';
      currentStreamIndexRef.current = null;
    };

    return () => {
      socketRef.current?.close();
    };
  }, [token]);

  const handleLogout = () => {
    window.location.href = "/logout";
  }

  const handleSend = (e) => {
      e.preventDefault();
      if (input.trim() === '' || isLoading) return;
      const currentSession = AppManager.getCurrentSession();
      setIsLoading(true);
      setAiTyping(true);
      const userMessage = {
          id: Date.now(),
          text: input,
          sender: 'user',
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      const fallbackTimer = setTimeout(() => {
        setIsLoading(false);
        setAiTyping(false);
      }, 30000);

      streamingMessageRef.current = '';
      currentStreamIndexRef.current = null;
      shouldScrollRef.current = true; 

      const messagePayload = JSON.stringify({
          type: 'ai_request',
          prompt: input,
          session_id: currentSession
      });
      
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          try {
              socketRef.current.send(messagePayload);
          } catch (error) {
            clearTimeout(fallbackTimer);
            setIsLoading(false);
            setAiTyping(false)
              setMessages((prev) => [
                  ...prev,
                  {
                      id: Date.now(),
                      text: 'Failed to send message. Please try again.',
                      sender: 'ai',
                  }
              ]);
          }
      } else {
        clearTimeout(fallbackTimer);
        setIsLoading(false);
        setAiTyping(false)
          setMessages((prev) => [
              ...prev,
              {
                  id: Date.now(),
                  text: 'Unable to send message. Please try again later.',
                  sender: 'ai',
              }
          ]);
      }
  };

  // Function to handle the "New Chat" action
  const startNewChat = () => {
    loadNewSessionPage();
    loadHistory();
    setActivateState(prev => ({
        ...prev,
        title: 'New Chat'
      }));
    setMessages([]);
    shouldScrollRef.current = true;
  };

  // Toggle sidebar collapse state
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const TypingIndicator = () => (
    <div className="p-4 mb-4 fade-in message-ai">
      <div className="flex items-start">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mr-3 flex-shrink-0">
          <i className="fas fa-robot text-white text-sm"></i>
        </div>
        <div>
          <h3 className="font-semibold text-purple-300">{activeState.title}</h3>
          <p className="mt-1 text-gray-200 typing-indicator">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </p>
        </div>
      </div>
    </div>
  );

 



  // Handle delete message action
  const handleDeleteMessage = (message) => {
    setMessageToDelete(message);
    setShowMessageDeleteModal(true);
  };

  // Confirm message deletion
  const confirmDeleteMessage = () => {
    setMessages(prev => prev.filter(msg => msg.id !== messageToDelete.id));
    
    // Send delete to server if needed
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const deletePayload = JSON.stringify({
        type: 'delete_message',
        message_id: messageToDelete.id
      });
      socketRef.current.send(deletePayload);
    }
    
    setShowMessageDeleteModal(false);
    setMessageToDelete(null);
  };

  // Cancel message deletion
  const cancelDeleteMessage = () => {
    setShowMessageDeleteModal(false);
    setMessageToDelete(null);
  };

  // Component to render a single message bubble with new styling
  const MessageBubble = ({ message }) => {
    const isUser = message.sender === 'user';
    useEffect(() => {
    if (!isUser) {
      Prism.highlightAll(); 
    }
  }, [message.text, isUser]);

    // Regular message
    return (
      <div className={`p-4 mb-4 ${isUser ? 'message-user' : 'message-ai'} ${
        !isUser && message.isStreaming ? 'typing-animation' : ''}`}>
        <div className={`flex items-start ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Message content */}
      <div className={`relative flex-grow-0 p-4 rounded-xl shadow-md ${ isUser ? 'bg-gradient-to-r from-gray-600 to-gray-700 rounded-bl-none' : 'bg-gradient-to-r from-purple-500 to-blue-500 rounded-br-none' } ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`flex items-center ${isUser ? 'flex-row-reverse' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
            ${isUser? 'bg-gradient-to-r from-gray-600 to-gray-700 ml-3' : 'bg-gradient-to-r from-purple-500 to-blue-500 mr-3'}`}>
            <i className={`fas text-sm ${isUser ? 'fa-user text-gray-300' : 'fa-robot text-white' }`}></i>
          </div>

          <span className={`font-semibold ${isUser ? 'text-blue-300' : 'text-purple-300'}`}>
            {isUser ? 'You' : 'Ai Bot'}
          </span>
        </div>
      {/* Real-time typing text */}
        {isUser ? (
          <p className="mt-1 text-gray-200 whitespace-pre-wrap">{message.text}</p>
        ) : (
          <div className={`mt-1 text-gray-200 whitespace-pre-wrap ai-response max-w-3xl`} dangerouslySetInnerHTML={{__html: FormatMessageAdvanced(message.text),}}/>
        )}

        {/* Action icons */}
        <div className={`flex gap-3 mt-2 ${isUser ? 'justify-end' : 'justify-start' } text-gray-300 text-sm`}>
          <button onClick={() => navigator.clipboard.writeText(message.text)} className="hover:text-white transition-colors copy-user-content tooltip">
            <i className="fas fa-copy"></i>
            <span className="tooltip-text">Copy</span>
          </button>

          {isUser && (
            <>
              <button className="hover:text-white transition-colors edit-user-content tooltip">
                <i className="fas fa-edit"></i>
                <span className="tooltip-text">Edit message</span>
              </button>
              <button  className="hover:text-white transition-colors delete-user-content tooltip">
                <i className="fas fa-trash"></i>
                <span className="tooltip-text">Delete message</span>
              </button>
            </>
          )}
        </div>
      </div>

  </div>
</div>
);

  };

  const loadUpdateContentTite =(newTitle)=>{
    const truncated =
        newTitle.length > 25 ? newTitle.substring(0, 25) + "..." : newTitle;

      setActivateState(prev => ({
        ...prev,
        title: truncated
      }));
  }

  const handleConversationClick = (conversationId, title) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // Mark which conversation we're waiting for
      loadContent(conversationId);
    
      loadUpdateContentTite(title)
      appManager.updateCurrentSession(conversationId);
    } else {
      console.error("WebSocket is not open, cannot fetch messages.");
    }
  };

  // Handle three-dot menu click
  const handleMenuClick = (e, conversationId) => {
    e.stopPropagation();
    console.log(conversationId)
    setActiveDropdown(activeDropdown === conversationId ? null : conversationId);
  };

  // Handle edit action
  const handleEdit = (historyItem) => {
    setSelectedHistory(historyItem);
    setEditTitle(historyItem.title);
    setShowEditModal(true);
    setActiveDropdown(null);
  };

  // Handle delete action
  const handleDelete = (historyItem) => {
    setSelectedHistory(historyItem);
    setShowDeleteModal(true);
    setActiveDropdown(null);
  };

  // Confirm delete
  const confirmDelete = () => {
    const deleteContentPayload = JSON.stringify({
      target_id:selectedHistory.id,
      type: 'delete_content'
    });
    socketRef.current.send(deleteContentPayload);
    loadNewSessionPage();
    loadContent(selectedHistory.id);
    setShowDeleteModal(false);
    setSelectedHistory(null);
  };

  // Save edited title
  const saveEdit = () => {
    const editTitlePayload = JSON.stringify({
        message_id:selectedHistory.id,
        content:editTitle,
        type: 'edit_content'
      });
    socketRef.current.send(editTitlePayload);
    setShowEditModal(false);
    setSelectedHistory(null);
  };

  // Cancel edit
  const cancelEdit = () => {
    setShowEditModal(false);
    setSelectedHistory(null);
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedHistory(null);
  };

  // Add styles to document head once
  let stylesAdded = false;
  const addMarkdownStyles = () => {
    if (stylesAdded) return;

    const styleElement = document.createElement("style");
    styleElement.textContent = markdownStyles;
    document.head.appendChild(styleElement);
    stylesAdded = true;
  };

  useEffect(() => {
    addMarkdownStyles();
  }, [])

 

  // Copy function for code blocks - attach to window for global access
  if (typeof window !== 'undefined') {
    window.copyCode = (button) => {
        const code = button.nextElementSibling.innerText;
        navigator.clipboard.writeText(code).then(() => {
            button.innerHTML = "✅";
            setTimeout(() => (button.innerHTML = "📋"), 1500);
        });
    };
  }

  return (
    <div className="bg-gray-950 text-gray-100 h-screen flex overflow-hidden font-sans chat-body">
    
      {/* Delete Confirmation Modal for conversations */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-lg font-semibold mb-4">Delete chat?</h3>
            <p className='delete-question'>Are you sure you want to delete this chat? <br />This action cannot be undone.</p>
            <div className="modal-buttons">
              <button className="modal-button modal-button-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="modal-button modal-button-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for messages */}
      {showMessageDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-lg font-semibold mb-4">Delete message?</h3>
            <p className='delete-question'>Are you sure you want to delete this message? <br />This action cannot be undone.</p>
            <div className="modal-buttons">
              <button className="modal-button modal-button-secondary" onClick={cancelDeleteMessage}>
                Cancel
              </button>
              <button className="modal-button modal-button-danger" onClick={confirmDeleteMessage}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Title Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-lg font-semibold mb-4">Edit Conversation Title</h3>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-white mb-4"
              placeholder="Enter new title"
            />
            <div className="modal-buttons">
              <button className="modal-button modal-button-secondary" onClick={cancelEdit}>
                Cancel
              </button>
              <button className="modal-button modal-button-primary" onClick={saveEdit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Confirm Logout</h2>
            <p className="modal-text">Are you sure you want to log out?</p>
            <div className="modal-actions">
              <button onClick={handleLogout} className="btn-confirm">Yes, Logout</button>
              <button onClick={() => setShowLogoutModal(false)} className="btn-cancel">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Sidebar for history and controls */}
      <aside className={`${isSidebarCollapsed ? 'sidebar-collapsed' : ''} w-64 bg-gray-900 border-r border-gray-800 flex flex-col shadow-lg relative`}>
        <div className="sidebar-content p-4 flex-grow flex flex-col">
          {/* New chat button */}
          <button
            onClick={startNewChat}
            className="flex items-center justify-center w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 transition-colors duration-200 rounded-lg font-medium mb-4 text-white"
          >
            <i className="fas fa-plus mr-2"></i> New Chat
          </button>
          {/* Chat history */}
          <ul className="flex-grow overflow-y-auto scrollbar-hide text-sm space-y-2 pr-2 history-container">
             {history.map((item) => (
          <li
            key={item.id}
            className={`history-item ${activeDropdown === item.id ? 'dropdown-active' : ''}`}
            onClick={() => handleConversationClick(item.id, item.title)}>
            <span className="conversation-title">{item.title}</span>
            
            <div 
              className="history-menu"
              onClick={(e) => handleMenuClick(e, item.id)}>
              <i className="fas fa-ellipsis-v"></i>
            </div>
            
            {activeDropdown === item.id && (
              <div ref={dropdownRef} className="dropdown-menu">
                <div 
                  className="dropdown-item"
                  onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                >
                  <i className="fas fa-edit"></i> Edit
                </div>
                <div 
                  className="dropdown-item delete-option"
                  onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                >
                  <i className="fas fa-trash-alt"></i> Delete
                </div>
              </div>
            )}
          </li>
        ))}
          </ul>
        </div>
        {/* Settings and Logout buttons */}
        <div className="sidebar-content border-t border-gray-800 p-4 space-y-2">
          <button className="flex items-center w-full px-4 py-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors duration-200 rounded-lg">
            <i className="fas fa-cog mr-2"></i> Settings
          </button>
          <button onClick={() => setShowLogoutModal(true)} className="flex items-center w-full px-4 py-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors duration-200 rounded-lg">
            <i className="fas fa-sign-out-alt mr-2"></i> Logout
          </button>
        
        </div>
        
        {/* Collapse/Expand button */}
        <div className="sidebar-collapse-button" onClick={toggleSidebar}>
          <i className={`fas ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-gray-300 text-xs`}></i>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col chat-container">
  {/* Header fixed */}
 
      <header className="p-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between shadow-md">
        <h1 className="text-xl font-bold text-gray-100">{activeState.title}</h1>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-400">Online</span>
        </div>
      </header>
  {/* Scrollable messages */}
  <div ref={chatDisplayRef} className="message-container p-6">
    {messages.map((msg) => (
      <MessageBubble key={msg.id} message={msg} />
    ))}
    {isAiTyping && isLoading && <TypingIndicator />}
    <div ref={messagesEndRef} />
  </div>

  {/* Fixed textarea input */}
  <form onSubmit={handleSend} className="p-4 border-t border-gray-800">
    <div className="relative flex items-center bg-gray-900 border border-gray-700 rounded-xl shadow-md">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows="1"
        placeholder="Send a message..."
        className="w-full pl-5 pr-14 py-4 text-sm bg-transparent rounded-xl focus:outline-none resize-none"
        onInput={(e) => {
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
          }
        }}
      ></textarea>
      <button
        type="submit"
        className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center transition-colors duration-200 hover:bg-blue-700"
      >
        <i className="fas fa-arrow-up"></i>
      </button>
    </div>
  </form>
</main>

    </div>
  );
}