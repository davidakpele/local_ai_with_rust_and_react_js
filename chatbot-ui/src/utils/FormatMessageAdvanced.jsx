import Prism from "prismjs";
import "prismjs/components/prism-java";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-go";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-markup"; // ✅ Prism's HTML/XML support
import { useEffect } from "react";

const escapeHtml = (unsafe) =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const FormatMessageAdvanced = (text) => {
  useEffect(() => {
    Prism.highlightAll();

    // Copy button logic
    document.querySelectorAll(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(btn.dataset.code);
        btn.textContent = "✅";
        setTimeout(() => (btn.textContent = "📋"), 2000);
      });
    });
  }, [text]);

  if (!text) return "";

  let formattedText = text; // ❌ remove global escape

  const codeBlocks = [];

  // --- Capture fenced code blocks ---
  formattedText = formattedText.replace(
    /```(\w+)?\s*([\s\S]*?)```/g,
    (match, language, code) => {
      const langClass = language ? `language-${language.toLowerCase()}` : "";
      const escapedCode = escapeHtml(code.trim()); // ✅ escape only code

      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(
        `<pre class="code-block ${langClass}">
            <button class="copy-btn" data-code="${escapeHtml(
              code.trim()
            )}">📋</button>
            <code class="${langClass}">${escapedCode}</code>
        </pre>`
      );
      return placeholder;
    }
  );

  // --- Inline code ---
  formattedText = formattedText.replace(
    /`([^`]+)`/g,
    '<code class="inline-code">$1</code>'
  );

  // --- Lists ---
  formattedText = formattedText.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");
  formattedText = formattedText.replace(
    /(<li>.*<\/li>)/gs,
    '<ol class="list-decimal pl-6">$1</ol>'
  );
  formattedText = formattedText.replace(/^\-\s+(.+)$/gm, "<li>$1</li>");
  formattedText = formattedText.replace(
    /(<li>.*<\/li>)/gs,
    '<ul class="list-disc pl-6">$1</ul>'
  );

  // --- Bold & Italic ---
  formattedText = formattedText.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );
  formattedText = formattedText.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // --- Paragraphs ---
  formattedText = formattedText.replace(/\n{2,}/g, "</p><p>");
  formattedText = `<p>${formattedText}</p>`;

  // --- Restore code blocks ---
  codeBlocks.forEach((block, index) => {
    formattedText = formattedText.replace(`__CODE_BLOCK_${index}__`, block);
  });

  return formattedText;
};
