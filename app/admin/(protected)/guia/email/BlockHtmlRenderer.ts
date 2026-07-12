import type {
  EmailBlock, EmailState, DesignOptions,
  HeaderBlock, TextBlock, ImageBlock,
  ButtonBlock, DividerBlock, SpacerBlock,
  ColumnsBlock, CalloutBlock,
} from './types';

/* ─────────────────────────────────────────────────────────────
   Renders an EmailState → full HTML email string
   Email-safe: table-based layout, inline styles only.
   ───────────────────────────────────────────────────────────── */

function fontStack(d: DesignOptions) {
  return d.font === 'serif' ? 'Georgia,serif' : 'system-ui,-apple-system,sans-serif';
}

function btnRadius(radius: 'pill' | 'rounded' | 'square') {
  return radius === 'pill' ? '999px' : radius === 'rounded' ? '10px' : '4px';
}

function btnPadding(size: 'sm' | 'md' | 'lg') {
  return size === 'sm' ? '10px 22px' : size === 'md' ? '14px 34px' : '17px 44px';
}

function btnFontSize(size: 'sm' | 'md' | 'lg') {
  return size === 'sm' ? '12px' : size === 'md' ? '13px' : '15px';
}

/* ── Block renderers ─────────────────────────────────────────── */

function renderHeader(b: HeaderBlock, d: DesignOptions): string {
  const align = b.align;
  const f = fontStack(d);
  const badge = b.showBadge
    ? `<p style="margin:0 0 6px;font-family:${f};font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${d.accentColor};">Hotel El Encino · Directorio Santiago</p>`
    : '';
  const sub = b.subtitle
    ? `<p style="margin:8px 0 0;font-family:${f};font-size:15px;color:${b.textColor};opacity:0.72;line-height:1.55;">${b.subtitle}</p>`
    : '';
  return `
<tr><td style="background:${b.bgColor};padding:32px 40px 28px;text-align:${align};">
  ${badge}
  <h1 style="margin:0;font-family:${f};font-size:24px;font-weight:400;color:${b.textColor};letter-spacing:-0.02em;line-height:1.38;">${b.title || 'Sin título'}</h1>
  ${sub}
</td></tr>`;
}

function renderText(b: TextBlock, d: DesignOptions): string {
  const f = fontStack(d);
  // Wrap raw HTML in email-safe container
  return `
<tr><td style="background:#ffffff;padding:10px 40px;text-align:${b.align};">
  <div style="font-family:${f};font-size:15px;color:#1a1a1a;line-height:1.75;">${b.html || ''}</div>
</td></tr>`;
}

function renderImage(b: ImageBlock, _d: DesignOptions): string {
  if (!b.src) return '';
  const alignment = b.align === 'full' ? '100%' : `${b.maxWidthPct}%`;
  const wrapAlign = b.align === 'left' ? 'left' : b.align === 'right' ? 'right' : 'center';
  const img = `<img src="${b.src}" alt="${b.alt || ''}" width="${b.align === 'full' ? '100%' : b.maxWidthPct + '%'}" style="display:block;max-width:${alignment};border-radius:8px;" />`;
  const caption = b.caption ? `<p style="font-family:system-ui,sans-serif;font-size:11px;color:#999;margin:6px 0 0;text-align:${wrapAlign};">${b.caption}</p>` : '';
  const linked = b.link ? `<a href="${b.link}" style="display:block;">${img}</a>` : img;
  return `
<tr><td style="background:#ffffff;padding:12px 40px;text-align:${wrapAlign};">
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td>
    ${linked}${caption}
  </td></tr></table>
</td></tr>`;
}

function renderButton(b: ButtonBlock, _d: DesignOptions): string {
  const r = btnRadius(b.radius);
  const p = btnPadding(b.size);
  const fs = btnFontSize(b.size);
  const align = b.align === 'left' ? 'left' : b.align === 'right' ? 'right' : 'center';
  return `
<tr><td style="background:#ffffff;padding:16px 40px 8px;text-align:${align};">
  <a href="${b.url || '#'}" style="display:inline-block;background:${b.bgColor};color:${b.textColor};text-decoration:none;padding:${p};border-radius:${r};font-family:system-ui,sans-serif;font-size:${fs};font-weight:600;letter-spacing:0.07em;text-transform:uppercase;">${b.text || 'Botón'}</a>
</td></tr>`;
}

