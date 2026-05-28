const DB_PROVIDER = 'supabase'; 
const SUPABASE_URL = "https://lqjlzlzbpbbtrdnzbguv.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxamx6bHpicGJidHJkbnpiZ3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NzM3MDIsImV4cCI6MjA5NTQ0OTcwMn0.p82nSPh760G43sfNLPQHDsxP0F-F4lXIvWGUWAzNNa4";

let supabaseClient = null;

try {
  if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client initialized successfully.");
  } else {
    console.warn("Supabase library not loaded or credentials missing. Running in Mock fallback mode.");
  }
} catch (e) {
  console.error("Error initializing Supabase client:", e);
}

let SISWA = {};
let TEACHERS = [];
let CANDIDATES = [];

const ADMIN_PASS = "osismarganaduvanesto";
const STORAGE_KEY = "osis_smkn2mjk_votes_v4";
let selectedCandidateId = null;
let voterRole = 'siswa'; 
let currentVoter = null; 
let realtimeChannel = null;

function getLocalVotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveLocalVotes(votes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
}
function clearLocalVotes() {
  localStorage.removeItem(STORAGE_KEY);
}

async function initApp() {
  const txt = "PEMILIHAN KETUA OSIS · SMKN 2 MOJOKERTO · SUARAMU MENENTUKAN · ";
  const mq = document.getElementById('mq');
  if (mq) {
    mq.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('span');
      s.className = 'marquee-item';
      s.innerHTML = txt.replace(/·/g, '<span class="mdot">·</span>');
      mq.appendChild(s);
    }
  }

  if (supabaseClient) {
    try {
      console.log("Memuat data master dari Supabase...");

      const { data: guruData, error: guruError } = await supabaseClient
        .from('teachers')
        .select('*')
        .order('nama', { ascending: true });
      
      if (guruError) throw guruError;
      TEACHERS = guruData || [];

      const { data: siswaData, error: siswaError } = await supabaseClient
        .from('students')
        .select('*');
      
      if (siswaError) throw siswaError;

      SISWA = {}; 
      if (siswaData) {
        siswaData.forEach(item => {
          if (!SISWA[item.kelas]) {
            SISWA[item.kelas] = [];
          }
          
          const isDuplicate = SISWA[item.kelas].some(s => s.absen === item.absen);
          if (!isDuplicate) {
            SISWA[item.kelas].push({
              absen: item.absen,
              nama: item.nama
            });
          }
        });
      }

      const { data: candidatesData, error: candidatesError } = await supabaseClient
        .from('candidates')
        .select('*')
        .order('id', { ascending: true });
      
      if (candidatesError) throw candidatesError;
      if (candidatesData && candidatesData.length > 0) {
        CANDIDATES = candidatesData;
        console.log("Data kandidat berhasil dimuat dari Supabase.");
      }

      console.log("Data master siswa, guru, dan kandidat berhasil disinkronkan dari cloud.");

    } catch (error) {
      console.error("Gagal memuat data dari Supabase, mengaktifkan mode aman lokal:", error);
    }
  }

  const selKelas = document.getElementById('sel-kelas');
  if (selKelas) {
    selKelas.innerHTML = '<option value="">— Pilih kelas kamu —</option>';
    Object.keys(SISWA).sort().forEach(k => {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = k;
      selKelas.appendChild(o);
    });
  }

  if (typeof renderCandidates === 'function') {
    renderCandidates();
  }
}

document.addEventListener('DOMContentLoaded', initApp);

function renderCandidates() {
  const container = document.getElementById('cand-list');
  if (!container) return;
  
  container.innerHTML = CANDIDATES.map(c => `
    <div class="cand-card" id="card-${c.id}" onclick="selectCandidate('${c.id}')">
      <div class="cand-img-wrap">
        <img src="${c.photo}" alt="Kandidat ${c.id}" onerror="this.src='https://placehold.co/140x160?text=Kandidat+${c.id}'">
      </div>
      <div class="cand-body">
        <div class="cand-num-badge ${c.num}">${c.id}</div>
        <div class="cname">${c.name}</div>
        <div class="cvisi-title">Visi:</div>
        <div class="cvisi">${c.visi}</div>
        <div class="cmisi-title">Misi:</div>
        <ol class="cmisi" style="list-style-position: inside;">
          ${c.misi.split('<br>').map(m => `<li>${m.replace(/^\d+\.\s*/, '')}</li>`).join('')}
        </ol>
      </div>
      <div class="radio-box-container">
        <div class="radio-box"></div>
      </div>
    </div>`).join('');
}

