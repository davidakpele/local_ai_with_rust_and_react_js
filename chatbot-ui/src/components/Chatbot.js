import React, { useState, useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import AppManager from '../utils/appManager';

// Add styles only once - moved outside component
const markdownStyles = `
    /* Base styling */
    .ai-response {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #1f2937;
      line-height: 1.7;
    }

    /* Headings */
    .ai-response h1, .ai-response h2, .ai-response h3 {
      font-weight: 600;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      line-height: 1.3;
    }

    .ai-response h1 { 
      font-size: 1.5rem; 
      border-bottom: 2px solid #e5e7eb; 
      padding-bottom: .3rem; 
    }
    
    .ai-response h2 { 
      font-size: 1.25rem; 
      border-bottom: 1px solid #e5e7eb; 
      padding-bottom: .2rem; 
    }
    
    .ai-response h3 { 
      font-size: 1.1rem; 
    }

    /* Paragraphs */
    .ai-response p { 
      margin: 0.5rem 0; 
    }

    /* Lists */
    .ai-response ul, .ai-response ol { 
      margin: 0.5rem 0; 
      padding-left: 1.5rem; 
    }
    
    .ai-response li { 
      margin: .25rem 0; 
    }

    /* Blockquotes */
    .ai-response blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 1rem;
      margin: 0.5rem 0;
      color: #374151;
      border-radius: 6px;
      font-style: italic;
    }

    /* Inline code */
    .ai-response code:not(.inline-code) {
      color: #fff;
      background: #1e293b !important;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: "Fira Code", monospace;
    }

    /* Code blocks */
    .ai-response pre {
      position: relative;
      background: #1e293b;
      color: #f8fafc;
      padding: 2px !important;
      margin: 4px 0 !important;
      border-radius: 8px;
      overflow-x: auto;
    }
    .ai-response pre code {
      color: inherit;
      background: none;
      padding: 0;
      display: block;
      white-space: pre;
      font-family: "Fira Code", monospace;
    }

    /* Copy button */
    .ai-response .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #374151;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background 0.2s ease;
    }
    .ai-response .copy-btn:hover {
      background: #2563eb;
    }

    /* Inline code specifically */
    .inline-code {
      background: #f3f4f6;
      color: #d63384;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: "Fira Code", monospace;
    }
`;

// Add styles to document head once
let stylesAdded = false;
const addMarkdownStyles = () => {
  if (stylesAdded) return;
  
  const styleElement = document.createElement('style');
  styleElement.textContent = markdownStyles;
  document.head.appendChild(styleElement);
  stylesAdded = true;
};

// Helper function to escape HTML (important for code blocks)
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Enhanced message formatting function with code support
// Enhanced message formatting function with code support
const formatMessageAdvanced = (text) => {
  if (!text) return '';

  let formattedText = text;
  const codeBlocks = [];

  // Handle code blocks (```code```)
  formattedText = formattedText.replace(/```(\w+)?\s*([\s\S]*?)```/g, (match, language, code) => {
      const langClass = language ? ` language-${language}` : '';
      const escapedCode = escapeHtml(code.trim());
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      
      codeBlocks.push(
          `<pre>
              <button class="copy-btn" onclick="window.copyCode(this)">📋</button>
              <code class="${langClass}">${escapedCode}</code>
          </pre>`
      );
      return placeholder;
  });

  // Inline code
  formattedText = formattedText.replace(/`([^`]+)`/g, '<code class="inline-code bg-gray-200 text-red-600 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

  // Numbered lists
  formattedText = formattedText.replace(/(\n|^)(\d+)\.\s+([^\n]+)/g, '$1<li class="list-decimal ml-5">$3</li>');

  // Bullet lists
  formattedText = formattedText.replace(/(\n|^)([•\-*])\s+([^\n]+)/g, '$1<li class="list-disc ml-5">$3</li>');

  // Wrap consecutive list items
  formattedText = formattedText.replace(/(<li[^>]*>.*?<\/li>(\s*<li[^>]*>.*?<\/li>)+)/gs, (match) => {
      if (match.match(/list-decimal/)) {
          return `<ol class="list-decimal pl-5 space-y-1 my-2">${match}</ol>`;
      } else {
          return `<ul class="list-disc pl-5 space-y-1 my-2">${match}</ul>`;
      }
  });

  // Bold
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');

  // Italic
  formattedText = formattedText.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // 🚫 REMOVE global <br/> replacement
  // Instead, turn standalone newlines into paragraphs
  formattedText = formattedText
    .split(/\n{2,}/) // split on double newlines (paragraph breaks)
    .map(block => {
      block = block.trim();
      if (!block) return '';
      if (block.startsWith('<li')) return block; // don’t wrap list items
      return `<p>${block}</p>`;
    })
    .join('');

  // Restore code blocks
  codeBlocks.forEach((block, index) => {
      formattedText = formattedText.replace(`__CODE_BLOCK_${index}__`, block);
  });

  return formattedText;
};


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

// Format time function
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Updated ChatMessage component to match your structure
const ChatMessage = ({ message, isUser, timestamp }) => {
  useEffect(() => {
    if (!isUser) {
      Prism.highlightAll();
    }
  }, [message, isUser]);

  return (
    <div className={`flex items-start ${isUser ? "justify-end" : "justify-start"}`}>
      {/* AI icon (left, swapped) */}
      {!isUser && (
        <div className="mr-2 mt-1">
          <i className="fas fa-robot text-purple-400"></i>
        </div>
      )}

      {/* Message bubble */}
      <div className="flex flex-col max-w-[80%]">
        <div
          className={`px-4 py-2 rounded-2xl shadow text-sm whitespace-pre-wrap break-words relative 
          ${isUser
            ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white self-end"
            : "bg-white text-gray-800"
          }`}
        >
          {isUser ? (
            message
          ) : (
            <div
              className="ai-response"
              dangerouslySetInnerHTML={{ __html: formatMessageAdvanced(message) }}
            />
          )}
        </div>
        <span
          className={`text-[10px] text-gray-500 mt-1 ${isUser ? "text-right" : "text-left"}`}
        >
          {formatTime(timestamp)}
        </span>
      </div>

      {/* User icon (right, swapped) */}
      {isUser && (
        <div className="ml-2 mt-1">
          <i className="fas fa-user text-blue-300"></i>
        </div>
      )}
    </div>
  );
};


// Component for the typing indicator animation (updated to match your structure)
const TypingIndicator = () => {
  return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-2xl w-fit">
          <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></span>
          <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
          <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
      </div>
  );
};

// Styled components for input area
const InputContainer = ({ children }) => (
  <div className="px-5 py-4 bg-white border-t border-gray-200">{children}</div>
);

const InputWrapper = ({ children }) => (
  <div className="flex items-center gap-2">{children}</div>
);

const Input = ({ ...props }) => (
  <textarea
    className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
    rows={1} // adjust how many lines show by default
    {...props}
  />
);


const SendButton = ({ disabled, ...props }) => (
  <button
      className={`p-2 rounded-full ${disabled ? 'bg-gray-300 text-gray-500' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
      disabled={disabled}
      {...props}
  >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
      </svg>
  </button>
);

const Chatbot = () => {
  const [messages, setMessages] = useState([
      { id: 1, text: 'Hello! How can I help you today?', sender: 'ai', timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const currentStreamIndexRef = useRef(null);
  const streamingMessageRef = useRef('');

  const { token, username } = AppManager.get({
      keys: ['token', 'username'],
      type: 'local'
  });

  // Add styles on component mount
  useEffect(() => {
      addMarkdownStyles();
  }, []);

  // Scroll to bottom
  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
      scrollToBottom();
  }, [messages, isLoading]);

  // Setup WebSocket on mount
  useEffect(() => {
      if (!token) {
          console.warn('Token missing. WebSocket not connected.');
          return;
      }

      const wsUrl = `ws://localhost:9001/ws/chat`;

      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
          console.log('WebSocket connected');
          const startPayload = JSON.stringify({
              token: token,
              type: 'start_connection'
          });
          socketRef.current.send(startPayload);
      };

      socketRef.current.onmessage = (event) => {
          try {
              const data = JSON.parse(event.data);
          
              switch(data.type) {
                  case 'session_created':
                      break;

                  case 'stream_chunk':
                    if (!data.chunk || data.chunk.trim() === "") {
                        break;
                    }
                      // Add chunk to the streaming buffer
                      streamingMessageRef.current += data.chunk;
                      
                      // Update or create the streaming message
                      setMessages((prev) => {
                          if (currentStreamIndexRef.current === null) {
                              // Create new message for streaming
                              currentStreamIndexRef.current = prev.length;
                              return [...prev, {
                                  id: Date.now(),
                                  text: streamingMessageRef.current,
                                  sender: 'ai',
                                  timestamp: Date.now(),
                                  isStreaming: true
                              }];
                          } else {
                              // Update existing streaming message
                              const newMessages = [...prev];
                              if (currentStreamIndexRef.current < newMessages.length) {
                                  newMessages[currentStreamIndexRef.current] = {
                                      ...newMessages[currentStreamIndexRef.current],
                                      text: streamingMessageRef.current
                                  };
                              } else {
                                  // Fallback: if index is invalid, create new message
                                  currentStreamIndexRef.current = newMessages.length;
                                  newMessages.push({
                                      id: Date.now(),
                                      text: streamingMessageRef.current,
                                      sender: 'ai',
                                      timestamp: Date.now(),
                                      isStreaming: true
                                  });
                              }
                              return newMessages;
                          }
                      });
                      break;

                  case 'stream_end':
                      // Finalize the streaming message
                      setMessages((prev) => {
                          const newMessages = [...prev];
                          if (currentStreamIndexRef.current !== null &&
                              currentStreamIndexRef.current < newMessages.length) {
                              newMessages[currentStreamIndexRef.current] = {
                                  ...newMessages[currentStreamIndexRef.current],
                                  text: streamingMessageRef.current,
                                  isStreaming: false
                              };
                          }
                          return newMessages;
                      });
                      
                      setIsLoading(false);
                      streamingMessageRef.current = '';
                      currentStreamIndexRef.current = null;
                      break;

                  case 'ai_response':
                      // Handle complete AI response (non-streaming fallback)
                      setMessages((prev) => [...prev, {
                          id: Date.now(),
                          text: data.response,
                          sender: 'ai',
                          timestamp: Date.now()
                      }]);
                      setIsLoading(false);
                      streamingMessageRef.current = '';
                      currentStreamIndexRef.current = null;
                      break;

                  case 'error':
                      // Handle errors
                      setMessages((prev) => [...prev, {
                          id: Date.now(),
                          text: `Error: ${data.error || 'Something went wrong.'}`,
                          sender: 'ai',
                          timestamp: Date.now()
                      }]);
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
          console.error('WebSocket error:', error);
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

  const handleSend = (e) => {
      e.preventDefault();
      if (input.trim() === '' || isLoading) return;

      const userMessage = {
          id: Date.now(),
          text: input,
          sender: 'user',
          timestamp: Date.now()
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      streamingMessageRef.current = '';
      currentStreamIndexRef.current = null;

      const messagePayload = JSON.stringify({
          type: 'ai_request',
          prompt: input,
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          try {
              socketRef.current.send(messagePayload);
          } catch (error) {
              console.error('Error sending message:', error);
              setMessages((prev) => [
                  ...prev,
                  {
                      id: Date.now(),
                      text: 'Failed to send message. Please try again.',
                      sender: 'ai',
                      timestamp: Date.now()
                  }
              ]);
              setIsLoading(false);
          }
      } else {
          console.error('WebSocket is not connected');
          setMessages((prev) => [
              ...prev,
              {
                  id: Date.now(),
                  text: 'Unable to send message. Please try again later.',
                  sender: 'ai',
                  timestamp: Date.now()
              }
          ]);
          setIsLoading(false);
      }
  };

  const handleLogout = () => {
    window.location.href = "/logout";
  }
  
  return (
      <div className="flex flex-col h-[690px] w-full max-w-4xl mx-auto bg-gray-800 shadow-xl rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4  text-white">
              {/* Left side */}
              <div className="flex items-center gap-3" >
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 font-bold text-lg">
                      AI
                  </div>
                  <div>
                      <h3 className="font-semibold">AI Assistant</h3>
                      <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          <p className="text-xs opacity-90">Online • Ready to help</p>
                      </div>
                  </div>
              </div>

              {/* Right side (Logout button) */}
              <button 
                  onClick={handleLogout} 
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                  Logout
              </button>
          </div>


          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
              {messages.map((msg) => (
                  <ChatMessage
                      key={msg.id}
                      message={msg.text}
                      isUser={msg.sender === "user"}
                      timestamp={msg.timestamp}
                  />
              ))}

              {isLoading && <TypingIndicator />}

              <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <InputContainer>
              <form onSubmit={handleSend}>
                  <InputWrapper>
                      <Input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Type your message here..."
                          maxLength={500}
                      />
                      <SendButton type="submit" disabled={!input.trim() || isLoading}>
                          <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                          </svg>
                      </SendButton>
                  </InputWrapper>
              </form>
          </InputContainer>
      </div>
  );
};

export default Chatbot;