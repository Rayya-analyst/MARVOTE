

let students       = {};
let realtimeChannel = null;

function getClass(identifier) {
  return (identifier || '').split('|')[0].trim();
}

function isClassXII(kelas) {
  return kelas.startsWith('XII ');
}

function matchesMajor(kelas, major) {
  if (!major) return true;
  const selectedMajor = major.replace(/^LPS/, 'PS').trim().toUpperCase();
  const classMajor    = (kelas || '').split(' ').slice(1).join(' ').replace(/^LPS/, 'PS').trim().toUpperCase();
  return classMajor === selectedMajor;
}

function getSortParts(kelas) {
  const parts = (kelas || '').split(' ');
  const rawMajor = (parts[1] || '').replace(/^LPS/, 'PS').toUpperCase();
  return {
    majorRank: { APHP: 1, DKV: 2, KULINER: 3, PS: 4, RPL: 5 }[rawMajor] || 99,
    rombel:    Number.parseInt(parts[2], 10) || 0
  };
}

function getAttendance(identifier) {
  const match = (identifier || '').match(/Absen\s+(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function compareStudents(first, second) {
  const firstClass  = getClass(first.identifier  || first.kelas);
  const secondClass = getClass(second.identifier || second.kelas);
  const firstParts  = getSortParts(firstClass);
  const secondParts = getSortParts(secondClass);

  if (firstParts.majorRank !== secondParts.majorRank) {
    return firstParts.majorRank - secondParts.majorRank;
  }
  if (firstParts.rombel !== secondParts.rombel) {
    return firstParts.rombel - secondParts.rombel;
  }
  return getAttendance(first.identifier) - getAttendance(second.identifier);
}

async function loadStudents() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from('students')
      .select('kelas, absen, nama')
      .like('kelas', 'XII %');
    if (error) throw error;

    students = {};
    (data || []).forEach(student => {
      if (!students[student.kelas]) students[student.kelas] = [];
      students[student.kelas].push(student);
    });
  } catch (error) {
    console.error('Master siswa gagal dimuat:', error);
  }
}

async function getVotes() {
  if (!supabaseClient) {
    return getLocalVotes().filter(v => isClassXII(getClass(v.voter_identifier)));
  }

  try {
    const { data, error } = await supabaseClient
      .from('votes')
      .select('voter_name, voter_role, voter_identifier, timestamp')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []).filter(v => isClassXII(getClass(v.voter_identifier)));
  } catch (error) {
    console.warn('Data live gagal dimuat, memakai data lokal:', error);
    return getLocalVotes().filter(v => isClassXII(getClass(v.voter_identifier)));
  }
}

let currentViewMode = localStorage.getItem('marvote_report_view') || 'table';
let lastReportData  = null;

function setViewMode(mode) {
  currentViewMode = mode;
  try {
    localStorage.setItem('marvote_report_view', mode);
  } catch (e) {}

  const btnTable = document.getElementById('btn-view-table');
  const btnCards = document.getElementById('btn-view-cards');
  if (btnTable && btnCards) {
    btnTable.classList.toggle('active', mode === 'table');
    btnCards.classList.toggle('active', mode === 'cards');
  }

  if (lastReportData) {
    renderReportData(lastReportData);
  } else {
    renderReport();
  }
}

function formatVoteTime(ts) {
  if (!ts || ts === '-') return '-';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return ts;
  }
}