function selectCandidate(id) {
  selectedCandidateId = id;
  document.querySelectorAll('.cand-card').forEach(el => el.classList.remove('selected'));
  const card = document.getElementById('card-' + id);
  if (card) card.classList.add('selected');
}

function setRole(role) {
  voterRole = role;
  currentVoter = null;
  selectedCandidateId = null;
  document.getElementById('name-reveal').classList.remove('show');
  document.querySelectorAll('.cand-card').forEach(el => el.classList.remove('selected'));
  
  document.querySelector('.cand-section')?.classList.remove('show');
  document.querySelector('.submit-wrap')?.classList.remove('show');

  const btnSiswa = document.getElementById('role-siswa');
  const btnGuru = document.getElementById('role-guru');
  const containerSiswa = document.getElementById('voter-siswa-container');
  const containerGuru = document.getElementById('voter-guru-container');

  if (role === 'siswa') {
    btnSiswa.classList.add('active');
    btnGuru.classList.remove('active');
    containerSiswa.style.display = 'block';
    containerGuru.style.display = 'none';
    resetSiswaForm();
  } else {
    btnGuru.classList.add('active');
    btnSiswa.classList.remove('active');
    containerSiswa.style.display = 'none';
    containerGuru.style.display = 'block';
    resetGuruForm();
  }
}

function resetSiswaForm() {
  document.getElementById('sel-kelas').value = '';
  const selAbsen = document.getElementById('sel-absen');
  selAbsen.innerHTML = '<option value="">— Pilih kelas dulu —</option>';
  selAbsen.disabled = true;
}

function resetGuruForm() {
  document.getElementById('input-kode-guru').value = '';
}

function onKelasChange() {
  const kelas = document.getElementById('sel-kelas').value;
  const selAbsen = document.getElementById('sel-absen');
  const reveal = document.getElementById('name-reveal');
  reveal.classList.remove('show');
  currentVoter = null;
  selAbsen.innerHTML = '<option value="">— Pilih nomor absen —</option>';

  document.querySelector('.cand-section')?.classList.remove('show');
  document.querySelector('.submit-wrap')?.classList.remove('show');
  
  if (!kelas) {
    selAbsen.disabled = true;
    return;
  }
  
  selAbsen.disabled = false;
  const siswaList = SISWA[kelas] || [];
  siswaList.forEach(s => {
    const o = document.createElement('option');
    o.value = s.absen;
    o.textContent = `Absen ${s.absen} — ${s.nama}`;
    selAbsen.appendChild(o);
  });
}

async function onAbsenChange() {
  const kelas = document.getElementById('sel-kelas').value;
  const absenStr = document.getElementById('sel-absen').value;
  const reveal = document.getElementById('name-reveal');
  
  if (!kelas || !absenStr) {
    reveal.classList.remove('show');
    currentVoter = null;
    document.querySelector('.cand-section')?.classList.remove('show');
    document.querySelector('.submit-wrap')?.classList.remove('show');
    return;
  }
  
  const absen = parseInt(absenStr);
  const nameDisplay = document.getElementById('name-display');
  const kelasDisplay = document.getElementById('kelas-display');
  
  nameDisplay.textContent = "Mengambil data...";
  kelasDisplay.textContent = "";
  reveal.classList.add('show');

  let nama = null;
  
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('students')
        .select('nama')
        .eq('kelas', kelas)
        .eq('absen', absen)
        .maybeSingle();
      if (error) throw error;
      if (data) nama = data.nama;
    } catch (e) {
      console.warn("Supabase fetch student name failed, falling back to local seed.", e);
    }
  }

  if (!nama) {
    const s = (SISWA[kelas] || []).find(x => x.absen === absen);
    nama = s ? s.nama : null;
  }

  if (nama) {
    currentVoter = {
      name: nama,
      role: 'siswa',
      identifier: `${kelas} | Absen ${absen}`,
      metadata: { kelas, absen }
    };
    nameDisplay.textContent = nama;
    kelasDisplay.textContent = `Siswa · Kelas ${kelas} · Absen ${absen}`;
    
    document.querySelector('.cand-section')?.classList.add('show');
    document.querySelector('.submit-wrap')?.classList.add('show');
  } else {
    nameDisplay.textContent = "Data Tidak Ditemukan";
    kelasDisplay.textContent = "Pastikan kelas dan absen benar.";
    currentVoter = null;
    
    document.querySelector('.cand-section')?.classList.remove('show');
    document.querySelector('.submit-wrap')?.classList.remove('show');
  }
}

