

async function initApp() {
  
  const txt = "PEMILIHAN KETUA OSIS · SMKN 2 MOJOKERTO · SUARAMU MENENTUKAN · ";
  const mq  = document.getElementById('mq');
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
          const kKey = (item.kelas || '').trim().toUpperCase();
          if (!SISWA[kKey]) {
            SISWA[kKey] = [];
          }
          const isDuplicate = SISWA[kKey].some(s => s.absen === item.absen);
          if (!isDuplicate) {
            SISWA[kKey].push({ absen: item.absen, nama: item.nama, rawKelas: item.kelas });
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
          ...CANDIDATE_DETAILS[index],
          photo: resolveCandidatePhoto(candidate.photo, index)
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
      id:    String.fromCharCode(65 + index),
      num:   `n${String.fromCharCode(65 + index)}`,
      pb:    `pb${String.fromCharCode(65 + index)}`,
      photo: resolveCandidatePhoto(null, index)
    }));
  }

  renderCandidates();
}

function resolveCandidatePhoto(photo, index) {
  const defaultFile = `candidate_${String.fromCharCode(97 + index)}.png`;
  if (!photo) {
    return `assets/images/${defaultFile}`;
  }
  if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
    return photo;
  }
  if (photo.startsWith('assets/images/')) {
    return photo;
  }
  const filename = photo.split('/').pop();
  return `assets/images/${filename}`;
}

document.addEventListener('DOMContentLoaded', initApp);

