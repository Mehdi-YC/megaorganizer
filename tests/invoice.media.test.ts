import { describe, it, expect, beforeEach } from 'bun:test';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { saveUserMediaFile, getUserMediaFilePath } from '$lib/server/services/invoice.service';

/** Same layout the service uses: <UPLOAD_DIR>/<userId>/invoicing. */
function getInvoicingDirForTests(userId: string) {
	return path.join(path.resolve(process.env.UPLOAD_DIR!), userId, 'invoicing');
}

const USER = 'test-user-media';

// A 1x1 PNG: the smallest real file that passes the magic-byte check.
const PNG_BYTES = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64'
);

function fileFrom(bytes: Buffer, name: string, type: string) {
	return new File([new Uint8Array(bytes)], name, { type });
}

describe('signature and stamp uploads', () => {
	beforeEach(async () => {
		await db.delete(user).run();
		await db
			.insert(user)
			.values({ id: USER, name: 'Media User', email: 'media@example.com', emailVerified: true })
			.run();
	});

	it('stores a PNG under a deterministic name', async () => {
		const result = await saveUserMediaFile(
			USER,
			'signature',
			fileFrom(PNG_BYTES, 'sig.png', 'image/png')
		);

		expect(result.storedName).toBe('signature.png');
		const saved = await getUserMediaFilePath(USER, 'signature');
		expect(saved).toBe(path.join(getInvoicingDirForTests(USER), 'signature.png'));
		expect(readFileSync(saved!).equals(PNG_BYTES)).toBe(true);
	});

	it('replaces the previous upload instead of accumulating files', async () => {
		await saveUserMediaFile(USER, 'stamp', fileFrom(PNG_BYTES, 'one.png', 'image/png'));
		await saveUserMediaFile(USER, 'stamp', fileFrom(PNG_BYTES, 'two.png', 'image/png'));

		const files = readdirSync(getInvoicingDirForTests(USER)).filter((f) => f.startsWith('stamp'));
		expect(files).toEqual(['stamp.png']);
	});

	it('rejects an SVG even when it claims to be an image', async () => {
		const svg = Buffer.from(
			'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
		);
		await expect(
			saveUserMediaFile(USER, 'stamp', fileFrom(svg, 'stamp.svg', 'image/svg+xml'))
		).rejects.toThrow('must be a PNG, JPEG, or WebP');
	});

	it('rejects bytes that do not match any allowed image format', async () => {
		await expect(
			saveUserMediaFile(
				USER,
				'signature',
				fileFrom(Buffer.from('<html>hi</html>'), 'x.png', 'image/png')
			)
		).rejects.toThrow('must be a PNG, JPEG, or WebP');
	});

	it('rejects files over 2MB', async () => {
		const oversized = Buffer.concat([PNG_BYTES, Buffer.alloc(2 * 1024 * 1024)]);
		await expect(
			saveUserMediaFile(USER, 'signature', fileFrom(oversized, 'big.png', 'image/png'))
		).rejects.toThrow('smaller than 2MB');
	});

	it('keeps a legacy upload readable when a new one is not saved', async () => {
		const dir = getInvoicingDirForTests(USER);
		mkdirSync(dir, { recursive: true });
		writeFileSync(path.join(dir, 'signature_legacy.png'), PNG_BYTES);

		expect(await getUserMediaFilePath(USER, 'signature')).toBe(
			path.join(dir, 'signature_legacy.png')
		);
	});
});
