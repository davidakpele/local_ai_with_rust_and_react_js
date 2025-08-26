import { Component } from 'react';

export default new class ChatManager extends Component {

    // Enhanced message formatting function with code support
    formatMessageAdvanced = (text) => {
        if (!text) return '';
        
        let formattedText = text;
        
        // First, handle code blocks (```code```)
        formattedText = formattedText.replace(/```(\w+)?\s*([\s\S]*?)```/g, (match, language, code) => {
            const langClass = language ? ` language-${language}` : '';
            return `<div class="code-block bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto my-3">
                <div class="code-header flex justify-between items-center mb-2 text-sm text-gray-400">
                    <span>${language || 'code'}</span>
                    <button class="copy-btn bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs" onclick="copyCode(this)">
                        Copy
                    </button>
                </div>
                <pre class="whitespace-pre-wrap break-words${langClass}">${escapeHtml(code.trim())}</pre>
            </div>`;
        });

        // Handle inline code (`code`)
        formattedText = formattedText.replace(/`([^`]+)`/g, '<code class="inline-code bg-gray-200 text-red-600 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
        
        // Convert numbered lists
        formattedText = formattedText.replace(/(\n|^)(\d+)\.\s+([^\n]+)/g, '$1<li class="list-decimal ml-5">$3</li>');
        
        // Convert bullet points
        formattedText = formattedText.replace(/(\n|^)([•\-*])\s+([^\n]+)/g, '$1<li class="list-disc ml-5">$3</li>');
        
        // Wrap consecutive list items
        formattedText = formattedText.replace(/(<li[^>]*>.*?<\/li>(\s*<li[^>]*>.*?<\/li>)+)/g, (match) => {
            if (match.match(/<li class="list-decimal/)) {
                return `<ol class="list-decimal pl-5 space-y-1 my-2">${match}</ol>`;
            } else {
                return `<ul class="list-disc pl-5 space-y-1 my-2">${match}</ul>`;
            }
        });
        
        // Convert line breaks (but not inside code blocks)
        formattedText = formattedText.replace(/\n/g, '<br />');
        
        // Convert bold text (**text**)
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
        
        // Convert italic text (*text*)
        formattedText = formattedText.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
        
        return formattedText;
    };

    // Helper function to escape HTML (important for code blocks)
    escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // Copy function for code blocks (add this to your component or globally)
    copyCode = (button) => {
    const codeBlock = button.parentElement.nextElementSibling;
    const textToCopy = codeBlock.textContent;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('bg-green-600');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-green-600');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};
}