function renderCandidates() {
  const container = document.getElementById('cand-list');
  if (!container) return;
  
  container.innerHTML = CANDIDATES.map((c, index) => {
    const photoUrl = resolveCandidatePhoto(c.photo, index);
    const char = String.fromCharCode(97 + index);
    const fallbackAsset = `assets/images/candidate_${char}.png`;
    const fallbackRoot = `candidate_${char}.png`;
    const paslonNum = index + 1;
    const isSelected = selectedCandidateId === c.id;

    return `
    <div class="cand-card ${isSelected ? 'selected' : ''}" id="card-${c.id}" onclick="selectCandidate('${c.id}')" data-id="${c.id}">
      <div class="cand-card-main">
        <div class="cand-img-wrap">
          <img src="${photoUrl}" alt="Paslon ${paslonNum}" onerror="if(!this.dataset.triedAsset){this.dataset.triedAsset='1';this.src='${fallbackAsset}';}else if(!this.dataset.triedRoot){this.dataset.triedRoot='1';this.src='${fallbackRoot}';}else{this.src='https://placehold.co/140x160?text=Paslon+${paslonNum}';}">
          <div class="cand-num-badge cand-img-badge ${c.num}">${paslonNum}</div>
        </div>
        <div class="cand-body">
          <div class="cand-header-meta">
            <span class="cand-badge-pill ${c.num}">PASLON 0${paslonNum}</span>
            <div class="cand-select-indicator">
              <span class="select-label">${isSelected ? 'Terpilih' : 'Pilih'}</span>
              <div class="radio-box"></div>
            </div>
          </div>
          <h3 class="cname">${c.name}</h3>
          <div class="cvisi-snippet">
            <i class="ti ti-quote snippet-icon" aria-hidden="true"></i>
            <span class="cvisi-snippet-text">${c.visi}</span>
          </div>
          <div class="cand-action-row">
            <button type="button" class="btn-toggle-detail" id="btn-toggle-${c.id}" onclick="toggleCandDetail(event, '${c.id}')" aria-expanded="false" aria-controls="details-${c.id}">
              <span class="toggle-text"><i class="ti ti-file-text" aria-hidden="true"></i> Visi, Misi & Proker</span>
              <i class="ti ti-chevron-down toggle-icon" id="toggle-icon-${c.id}" aria-hidden="true"></i>
            </button>
            <button type="button" class="btn-quick-select" onclick="selectCandidate('${c.id}'); event.stopPropagation();">
              <i class="ti ti-check" aria-hidden="true"></i>
              <span class="select-btn-text">${isSelected ? 'Dipilih' : 'Pilih Paslon'}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="cand-details-drawer" id="details-${c.id}">
        <div class="cand-details-inner">
          <div class="cand-details-tabs">
            <button type="button" class="cand-tab-btn active" id="tabbtn-vm-${c.id}" onclick="switchCandTab(event, '${c.id}', 'visimisi')">
              <i class="ti ti-target-arrow" aria-hidden="true"></i> Visi & Misi
            </button>
            <button type="button" class="cand-tab-btn" id="tabbtn-pk-${c.id}" onclick="switchCandTab(event, '${c.id}', 'proker')">
              <i class="ti ti-list-check" aria-hidden="true"></i> Program Kerja
            </button>
          </div>

          <div class="cand-tab-pane active" id="tab-visimisi-${c.id}">
            <div class="detail-block detail-visi-box">
              <div class="cvisi-title"><i class="ti ti-bulb" aria-hidden="true"></i> VISI</div>
              <div class="cvisi">${c.visi}</div>
            </div>
            <div class="detail-block detail-misi-box">
              <div class="cmisi-title"><i class="ti ti-checklist" aria-hidden="true"></i> MISI</div>
              <ol class="cmisi">
                ${(c.misi || '').split('<br>').filter(m => m.trim()).map(m => `<li>${m.replace(/^\d+\.\s*/, '')}</li>`).join('')}
              </ol>
            </div>
          </div>

          <div class="cand-tab-pane" id="tab-proker-${c.id}">
            <div class="detail-block detail-proker-box">
              <div class="cproker-title"><i class="ti ti-sparkles" aria-hidden="true"></i> PROGRAM KERJA UNGGULAN</div>
              <div class="cproker-content">${formatProkerItems(c.proker)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function formatProkerItems(rawProker) {
  if (!rawProker || rawProker === '-') return '<div class="cproker">-</div>';
  const parts = rawProker.split('<br><br>');
  return parts.map(part => `<div class="proker-item-card">${part}</div>`).join('');
}

function toggleCandDetail(event, id) {
  if (event) event.stopPropagation();
  const drawer = document.getElementById(`details-${id}`);
  const btn = document.getElementById(`btn-toggle-${id}`);
  const icon = document.getElementById(`toggle-icon-${id}`);
  if (!drawer) return;

  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (icon) icon.className = 'ti ti-chevron-down toggle-icon';
  } else {
    drawer.classList.add('open');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    if (icon) icon.className = 'ti ti-chevron-up toggle-icon';
  }
}

function switchCandTab(event, id, tabName) {
  if (event) event.stopPropagation();
  const tabVm = document.getElementById(`tab-visimisi-${id}`);
  const tabPk = document.getElementById(`tab-proker-${id}`);
  const btnVm = document.getElementById(`tabbtn-vm-${id}`);
  const btnPk = document.getElementById(`tabbtn-pk-${id}`);

  if (tabName === 'visimisi') {
    tabVm?.classList.add('active');
    tabPk?.classList.remove('active');
    btnVm?.classList.add('active');
    btnPk?.classList.remove('active');
  } else {
    tabPk?.classList.add('active');
    tabVm?.classList.remove('active');
    btnPk?.classList.add('active');
    btnVm?.classList.remove('active');
  }
}

function selectCandidate(id) {
  selectedCandidateId = id;
  document.querySelectorAll('.cand-card').forEach(el => {
    const isThis = el.id === 'card-' + id;
    el.classList.toggle('selected', isThis);
    const label = el.querySelector('.select-label');
    if (label) label.textContent = isThis ? 'Terpilih' : 'Pilih';
    const btnText = el.querySelector('.select-btn-text');
    if (btnText) btnText.textContent = isThis ? 'Dipilih' : 'Pilih Paslon';
  });
}

function setRole(role) {
  voterRole           = 'siswa';
  currentVoter        = null;
  selectedCandidateId = null;
  document.getElementById('name-reveal')?.classList.remove('show');
  document.querySelectorAll('.cand-card').forEach(el => {
    el.classList.remove('selected');
    const label = el.querySelector('.select-label');
    if (label) label.textContent = 'Pilih';
    const btnText = el.querySelector('.select-btn-text');
    if (btnText) btnText.textContent = 'Pilih Paslon';
  });
  
  // Close any open candidate details drawers
  document.querySelectorAll('.cand-details-drawer').forEach(drawer => {
    drawer.classList.remove('open');
  });
  document.querySelectorAll('.toggle-icon').forEach(icon => {
    icon.className = 'ti ti-chevron-down toggle-icon';
  });

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
  const tokenEl      = document.getElementById('input-kode-siswa');
  const token        = tokenEl ? tokenEl.value.trim().toUpperCase() : '';
  const reveal       = document.getElementById('name-reveal');
  const nameDisplay  = document.getElementById('status-title');
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

  nameDisplay.textContent  = "Memvalidasi kode token...";
  kelasDisplay.textContent = "";
  successMessage.style.display = 'none';
  reveal.classList.add('show');

  const tokenPattern = /^(X|XI|XII)(APHP|DKV|KULINER|KUL|PS|RPL)([1-3])(\d{2})$/;
  const match        = token.match(tokenPattern);

  if (!match) {
    nameDisplay.textContent  = "Format Token Salah";
    kelasDisplay.textContent = "Gunakan format: TINGKAT + JURUSAN + ROMBEL + 2 DIGIT ABSEN. Contoh: XRPL301 atau XIIKUL103";
    currentVoter = null;
    document.querySelector('.cand-section')?.classList.remove('show');
    document.querySelector('.submit-wrap')?.classList.remove('show');
    return;
  }

  const tingkat = match[1];
  let jurusan   = match[2];
  if (jurusan === 'KUL') {
    jurusan = 'KULINER';
  }
  const rombel  = match[3];
  const absen   = parseInt(match[4], 10);

  const namaKelasTarget = `${tingkat} ${jurusan} ${rombel}`;

  let namaSiswa = null;
  let verifiedKelas = namaKelasTarget;

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('students')
        .select('nama, kelas')
        .ilike('kelas', namaKelasTarget)
        .eq('absen', absen)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        namaSiswa = data.nama;
        if (data.kelas) verifiedKelas = data.kelas;
      }
    } catch (e) {
      console.error("Gagal mengambil data token siswa dari Supabase:", e);
    }
  }

  if (!namaSiswa) {
    const s = (SISWA[namaKelasTarget.toUpperCase()] || []).find(x => x.absen === absen);
    namaSiswa = s ? s.nama : null;
    if (s && s.rawKelas) verifiedKelas = s.rawKelas;
  }

  if (namaSiswa) {
    currentVoter = {
      name:       namaSiswa,
      role:       'siswa',
      identifier: `${verifiedKelas} | Absen ${absen}`,
      metadata:   { kelas: verifiedKelas, absen: absen }
    };

    nameDisplay.textContent  = namaSiswa;
    kelasDisplay.textContent = `Siswa • Kelas ${verifiedKelas} • No. Absen ${absen}`;
    successMessage.style.display = 'block';

    document.querySelector('.cand-section')?.classList.add('show');
    document.querySelector('.submit-wrap')?.classList.add('show');
  } else {
    nameDisplay.textContent  = "Data Siswa Tidak Ditemukan";
    kelasDisplay.textContent = `Tidak ada siswa di kelas ${verifiedKelas} dengan nomor absen ${absen}.`;
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

  const btnSubmit  = document.getElementById('btn-submit-vote');
  const originalText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = "<i class='ti ti-loader' style='animation: spin 1s linear infinite'></i> Memproses suara...";

  const candidate = CANDIDATES.find(c => c.id === selectedCandidateId);
  const now       = new Date();
  
  const entry = {
    voter_name:       currentVoter.name,
    voter_role:       currentVoter.role,
    voter_identifier: currentVoter.identifier,
    candidate_id:     candidate.id,
    candidate_name:   candidate.name,
    timestamp:        now.toISOString()
  };

  let success      = false;
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
    try {
      localStorage.setItem('marvote_last_vote_timestamp', String(Date.now()));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('marvote_events');
        bc.postMessage({ type: 'VOTE_SUBMITTED', timestamp: Date.now() });
        bc.close();
      }
    } catch (e) {
      console.warn("Notification error:", e);
    }

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
  
  const pageVote    = document.getElementById('page-vote');
  const mainContent = document.querySelector('.vote-main-content');
  if (pageVote && mainContent) {
    mainContent.classList.remove('active');
    pageVote.classList.remove('voting-active');
  }
}

function startVoting() {
  const pageVote    = document.getElementById('page-vote');
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
