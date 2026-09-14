

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

let SISWA      = {};       
let CANDIDATES = [];       

let selectedCandidateId = null;
let voterRole           = 'siswa';
let currentVoter        = null;
