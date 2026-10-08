export function buildEmailHtml({
  subject,
  preheader,
  content,
  unsubscribeUrl,
  brandName,
  brandDomain,
  accentColor = '#c05a1a',
  logoUrl,
}: {
  subject: string
  preheader: string
  content: string
  unsubscribeUrl: string
  brandName: string
  brandDomain: string
  accentColor?: string
  logoUrl?: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <span style="display:none;font-size:1px;color:#fff;max-height:0">${preheader}</span>
</head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:${accentColor};padding:28px 40px;text-align:center;">
          ${
            logoUrl
              ? `<img src="${logoUrl}" alt="${brandName}" width="64" height="64" style="display:block;margin:0 auto 12px;border-radius:50%;background:#fff;object-fit:cover;" />`
              : ''
          }
          <p style="margin:0;color:#ffffff;opacity:0.9;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">${brandName}</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:normal;font-family:Georgia,serif;">${subject}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;color:#333;font-size:16px;line-height:1.7;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9f9f7;padding:24px 40px;text-align:center;border-top:1px solid #e8e8e4;">
          <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;color:#888;">
            You're receiving this because you subscribed at ${brandDomain}
          </p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;">
            <a href="${unsubscribeUrl}" style="color:${accentColor};text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildDigestHtml({
  subject,
  preheader,
  intro,
  articles,
  unsubscribeUrl,
  brandName,
  brandDomain,
  accentColor = '#c05a1a',
  logoUrl,
}: {
  subject: string
  preheader: string
  intro: string
  articles: { title: string; excerpt: string; url: string; imageUrl?: string }[]
  unsubscribeUrl: string
  brandName: string
  brandDomain: string
  accentColor?: string
  logoUrl?: string
}): string {
  const articleBlocks = articles.map((a, i) => `
    ${i > 0 ? '<tr><td style="padding:0 40px"><hr style="border:none;border-top:1px solid #e8e8e4;margin:0" /></td></tr>' : ''}
    <tr><td style="padding:${i === 0 ? '32px' : '24px'} 40px ${i === articles.length - 1 ? '32px' : '0'};">
      ${a.imageUrl ? `<img src="${a.imageUrl}" alt="${a.title}" style="width:100%;max-height:220px;object-fit:cover;border-radius:6px;margin-bottom:16px;" />` : ''}
      <h2 style="margin:0 0 10px;font-size:20px;color:#1a1a1a;font-family:Georgia,serif;line-height:1.3;">
        <a href="${a.url}" style="color:#1a1a1a;text-decoration:none;">${a.title}</a>
      </h2>
      <p style="margin:0 0 14px;color:#555;font-size:15px;line-height:1.6;">${a.excerpt}</p>
      <a href="${a.url}" style="display:inline-block;background:${accentColor};color:#fff;padding:10px 20px;border-radius:4px;font-family:Arial,sans-serif;font-size:13px;text-decoration:none;font-weight:bold;">Read More →</a>
    </td></tr>
  `).join('')

  return buildEmailHtml({
    subject,
    preheader,
    brandName,
    brandDomain,
    accentColor,
    logoUrl,
    content: `
      ${intro ? `<p style="margin:0 0 24px;font-size:16px;line-height:1.7;">${intro}</p>` : ''}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 -40px;width:calc(100% + 80px);">
        ${articleBlocks}
      </table>
    `,
    unsubscribeUrl,
  })
}
