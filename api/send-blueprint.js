module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, name, blueprintText } = req.body;

  if (!email || !blueprintText) {
    return res.status(400).json({ error: 'Missing email or blueprint text' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email not configured' });
  }

  const firstName = name ? name.split(' ')[0] : 'there';
  const slug = name ? name.toLowerCase().replace(/\s+/g, '-') + '-' : '';
  const filename = slug + 'brand-blueprint.md';

  const encoded = Buffer.from(blueprintText).toString('base64');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Brand Blueprint <blueprint@fscreative.co>',
        to: email,
        subject: 'Your Brand Blueprint is ready',
        html: `
          <div style="font-family: Helvetica Neue, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #ffffff; color: #061410;">
            <p style="font-size: 13px; color: #7a7570; letter-spacing: 0.08em; text-transform: uppercase; font-family: monospace; margin-bottom: 28px;">FSCreative — Brand Blueprint</p>
            <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 16px; line-height: 1.2;">Your Brand Blueprint is attached.</h1>
            <p style="font-size: 14px; line-height: 1.65; color: #3a3530; margin-bottom: 16px;">Hey ${firstName} — your Brand Blueprint is attached to this email as a <code style="background: #f0ece6; padding: 2px 6px; border-radius: 4px; font-size: 12px;">.md</code> file.</p>
            <p style="font-size: 14px; line-height: 1.65; color: #3a3530; margin-bottom: 16px;">Drop it into the <strong>/Other</strong> folder inside your AI Brain. That's the file your brain builder will use to generate your Voice Codex, ICP, and Strategic Clarity documents.</p>
            <p style="font-size: 14px; line-height: 1.65; color: #3a3530; margin-bottom: 32px;">Keep it somewhere you can find it. It's yours to reference and build from as your brand grows.</p>
            <p style="font-size: 12px; color: #9a9490; border-top: 1px solid #e8e2da; padding-top: 24px; margin-top: 8px;">FSCreative — Frictionless OS</p>
          </div>
        `,
        attachments: [
          {
            filename: filename,
            content: encoded,
          }
        ]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to send email', detail: data });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
