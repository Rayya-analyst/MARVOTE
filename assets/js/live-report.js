

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
  const selectedMajor = major.replace(/^LPS/, 'PS');
  const classMajor    = kelas.split(' ').slice(1).join(' ').replace(/^LPS/, 'PS');
  return classMajor === selectedMajor;
}

function getSortParts(kelas) {
  const parts = kelas.split(' ');
  const major = parts[1] === 'LPS' ? 'PS' : parts[1];
  return {
    majorRank: { APHP: 1, DKV: 2, KULINER: 3, PS: 4, RPL: 5 }[major] || 99,
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

function renderTable(targetId, rows, emptyMessage) {
  const body = rows.length ? rows.map((row, index) => `
    <tr>
      <td style="color:#888">${index + 1}</td>
      <td><strong>${row.name}</strong></td>
      <td><span style="text-transform:uppercase;font-size:10px;font-weight:700;background:#eee;padding:3px 8px;border-radius:4px;">${row.role}</span></td>
      <td><code>${row.identifier}</code></td>
      <td style="font-size:11px;color:#666">${row.time}</td>
    </tr>
  `).join('') : `<tr><td colspan="5" class="empty-state">${emptyMessage}</td></tr>`;

  document.getElementById(targetId).innerHTML = `
    <table class="vtable">
      <thead>
        <tr>
          <th style="width:40px;">#</th>
          <th>Nama</th>
          <th>Peran</th>
          <th>Pengenal / Kelas</th>
          <th>Waktu Voting</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

async function renderReport() {
  const major       = document.getElementById('filter-major')?.value || '';
  const votes       = await getVotes();
  const allStudents = Object.entries(students).flatMap(([kelas, list]) =>
    list.map(student => ({ ...student, kelas }))
  );

  const eligibleStudents       = allStudents.filter(student => matchesMajor(student.kelas, major));
  const filteredVotes          = votes.filter(v => matchesMajor(getClass(v.voter_identifier), major));
  const votedIdentifiers       = new Set(votes.map(v => v.voter_identifier));
  const filteredVotedIdentifiers = new Set(filteredVotes.map(v => v.voter_identifier));

  const totalStudents  = allStudents.length;
  const totalVotes     = votes.length;
  const selectedStudents = major ? eligibleStudents.length : totalStudents;
  const selectedVotes    = major ? filteredVotedIdentifiers.size : votedIdentifiers.size;
  const participation    = selectedStudents ? Math.round((selectedVotes / selectedStudents) * 100) : 0;

  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi-card"><div class="kpi-num">${selectedVotes}</div><div class="kpi-lbl">Suara Masuk</div></div>
    <div class="kpi-card"><div class="kpi-num">${selectedStudents - selectedVotes}</div><div class="kpi-lbl">Belum Memilih</div></div>
    <div class="kpi-card"><div class="kpi-num">${participation}%</div><div class="kpi-lbl">Tingkat Partisipasi</div></div>
  `;

  const votedRows = filteredVotes.map(v => ({
    name:       v.voter_name,
    role:       v.voter_role,
    identifier: v.voter_identifier,
    time:       new Date(v.timestamp).toLocaleString('id-ID')
  })).sort(compareStudents);
  renderTable('voted-table', votedRows, 'Belum ada data pemilih yang cocok dengan filter.');

  const unvoted = eligibleStudents
    .filter(student => !votedIdentifiers.has(`${student.kelas} | Absen ${student.absen}`))
    .map(student => ({
      name:       student.nama,
      role:       'siswa',
      identifier: `${student.kelas} | Absen ${student.absen}`,
      time:       '-'
    })).sort(compareStudents);
  renderTable('unvoted-table', unvoted, 'Semua siswa pada filter ini sudah memilih.');
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
  await loadStudents();
  await renderReport();
  subscribeRealtime();
}

document.addEventListener('DOMContentLoaded', initLiveReport);