function renderDivider(b: DividerBlock, _d: DesignOptions): string {
  const margin = `0 ${Math.round((100 - b.widthPct) / 2)}%`;
  return `
<tr><td style="background:#ffffff;padding:8px 0;">
  <hr style="border:none;border-top:${b.thickness}px ${b.style} ${b.color};margin:${margin};width:${b.widthPct}%;" />
</td></tr>`;
}

function renderSpacer(b: SpacerBlock, _d: DesignOptions): string {
  return `
<tr><td style="background:#ffffff;height:${b.height}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

function renderColumns(b: ColumnsBlock, d: DesignOptions): string {
  const f = fontStack(d);
  const rPct = 100 - b.leftWidthPct;
  const right = b.rightImageSrc
    ? `<img src="${b.rightImageSrc}" alt="${b.rightImageAlt || ''}" style="display:block;width:100%;max-width:100%;border-radius:6px;" />`
    : `<div style="font-family:${f};font-size:15px;color:#1a1a1a;line-height:1.7;">${b.rightHtml || ''}</div>`;
  return `
<tr><td style="background:#ffffff;padding:12px 40px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="${b.leftWidthPct}%" style="padding-right:16px;vertical-align:top;">
      <div style="font-family:${f};font-size:15px;color:#1a1a1a;line-height:1.7;">${b.leftHtml || ''}</div>
    </td>
    <td width="${rPct}%" style="vertical-align:top;">${right}</td>
  </tr></table>
</td></tr>`;
}

function renderCallout(b: CalloutBlock, d: DesignOptions): string {
  const f = fontStack(d);
  return `
<tr><td style="background:#ffffff;padding:8px 40px;">
  <div style="background:${b.bgColor};border-left:3px solid ${b.borderColor};border-radius:${b.radius}px;padding:16px 20px;">
    <div style="font-family:${f};font-size:14px;color:#1a1a1a;line-height:1.7;">${b.html || ''}</div>
  </div>
</td></tr>`;
}

function renderBlock(block: EmailBlock, d: DesignOptions): string {
  switch (block.type) {
    case 'header':  return renderHeader(block as HeaderBlock, d);
    case 'text':    return renderText(block as TextBlock, d);
    case 'image':   return renderImage(block as ImageBlock, d);
    case 'button':  return renderButton(block as ButtonBlock, d);
    case 'divider': return renderDivider(block as DividerBlock, d);
    case 'spacer':  return renderSpacer(block as SpacerBlock, d);
    case 'columns': return renderColumns(block as ColumnsBlock, d);
    case 'callout': return renderCallout(block as CalloutBlock, d);
    default:        return '';
  }
}

/* ── Full email renderer ─────────────────────────────────────── */
export function renderEmailHtml(state: EmailState): string {
  const { design: d, blocks, subject, preheader } = state;
  const f = fontStack(d);

  const bodyRows = blocks.map(b => renderBlock(b, d)).join('\n');

  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;">${preheader}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject}</title>
  <style>
    @media only screen and (max-width:480px){
      .email-inner{padding:0 !important;}
      .email-inner td[style*="padding:12px 40px"], .email-inner td[style*="padding:36px 40px"]{padding:12px 20px !important;}
      h1{font-size:20px !important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${d.bodyBg};font-family:${f};">
${preheaderHtml}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${d.bodyBg};padding:36px 12px;">
    <tr><td align="center">
      <table class="email-inner" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-radius:18px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

        ${bodyRows}

        <!-- FOOTER -->
        <tr><td style="background:${d.footerBg};border-radius:0 0 18px 18px;padding:24px 40px;text-align:center;">
          <p style="margin:0;font-family:system-ui,sans-serif;font-size:11px;color:rgba(0,0,0,0.38);line-height:1.6;">
            Hotel El Encino · Matamoros 106, Santiago N.L.<br>
            <a href="https://hotelelencino.com/directorio" style="color:${d.accentColor};text-decoration:none;">Ver directorio</a>
            &nbsp;·&nbsp;
            <a href="https://hotelelencino.com/mi-negocio" style="color:${d.accentColor};text-decoration:none;">Mi panel</a>
            &nbsp;·&nbsp;
            <a href="{{unsubscribe_url}}" style="color:#bbb;text-decoration:none;">Cancelar suscripción</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