async function onTeacherCodeChange() {
  const code = document.getElementById('input-kode-guru').value.trim().toUpperCase();
  const reveal = document.getElementById('name-reveal');
  const nameDisplay = document.getElementById('name-display');
  const kelasDisplay = document.getElementById('kelas-display');

  if (code.length < 3) {
    reveal.classList.remove('show');
    currentVoter = null;
    document.querySelector('.cand-section')?.classList.remove('show');
    document.querySelector('.submit-wrap')?.classList.remove('show');
    return;
  }

  nameDisplay.textContent = "Memvalidasi kode...";
  kelasDisplay.textContent = "";
  reveal.classList.add('show');

  let nama = null;

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('teachers')
        .select('nama')
        .eq('code', code)
        .maybeSingle();
      if (error) throw error;
      if (data) nama = data.nama;
    } catch (e) {
      console.warn("Supabase fetch teacher name failed, falling back to local seed.", e);
    }
  }

  if (!nama) {
    const t = TEACHERS.find(x => x.code.toUpperCase() === code);
    nama = t ? t.nama : null;
  }

  if (nama) {
    currentVoter = {
      name: nama,
      role: 'guru',
      identifier: `Guru | Kode ${code}`,
      metadata: { code }
    };
    nameDisplay.textContent = nama;
    kelasDisplay.textContent = `Pendidik / Tenaga Kependidikan · Kode: ${code}`;
    
    document.querySelector('.cand-section')?.classList.add('show');
    document.querySelector('.submit-wrap')?.classList.add('show');
  } else {
    nameDisplay.textContent = "Kode Tidak Valid";
    kelasDisplay.textContent = "Periksa kembali kode guru Anda.";
    currentVoter = null;
    
    document.querySelector('.cand-section')?.classList.remove('show');
    document.querySelector('.submit-wrap')?.classList.remove('show');
  }
}

async function submitVote() {
  const errBox = document.getElementById('vote-err');
  errBox.classList.remove('show');

  if (!currentVoter) {
    showErr('vote-err', 'Isi identitas Anda dengan benar terlebih dahulu.');
    return;
  }
  if (!selectedCandidateId) {
    showErr('vote-err', 'Silakan pilih salah satu kandidat pilihan Anda.');
    return;
  }

  const btnSubmit = document.getElementById('btn-submit-vote');
  const originalText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = "<i class='ti ti-loader' style='animation: spin 1s linear infinite'></i> Memproses suara...";

  const candidate = CANDIDATES.find(c => c.id === selectedCandidateId);
  const now = new Date();
  
  const entry = {
    voter_name: currentVoter.name,
    voter_role: currentVoter.role,
    voter_identifier: currentVoter.identifier,
    candidate_id: candidate.id,
    candidate_name: candidate.name,
    timestamp: now.toISOString()
  };

  let success = false;
  let errorMessage = "";

  if (supabaseClient) {
    try {
      const { data: existing, error: checkError } = await supabaseClient
        .from('votes')
        .select('id')
        .eq('voter_identifier', entry.voter_identifier)
        .maybeSingle();

      if (checkError) throw checkError;
      
      if (existing) {
        throw new Error("Kamu sudah pernah memilih. Setiap pemilih dibatasi satu suara!");
      }

      const { error: insertError } = await supabaseClient
        .from('votes')
        .insert([entry]);

      if (insertError) throw insertError;
      success = true;
    } catch (e) {
      console.warn("Supabase submission failed. Falling back to local mode.", e);
      errorMessage = e.message;
    }
  }

  if (!success && !errorMessage.includes("sudah pernah memilih")) {
    const localVotes = getLocalVotes();
    if (localVotes.find(v => v.voter_identifier === entry.voter_identifier)) {
      errorMessage = "Kamu sudah pernah memilih. Setiap pemilih dibatasi satu suara!";
    } else {
      localVotes.push(entry);
      saveLocalVotes(localVotes);
      success = true;
    }
  }

  if (success) {
    document.getElementById('receipt-out').innerHTML = `
      <div class="receipt-hdr">✦ BUKTI SUARA SAH ✦</div>
      <div class="r-row"><span class="r-key">Voter</span><span class="r-val">${entry.voter_name}</span></div>
      <div class="r-row"><span class="r-key">Peran</span><span class="r-val">${entry.voter_role.toUpperCase()}</span></div>
      <div class="r-row"><span class="r-key">Identitas</span><span class="r-val">${entry.voter_identifier}</span></div>
      <div class="rdiv"></div>
      <div class="r-row">
        <span class="r-key">Pilihan</span>
        <span class="r-val">
          <span class="pbadge ${candidate.pb}">Kandidat ${candidate.id}</span>
        </span>
      </div>
      <div class="r-row"><span class="r-key">Waktu</span><span class="r-val" style="font-size: 11px;">${now.toLocaleString('id-ID')}</span></div>
      <div class="rfooter">PEMILIHAN KETUA OSIS<br>SMKN 2 MOJOKERTO · MANDIRI & JUJUR</div>
    `;
    showPage('success');
  } else {
    showErr('vote-err', errorMessage || 'Terjadi kesalahan saat memproses suara Anda.');
  }

  btnSubmit.disabled = false;
  btnSubmit.innerHTML = originalText;
}

