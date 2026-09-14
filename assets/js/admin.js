

const PASLON_LABELS = [
  { id: 'A', label: 'Natasya & Galeh', badgeClass: 'rA', fillClass: 'fA', pbClass: 'pbA', color: '#FFAEC9' },
  { id: 'B', label: 'Rona & Nila',     badgeClass: 'rB', fillClass: 'fB', pbClass: 'pbB', color: '#B2F0D8' },
  { id: 'C', label: 'Vizia & Wella',   badgeClass: 'rC', fillClass: 'fC', pbClass: 'pbC', color: '#FFE399' },
];

let adminAllVotes = [];
let paslonPieChartInstance = null;

function adminLogout() {
  sessionStorage.removeItem('marvote_admin_auth');
  location.replace('rahasia-panitia.html');
}

async function loadAdminDashboard() {
  
  ['admin-stat-votes', 'admin-stat-total', 'admin-stat-pct'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i>';
  });

  let votes = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('votes')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      votes = data || [];
    } catch (e) {
      console.warn('Gagal ambil votes dari Supabase, fallback lokal:', e);
      votes = getLocalVotes();
    }
  } else {
    votes = getLocalVotes();
  }
  adminAllVotes = votes;

  let totalSiswa = 0;
  if (supabaseClient) {
    try {
      const { count, error } = await supabaseClient
        .from('students')
        .select('*', { count: 'exact', head: true });
      if (!error) totalSiswa = count || 0;
    } catch (e) {  }
  }

  renderAdminStats(votes, totalSiswa);
  renderResultChart(votes);
  renderPieChart(votes);
  renderAdminVoteTable(votes);
}

function renderAdminStats(votes, totalSiswa) {
  const suaraTotal = votes.length;
  const pct        = totalSiswa ? Math.round((suaraTotal / totalSiswa) * 100) : '—';

  document.getElementById('admin-stat-votes').textContent = suaraTotal;
  document.getElementById('admin-stat-total').textContent = totalSiswa || '—';
  document.getElementById('admin-stat-pct').textContent   = totalSiswa ? `${pct}%` : '—';
}

function renderResultChart(votes) {
  const container = document.getElementById('result-chart');
  if (!container) return;

  const total = votes.length || 1;

  const counts = {};
  PASLON_LABELS.forEach(p => counts[p.id] = 0);
  votes.forEach(v => {
    if (counts[v.candidate_id] !== undefined) {
      counts[v.candidate_id]++;
    }
  });

  container.innerHTML = PASLON_LABELS.map(p => {
    const count = counts[p.id];
    const pct   = votes.length ? Math.round((count / total) * 100) : 0;
    return `
      <div class="result-row">
        <div class="result-label">
          <span class="result-badge ${p.badgeClass}">${p.id}</span>
          ${p.label}
        </div>
        <div class="result-track">
          <div class="result-fill ${p.fillClass}" style="width: 0%" data-pct="${pct}"></div>
        </div>
        <div class="result-count">${count} suara<br><small style="color:var(--grey);font-weight:600;">${pct}%</small></div>
      </div>`;
  }).join('');

  requestAnimationFrame(() => {
    container.querySelectorAll('.result-fill').forEach(el => {
      el.style.width = el.dataset.pct + '%';
    });
  });
}

function renderPieChart(votes) {
  const canvas = document.getElementById('paslonPieChart');
  const legendWrap = document.getElementById('pie-chart-legend');
  const totalBadge = document.getElementById('pie-total-badge');
  const centerNum = document.getElementById('pie-center-num');
  const centerLbl = document.querySelector('.pie-center-lbl');

  if (!canvas) return;

  const total = votes.length;
  if (totalBadge) totalBadge.textContent = `${total} Suara Masuk`;
  if (centerNum) centerNum.textContent = total;
  if (centerLbl) centerLbl.textContent = 'Total Suara';

  const counts = {};
  PASLON_LABELS.forEach(p => counts[p.id] = 0);
  votes.forEach(v => {
    if (counts[v.candidate_id] !== undefined) {
      counts[v.candidate_id]++;
    }
  });

  let maxVotes = 0;
  PASLON_LABELS.forEach(p => {
    if (counts[p.id] > maxVotes) maxVotes = counts[p.id];
  });

  if (legendWrap) {
    legendWrap.innerHTML = PASLON_LABELS.map((p, idx) => {
      const count = counts[p.id];
      const pct = total ? Math.round((count / total) * 100) : 0;
      const isLeading = total > 0 && count === maxVotes && maxVotes > 0;
      return `
        <div class="pie-legend-card" data-idx="${idx}" onclick="highlightPieSlice(${idx})" title="Klik untuk menyorot segmen Paslon ${p.id}">
          <div class="pie-legend-left">
            <div class="pie-legend-badge" style="background:${p.color}">${p.id}</div>
            <div class="pie-legend-info">
              <div class="pie-legend-name">
                ${p.label}
                ${isLeading ? '<span class="pie-winner-tag">👑 Unggul</span>' : ''}
              </div>
              <div class="pie-legend-tag">Paslon ${p.id}</div>
            </div>
          </div>
          <div class="pie-legend-right">
            <div class="pie-legend-pill" style="background:${p.color}">${pct}%</div>
            <div class="pie-legend-votes">${count} suara</div>
          </div>
        </div>`;
    }).join('');
  }

  if (typeof Chart === 'undefined') {
    renderSvgPieFallback(canvas, counts, total);
    return;
  }

  canvas.style.display = 'block';
  const fallbackEl = canvas.parentElement?.querySelector('.pie-svg-fallback');
  if (fallbackEl) fallbackEl.remove();

  if (paslonPieChartInstance) {
    paslonPieChartInstance.destroy();
    paslonPieChartInstance = null;
  }

  const ctx = canvas.getContext('2d');
  const hasVotes = total > 0;
  const chartData = hasVotes
    ? PASLON_LABELS.map(p => counts[p.id])
    : [1, 1, 1];
  const chartColors = hasVotes
    ? PASLON_LABELS.map(p => p.color)
    : ['#EAEAEA', '#EAEAEA', '#EAEAEA'];
  const chartLabels = PASLON_LABELS.map(p => `Paslon ${p.id} (${p.label})`);

  paslonPieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartData,
        backgroundColor: chartColors,
        borderColor: '#1A1A1A',
        borderWidth: 3,
        hoverBorderColor: '#1A1A1A',
        hoverBorderWidth: 3,
        hoverOffset: hasVotes ? 10 : 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: hasVotes,
          backgroundColor: '#1A1A1A',
          titleColor: '#FFF',
          bodyColor: '#FFF',
          titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
          bodyFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
          padding: 10,
          cornerRadius: 8,
          borderColor: '#1A1A1A',
          borderWidth: 2,
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              const pct = total ? Math.round((val / total) * 100) : 0;
              return ` ${val} suara (${pct}%)`;
            }
          }
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true,
        duration: 800
      }
    }
  });
}

