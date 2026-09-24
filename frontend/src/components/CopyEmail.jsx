import React, { useState } from 'react';
import { profile } from '../data/site';

// Primary contact button: copies the address, and still works as a mailto link
// if the clipboard is unavailable.
const CopyEmail = ({ className = 'btn btn-primary', label }) => {
  const [copied, setCopied] = useState(false);

  const onClick = async (e) => {
    if (!navigator.clipboard) return;
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  return (
    <a className={className} href={`mailto:${profile.email}`} onClick={onClick} aria-live="polite">
      {copied ? 'Copied' : label || profile.email}
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
        {copied
          ? <path d="M3 8.5l3 3 7-7" />
          : <><rect x="5.5" y="5.5" width="8" height="8" rx="1" /><path d="M10.5 3.5v-1h-8v8h1" /></>}
      </svg>
    </a>
  );
};

export default CopyEmail;
