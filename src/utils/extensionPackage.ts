import firebaseConfig from '../../firebase-applet-config.json';

interface ZipEntryInput {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function buildZipBlob(entries: ZipEntryInput[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const endRecord = new Uint8Array(22);
  const ev = new DataView(endRecord.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const blobParts: BlobPart[] = [
    ...localParts.map((u) => new Uint8Array(u)),
    ...centralParts.map((u) => new Uint8Array(u)),
    new Uint8Array(endRecord),
  ];

  return new Blob(blobParts, { type: 'application/zip' });
}

async function renderPngIcon(size: number): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#D9043D';
    const radius = Math.round(size * 0.22);
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, radius);
    ctx.fill();

    ctx.fillStyle = '#FAF9F7';
    ctx.font = `600 ${Math.round(size * 0.44)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SA', size / 2, size / 2 + size * 0.03);
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  if (!blob) return new Uint8Array();
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

export function getExtensionSourceFiles(appOrigin: string): {
  manifestJson: string;
  popupHtml: string;
  popupCss: string;
  popupJs: string;
} {
  const cleanOrigin = appOrigin.replace(/\/$/, '');

  const manifestJson = JSON.stringify(
    {
      manifest_version: 3,
      name: 'atlassofra — Hızlı Dünya Mutfağı Siparişi',
      version: '1.0.0',
      description:
        'İstanbul, Tokyo, Napoli, Paris, Bangkok ve New York mutfaklarından tek tıkla yemek siparişi verin.',
      action: {
        default_popup: 'popup.html',
        default_title: 'atlassofra',
        default_icon: {
          '48': 'icons/icon48.png',
          '128': 'icons/icon128.png',
        },
      },
      icons: {
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png',
      },
      permissions: ['storage'],
      host_permissions: ['https://firestore.googleapis.com/*'],
    },
    null,
    2
  );

  const popupHtml = `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>atlassofra</title>
    <link rel="stylesheet" href="popup.css" />
  </head>
  <body>
    <header class="header">
      <div class="brand">atlassofra</div>
      <a class="open-app" href="${cleanOrigin}" target="_blank" rel="noopener noreferrer">Siteyi Aç</a>
    </header>

    <section class="controls">
      <select id="city-select" aria-label="Şehir seçin">
        <option value="all">Tüm Dünya Şehirleri</option>
        <option value="istanbul">İstanbul</option>
        <option value="tokyo">Tokyo</option>
        <option value="napoli">Napoli</option>
        <option value="paris">Paris</option>
        <option value="bangkok">Bangkok</option>
        <option value="newyork">New York</option>
      </select>
      <input id="search-input" type="search" placeholder="Yemek veya restoran ara..." />
    </section>

    <main id="dish-list" class="dish-list"></main>

    <footer class="footer">
      <span id="status-text">Canlı menü bağlantısı</span>
      <a id="checkout-link" href="${cleanOrigin}/#restoranlar" target="_blank" rel="noopener noreferrer" class="primary-btn">
        Siparişe Geç
      </a>
    </footer>

    <script src="popup.js"></script>
  </body>
</html>
`;

  const popupCss = `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 380px;
  min-height: 480px;
  max-height: 560px;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #FAF9F7;
  color: #141413;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #E6E4DF;
  background: #FFFFFF;
}
.brand { font-family: Georgia, serif; font-size: 18px; font-weight: 600; }
.open-app { font-size: 12px; color: #D9043D; text-decoration: none; font-weight: 600; }
.controls {
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 8px;
  border-bottom: 1px solid #E6E4DF;
}
select, input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #E6E4DF;
  border-radius: 8px;
  background: #FFFFFF;
  font-size: 12px;
  color: #141413;
}
.dish-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dish-card {
  background: #FFFFFF;
  border: 1px solid #E6E4DF;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.dish-meta { font-size: 11px; color: #575550; margin-bottom: 3px; }
.dish-title { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.dish-price { font-family: ui-monospace, monospace; font-size: 12px; font-weight: 600; color: #D9043D; }
.order-link {
  padding: 7px 11px;
  border-radius: 7px;
  background: #D9043D;
  color: #FFFFFF;
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.footer {
  padding: 12px 16px;
  border-top: 1px solid #E6E4DF;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
#status-text { font-size: 11px; color: #575550; }
.primary-btn {
  padding: 8px 14px;
  border-radius: 8px;
  background: #D9043D;
  color: #FFFFFF;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
}
`;

  const popupJs = `const APP_URL = ${JSON.stringify(cleanOrigin)};
const FIRESTORE_RUN_QUERY = ${JSON.stringify(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`
  )};

const BASE_DISHES = [
  { id: 'ist-kebab', cityId: 'istanbul', cityName: 'İstanbul', restaurantName: 'Ocakbaşı Karaköy', name: 'Fıstıklı Odun Ateşi Zırh Kebap', priceTry: 540, prepMinutes: '25–30 dk' },
  { id: 'tok-ramen', cityId: 'tokyo', cityName: 'Tokyo', restaurantName: 'Menya Kuro Shibuya', name: '18 Saatlik Tonkotsu Ramen', priceTry: 620, prepMinutes: '20–25 dk' },
  { id: 'nap-pizza', cityId: 'napoli', cityName: 'Napoli', restaurantName: 'Forno Vesuvio', name: 'San Marzano Margherita Verace', priceTry: 460, prepMinutes: '22–28 dk' },
  { id: 'par-duck', cityId: 'paris', cityName: 'Paris', restaurantName: 'Bistro Saint-Paul', name: 'Kıtır Ördek Konfi & Sarladaise Patates', priceTry: 780, prepMinutes: '28–35 dk' },
  { id: 'bgk-padthai', cityId: 'bangkok', cityName: 'Bangkok', restaurantName: 'Krua Talay Bangkok', name: 'Demirhindi Soslu Kaplan Karidesli Pad Thai', priceTry: 490, prepMinutes: '18–24 dk' },
  { id: 'nyc-burger', cityId: 'newyork', cityName: 'New York', restaurantName: 'Mercer Smash Co.', name: 'Dry-Aged Double Smash Burger', priceTry: 580, prepMinutes: '22–30 dk' }
];

let allDishes = [...BASE_DISHES];

function render() {
  const city = document.getElementById('city-select').value;
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  const listEl = document.getElementById('dish-list');
  const checkoutLink = document.getElementById('checkout-link');

  checkoutLink.href = city === 'all' ? APP_URL + '/#restoranlar' : APP_URL + '/?sehir=' + encodeURIComponent(city) + '#restoranlar';

  const filtered = allDishes.filter((d) => {
    if (city !== 'all' && d.cityId !== city) return false;
    if (q) {
      const text = (d.name + ' ' + d.restaurantName + ' ' + d.cityName).toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  listEl.innerHTML = '';
  if (filtered.length === 0) {
    listEl.innerHTML = '<p style="font-size:12px;color:#575550;text-align:center;padding:24px 0;">Eşleşen yemek bulunamadı.</p>';
    return;
  }

  for (const dish of filtered) {
    const card = document.createElement('div');
    card.className = 'dish-card';
    card.innerHTML = \`
      <div>
        <div class="dish-meta">\${dish.cityName} · \${dish.restaurantName} · \${dish.prepMinutes}</div>
        <div class="dish-title">\${dish.name}</div>
        <div class="dish-price">\${Math.round(dish.priceTry).toLocaleString('tr-TR')} ₺</div>
      </div>
      <a class="order-link" href="\${APP_URL}/?sehir=\${encodeURIComponent(dish.cityId)}&yemek=\${encodeURIComponent(dish.id)}#restoranlar" target="_blank" rel="noopener noreferrer">Sipariş Ver</a>
    \`;
    listEl.appendChild(card);
  }
}

async function loadLivePartnerDishes() {
  try {
    const res = await fetch(FIRESTORE_RUN_QUERY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'dishes' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'isPublished' },
              op: 'EQUAL',
              value: { booleanValue: true }
            }
          }
        }
      })
    });
    if (!res.ok) return;
    const rows = await res.json();
    const partnerDishes = rows
      .filter((r) => r.document && r.document.fields)
      .map((r) => {
        const f = r.document.fields;
        const docId = r.document.name.split('/').pop();
        return {
          id: docId,
          cityId: f.cityId?.stringValue || 'istanbul',
          cityName: f.cityName?.stringValue || 'İstanbul',
          restaurantName: f.restaurantName?.stringValue || 'Üye Restoran',
          name: f.name?.stringValue || 'Özel Tabak',
          priceTry: Number(f.priceTry?.integerValue || f.priceTry?.doubleValue || 400),
          prepMinutes: f.prepMinutes?.stringValue || '25 dk'
        };
      });
    if (partnerDishes.length > 0) {
      allDishes = [...partnerDishes, ...BASE_DISHES];
      document.getElementById('status-text').textContent = allDishes.length + ' canlı tabak hazır';
      render();
    }
  } catch (err) {
    // Keep base dishes on network error
  }
}

document.getElementById('city-select').addEventListener('change', render);
document.getElementById('search-input').addEventListener('input', render);

render();
loadLivePartnerDishes();
`;

  return { manifestJson, popupHtml, popupCss, popupJs };
}

export async function generateChromeExtensionZip(appOrigin: string): Promise<Blob> {
  const encoder = new TextEncoder();
  const files = getExtensionSourceFiles(appOrigin);
  const [icon48, icon128] = await Promise.all([
    renderPngIcon(48),
    renderPngIcon(128),
  ]);

  return buildZipBlob([
    { name: 'manifest.json', data: encoder.encode(files.manifestJson) },
    { name: 'popup.html', data: encoder.encode(files.popupHtml) },
    { name: 'popup.css', data: encoder.encode(files.popupCss) },
    { name: 'popup.js', data: encoder.encode(files.popupJs) },
    { name: 'icons/icon48.png', data: icon48 },
    { name: 'icons/icon128.png', data: icon128 },
  ]);
}
