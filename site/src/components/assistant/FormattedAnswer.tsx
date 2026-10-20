import React from 'react';

interface FormattedAnswerProps {
  text: string;
}

export const FormattedAnswer: React.FC<FormattedAnswerProps> = ({ text }) => {
  if (!text) return null;

  // Split lines
  const lines = text.split('\n');

  const formatInlineText = (line: string) => {
    // 1. Convert citations like [delivery-01.mp4 - Record #5] into clean badge
    // 2. Remove asterisks **text** and convert to highlighted or bold text
    // 3. Highlight risk terms

    // Split on ** markers
    const parts = line.split(/(\*\*[^*]+\*\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const cleanContent = part.slice(2, -2).trim();

        // Check if it's a risk indicator
        const lower = cleanContent.toLowerCase();
        if (lower.includes('high risk')) {
          return (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 mx-1 rounded-md bg-red-100 text-red-900 font-bold border border-red-300 text-sm"
            >
              {cleanContent}
            </span>
          );
        }
        if (lower.includes('low risk')) {
          return (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 mx-1 rounded-md bg-emerald-100 text-emerald-900 font-bold border border-emerald-300 text-sm"
            >
              {cleanContent}
            </span>
          );
        }
        if (lower.includes('ground-truth')) {
          return (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 mx-1 rounded-md bg-teal-100 text-teal-900 font-bold border border-teal-300 text-sm"
            >
              {cleanContent}
            </span>
          );
        }
        if (lower.includes('model analysis')) {
          return (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 mx-1 rounded-md bg-blue-100 text-blue-900 font-bold border border-blue-300 text-sm"
            >
              {cleanContent}
            </span>
          );
        }

        // Generic bold without any asterisks
        return (
          <strong
            key={index}
            className="font-bold text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
          >
            {cleanContent}
          </strong>
        );
      }

      // Format filenames and citations
      const subParts = part.split(/(\[[^\]]+\]|\b[\w-]+\.mp4\b)/g);
      return subParts.map((sub, sIdx) => {
        if (sub.startsWith('[') && sub.endsWith(']')) {
          return (
            <span
              key={`${index}-${sIdx}`}
              className="inline-flex items-center px-2 py-0.5 mx-1 rounded-md bg-slate-100 text-slate-800 font-mono text-xs font-semibold border border-slate-300"
            >
              {sub.slice(1, -1)}
            </span>
          );
        }
        if (sub.endsWith('.mp4')) {
          return (
            <span
              key={`${index}-${sIdx}`}
              className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
            >
              {sub}
            </span>
          );
        }
        return <span key={`${index}-${sIdx}`}>{sub}</span>;
      });
    });
  };

  return (
    <div className="space-y-2.5 text-base text-slate-900 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Header style
        if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
          const headerText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
          return (
            <h4
              key={idx}
              className="text-lg font-extrabold text-slate-950 pt-2 pb-1 border-b border-slate-200 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {headerText}
            </h4>
          );
        }

        // Bullet items
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          const bulletText = trimmed.replace(/^[-•*]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2 text-slate-800">
              <span className="text-emerald-600 font-bold text-lg leading-none mt-1">•</span>
              <div className="flex-1">{formatInlineText(bulletText)}</div>
            </div>
          );
        }

        // Regular line
        return <p key={idx}>{formatInlineText(trimmed)}</p>;
      })}
    </div>
  );
};
