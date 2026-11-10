const fs = require('fs');
const path = require('path');

const RAW_DIR = path.resolve(__dirname, '..', 'raw', 'landlord');
const OUT_DIR = __dirname;

function toFileUrl(p) {
  let url = p.replace(/\\/g, '/');
  url = url.split('/').map((seg, i) => (i === 0 ? seg : encodeURIComponent(seg))).join('/');
  return 'file:///' + url;
}

const screens = [
  {
    out: '01-home.html',
    file: 'Screenshot 2026-11-04 135106.png',
    headline: 'Manage your rental portfolio',
    sub: 'Applications, leases, maintenance and payments — all in one place',
    from: '#2563EB', to: '#0a1f45', bar: '#eef2f9',
  },
  {
    out: '02-list-property.html',
    file: 'Screenshot 2026-11-04 135123.png',
    headline: 'List a property in minutes',
    sub: 'A simple step-by-step wizard, from details to going live',
    from: '#8b5cf6', to: '#4c1d95', bar: '#fbfbfe',
  },
  {
    out: '03-payments.html',
    file: 'Screenshot 2026-11-04 135325.png',
    headline: 'Get paid, every time',
    sub: 'Collect rent, send invoices and track every payment',
    from: '#10b981', to: '#065f46', bar: '#0e2a52',
  },
  {
    out: '04-applications.html',
    file: 'Screenshot 2026-11-04 175032.png',
    headline: 'Review applications with confidence',
    sub: 'Check documents, compare affordability and respond fast',
    from: '#f59e0b', to: '#9a3412', bar: '#0e2a52',
  },
  {
    out: '05-maintenance.html',
    file: 'Screenshot 2026-11-04 175045.png',
    headline: 'Stay on top of maintenance',
    sub: 'Track every repair request from report to resolved',
    from: '#22c55e', to: '#14532d', bar: '#0e2a52',
  },
  {
    out: '06-leases.html',
    file: 'Screenshot 2026-11-04 175115.png',
    headline: 'Sign leases digitally',
    sub: 'Create, send and e-sign contracts, no paperwork',
    from: '#6366f1', to: '#1e1b4b', bar: '#0e2a52',
  },
  {
    out: '07-inspections.html',
    file: 'Screenshot 2026-11-04 175129.png',
    headline: 'Document every inspection',
    sub: 'Photos, notes and sign-off for every move-in and move-out',
    from: '#f43f5e', to: '#7f1d1d', bar: '#0e2a52',
  },
  {
    out: '08-inventory.html',
    file: 'Screenshot 2026-11-04 175015.png',
    headline: 'Keep track of every item',
    sub: 'A clear record of furniture and appliances at each property',
    from: '#14b8a6', to: '#134e4a', bar: '#0e2a52',
  },
];

const template = (s) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 1290px; height: 2796px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: radial-gradient(120% 90% at 50% -10%, ${s.from} 0%, ${s.to} 65%);
    overflow: hidden;
  }
  body {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .header {
    height: 660px;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 0 110px;
    text-align: center;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 36px;
  }
  .brand .mark {
    width: 56px; height: 56px; border-radius: 16px;
    background: rgba(255,255,255,0.18);
    display: flex; align-items: center; justify-content: center;
  }
  .brand .mark svg { width: 30px; height: 30px; }
  .brand .name {
    color: #fff; font-weight: 800; font-size: 34px; letter-spacing: -0.5px;
  }
  .headline {
    color: #fff;
    font-weight: 800;
    font-size: 92px;
    line-height: 1.08;
    letter-spacing: -2px;
    text-shadow: 0 2px 24px rgba(0,0,0,0.18);
  }
  .sub {
    color: rgba(255,255,255,0.88);
    font-weight: 500;
    font-size: 40px;
    line-height: 1.3;
    margin-top: 30px;
    max-width: 980px;
  }
  .phone-wrap {
    position: relative;
    margin-top: 50px;
  }
  .phone {
    position: relative;
    width: 947px;
    padding: 17px;
    border-radius: 86px;
    background: linear-gradient(150deg, #3a3a3d 0%, #19191b 35%, #050505 75%, #141416 100%);
    box-shadow:
      0 70px 140px rgba(0,0,0,0.45),
      0 24px 48px rgba(0,0,0,0.35);
  }
  .phone::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 86px;
    padding: 3px;
    background: linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.04) 28%, rgba(255,255,255,0) 55%, rgba(255,255,255,0.22) 100%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
  .btn {
    position: absolute;
    background: linear-gradient(90deg, #060606, #2a2a2c 45%, #060606);
  }
  .btn.action { left: -7px; top: 290px; width: 7px; height: 56px; border-radius: 4px 0 0 4px; }
  .btn.vol-up { left: -7px; top: 410px; width: 7px; height: 108px; border-radius: 4px 0 0 4px; }
  .btn.vol-down { left: -7px; top: 538px; width: 7px; height: 108px; border-radius: 4px 0 0 4px; }
  .btn.power { right: -7px; top: 420px; width: 7px; height: 160px; border-radius: 0 4px 4px 0; }
  .screen {
    position: relative;
    width: 913px;
    height: 1980px;
    border-radius: 70px;
    overflow: hidden;
    background: #f6f8fc;
    box-shadow: inset 0 0 0 2px rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
  }
  .statusbar {
    position: relative;
    flex: 0 0 auto;
    height: 78px;
    background: ${s.bar};
  }
  .island {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 210px;
    height: 48px;
    background: #000;
    border-radius: 26px;
    z-index: 5;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
  }
  .shot {
    flex: 1 1 auto;
    position: relative;
    overflow: hidden;
  }
  .shot img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    image-rendering: -webkit-optimize-contrast;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <span class="mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/></svg>
      </span>
      <span class="name">MzanziHomes</span>
    </div>
    <div class="headline">${s.headline}</div>
    <div class="sub">${s.sub}</div>
  </div>
  <div class="phone-wrap">
    <div class="phone">
      <div class="btn action"></div>
      <div class="btn vol-up"></div>
      <div class="btn vol-down"></div>
      <div class="btn power"></div>
      <div class="screen">
        <div class="statusbar"><div class="island"></div></div>
        <div class="shot"><img src="${toFileUrl(path.join(RAW_DIR, s.file))}" /></div>
      </div>
    </div>
  </div>
</body>
</html>
`;

for (const s of screens) {
  fs.writeFileSync(path.join(OUT_DIR, s.out), template(s), 'utf8');
  console.log('wrote', s.out);
}