function showPage(p) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const page = document.getElementById('page-' + p);
  if (page) page.classList.add('active');
  window.scrollTo(0, 0);
}

function showErr(id, msg) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 5000);
  }
}

function resetForm() {
  setRole('siswa');
  resetSiswaForm();
  
  const pageVote = document.getElementById('page-vote');
  const mainContent = document.querySelector('.vote-main-content');
  if (pageVote && mainContent) {
    mainContent.classList.remove('active');
    pageVote.classList.remove('voting-active');
  }
}

function startVoting() {
  const pageVote = document.getElementById('page-vote');
  const mainContent = document.querySelector('.vote-main-content');
  
  if (pageVote && mainContent) {
    mainContent.classList.add('active');
    pageVote.classList.add('voting-active');
    
    setTimeout(() => {
      const anchor = document.getElementById('form-anchor');
      if (anchor) {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
}

function adminLogin() {
  const pass = document.getElementById('admin-pass').value;
  if (pass !== ADMIN_PASS) {
    showErr('admin-err', 'Password admin salah.');
    return;
  }
  renderAdmin();
  showPage('admin');
  aktifkanRealtimeAdmin();
}

function adminLogout() {
  document.getElementById('admin-pass').value = '';
  showPage('vote');
  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
    console.log("Radar Realtime MARVOTE Dimatikan.");
  }
}

async function renderAdmin() {
  let votes = [];

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('votes')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      votes = data;
    } catch (e) {
      console.warn("Supabase select votes failed. Falling back to local votes.", e);
      votes = getLocalVotes();
    }
  } else {
    votes = getLocalVotes();
  }

  const totalVotesCast = votes.length;
  
  const totalSiswa = Object.values(SISWA).reduce((sum, arr) => sum + arr.length, 0);
  const totalGuru = TEACHERS.length;
  const totalMasterDaftar = totalSiswa + totalGuru;
  
  const pctTurnout = totalMasterDaftar ? Math.round((totalVotesCast / totalMasterDaftar) * 100) : 0;
  const belumVotedCount = totalMasterDaftar - totalVotesCast;

  const kpi = document.getElementById('kpi-grid');
  if (kpi) {
    kpi.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-num">${totalVotesCast}</div>
        <div class="kpi-lbl">Suara Masuk</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-num">${belumVotedCount}</div>
        <div class="kpi-lbl">Belum Memilih</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-num">${pctTurnout}%</div>
        <div class="kpi-lbl">Tingkat Partisipasi</div>
      </div>
    `;
  }

  const counts = {};
  CANDIDATES.forEach(c => counts[c.id] = 0);
  votes.forEach(v => {
    if (counts[v.candidate_id] !== undefined) counts[v.candidate_id]++;
  });

  const chart = document.getElementById('bar-chart');
  if (chart) {
    chart.innerHTML = CANDIDATES.map(c => {
      const p = totalVotesCast ? Math.round((counts[c.id] / totalVotesCast) * 100) : 0;
      return `
        <div class="bar-row">
          <div class="bar-lbl">
            <span class="pbadge ${c.pb}">Kandidat ${c.id}</span>
            <span style="font-size:11px; color:#555; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${c.name.split(' ')[0]}
            </span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${p}%; background:${c.color};"></div>
          </div>
          <div style="width:36px; text-align:right; font-weight:700;">${counts[c.id]}</div>
          <div class="bar-pct">${p}%</div>
        </div>
      `;
    }).join('');
  }

  const allVotersTbody = votes.length ? votes.map((v, i) => {
    const formattedTime = new Date(v.timestamp).toLocaleString('id-ID');
    return `
      <tr>
        <td style="color:#888">${i + 1}</td>
        <td><strong>${v.voter_name}</strong></td>
        <td><span style="text-transform: uppercase; font-size:10px; font-weight:700; background:#eee; padding:3px 8px; border-radius:4px;">${v.voter_role}</span></td>
        <td><code>${v.voter_identifier}</code></td>
        <td><span class="pbadge pb${v.candidate_id}">Kand.${v.candidate_id}</span></td>
        <td style="font-size:11px; color:#666">${formattedTime}</td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="6" class="empty-state">Belum ada suara masuk.</td></tr>`;

  document.getElementById('voter-table').innerHTML = `
    <table class="vtable">
      <thead>
        <tr>
          <th style="width:40px;">#</th>
          <th>Nama</th>
          <th>Peran</th>
          <th>Pengenal / Kelas</th>
          <th>Pilihan</th>
          <th>Waktu Voting</th>
        </tr>
      </thead>
      <tbody>${allVotersTbody}</tbody>
    </table>
  `;

  const kelasMap = {};
  votes.forEach(v => {
    if (v.voter_role === 'siswa') {
      const match = v.voter_identifier.split('|')[0].trim();
      if (!kelasMap[match]) kelasMap[match] = [];
      kelasMap[match].push(v);
    }
  });

  document.getElementById('kelas-table').innerHTML = Object.keys(SISWA).sort().map(k => {
    const sudah = kelasMap[k] || [];
    const total_k = SISWA[k].length;
    const rows = sudah.map((v, i) => `
      <tr>
        <td style="color:#888">${i + 1}</td>
        <td><strong>${v.voter_name}</strong></td>
        <td>Absen ${v.voter_identifier.split('Absen')[1]?.trim() || ''}</td>
        <td><span class="pbadge pb${v.candidate_id}">Kand.${v.candidate_id}</span></td>
      </tr>
    `).join('');

    return `
      <div class="kelas-hd">Kelas ${k} <span style="font-weight:400; font-size:11px; color:var(--grey)">(${sudah.length} dari ${total_k} siswa sudah memilih)</span></div>
      <div class="table-wrap">
        <table class="vtable">
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>Nama</th>
              <th>No. Absen</th>
              <th>Pilihan</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="4" class="empty-state">Belum ada pemilih dari kelas ini.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  const teacherVotes = votes.filter(v => v.voter_role === 'guru');
  const guruRows = teacherVotes.length ? teacherVotes.map((v, i) => {
    const formattedTime = new Date(v.timestamp).toLocaleString('id-ID');
    const code = v.voter_identifier.split('Kode')[1]?.trim() || '';
    return `
      <tr>
        <td style="color:#888">${i + 1}</td>
        <td><strong>${v.voter_name}</strong></td>
        <td><code>${code}</code></td>
        <td><span class="pbadge pb${v.candidate_id}">Kand.${v.candidate_id}</span></td>
        <td style="font-size:11px; color:#666">${formattedTime}</td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="5" class="empty-state">Belum ada suara masuk dari Guru / Staff.</td></tr>`;

  const guruTableEl = document.getElementById('guru-table');
  if (guruTableEl) {
    guruTableEl.innerHTML = `
      <table class="vtable">
        <thead>
          <tr>
            <th style="width:40px;">#</th>
            <th>Nama Lengkap</th>
            <th>Kode Guru</th>
            <th>Pilihan</th>
            <th>Waktu Voting</th>
          </tr>
        </thead>
        <tbody>${guruRows}</tbody>
      </table>
    `;
  }

  const votedIdentifierSet = new Set(votes.map(v => v.voter_identifier));
  const belumList = [];

  Object.entries(SISWA).forEach(([kelas, list]) => {
    list.forEach(s => {
      const id = `${kelas} | Absen ${s.absen}`;
      if (!votedIdentifierSet.has(id)) {
        belumList.push({ name: s.nama, role: 'siswa', identifier: id });
      }
    });
  });

  TEACHERS.forEach(t => {
    const id = `Guru | Kode ${t.code}`;
    if (!votedIdentifierSet.has(id)) {
      belumList.push({ name: t.nama, role: 'guru', identifier: id });
    }
  });

  const belumRows = belumList.length ? belumList.map((b, i) => `
    <tr>
      <td style="color:#888">${i + 1}</td>
      <td><strong>${b.name}</strong></td>
      <td><span style="text-transform: uppercase; font-size:10px; font-weight:700; background:#eee; padding:3px 8px; border-radius:4px;">${b.role}</span></td>
      <td><code>${b.identifier}</code></td>
    </tr>
  `).join('') : `<tr><td colspan="4" class="empty-state">🎉 Hebat! Semua pemilih sudah menyalurkan suaranya!</td></tr>`;

  document.getElementById('belum-table').innerHTML = `
    <table class="vtable">
      <thead>
        <tr>
          <th style="width:40px;">#</th>
          <th>Nama Lengkap</th>
          <th>Peran</th>
          <th>Pengenal Identitas</th>
        </tr>
      </thead>
      <tbody>${belumRows}</tbody>
    </table>
  `;
}

function switchTab(btn, id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  btn.classList.add('active');
  const content = document.getElementById(id);
  if (content) content.classList.add('active');
}

async function seedSupabase() {
  if (!supabaseClient) {
    alert("Supabase client belum terinisialisasi. Periksa koneksi internet atau script CDN.");
    return;
  }

  const btn = document.getElementById('btn-seed');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "<i class='ti ti-loader' style='animation: spin 1s linear infinite'></i> Mengupload data...";

  try {
    const studentRows = [];
    Object.entries(SISWA).forEach(([kelas, list]) => {
      list.forEach(s => {
        studentRows.push({ kelas, absen: s.absen, nama: s.nama });
      });
    });

    for (let i = 0; i < studentRows.length; i += 50) {
      const chunk = studentRows.slice(i, i + 50);
      const { error } = await supabaseClient.from('students').insert(chunk);
      if (error) {
        if (!error.message.includes("duplicate key")) {
          throw error;
        }
      }
    }

    const { error: guruErr } = await supabaseClient.from('teachers').insert(TEACHERS);
    if (guruErr && !guruErr.message.includes("duplicate key")) {
      throw guruErr;
    }

    alert(`Seeding Selesai!\nMaster Data: ${studentRows.length} siswa (36 kelas) & ${TEACHERS.length} guru berhasil disinkronisasi ke tabel Supabase.`);
    renderAdmin();
  } catch (e) {
    console.error(e);
    alert(`Seeding Gagal!\nPastikan Anda sudah membuat tabel 'students' dan 'teachers' di SQL editor Supabase.\n\nError: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function clearData() {
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('votes')
        .delete()
        .neq('id', 0); 
      if (error) throw error;
      alert("Database Supabase berhasil direset.");
    } catch (e) {
      console.warn("Supabase clear failed. Clearing local storage fallback.", e);
      clearLocalVotes();
      alert("Data lokal direset.");
    }
  } else {
    clearLocalVotes();
    alert("Data lokal direset.");
  }
  renderAdmin();
}

async function exportCSV() {
  let votes = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('votes')
        .select('*')
        .order('timestamp', { ascending: true });
      if (error) throw error;
      votes = data;
    } catch (e) {
      console.warn("Supabase export query failed, exporting local logs.", e);
      votes = getLocalVotes();
    }
  } else {
    votes = getLocalVotes();
  }

  if (!votes.length) {
    alert("Tidak ada data voting untuk diexport.");
    return;
  }

  const headers = ["No", "Nama Pemilih", "Peran", "Identitas/Kelas", "ID Pilihan", "Nama Kandidat", "Waktu Voting"];
  const rows = votes.map((v, i) => [
    i + 1,
    v.voter_name,
    v.voter_role,
    v.voter_identifier,
    v.candidate_id,
    v.candidate_name,
    new Date(v.timestamp).toLocaleString('id-ID')
  ]);

  const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hasil_voting_osis_smkn2mjk_${new Date().toLocaleDateString('id-ID')}.csv`;
  a.click();
}

function aktifkanRealtimeAdmin() {
  if (!supabaseClient) return;
  if (realtimeChannel) return;

  console.log("Radar Realtime MARVOTE Aktif! Memantau suara masuk...");

  realtimeChannel = supabaseClient
    .channel('pantau-suara-osis')
    .on(
      'postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'votes'   
      }, 
      (payload) => {
        console.log('Ada suara baru terdeteksi!', payload.new);
        renderAdmin(); 
      }
    )
    .subscribe();
}