function highlightPieSlice(idx) {
  if (!paslonPieChartInstance) return;
  paslonPieChartInstance.setActiveElements([
    { datasetIndex: 0, index: idx }
  ]);
  paslonPieChartInstance.tooltip.setActiveElements([
    { datasetIndex: 0, index: idx }
  ]);
  paslonPieChartInstance.update();
}

function renderSvgPieFallback(canvas, counts, total) {
  const parent = canvas.parentElement;
  if (!parent) return;

  canvas.style.display = 'none';
  let fb = parent.querySelector('.pie-svg-fallback');
  if (!fb) {
    fb = document.createElement('div');
    fb.className = 'pie-svg-fallback';
    parent.appendChild(fb);
  }

  if (total === 0) {
    fb.innerHTML = `
      <svg width="240" height="240" viewBox="0 0 42 42" style="transform:rotate(-90deg);border-radius:50%;">
        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#EAEAEA" stroke-width="6" stroke-dasharray="100 0"></circle>
      </svg>`;
    return;
  }

  let accumulated = 0;
  const slices = PASLON_LABELS.map(p => {
    const pct = (counts[p.id] / total) * 100;
    const strokeDash = `${pct} ${100 - pct}`;
    const strokeOffset = 100 - accumulated;
    accumulated += pct;
    return `<circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="${p.color}" stroke-width="6" stroke-dasharray="${strokeDash}" stroke-dashoffset="${strokeOffset}"></circle>`;
  }).join('');

  fb.innerHTML = `
    <svg width="240" height="240" viewBox="0 0 42 42" style="transform:rotate(-90deg);border-radius:50%;">
      ${slices}
    </svg>`;
}

function renderAdminVoteTable(votes) {
  const tableWrap = document.getElementById('admin-vote-table');
  if (!tableWrap) return;

  const rows = votes.length
    ? votes.map((v, i) => {
        const paslon = PASLON_LABELS.find(p => p.id === v.candidate_id);
        return `
          <tr>
            <td style="color:#888">${i + 1}</td>
            <td><strong>${v.voter_name}</strong></td>
            <td><code style="font-size:11px;">${v.voter_identifier}</code></td>
            <td>
              <span class="pbadge ${paslon?.pbClass || ''}">Paslon ${v.candidate_id}</span>
            </td>
            <td style="font-size:11px;color:#666">${new Date(v.timestamp).toLocaleString('id-ID')}</td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="5" class="empty-state">Belum ada suara masuk.</td></tr>`;

  tableWrap.innerHTML = `
    <table class="vtable">
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Nama Pemilih</th>
          <th>Identitas / Kelas</th>
          <th>Pilihan</th>
          <th>Waktu</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function exportCSV() {
  if (!adminAllVotes.length) {
    alert('Belum ada data untuk diekspor.');
    return;
  }

  const header = ['No', 'Nama Pemilih', 'Identitas', 'Pilihan', 'Waktu'];
  const rows   = adminAllVotes.map((v, i) => [
    i + 1,
    `"${v.voter_name}"`,
    `"${v.voter_identifier}"`,
    `Paslon ${v.candidate_id}`,
    new Date(v.timestamp).toLocaleString('id-ID')
  ]);

  const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `marvote_hasil_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function resetLocalVotesAdmin() {
  if (!confirm('Hapus SEMUA data suara di localStorage browser ini?\n(Data di Supabase tidak terpengaruh)')) return;
  clearLocalVotes();
  alert('Data lokal berhasil dihapus.');
  loadAdminDashboard();
}

function refreshAdmin() {
  loadAdminDashboard();
}

document.addEventListener('DOMContentLoaded', loadAdminDashboard);
