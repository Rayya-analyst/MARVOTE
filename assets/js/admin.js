


const PASLON_LABELS = [
  { id: '01', label: 'Natasya & Galeh', badgeClass: 'rA', fillClass: 'fA', pbClass: 'pbA', color: '#FFAEC9' },
  { id: '02', label: 'Rona & Nila',     badgeClass: 'rB', fillClass: 'fB', pbClass: 'pbB', color: '#B2F0D8' },
  { id: '03', label: 'Vizia & Wella',   badgeClass: 'rC', fillClass: 'fC', pbClass: 'pbC', color: '#FFE399' },
];

let adminAllVotes = [];
let paslonPieChartInstance = null;
let realtimeChannel = null;
let broadcastChannel = null;
let pollingTimer = null;
let lastVotesHash = "";
let isFetching = false;
let isRealtimeSubscribed = false;

function adminLogout() {
  if (pollingTimer) clearInterval(pollingTimer);
  if (realtimeChannel && supabaseClient) supabaseClient.removeChannel(realtimeChannel);
  if (broadcastChannel) broadcastChannel.close();
  sessionStorage.removeItem('marvote_admin_auth');
  location.replace('rahasia-panitia.html');
}

async function loadAdminDashboard(isSilent = false) {
  if (isFetching) return;
  isFetching = true;

  if (!isSilent) {
    ['admin-stat-votes', 'admin-stat-total', 'admin-stat-pct'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i>';
    });
  }

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

  let totalSiswa = 0;
  if (supabaseClient) {
    try {
      const { count, error } = await supabaseClient
        .from('students')
        .select('*', { count: 'exact', head: true });
      if (!error) totalSiswa = count || 0;
    } catch (e) { }
  }

  const newHash = votes.map(v => `${v.id || ''}_${v.voter_identifier}_${v.candidate_id}_${v.timestamp}`).join('|');
  const hasChanged = newHash !== lastVotesHash;

  if (hasChanged || !isSilent) {
    lastVotesHash = newHash;
    adminAllVotes = votes;

    renderAdminStats(votes, totalSiswa);
    renderResultChart(votes);
    renderPieChart(votes);
    renderAdminVoteTable(votes);
  }

  isFetching = false;
}

