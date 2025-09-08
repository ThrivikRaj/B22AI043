import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
	const [rows, setRows] = useState(() => (
		Array.from({ length: 5 }, () => ({ url: '', validity: '', shortcode: '' }))
	));
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState([]);

	const canSubmit = useMemo(() => rows.some(r => r.url.trim() !== ''), [rows]);

	function updateRow(index, field, value) {
		setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
	}

	async function handleSubmit() {
		if (!canSubmit) {
			setResults([{ index: 0, error: 'Enter at least one URL' }]);
			return;
		}
		const payload = rows
			.filter(r => r.url.trim() !== '')
			.slice(0, 5)
			.map(r => ({
				url: r.url.trim(),
				validity: r.validity === '' ? undefined : Number(r.validity),
				shortcode: r.shortcode.trim() === '' ? undefined : r.shortcode.trim(),
			}));

		setLoading(true);
		setResults([]);
		try {
			const res = await fetch('/shorturls/batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
			setResults(data);
		} catch (e) {
			setResults([{ index: 0, error: e.message || 'Unexpected error' }]);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div style={{ fontFamily: 'Arial, sans-serif', margin: 24, color: '#1f2937' }}>
			<h1 style={{ fontSize: 22, marginBottom: 16 }}>Shorten up to 5 links</h1>
			<div style={{ maxWidth: 840, margin: '0 auto' }}>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 180px', gap: '8px 12px', alignItems: 'center' }}>
					<div style={{ fontWeight: 600, color: '#374151' }}>Original URL</div>
					<div style={{ fontWeight: 600, color: '#374151' }}>Validity (min)</div>
					<div style={{ fontWeight: 600, color: '#374151' }}>Custom shortcode (optional)</div>
					{rows.map((row, idx) => (
						<React.Fragment key={idx}>
							<input type="text" placeholder={`https://example.com/page-${idx + 1}`}
							       value={row.url}
							       onChange={e => updateRow(idx, 'url', e.target.value)}
							       style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }} />
							<input type="number" min="0" placeholder="e.g. 60"
							       value={row.validity}
							       onChange={e => updateRow(idx, 'validity', e.target.value)}
							       style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }} />
							<input type="text" placeholder="optional"
							       value={row.shortcode}
							       onChange={e => updateRow(idx, 'shortcode', e.target.value)}
							       style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }} />
						</React.Fragment>
					))}
				</div>
				<button disabled={!canSubmit || loading}
				        onClick={handleSubmit}
				        style={{ marginTop: 16, padding: '10px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
					{loading ? 'Shortening...' : 'Shorten'}
				</button>
				<div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>Leave Validity empty for no expiry. Shortcode must be 3-30 chars [A-Za-z0-9_-].</div>

				<div style={{ marginTop: 24 }}>
					{results.map((item, i) => {
						const expiryText = item.expiryHuman || item.expiryIso ? ` (expires: ${item.expiryHuman || new Date(item.expiryIso).toLocaleString()})` : '';
						return (
							<div key={i} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 8, background: '#fafafa' }}>
								{item.error ? (
									<div style={{ color: '#b91c1c' }}>Row {item.index + 1}: {item.error}</div>
								) : (
									<div>
										<strong>Row {item.index + 1}:</strong> <a href={item.shortLink} target="_blank" rel="noreferrer">{item.shortLink}</a>{expiryText}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

createRoot(document.getElementById('root')).render(<App />); 