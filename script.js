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
let CANDIDATES = [];

const CANDIDATE_DETAILS = [
  {
    name: 'Natasya Sandyta & Galeh Said',
    visi: 'Mewujudkan OSIS sebagai wadah yang inspiratif, peduli lingkungan, dan terbuka dalam mengembangkan potensi serta menjadi tempat bagi siswa untuk berprestasi dan berkarya.',
    misi: 'Mengembangkan motivasi dan inspirasi siswa.<br>Meningkatkan kepedulian terhadap lingkungan.<br>Menyediakan ruang yang nyaman bagi siswa.<br>Membangun budaya saling mendukung, menghargai, dan berani berpendapat.',
    proker: '<strong>PODCAST JEJAK SISWA</strong><br>Podcast bersama siswa berprestasi untuk memberikan motivasi dan inspirasi, sekaligus membahas curhatan siswa melalui menfess.<br><br><strong>MUSIK SAAT ISTIRAHAT</strong><br>Pemutaran musik atau podcast Jejak Siswa dua kali setiap minggu saat jam istirahat agar suasana sekolah lebih menyenangkan.<br><br><strong>ONE STUDENT ONE BOTTLE</strong><br>Gerakan membawa satu botol plastik bekas setiap minggu untuk dikumpulkan dan didaur ulang, sekaligus meningkatkan kepedulian terhadap lingkungan.'
  },
  {
    name: 'Rona Qurrotu & Nila Asna',
    visi: 'Mewujudkan SMKN 2 Mojokerto sebagai sekolah yang unggul dalam prestasi, serta menjadi tempat bagi siswa untuk berkembang menjadi pribadi yang percaya diri, mampu berkomunikasi dengan baik, kompeten, berkarakter, siap menghadapi dunia kerja, dan memberikan dampak positif bagi sekolah serta lingkungan sekitar.',
    misi: 'Pengembangan Potensi & Prestasi: Mendorong siswa mengembangkan potensi, minat, dan bakat serta meningkatkan prestasi akademik maupun nonakademik.<br><br>Karakter & Kepemimpinan: Membentuk siswa yang disiplin, bertanggung jawab, kreatif, berakhlak mulia, mampu bekerja sama, dan memiliki jiwa kepemimpinan.<br><br>Aspirasi & Lingkungan Positif: Menampung aspirasi serta menciptakan lingkungan sekolah yang aktif, sehat, harmonis, dan positif.',
    proker: '<strong>ASPIRASI SISWA</strong><br>Wadah aspirasi, apresiasi, dan ide melalui kotak aspirasi, formulir digital, serta media sosial OSIS.<br><br><strong>ONE SCHOOL, ONE CELEBRATION</strong><br>Kolaborasi dengan sekolah lain melalui kompetisi, kegiatan kreatif, sosial, dan edukatif.<br><br><strong>SPEAK UP SKANEDA</strong><br>Latihan public speaking, presentasi, diskusi, dan MC agar siswa lebih percaya diri.<br><br><strong>ONE STUDENT, ONE TALENT</strong><br>Program untuk menemukan dan mengembangkan bakat serta minat setiap siswa.'
  },
  {
    name: 'Vizia Salsabilla & Wella Berlian',
    visi: 'Mewujudkan organisasi OSIS sebagai organisasi yang dapat menampung segala aspirasi siswa, aktif, kreatif, inovatif, dan inspiratif.',
    misi: 'Meningkatkan kedisiplinan dan rasa tanggung jawab siswa.<br>Menjadi teladan bagi seluruh siswa dalam sikap dan prestasi.<br>Meningkatkan kerja sama antara siswa, OSIS, dan guru.<br>Mewujudkan OSIS yang responsif dan bertanggung jawab dalam menjalankan program kerja.',
    proker: '<strong>SKILL SWAP DAY</strong><br>Wadah bagi siswa untuk saling berbagi keterampilan seperti public speaking, editing, desain, memasak, olahraga, dan keterampilan lainnya.<br><br><strong>JAVANESE CULTURE</strong><br>Melanjutkan dan mengembangkan kegiatan Javanese Culture dengan bazar makanan tradisional yang melibatkan siswa.<br><br><strong>FRIDAY ARENA</strong><br>Permainan bola atau aktivitas olahraga saat istirahat kedua hari Jumat untuk menciptakan suasana aktif dan mempererat kebersamaan.'
  }
];

const STORAGE_KEY = "osis_smkn2mjk_votes_v4";
let selectedCandidateId = null;
let voterRole = 'siswa'; 
let currentVoter = null; 

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
        CANDIDATES = candidatesData.map((candidate, index) => ({
          ...candidate,
          ...CANDIDATE_DETAILS[index]
        }));
        console.log("Data paslon berhasil dimuat dari Supabase.");
      }

      console.log("Data master siswa dan paslon berhasil disinkronkan dari cloud.");

    } catch (error) {
      console.error("Gagal memuat data dari Supabase, mengaktifkan mode aman lokal:", error);
    }
  }

  if (!CANDIDATES.length) {
    CANDIDATES = CANDIDATE_DETAILS.map((details, index) => ({
      ...details,
      id: String.fromCharCode(65 + index),
      num: `n${String.fromCharCode(65 + index)}`,
      pb: `pb${String.fromCharCode(65 + index)}`,
      photo: `candidate_${String.fromCharCode(97 + index)}.png`
    }));
  }

  if (typeof renderCandidates === 'function') {
    renderCandidates();
  }
}

