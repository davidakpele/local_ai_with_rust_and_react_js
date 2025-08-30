import { Component } from 'react';

export default new class ChatManager extends Component {

    // Helper function to escape HTML (important for code blocks)
    escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Enhanced message formatting function with code support
    formatMessageAdvanced = (text) => {
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

    
    formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

}