function renderReportContent(targetId, rows, emptyMessage) {
  const container = document.getElementById(targetId);
  if (!container) return;

  if (!rows || !rows.length) {
    container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }

  if (currentViewMode === 'cards') {
    const cardsHtml = rows.map((row, index) => `
      <div class="report-card-item">
        <div class="report-card-header">
          <div class="report-card-meta">
            <span class="report-card-num">#${index + 1}</span>
            <span class="role-badge">${row.role}</span>
          </div>
          <span class="report-card-time"><i class="ti ti-clock" aria-hidden="true"></i> ${row.time}</span>
        </div>
        <div class="report-card-name">${row.name}</div>
        <div class="report-card-ident"><i class="ti ti-id-badge-2" aria-hidden="true"></i> ${row.identifier}</div>
      </div>
    `).join('');

    container.innerHTML = `<div class="report-cards-grid">${cardsHtml}</div>`;
  } else {
    const rowsHtml = rows.map((row, index) => `
      <tr>
        <td class="col-num">${index + 1}</td>
        <td class="col-name"><strong>${row.name}</strong></td>
        <td class="col-role"><span class="role-badge">${row.role}</span></td>
        <td class="col-ident"><span class="ident-code">${row.identifier}</span></td>
        <td class="col-time">${row.time !== '-' ? `<i class="ti ti-clock" style="margin-right:4px;" aria-hidden="true"></i>` : ''}${row.time}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="table-scroll-hint">
        <i class="ti ti-arrows-left-right" aria-hidden="true"></i> Geser tabel ke samping untuk info lengkap
      </div>
      <table class="vtable">
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th class="col-name">Nama</th>
            <th class="col-role">Peran</th>
            <th class="col-ident">Pengenal / Kelas</th>
            <th class="col-time">Waktu Voting</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
  }
}

function renderReportData(data) {
  const { votedRows, unvotedRows } = data;
  renderReportContent('voted-table', votedRows, 'Belum ada data pemilih yang cocok dengan filter.');
  renderReportContent('unvoted-table', unvotedRows, 'Semua siswa pada filter ini sudah memilih.');
}

async function renderReport() {
  const major       = document.getElementById('filter-major')?.value || '';
  const votes       = await getVotes();
  const allStudents = Object.entries(students).flatMap(([kelas, list]) =>
    list.map(student => ({ ...student, kelas }))
  );

  const eligibleStudents       = allStudents.filter(student => matchesMajor(student.kelas, major));
  const filteredVotes          = votes.filter(v => matchesMajor(getClass(v.voter_identifier), major));
  const votedIdentifiers       = new Set(votes.map(v => (v.voter_identifier || '').toUpperCase()));
  const filteredVotedIdentifiers = new Set(filteredVotes.map(v => (v.voter_identifier || '').toUpperCase()));

  const totalStudents  = allStudents.length;
  const totalVotes     = votes.length;
  const selectedStudents = major ? eligibleStudents.length : totalStudents;
  const selectedVotes    = major ? filteredVotedIdentifiers.size : votedIdentifiers.size;
  const participation    = selectedStudents ? Math.round((selectedVotes / selectedStudents) * 100) : 0;

  const kpiGrid = document.getElementById('kpi-grid');
  if (kpiGrid) {
    kpiGrid.innerHTML = `
      <div class="kpi-card"><div class="kpi-num">${selectedVotes}</div><div class="kpi-lbl">Suara Masuk</div></div>
      <div class="kpi-card"><div class="kpi-num">${selectedStudents - selectedVotes}</div><div class="kpi-lbl">Belum Memilih</div></div>
      <div class="kpi-card"><div class="kpi-num">${participation}%</div><div class="kpi-lbl">Tingkat Partisipasi</div></div>
    `;
  }

  const votedRows = filteredVotes.map(v => ({
    name:       v.voter_name,
    role:       v.voter_role,
    identifier: v.voter_identifier,
    time:       formatVoteTime(v.timestamp)
  })).sort(compareStudents);

  const unvotedRows = eligibleStudents
    .filter(student => !votedIdentifiers.has(`${student.kelas} | Absen ${student.absen}`.toUpperCase()))
    .map(student => ({
      name:       student.nama,
      role:       'siswa',
      identifier: `${student.kelas} | Absen ${student.absen}`,
      time:       '-'
    })).sort(compareStudents);

  lastReportData = { votedRows, unvotedRows };
  renderReportData(lastReportData);
}

function switchTab(button, id) {
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  button.classList.add('active');
  document.getElementById(id)?.classList.add('active');
}

function subscribeRealtime() {
  if (!supabaseClient) return;
  realtimeChannel = supabaseClient
    .channel('live-report-partisipasi-kelas-xii')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => renderReport())
    .subscribe();
}

async function initLiveReport() {
  const btnTable = document.getElementById('btn-view-table');
  const btnCards = document.getElementById('btn-view-cards');
  if (btnTable && btnCards) {
    btnTable.classList.toggle('active', currentViewMode === 'table');
    btnCards.classList.toggle('active', currentViewMode === 'cards');
  }

  await loadStudents();
  await renderReport();
  subscribeRealtime();
}

document.addEventListener('DOMContentLoaded', initLiveReport);