document.addEventListener('DOMContentLoaded', initApp);

function renderCandidates() {
  const container = document.getElementById('cand-list');
  if (!container) return;
  
  container.innerHTML = CANDIDATES.map((c, index) => `
    <div class="cand-card" id="card-${c.id}" onclick="selectCandidate('${c.id}')">
      <div class="cand-img-wrap">
        <img src="${c.photo}" alt="Paslon ${index + 1}" onerror="this.src='https://placehold.co/140x160?text=Paslon+${index + 1}'">
      </div>
      <div class="cand-body">
        <div class="cand-num-badge ${c.num}">${index + 1}</div>
        <div class="cname">${c.name}</div>
        <div class="cvisi-title">Visi:</div>
        <div class="cvisi">${c.visi}</div>
        <div class="cmisi-title">Misi:</div>
        <ol class="cmisi" style="list-style-position: inside;">
          ${c.misi.split('<br>').map(m => `<li>${m.replace(/^\d+\.\s*/, '')}</li>`).join('')}
        </ol>
        <div class="cproker-title">Program Kerja:</div>
        <div class="cproker">${c.proker || '-'}</div>
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
  voterRole = 'siswa';
  currentVoter = null;
  selectedCandidateId = null;
  document.getElementById('name-reveal').classList.remove('show');
  document.querySelectorAll('.cand-card').forEach(el => el.classList.remove('selected'));
  
  document.querySelector('.cand-section')?.classList.remove('show');
  document.querySelector('.submit-wrap')?.classList.remove('show');

  resetSiswaForm();
}

function resetSiswaForm() {
  const inputSiswa = document.getElementById('input-kode-siswa');
  if (inputSiswa) {
    inputSiswa.value = '';
  }
  document.getElementById('name-reveal')?.classList.remove('show');
  document.querySelector('.cand-section')?.classList.remove('show');
  document.querySelector('.submit-wrap')?.classList.remove('show');
}

async function onStudentCodeChange() {
  const tokenEl = document.getElementById('input-kode-siswa');
  const token = tokenEl ? tokenEl.value.trim().toUpperCase() : '';
  const reveal = document.getElementById('name-reveal');
  const nameDisplay = document.getElementById('status-title');
  const kelasDisplay = document.getElementById('status-desc');
  const successMessage = document.getElementById('success-message');

  if (token.length < 6) {
    reveal.classList.remove('show');
    currentVoter = null;
    document.querySelector('.cand-section')?.classList.remove('show');
    document.querySelector('.submit-wrap')?.classList.remove('show');
    successMessage.style.display = 'none';
    return;
  }

  nameDisplay.textContent = "Memvalidasi kode token...";
  kelasDisplay.textContent = "";
  successMessage.style.display = 'none';
  reveal.classList.add('show');

  const tokenPattern = /^(X|XI|XII)(APHP|DKV|KULINER|PS|PS|RPL)([1-3])(\d{2})$/;
  const match = token.match(tokenPattern);

  if (!match) {
    nameDisplay.textContent = "Format Token Salah";
    kelasDisplay.textContent = "Gunakan format: TINGKAT + JURUSAN + ROMBEL + 2 DIGIT ABSEN. Contoh: XRPL301";
    currentVoter = null;
    document.querySelector('.cand-section')?.classList.remove('show');
    document.querySelector('.submit-wrap')?.classList.remove('show');
    return;
  }

  const tingkat = match[1];
  const jurusan = match[2];
  const rombel = match[3];
  const absen = parseInt(match[4], 10);

  const namaKelasTarget = `${tingkat} ${jurusan} ${rombel}`;

  let namaSiswa = null;

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('students')
        .select('nama')
        .eq('kelas', namaKelasTarget)
        .eq('absen', absen)
        .maybeSingle();
      if (error) throw error;
      if (data) namaSiswa = data.nama;
    } catch (e) {
      console.error("Gagal mengambil data token siswa dari Supabase:", e);
    }
  }

  if (!namaSiswa) {
    const s = (SISWA[namaKelasTarget] || []).find(x => x.absen === absen);
    namaSiswa = s ? s.nama : null;
  }

  if (namaSiswa) {
    currentVoter = {
      name: namaSiswa,
      role: 'siswa',
      identifier: `${namaKelasTarget} | Absen ${absen}`,
      metadata: { kelas: namaKelasTarget, absen: absen }
    };

    nameDisplay.textContent = namaSiswa;
    kelasDisplay.textContent = `Siswa • Kelas ${namaKelasTarget} • No. Absen ${absen}`;
    successMessage.style.display = 'block';

    document.querySelector('.cand-section')?.classList.add('show');
    document.querySelector('.submit-wrap')?.classList.add('show');
  } else {
    nameDisplay.textContent = "Data Siswa Tidak Ditemukan";
    kelasDisplay.textContent = `Tidak ada siswa di kelas ${namaKelasTarget} dengan nomor absen ${absen}.`;
    successMessage.style.display = 'none';
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
    showErr('vote-err', 'Silakan pilih salah satu paslon pilihan Anda.');
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
          <span class="pbadge ${candidate.pb}">Paslon ${CANDIDATES.indexOf(candidate) + 1}</span>
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
