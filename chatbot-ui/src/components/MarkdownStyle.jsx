// MarkdownStyle.js
const markdownStyles = `
  /* Base styling */
  .ai-response {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff;
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
    margin: 0.25rem 0; 
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

export default markdownStyles;
