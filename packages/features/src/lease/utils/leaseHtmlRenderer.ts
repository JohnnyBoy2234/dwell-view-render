/**
 * Lease HTML Renderer
 * 
 * Converts processed lease template text into styled HTML
 * with proper text wrapping, typography, and formatting.
 */

/**
 * Render processed lease template as styled HTML
 */
export function renderLeaseAsHtml(processedTemplate: string): string {
  let html = processedTemplate;

  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert section separators (====) to styled dividers
  html = html.replace(/={5,}/g, '<hr class="lease-divider lease-divider-major" />');
  
  // Convert minor separators (---) to styled dividers  
  html = html.replace(/-{5,}/g, '<hr class="lease-divider lease-divider-minor" />');

  // Convert bold text patterns (UPPERCASE HEADINGS)
  html = html.replace(/^([A-Z][A-Z\s&()]+)$/gm, (match) => {
    return `<h3 class="lease-section-header">${match}</h3>`;
  });

  // Convert numbered clauses (e.g., "1. INTERPRETATION", "4.1 The monthly rental")
  html = html.replace(/^(\d+\.)\s+([A-Z][A-Z\s&()]+)$/gm, (_, num, title) => {
    return `<h4 class="lease-clause-header"><span class="clause-number">${num}</span> ${title}</h4>`;
  });

  // Convert sub-clauses (e.g., "4.1.1 An amount equal to...")
  html = html.replace(/^(\d+\.\d+\.?\d*)\s+/gm, (_, num) => {
    return `<span class="clause-number">${num}</span> `;
  });

  // Convert bullet points
  html = html.replace(/^[-•]\s+(.+)$/gm, '<li class="lease-bullet">$1</li>');

  // Wrap consecutive list items in ul
  html = html.replace(/(<li class="lease-bullet">.*?<\/li>\n?)+/gs, (match) => {
    return `<ul class="lease-list">${match}</ul>`;
  });

  // Convert schedule labels (e.g., "Name:", "Address:")
  html = html.replace(/^([A-Za-z\s\/]+):\s*(.*)$/gm, (_, label, value) => {
    if (value.trim()) {
      return `<div class="lease-field"><span class="lease-field-label">${label}:</span> <span class="lease-field-value">${value}</span></div>`;
    }
    return `<div class="lease-field"><span class="lease-field-label">${label}:</span></div>`;
  });

  // Convert paragraphs (lines that aren't already wrapped)
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    // Skip if already has HTML tags or is empty
    if (!trimmed || trimmed.startsWith('<') || trimmed.startsWith('</')) {
      return line;
    }
    return `<p class="lease-paragraph">${line}</p>`;
  });

  html = processedLines.join('\n');

  // Remove empty paragraphs
  html = html.replace(/<p class="lease-paragraph">\s*<\/p>/g, '');

  return html;
}

/**
 * Get CSS styles for the lease document
 */
export function getLeaseStyles(): string {
  return `
    .lease-content {
      font-family: 'Times New Roman', Georgia, serif;
      font-size: 14px;
      line-height: 1.7;
      color: hsl(var(--foreground));
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      max-width: 100%;
    }

    .lease-divider-major {
      border: none;
      border-top: 2px solid hsl(var(--border));
      margin: 24px 0;
    }

    .lease-divider-minor {
      border: none;
      border-top: 1px solid hsl(var(--border));
      margin: 16px 0;
    }

    .lease-section-header {
      font-weight: 700;
      font-size: 16px;
      margin: 24px 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: hsl(var(--foreground));
    }

    .lease-clause-header {
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0 8px;
      color: hsl(var(--foreground));
    }

    .clause-number {
      font-weight: 600;
      color: hsl(var(--muted-foreground));
    }

    .lease-paragraph {
      margin: 8px 0;
      text-align: justify;
    }

    .lease-field {
      margin: 4px 0;
      display: flex;
      gap: 8px;
    }

    .lease-field-label {
      font-weight: 600;
      color: hsl(var(--muted-foreground));
      min-width: 150px;
    }

    .lease-field-value {
      color: hsl(var(--foreground));
    }

    .lease-list {
      margin: 12px 0 12px 24px;
      padding: 0;
      list-style-type: disc;
    }

    .lease-bullet {
      margin: 4px 0;
    }

    .lease-signature-section {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 2px solid hsl(var(--border));
    }

    .lease-signature-block {
      margin: 24px 0;
      padding: 16px;
      border: 1px solid hsl(var(--border));
      border-radius: 8px;
      background: hsl(var(--muted) / 0.3);
    }

    .lease-signature-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .lease-signature-image {
      max-width: 300px;
      height: auto;
      border: 1px solid hsl(var(--border));
      border-radius: 4px;
      background: white;
    }

    .lease-signature-canvas {
      width: 100%;
      max-width: 400px;
      height: 150px;
      border: 2px dashed hsl(var(--border));
      border-radius: 8px;
      background: white;
      cursor: crosshair;
    }

    .lease-signature-meta {
      font-size: 12px;
      color: hsl(var(--muted-foreground));
      margin-top: 8px;
    }

    .lease-draft-watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 100px;
      font-weight: bold;
      color: hsl(var(--muted-foreground) / 0.1);
      pointer-events: none;
      z-index: 0;
      user-select: none;
    }

    @media print {
      .lease-content {
        font-size: 12px;
      }
      .lease-signature-canvas {
        display: none;
      }
    }
  `;
}

/**
 * Render the signature section HTML
 */
export function renderSignatureSection(
  landlordSignature?: { imageUrl: string; name: string; signedAt: string },
  tenantSignature?: { imageUrl: string; name: string; signedAt: string },
  showLandlordPad?: boolean,
  showTenantPad?: boolean
): string {
  return `
    <div class="lease-signature-section">
      <h3 class="lease-section-header">SIGNATURES</h3>
      
      <div class="lease-signature-block">
        <div class="lease-signature-title">LANDLORD</div>
        ${landlordSignature ? `
          <img src="${landlordSignature.imageUrl}" alt="Landlord Signature" class="lease-signature-image" />
          <div class="lease-signature-meta">
            <div><strong>Name:</strong> ${landlordSignature.name}</div>
            <div><strong>Signed:</strong> ${landlordSignature.signedAt}</div>
          </div>
        ` : showLandlordPad ? `
          <div id="landlord-signature-pad" class="lease-signature-pad-container"></div>
        ` : `
          <p class="lease-signature-meta">Awaiting signature...</p>
        `}
      </div>

      <div class="lease-signature-block">
        <div class="lease-signature-title">TENANT</div>
        ${tenantSignature ? `
          <img src="${tenantSignature.imageUrl}" alt="Tenant Signature" class="lease-signature-image" />
          <div class="lease-signature-meta">
            <div><strong>Name:</strong> ${tenantSignature.name}</div>
            <div><strong>Signed:</strong> ${tenantSignature.signedAt}</div>
          </div>
        ` : showTenantPad ? `
          <div id="tenant-signature-pad" class="lease-signature-pad-container"></div>
        ` : `
          <p class="lease-signature-meta">Awaiting signature...</p>
        `}
      </div>
    </div>
  `;
}
