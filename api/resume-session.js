module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    const response = await fetch(
      `${baseUrl}/rest/v1/blueprints?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const data = await response.json();
    const session = (data && data.length > 0) ? data[0] : null;
    res.status(200).json({ session });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