function renderAdminStats(votes, totalSiswa) {
  const suaraTotal = votes.length;
  const pct        = totalSiswa ? Math.round((suaraTotal / totalSiswa) * 100) : '—';

  const votesEl = document.getElementById('admin-stat-votes');
  const totalEl = document.getElementById('admin-stat-total');
  const pctEl   = document.getElementById('admin-stat-pct');

  if (votesEl) {
    if (votesEl.textContent !== String(suaraTotal) && votesEl.textContent !== '—') {
      votesEl.classList.remove('highlight-update');
      void votesEl.offsetWidth;
      votesEl.classList.add('highlight-update');
    }
    votesEl.textContent = suaraTotal;
  }
  if (totalEl) totalEl.textContent = totalSiswa || '—';
  if (pctEl) pctEl.textContent   = totalSiswa ? `${pct}%` : '—';
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

  const existingRows = container.querySelectorAll('.result-row');
  if (existingRows.length === PASLON_LABELS.length) {
    PASLON_LABELS.forEach((p, i) => {
      const count = counts[p.id];
      const pct   = votes.length ? Math.round((count / total) * 100) : 0;
      const row   = existingRows[i];
      const fill  = row.querySelector('.result-fill');
      const countEl = row.querySelector('.result-count');
      if (fill) fill.style.width = pct + '%';
      if (countEl) countEl.innerHTML = `${count} suara<br><small style="color:var(--grey);font-weight:600;">${pct}%</small>`;
    });
    return;
  }

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

  const hasVotes = total > 0;
  const chartData = hasVotes
    ? PASLON_LABELS.map(p => counts[p.id])
    : [1, 1, 1];
  const chartColors = hasVotes
    ? PASLON_LABELS.map(p => p.color)
    : ['#EAEAEA', '#EAEAEA', '#EAEAEA'];
  const chartLabels = PASLON_LABELS.map(p => `Paslon ${p.id} (${p.label})`);

  if (paslonPieChartInstance) {
    paslonPieChartInstance.data.labels = chartLabels;
    paslonPieChartInstance.data.datasets[0].data = chartData;
    paslonPieChartInstance.data.datasets[0].backgroundColor = chartColors;
    paslonPieChartInstance.data.datasets[0].hoverOffset = hasVotes ? 10 : 0;
    paslonPieChartInstance.options.plugins.tooltip.enabled = hasVotes;
    paslonPieChartInstance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
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
        const safeName = (v.voter_name || '').replace(/'/g, "\\'");
        const voteIdArg = v.id !== undefined && v.id !== null ? v.id : `'${v.voter_identifier || ''}'`;
        return `
          <tr>
            <td style="color:#888">${i + 1}</td>
            <td><strong>${v.voter_name}</strong></td>
            <td><code style="font-size:11px;">${v.voter_identifier}</code></td>
            <td>
              <span class="pbadge ${paslon?.pbClass || ''}">Paslon ${v.candidate_id}</span>
            </td>
            <td style="font-size:11px;color:#666">${new Date(v.timestamp).toLocaleString('id-ID')}</td>
            <td style="text-align:center;width:60px;">
              <button class="btn-del-row" onclick="deleteSingleVote(${voteIdArg}, '${safeName}')" title="Hapus suara ini">
                <i class="ti ti-trash"></i>
              </button>
            </td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="6" class="empty-state">Belum ada suara masuk.</td></tr>`;

  tableWrap.innerHTML = `
    <table class="vtable">
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Nama Pemilih</th>
          <th>Identitas / Kelas</th>
          <th>Pilihan</th>
          <th>Waktu</th>
          <th style="width:60px;text-align:center">Aksi</th>
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

async function resetAllVotesAdmin() {
  const voteCount = adminAllVotes.length;
  const confirmMsg = `PERINGATAN!\n\nApakah Anda yakin ingin menghapus SEMUA data suara (${voteCount} suara) dari sistem?\n\nTindakan ini akan menghapus data di database Supabase dan penyimpanan lokal browser. Data yang dihapus TIDAK BISA dipulihkan kembali!`;
  
  if (!confirm(confirmMsg)) return;

  const btn = document.getElementById('btn-delete-all-votes');
  let originalHtml = '';
  if (btn) {
    originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Menghapus...';
  }

  let errorOccurred = false;
  let errorMsg = '';

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('votes')
        .delete()
        .neq('id', 0);

      if (error) {
        const { error: err2 } = await supabaseClient
          .from('votes')
          .delete()
          .gte('id', 0);
        if (err2) throw err2;
      }
    } catch (e) {
      console.error('Gagal hapus data dari Supabase:', e);
      errorOccurred = true;
      errorMsg = e.message || String(e);
    }
  }

  clearLocalVotes();

  try {
    localStorage.setItem('marvote_last_vote_timestamp', String(Date.now()));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('marvote_events');
      bc.postMessage({ type: 'VOTES_DELETED', timestamp: Date.now() });
      bc.close();
    }
  } catch (e) {}

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }

  if (errorOccurred) {
    alert(`Peringatan: Gagal menghapus sebagian data dari cloud (${errorMsg}). Data lokal telah dibersihkan.`);
  } else {
    alert('Semua data voting berhasil dihapus dari database dan sistem.');
  }

  lastVotesHash = "";
  await loadAdminDashboard(false);
}

async function deleteSingleVote(voteId, voterName) {
  if (!confirm(`Hapus data suara dari "${voterName}"?`)) return;

  if (supabaseClient && voteId && typeof voteId === 'number') {
    try {
      const { error } = await supabaseClient
        .from('votes')
        .delete()
        .eq('id', voteId);
      if (error) throw error;
    } catch (e) {
      console.error('Gagal menghapus suara dari database:', e);
      alert('Gagal menghapus data dari database: ' + (e.message || e));
      return;
    }
  } else if (supabaseClient && typeof voteId === 'string') {
    try {
      const { error } = await supabaseClient
        .from('votes')
        .delete()
        .eq('voter_identifier', voteId);
      if (error) throw error;
    } catch (e) {
      console.error('Gagal menghapus suara dari database:', e);
    }
  }

  let local = getLocalVotes();
  local = local.filter(v => (typeof voteId === 'number' ? v.id !== voteId : v.voter_identifier !== voteId));
  saveLocalVotes(local);

  try {
    localStorage.setItem('marvote_last_vote_timestamp', String(Date.now()));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('marvote_events');
      bc.postMessage({ type: 'VOTES_DELETED', timestamp: Date.now() });
      bc.close();
    }
  } catch (e) {}

  lastVotesHash = "";
  loadAdminDashboard(true);
}

function refreshAdmin() {
  lastVotesHash = "";
  loadAdminDashboard(false);
}

function setupRealtimeSync() {
  if (isRealtimeSubscribed) return;
  isRealtimeSubscribed = true;

  // 1. Supabase Realtime channel
  if (supabaseClient) {
    try {
      realtimeChannel = supabaseClient
        .channel('admin-dashboard-votes-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, (payload) => {
          console.log('[Admin Realtime] Perubahan terdeteksi:', payload);
          loadAdminDashboard(true);
        })
        .subscribe((status) => {
          console.log('[Admin Realtime] Status channel:', status);
          updateLiveBadge(status === 'SUBSCRIBED');
        });
    } catch (e) {
      console.warn('Supabase realtime error:', e);
    }
  }

  // 2. BroadcastChannel API (instan antar-tab di browser yang sama)
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel('marvote_events');
      broadcastChannel.onmessage = (event) => {
        console.log('[BroadcastChannel] Event diterima:', event.data);
        if (event.data?.type === 'VOTE_SUBMITTED' || event.data?.type === 'VOTES_DELETED') {
          loadAdminDashboard(true);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }

  // 3. Storage event listener (fallback tab sinkronisasi)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === 'marvote_last_vote_timestamp') {
      console.log('[Storage Event] Update terdeteksi:', e.key);
      loadAdminDashboard(true);
    }
  });

  // 4. Smart Polling fallback (setiap 3 detik)
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(() => {
    loadAdminDashboard(true);
  }, 3000);
}

function updateLiveBadge(isLive) {
  const badge = document.getElementById('admin-live-badge');
  if (!badge) return;
  if (isLive) {
    badge.title = 'Terhubung ke server secara real-time';
  } else {
    badge.title = 'Pembaruan otomatis aktif (mode sinkronisasi berkala)';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadAdminDashboard(false);
  setupRealtimeSync();
});
