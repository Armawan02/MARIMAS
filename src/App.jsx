import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword, signOut, updatePassword, updateProfile } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { Activity, ArrowRight, ArrowUpRight, Bell, Camera, Check, CheckCircle2, ClipboardList, FileText, GraduationCap, ImagePlus, LayoutDashboard, LocateFixed, LogOut, MapPin, Menu, Plus, Search, Settings, ShieldCheck, Star, Users, X } from 'lucide-react';
import { auth, db, firebaseConfigured } from './firebase';

const roles = ['Mahasiswa', 'Admin', 'Dosen Pembimbing', 'Pembimbing Lapangan'];
const today = () => new Date().toISOString().slice(0, 10);
const prettyDate = value => value ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : '—';
const initials = name => (name || 'MH').split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
const duration = log => {
  if (!log.start || !log.end) return '—';
  const [sh, sm] = log.start.split(':').map(Number), [eh, em] = log.end.split(':').map(Number);
  const mins = Math.max(0, eh * 60 + em - sh * 60 - sm);
  return `${Math.floor(mins / 60)} jam${mins % 60 ? ` ${mins % 60} mnt` : ''}`;
};
const canvasBlob = (canvas, quality) => new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
async function compressCanvas(canvas, maxBytes) {
  let current = canvas;
  for (let resize = 0; resize < 4; resize += 1) {
    for (const quality of [.68, .52]) {
      const blob = await canvasBlob(current, quality);
      if (blob && blob.size <= maxBytes) return blob;
    }
    if (resize === 3) break;
    const smaller = document.createElement('canvas');
    smaller.width = Math.max(1, Math.round(current.width * .78));
    smaller.height = Math.max(1, Math.round(current.height * .78));
    smaller.getContext('2d').drawImage(current, 0, 0, smaller.width, smaller.height);
    current = smaller;
  }
  return null;
}
async function makeImageBlob(source, width, height, maxBytes, maxDimension) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return compressCanvas(canvas, maxBytes);
}
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca foto.'));
    reader.readAsDataURL(blob);
  });
}

function SignIn({ onConfigured }) {
  const [signup, setSignup] = useState(false), [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [studentInfo, setStudentInfo] = useState({ nim: '', programStudi: '' }), [registrationRole, setRegistrationRole] = useState('Mahasiswa'), [unitKerja, setUnitKerja] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (signup) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        await setDoc(doc(db, 'users', credential.user.uid), { name, email, ...(registrationRole === 'Mahasiswa' ? studentInfo : { unitKerja }), requestedRole: registrationRole, role: 'Mahasiswa', accountStatus: 'Menunggu verifikasi', createdAt: serverTimestamp() });
      } else await signInWithEmailAndPassword(auth, email, password);
    } catch (err) { setError(err.code?.replace('auth/', '').replaceAll('-', ' ') || 'Tidak dapat masuk. Periksa koneksi dan konfigurasi Firebase.'); }
    finally { setBusy(false); }
  }
  if (!firebaseConfigured) return <main className="setup-screen"><div className="setup-card"><Brand /><div className="eyebrow"><span className="eyebrow-dot" />PERSIAPAN FIREBASE</div><h1>Hubungkan proyek Firebase</h1><p>Aplikasi React sudah siap. Tambahkan konfigurasi Firebase agar autentikasi dan database dapat digunakan.</p><ol><li>Buat project Firebase dan aktifkan <b>Authentication → Email/Password</b>.</li><li>Buat database <b>Cloud Firestore</b>, lalu terapkan file <code>firestore.rules</code>.</li><li>Salin <code>.env.example</code> menjadi <code>.env.local</code> dan isi kredensial web app Firebase.</li><li>Untuk deploy, masukkan variabel <code>VITE_FIREBASE_*</code> yang sama di Vercel.</li></ol><button className="button button-primary" onClick={onConfigured}>Saya sudah mengisi env, muat ulang</button></div></main>;
  return <main className="signin-screen"><section className="signin-art"><Brand /><div className="signin-art-copy"><span className="hero-tag">✦ &nbsp;PERJALANAN MAGANGMU</span><h1>Belajar hari ini,<br /><em>berdampak esok hari.</em></h1><p>Catat proses, rayakan progres. Setiap langkah kecil membangun profesional humas masa depan.</p><div className="signin-illustration"><div className="sun" /><div className="hill" /><div className="plant">✳</div></div></div><small className="signin-copyright">MARIMAS · Universitas Sulawesi Barat</small></section><section className="signin-form-side"><form className="signin-form" onSubmit={submit}><div className="eyebrow"><span className="eyebrow-dot" />PORTAL AKADEMIK</div><h2>{signup ? 'Daftar akun MARIMAS' : 'Selamat datang kembali'}</h2><p>Gunakan email dan kata sandi akun MARIMAS yang sudah disetujui Admin.</p>{signup && <><label>Nama lengkap<input required value={name} onChange={e => setName(e.target.value)} placeholder="Nama sesuai identitas" /></label><label>Jenis pendaftar<select value={registrationRole} onChange={e => setRegistrationRole(e.target.value)}><option>Mahasiswa</option><option>Dosen Pembimbing</option><option>Pembimbing Lapangan</option></select></label>{registrationRole === 'Mahasiswa' ? <><label>NIM<input required value={studentInfo.nim} minLength={5} maxLength={20} onChange={e => setStudentInfo({ ...studentInfo, nim: e.target.value })} placeholder="Nomor induk mahasiswa" /></label><label>Program studi<input required value={studentInfo.programStudi} onChange={e => setStudentInfo({ ...studentInfo, programStudi: e.target.value })} placeholder="Program studi" /></label></> : <label>Unit kerja / instansi<input required value={unitKerja} onChange={e => setUnitKerja(e.target.value)} placeholder="Unit atau instansi pembimbing" /></label>}</>}<label>Email akademik<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@student.unsulbar.ac.id" /></label><label>Kata sandi<input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 6 karakter" /></label>{error && <div className="form-error">{error}</div>}<button className="button button-primary signin-button" disabled={busy}>{busy ? 'Memproses...' : signup ? 'Daftar untuk verifikasi' : 'Masuk'} <ArrowRight size={15} /></button><div className="signin-toggle">{signup ? 'Sudah punya akun?' : 'Belum memiliki akun?'} <button type="button" onClick={() => { setSignup(!signup); setError(''); }}>{signup ? 'Masuk' : 'Daftar akun MARIMAS'}</button></div><div className="signin-notice"><ShieldCheck size={16} /><span>{signup ? <>Admin akan memeriksa data pendaftaran dan jenis akun sebelum memberi akses portal.</> : <>Mahasiswa, dosen pembimbing, dan pembimbing lapangan login di sini setelah akunnya disetujui Admin.</>}</span></div></form></section></main>;
}

function Brand() { return <a className="brand" href="#dashboard" aria-label="MARIMAS — Magang Mandiri Humas, Universitas Sulawesi Barat"><span className="brand-icon"><img src="/unsulbar-logo.png" alt="Lambang Universitas Sulawesi Barat" /></span><span className="brand-copy"><strong>MARIMAS</strong><small>MAGANG MANDIRI HUMAS</small><small className="brand-campus">UNIVERSITAS SULAWESI BARAT</small></span></a>; }
function Status({ value }) { const approved = value === 'Disetujui' || value === 'Aktif' || value === 'Sudah dinilai'; return <span className={`status-pill ${approved ? 'approved' : value === 'Perlu revisi' ? 'revision' : 'waiting'}`}>{value || 'Menunggu'}</span>; }
function AccountReview({ status, email, onRefresh, onSignOut }) { const rejected = status === 'Ditolak'; return <main className="account-review-screen"><section className="account-review-card"><Brand /><div className={`account-review-mark ${rejected ? 'rejected' : ''}`}>{rejected ? <X size={30} /> : <ShieldCheck size={30} />}</div><span className="eyebrow">STATUS AKUN</span><h1>{rejected ? 'Pendaftaran belum disetujui' : 'Menunggu verifikasi Admin'}</h1><p>{rejected ? 'Akun ini belum mendapat persetujuan untuk masuk ke portal. Silakan hubungi Admin MARIMAS.' : 'Data pendaftaranmu sedang diperiksa Admin. Fitur logbook dan penilaian akan terbuka setelah akun disetujui.'}</p><div className="account-review-email">{email}</div>{!rejected && <button className="button button-primary" onClick={onRefresh}>Periksa status</button>}<button className="button button-outline" onClick={onSignOut}>Keluar</button></section></main>; }

export default function App() {
  const [user, setUser] = useState(undefined), [profile, setProfile] = useState(null), [page, setPage] = useState(location.hash.slice(1) || 'dashboard');
  const [logs, setLogs] = useState([]), [students, setStudents] = useState([]), [evaluations, setEvaluations] = useState([]), [modal, setModal] = useState(false), [toast, setToast] = useState(''), [search, setSearch] = useState(''), [statusFilter, setStatusFilter] = useState('Semua');
  const [reviewModal, setReviewModal] = useState(null);
  const [logForm, setLogForm] = useState({ date: today(), title: '', category: 'Konten & Media', start: '08:00', end: '16:00', description: '' });
  const [evalForm, setEvalForm] = useState({ studentId: '', criterion: 'Komunikasi profesional', score: 90, note: '' });
  const [mobileNav, setMobileNav] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const galleryInputRef = useRef(null), cameraInputRef = useRef(null);
  const [photoURL, setPhotoURL] = useState('');
  const [profilePhotoData, setProfilePhotoData] = useState('');
  const [evidenceModal, setEvidenceModal] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [profileBusy, setProfileBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false), [cameraStream, setCameraStream] = useState(null), [cameraError, setCameraError] = useState('');
  const [geoPosition, setGeoPosition] = useState(null), [geoError, setGeoError] = useState('');
  const geoRequestRef = useRef(null), geoUpdatedAtRef = useRef(0);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const cameraVideoRef = useRef(null), photoGalleryRef = useRef(null);
  const [logSaving, setLogSaving] = useState(false), [logSavingStage, setLogSavingStage] = useState('');
  const [logSaveError, setLogSaveError] = useState('');
  const role = profile?.role || 'Mahasiswa';
  const name = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Pengguna';
  const canReview = ['Admin', 'Dosen Pembimbing', 'Pembimbing Lapangan'].includes(role);
  const notify = message => { setToast(message); window.clearTimeout(notify.timer); notify.timer = window.setTimeout(() => setToast(''), 2800); };

  useEffect(() => {
    const closeOnOutsideClick = event => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) cameraVideoRef.current.srcObject = cameraStream;
  }, [cameraStream, cameraOpen]);

  useEffect(() => () => {
    cameraStream?.getTracks().forEach(track => track.stop());
    if (capturedPhoto?.previewUrl) URL.revokeObjectURL(capturedPhoto.previewUrl);
  }, [cameraStream, capturedPhoto]);

  useEffect(() => {
    if (!firebaseConfigured) { setUser(null); return undefined; }
    let stopProfile = () => {}, stopProfilePhoto = () => {};
    const stopAuth = onAuthStateChanged(auth, current => {
      stopProfile(); stopProfilePhoto(); setUser(current); setPhotoURL(current?.photoURL || ''); setProfilePhotoData('');
      if (!current) { setProfile(null); return; }
      stopProfile = onSnapshot(doc(db, 'users', current.uid), snapshot => {
        setProfile(snapshot.exists() ? { ...snapshot.data(), uid: current.uid } : null);
      }, error => notify(`Gagal memuat profil: ${error.message}`));
      stopProfilePhoto = onSnapshot(doc(db, 'profilePhotos', current.uid), snapshot => {
        setProfilePhotoData(snapshot.exists() ? snapshot.data().photoData || '' : '');
      }, error => notify(`Foto profil: ${error.message}`));
    });
    return () => { stopAuth(); stopProfile(); stopProfilePhoto(); };
  }, []);

  useEffect(() => {
    if (!user || !profile || (profile.accountStatus && profile.accountStatus !== 'Disetujui')) return undefined;
    const isStudent = role === 'Mahasiswa';
    const logQuery = isStudent ? query(collection(db, 'logbooks'), where('studentId', '==', user.uid)) : query(collection(db, 'logbooks'));
    const stopLogs = onSnapshot(logQuery, snap => setLogs(snap.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (b.date || '').localeCompare(a.date || ''))), error => notify(`Logbook: ${error.message}`));
    let stopUsers = () => {};
    if (!isStudent) stopUsers = onSnapshot(collection(db, 'users'), snap => setStudents(snap.docs.map(item => ({ uid: item.id, ...item.data() }))), error => notify(`Mahasiswa: ${error.message}`));
    const evaluationQuery = isStudent ? query(collection(db, 'evaluations'), where('studentId', '==', user.uid)) : query(collection(db, 'evaluations'));
    const stopEvaluations = onSnapshot(evaluationQuery, snap => setEvaluations(snap.docs.map(item => ({ id: item.id, ...item.data() }))), error => notify(`Penilaian: ${error.message}`));
    return () => { stopLogs(); stopUsers(); stopEvaluations(); };
  }, [user, profile, role]);

  useEffect(() => { const onHash = () => setPage(location.hash.slice(1) || 'dashboard'); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash); }, []);
  const filteredLogs = useMemo(() => logs.filter(log => `${log.title} ${log.category}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'Semua' || log.status === statusFilter)), [logs, search, statusFilter]);
  const average = evaluations.length ? (evaluations.reduce((sum, item) => sum + Number(item.score || 0), 0) / evaluations.length).toFixed(1) : '—';
  const pending = logs.filter(log => log.status === 'Menunggu').length;
  const nav = [{ id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard }, { id: 'logbook', label: 'Logbook', Icon: FileText }, { id: 'penilaian', label: 'Penilaian', Icon: Star }, { id: 'mahasiswa', label: 'Mahasiswa', Icon: Users }, { id: 'pengaturan', label: 'Pengaturan', Icon: Settings }];

  async function saveLog(event) {
    event.preventDefault();
    if (!capturedPhoto) return notify('Ambil atau pilih foto bukti kegiatan terlebih dahulu.');
    if (logForm.end <= logForm.start) return notify('Jam selesai harus setelah jam mulai.');
    setLogSaving(true);
    setLogSaveError('');
    setLogSavingStage('Menyiapkan foto…');
    try {
      const photoData = await blobToDataUrl(capturedPhoto.blob);
      if (photoData.length > 700000) return notify('Foto terkompresi masih terlalu besar. Ambil ulang dengan resolusi lebih rendah.');
      const logRef = doc(collection(db, 'logbooks'));
      const batch = writeBatch(db);
      batch.set(doc(db, 'logbookPhotos', logRef.id), { photoData, studentId: user.uid, createdAt: serverTimestamp() });
      batch.set(logRef, { ...logForm, description: '', photoEvidenceId: logRef.id, photoMetadata: capturedPhoto.metadata, studentId: user.uid, studentName: name, status: 'Menunggu', createdAt: serverTimestamp() });
      setLogSavingStage('Menyimpan logbook…');
      await batch.commit();
      closeLogModal();
      setLogForm({ date: today(), title: '', category: 'Konten & Media', start: '08:00', end: '16:00', description: '' });
      notify('Foto dan logbook berhasil disimpan.');
    } catch (error) {
      console.error('Gagal menyimpan logbook:', error);
      const details = error.code === 'permission-denied'
        ? 'Firebase menolak akses. Pastikan Rules terbaru sudah di-Publish pada proyek marimas-22029 dan akun Anda berstatus Disetujui.'
        : error.code === 'resource-exhausted'
          ? 'Kuota Firebase habis. Periksa penggunaan Firestore di Firebase Console.'
          : error.code === 'unavailable'
            ? 'Firebase tidak dapat dijangkau. Periksa koneksi internet lalu coba lagi.'
            : `${error.code || 'error'}: ${error.message || 'Terjadi kesalahan saat menyimpan.'}`;
      setLogSaveError(details);
      notify('Logbook gagal disimpan. Lihat keterangan pada formulir.');
    }
    finally { setLogSaving(false); setLogSavingStage(''); }
  }

  function readGeolocation() {
    if (geoRequestRef.current) return geoRequestRef.current;
    if (geoPosition && Date.now() - geoUpdatedAtRef.current < 30000) return Promise.resolve(geoPosition);
    if (!navigator.geolocation) {
      setGeoError('Perangkat tidak menyediakan layanan lokasi.');
      return Promise.resolve(null);
    }
    setGeoError('Mencari lokasi perangkat…');
    geoRequestRef.current = new Promise(resolve => navigator.geolocation.getCurrentPosition(position => {
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      geoUpdatedAtRef.current = Date.now();
      setGeoPosition(point); setGeoError(''); geoRequestRef.current = null; resolve(point);
    }, error => {
      const message = error.code === 1 ? 'Izin lokasi ditolak; koordinat tidak akan tercantum.' : 'Lokasi tidak ditemukan; coba aktifkan GPS.';
      setGeoError(message); geoRequestRef.current = null; resolve(null);
    }, { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }));
    return geoRequestRef.current;
  }

  async function startCamera() {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Kamera langsung memerlukan browser yang mendukung kamera dan koneksi HTTPS.');
      setCameraOpen(true);
      return;
    }
    setCameraOpen(true);
    readGeolocation();
    try { setCameraStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })); }
    catch (error) { setCameraError(error.name === 'NotAllowedError' ? 'Izin kamera ditolak. Izinkan akses kamera di pengaturan browser.' : `Kamera tidak dapat dibuka: ${error.message}`); }
  }

  function closeCamera() {
    cameraStream?.getTracks().forEach(track => track.stop());
    setCameraStream(null); setCameraOpen(false); setCameraError('');
  }

  function closeLogModal() {
    closeCamera();
    setCapturedPhoto(null); setLogSaveError(''); setModal(false);
  }

  function photoMetadata(position) {
    const now = new Date();
    const day = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(now);
    const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
    const latitude = position?.latitude ?? null, longitude = position?.longitude ?? null;
    return { day, date, time, latitude, longitude, location: latitude == null ? 'Lokasi tidak tersedia' : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  }

  function stampPhoto(source, width, height, metadata) {
    const scale = Math.min(1, 1440 / Math.max(width, height));
    width = Math.round(width * scale); height = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(source, 0, 0, width, height);
    const padding = Math.max(14, Math.round(width * .025));
    const lineHeight = Math.max(20, Math.round(width * .032));
    const fontSize = Math.max(13, Math.round(width * .021));
    const panelHeight = padding * 2 + lineHeight * 4;
    context.fillStyle = 'rgba(76, 10, 28, .82)';
    context.fillRect(0, height - panelHeight, width, panelHeight);
    context.fillStyle = '#f5d65f';
    context.font = `700 ${fontSize}px Arial, sans-serif`;
    context.fillText('MARIMAS  •  BUKTI KEGIATAN MAGANG', padding, height - panelHeight + padding + fontSize);
    context.fillStyle = '#ffffff';
    context.font = `600 ${fontSize}px Arial, sans-serif`;
    context.fillText(`${metadata.day}, ${metadata.date}  •  ${metadata.time}`, padding, height - panelHeight + padding + lineHeight + fontSize);
    context.fillText(`Lokasi: ${metadata.location}`, padding, height - panelHeight + padding + lineHeight * 2 + fontSize);
    context.fillText(`Lat ${metadata.latitude ?? '—'}   Lon ${metadata.longitude ?? '—'}`, padding, height - panelHeight + padding + lineHeight * 3 + fontSize);
    return compressCanvas(canvas, 180 * 1024);
  }

  async function capturePhoto() {
    const video = cameraVideoRef.current;
    if (!video?.videoWidth) return notify('Tunggu sampai kamera siap.');
    const position = await readGeolocation();
    const metadata = photoMetadata(position);
    const blob = await stampPhoto(video, video.videoWidth, video.videoHeight, metadata);
    if (!blob) return notify('Foto tidak dapat diproses. Coba ambil ulang.');
    setCapturedPhoto({ blob, previewUrl: URL.createObjectURL(blob), metadata });
    closeCamera();
  }

  async function chooseLogPhoto(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify('Pilih file gambar yang valid.');
    if (file.size > 10 * 1024 * 1024) return notify('Ukuran foto maksimal 10 MB.');
    try {
      const position = await readGeolocation();
      const metadata = photoMetadata(position);
      const image = await createImageBitmap(file);
      const blob = await stampPhoto(image, image.width, image.height, metadata);
      image.close?.();
      if (!blob) return notify('Foto tidak dapat diproses.');
      setCapturedPhoto({ blob, previewUrl: URL.createObjectURL(blob), metadata });
    } catch (error) { notify(`Foto tidak dapat dibaca: ${error.message}`); }
  }
  async function reviewLog(log, status, comment) {
    if (status === 'Perlu revisi' && !comment.trim()) return notify('Tulis komentar agar mahasiswa tahu bagian yang perlu diperbaiki.');
    try { await updateDoc(doc(db, 'logbooks', log.id), { status, reviewedAt: serverTimestamp(), reviewedBy: user.uid, reviewComment: comment.trim().slice(0, 1000) }); setReviewModal(null); notify(`Logbook ${status.toLowerCase()}.`); }
    catch (error) { notify(`Tidak dapat memperbarui logbook: ${error.message}`); }
  }
  async function saveEvaluation(event) {
    event.preventDefault(); if (!evalForm.studentId) return notify('Pilih mahasiswa terlebih dahulu.');
    const target = students.find(item => item.uid === evalForm.studentId);
    try { await addDoc(collection(db, 'evaluations'), { ...evalForm, type: role === 'Pembimbing Lapangan' ? 'Penilaian Akhir' : 'Penilaian', date: today(), studentName: target?.name || '', evaluatorId: user.uid, evaluatorName: name, evaluatorRole: role, createdAt: serverTimestamp() }); setEvalForm(current => ({ ...current, note: '' })); notify('Penilaian berhasil disimpan.'); }
    catch (error) { notify(`Penilaian gagal disimpan: ${error.message}`); }
  }
  async function changeRole(student, nextRole) {
    try { await updateDoc(doc(db, 'users', student.uid), { role: nextRole }); notify(`Role ${student.name} diubah menjadi ${nextRole}.`); }
    catch (error) { notify(`Role gagal diperbarui: ${error.message}`); }
  }
  async function changeAccountStatus(student, accountStatus) {
    try { await updateDoc(doc(db, 'users', student.uid), { accountStatus, ...(accountStatus === 'Disetujui' ? { role: student.requestedRole || student.role || 'Mahasiswa' } : {}), reviewedBy: user.uid, reviewedAt: serverTimestamp() }); notify(`Akun ${student.name} ${accountStatus === 'Disetujui' ? 'disetujui' : 'ditolak'}.`); }
    catch (error) { notify(`Status akun gagal diperbarui: ${error.message}`); }
  }
  async function refreshProfile() {
    try { const snapshot = await getDoc(doc(db, 'users', user.uid)); if (snapshot.exists()) setProfile({ ...snapshot.data(), uid: user.uid }); }
    catch (error) { notify(`Status akun belum dapat dimuat: ${error.message}`); }
  }

  async function saveNewPassword(event) {
    event.preventDefault();
    if (passwordForm.next.length < 6) return notify('Kata sandi baru minimal 6 karakter.');
    if (passwordForm.next !== passwordForm.confirm) return notify('Konfirmasi kata sandi baru belum cocok.');
    setProfileBusy(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordForm.current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordForm.next);
      setPasswordForm({ current: '', next: '', confirm: '' });
      notify('Kata sandi berhasil diperbarui.');
    } catch (error) {
      const message = error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
        ? 'Kata sandi lama tidak sesuai.'
        : error.code === 'auth/weak-password' ? 'Kata sandi baru terlalu lemah.'
          : error.code === 'auth/requires-recent-login' ? 'Silakan keluar lalu masuk kembali sebelum mengganti kata sandi.'
            : `Kata sandi gagal diperbarui: ${error.message}`;
      notify(message);
    } finally { setProfileBusy(false); }
  }

  async function saveProfilePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify('Pilih file gambar yang valid.');
    if (file.size > 10 * 1024 * 1024) return notify('Ukuran foto sumber maksimal 10 MB.');
    setProfileBusy(true);
    try {
      const image = await createImageBitmap(file);
      const blob = await makeImageBlob(image, image.width, image.height, 180 * 1024, 640);
      image.close?.();
      if (!blob) return notify('Foto profil tidak dapat dikompres. Pilih foto lain.');
      const photoData = await blobToDataUrl(blob);
      await setDoc(doc(db, 'profilePhotos', user.uid), { photoData, updatedAt: serverTimestamp() });
      setProfilePhotoData(photoData);
      notify('Foto profil berhasil disimpan.');
    } catch (error) { notify(`Foto gagal disimpan: ${error.message}`); }
    finally { setProfileBusy(false); }
  }

  async function showEvidence(log) {
    setEvidenceModal({ loading: true, title: log.title });
    try {
      const snapshot = await getDoc(doc(db, 'logbookPhotos', log.photoEvidenceId || log.id));
      if (!snapshot.exists()) throw new Error('Foto bukti tidak ditemukan.');
      setEvidenceModal({ loading: false, title: log.title, photoData: snapshot.data().photoData, metadata: log.photoMetadata });
    } catch (error) {
      setEvidenceModal({ loading: false, title: log.title, error: error.message });
    }
  }

  if (user === undefined) return <div className="loading-screen"><Brand /><span className="loader" />Memuat portal magang...</div>;
  if (!user) return <SignIn onConfigured={() => location.reload()} />;
  if (!profile || (profile.role !== 'Admin' && profile.accountStatus !== 'Disetujui')) return <AccountReview status={profile?.accountStatus || 'Menunggu verifikasi'} email={user.email} onRefresh={refreshProfile} onSignOut={() => signOut(auth)} />;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}><Brand /><div className="sidebar-label">MENU UTAMA</div><nav className="main-nav">{nav.filter(item => item.id !== 'mahasiswa' || role !== 'Mahasiswa').map(({ id, label, Icon }) => <button key={id} onClick={() => { setPage(id); location.hash = id; setMobileNav(false); }} className={`nav-link ${page === id ? 'active' : ''}`}><Icon size={17} />{label}{id === 'logbook' && <span className="nav-count">{logs.length}</span>}{id === 'mahasiswa' && role === 'Admin' && <span className="nav-count">{students.filter(item => item.accountStatus === 'Menunggu verifikasi' || (!item.accountStatus && item.role !== 'Admin')).length}</span>}</button>)}</nav><div className="sidebar-divider" /><div className="sidebar-label">AKUN</div><div className="sidebar-bottom"><div className="help-card"><span className="help-spark">✳</span><strong>Butuh bantuan?</strong><p>Tim akademik siap membantu perjalanan magangmu.</p><a href="mailto:humas@unsulbar.ac.id">Hubungi kami ↗</a></div><div className="user-mini"><div className="avatar avatar-green">{initials(name)}</div><div className="user-mini-copy"><strong>{name}</strong><small>{role}</small></div><button title="Keluar" className="icon-button" onClick={() => signOut(auth)}><LogOut size={15} /></button></div></div></aside>
    <main className="main-area"><header className="topbar"><button className="icon-button menu-toggle" onClick={() => setMobileNav(!mobileNav)} aria-label="Buka menu"><Menu /></button><div className="breadcrumb"><span>Magang Mandiri</span><span className="crumb-sep">/</span><strong>{nav.find(item => item.id === page)?.label || 'Dashboard'}</strong></div><div className="top-actions"><span className="role-badge">{role}</span><button className="icon-button notification-button" title="Notifikasi"><Bell size={17} /><i /></button><div className="profile-menu" ref={profileMenuRef}><button type="button" className="top-avatar avatar avatar-green profile-menu-trigger" aria-label={`Menu profil ${name}`} aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen(open => !open)}>{profilePhotoData || photoURL ? <img src={profilePhotoData || photoURL} alt="" /> : initials(name)}</button>{profileMenuOpen && <div className="profile-dropdown" role="menu"><div className="profile-dropdown-header"><strong>{name}</strong><span>{user.email}</span><small>{role}</small></div><div className="profile-dropdown-divider" /><button type="button" className="profile-dropdown-item" role="menuitem" onClick={() => { setPage('pengaturan'); location.hash = 'pengaturan'; setProfileMenuOpen(false); setMobileNav(false); }}><Settings size={17} /> Profil</button><button type="button" className="profile-dropdown-item profile-dropdown-logout" role="menuitem" onClick={() => { setProfileMenuOpen(false); signOut(auth); }}><LogOut size={17} /> Keluar</button></div>}</div></div></header>
    <div className="content-wrap">
      {page === 'dashboard' && <><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" />MAGANG MANDIRI HUMAS</div><h1>Selamat datang, <span>{name.split(' ')[0]}</span> <span className="wave">✳</span></h1><p className="page-subtitle">{role === 'Mahasiswa' ? 'Terus berkembang, satu cerita dan pengalaman baru setiap hari.' : `Pantau kegiatan dan perkembangan ${role.toLowerCase()}.`}</p></div>{role === 'Mahasiswa' && <button className="button button-primary" onClick={() => setModal(true)}><Plus size={15} /> Tulis logbook</button>}</div><section className="hero-card"><div className="hero-content"><div className="hero-tag">✦ &nbsp;PERJALANAN MAGANGMU</div><h2>Belajar hari ini,<br /><em>berdampak esok hari.</em></h2><p>Catat proses, rayakan progres. Setiap langkah kecil membangun profesional humas masa depan.</p><button className="hero-link" onClick={() => { setPage('logbook'); location.hash = 'logbook'; }}>Lihat aktivitas magang <ArrowUpRight size={13} /></button></div><div className="hero-art"><div className="art-circle"><div className="art-sun" /><div className="art-hill" /><div className="art-person">✦</div></div><div className="art-note">✦ &nbsp;MAKE IT<br />&nbsp;&nbsp;&nbsp; MEANINGFUL</div></div></section><div className="section-heading"><div><h2>Ringkasan aktivitas</h2><p>Pantau progres magangmu di sini.</p></div><span className="term-chip"><i />Semester Ganjil 2025/2026</span></div><div className="stats-grid dashboard-stats"><Stat icon={<FileText />} label="Total logbook" value={logs.length} suffix="entri" note={`${pending} menunggu persetujuan`} /><Stat icon={<Star />} label="Rata-rata nilai" value={average} suffix={average === '—' ? '' : '/ 100'} note={`${evaluations.length} penilaian diterima`} color="peach" /></div><div className="dashboard-grid"><section className="panel activity-panel"><PanelHeading title="Aktivitas terbaru" subtitle="Perjalanan magangmu" action={<button className="text-button" onClick={() => { setPage('logbook'); location.hash = 'logbook'; }}>Lihat semua <ArrowRight size={13} /></button>} />{logs.slice(0, 4).map(log => <div className="activity-item" key={log.id}><div className="activity-icon"><FileText size={15} /></div><div className="activity-copy"><strong>{log.title}</strong><small>{prettyDate(log.date)} · {log.category}</small></div><Status value={log.status} /></div>)}{!logs.length && <Empty text="Belum ada logbook. Catat aktivitas pertamamu." />}</section><section className="panel progress-panel"><PanelHeading title="Perjalanan magang" subtitle="Progres kegiatanmu" /><div className="progress-date"><span>Logbook terkirim</span><span>{logs.length} aktivitas</span></div><div className="timeline"><div className="timeline-track"><span style={{ width: `${Math.min(logs.length * 5, 100)}%` }} /></div><i className="timeline-marker" /></div><div className="progress-bottom"><span><b>{logs.length}</b> aktivitas tercatat</span><strong>{logs.length ? 'Terus semangat!' : 'Mulai hari ini'}</strong></div><div className="mentor-row"><div className="mentor-avatar"><GraduationCap size={15} /></div><div><small>Role akun</small><strong>{role}</strong></div><span className="mentor-status"><CheckCircle2 size={14} /></span></div></section></div><div className="bottom-banner"><div className="banner-icon">✳</div><div><strong>Punya cerita magang hari ini?</strong><p>Jangan lupa catat pengalaman dan pembelajaran barumu.</p></div>{role === 'Mahasiswa' && <button className="button button-light" onClick={() => setModal(true)}>Isi logbook <ArrowRight size={13} /></button>}</div></>}

      {page === 'logbook' && <><PageTitle eyebrow="CATAT DAN BERTUMBUH" title="Logbook" subtitle="Dokumentasikan aktivitas dan pembelajaran magang." action={role === 'Mahasiswa' && <button className="button button-primary" onClick={() => setModal(true)}><Plus size={15} /> Tambah logbook</button>} /><div className="filter-row"><div className="search-box"><Search size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari aktivitas..." /></div><select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>Semua</option><option>Disetujui</option><option>Menunggu</option><option>Perlu revisi</option></select></div><section className="panel table-panel"><div className="table-wrap"><table className={role === 'Pembimbing Lapangan' ? 'logbook-table logbook-table-review' : 'logbook-table'}><thead><tr><th>TANGGAL</th><th>MAHASISWA</th><th>AKTIVITAS</th><th>KATEGORI</th><th>DURASI</th><th>STATUS</th><th>KOMENTAR PEMBIMBING</th>{role === 'Pembimbing Lapangan' && <th>VERIFIKASI</th>}</tr></thead><tbody>{filteredLogs.map(log => <tr key={log.id}><td>{prettyDate(log.date)}</td><td>{log.studentName || name}</td><td><b className="table-title">{log.title}</b>{log.photoEvidenceId && <button type="button" className="logbook-photo-link" onClick={() => showEvidence(log)}><ImagePlus size={16} /> Lihat foto bukti</button>}{log.photoMetadata && <small className="table-description">{log.photoMetadata.day}, {log.photoMetadata.date} · {log.photoMetadata.time}<br />{log.photoMetadata.latitude != null ? `Lat ${Number(log.photoMetadata.latitude).toFixed(5)}, Lon ${Number(log.photoMetadata.longitude).toFixed(5)}` : 'Lokasi tidak tersedia'}</small>}{log.description && <small className="table-description">{log.description}</small>}</td><td><span className="category-pill">{log.category}</span></td><td>{duration(log)}</td><td><Status value={log.status} /></td><td>{log.reviewComment || '—'}</td>{role === 'Pembimbing Lapangan' && <td>{log.status === 'Menunggu' ? <div className="review-actions"><button className="approve-button" onClick={() => setReviewModal({ log, status: 'Disetujui', comment: log.reviewComment || '' })}><Check size={14} /> Setujui</button><button className="revise-button" onClick={() => setReviewModal({ log, status: 'Perlu revisi', comment: log.reviewComment || '' })}>Perlu revisi</button></div> : 'Sudah diverifikasi'}</td>}</tr>)}</tbody></table>{!filteredLogs.length && <Empty text="Belum ada aktivitas yang cocok." />}</div><div className="table-footer">Menampilkan {filteredLogs.length} aktivitas</div></section></>}

      {page === 'penilaian' && <><PageTitle eyebrow="EVALUASI DAN UMPAN BALIK" title="Penilaian" subtitle="Lihat perkembangan dan penilaian selama masa magang." /><section className="score-overview"><div><span className="score-label">RATA-RATA NILAI</span><div className="big-score">{average}<span>{average === '—' ? '' : '/ 100'}</span></div><div className="score-caption"><span>★★★★★</span> {evaluations.length ? `${evaluations.length} penilaian tercatat` : 'Belum ada penilaian'}</div></div><div className="score-ring" style={{ '--score': `${Number(average) || 0}%` }}><div className="ring-text"><strong>{average === '—' ? '—' : Math.round(Number(average))}</strong><small>SKOR</small></div></div><div className="score-summary"><strong>Perkembangan kompetensi</strong><p>Penilaian diberikan oleh dosen pembimbing dan pembimbing lapangan.</p><div className="score-key"><span><i className="key-dot green" /> Dosen Pembimbing <b>{evaluations.filter(item => item.evaluatorRole === 'Dosen Pembimbing').length} penilaian</b></span><span><i className="key-dot purple" /> Pembimbing Lapangan <b>{evaluations.filter(item => item.evaluatorRole === 'Pembimbing Lapangan').length} penilaian</b></span></div></div></section><div className="section-heading"><div><h2>Riwayat penilaian</h2><p>Umpan balik kompetensi dan kinerja.</p></div></div><section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>TANGGAL</th><th>MAHASISWA</th><th>KOMPETENSI</th><th>JENIS</th><th>PENILAI</th><th>NILAI</th><th>CATATAN</th></tr></thead><tbody>{evaluations.map(item => <tr key={item.id}><td>{prettyDate(item.date)}</td><td>{item.studentName || name}</td><td>{item.criterion}</td><td>{item.type || 'Penilaian'}</td><td>{item.evaluatorName} <small className="table-description">{item.evaluatorRole}</small></td><td><b className="score-cell">{item.score}/100</b></td><td>{item.note || '—'}</td></tr>)}</tbody></table>{!evaluations.length && <Empty text="Belum ada penilaian. Pembimbing dapat mengisi formulir penilaian di bawah." />}</div></section>{canReview && <section className="panel submit-evaluation"><PanelHeading title={role === 'Pembimbing Lapangan' ? 'Penilaian akhir mahasiswa' : 'Berikan penilaian mahasiswa'} subtitle={role === 'Pembimbing Lapangan' ? 'Berikan nilai akhir dan catatan evaluasi setelah masa magang.' : 'Evaluasi kompetensi berdasarkan kegiatan magang.'} /><form className="evaluation-form" onSubmit={saveEvaluation}><label>Mahasiswa<select required value={evalForm.studentId} onChange={e => setEvalForm({ ...evalForm, studentId: e.target.value })}><option value="">Pilih mahasiswa</option>{students.filter(student => student.role === 'Mahasiswa').map(student => <option key={student.uid} value={student.uid}>{student.name} — {student.nim || student.email}</option>)}</select></label><label>Kompetensi<select value={evalForm.criterion} onChange={e => setEvalForm({ ...evalForm, criterion: e.target.value })}>{['Komunikasi profesional', 'Kedisiplinan & tanggung jawab', 'Kolaborasi tim', 'Kreativitas & inisiatif', 'Pemahaman teori komunikasi', 'Kualitas laporan & refleksi'].map(item => <option key={item}>{item}</option>)}</select></label><label className="range-field">{role === 'Pembimbing Lapangan' ? 'Nilai akhir' : 'Nilai'} <b>{evalForm.score}/100</b><input type="range" min="0" max="100" value={evalForm.score} onChange={e => setEvalForm({ ...evalForm, score: Number(e.target.value) })} /></label><label className="wide-field">Catatan<textarea rows="3" value={evalForm.note} onChange={e => setEvalForm({ ...evalForm, note: e.target.value })} placeholder="Tulis umpan balik untuk mahasiswa..." /></label><button className="button button-primary">Simpan penilaian <ArrowRight size={14} /></button></form></section>}</>}

      {page === 'mahasiswa' && <><PageTitle eyebrow="DATA AKADEMIK" title="Mahasiswa" subtitle="Periksa identitas dan setujui pendaftar sebelum mereka dapat memakai portal." /><div className="stats-grid"><Stat icon={<Users />} label="Mahasiswa terdaftar" value={students.filter(item => item.role === 'Mahasiswa').length} suffix="mahasiswa" /><Stat icon={<Star />} label="Pembimbing terdaftar" value={students.filter(item => item.role !== 'Mahasiswa').length} suffix="akun" color="peach" /><Stat icon={<ClipboardList />} label="Logbook perlu ditinjau" value={pending} suffix="entri" color="lilac" /></div><section className="panel student-panel"><PanelHeading title="Daftar akun" subtitle="Mahasiswa dapat mendaftar sendiri; Admin mengatur role akun." /><div className="table-wrap"><table><thead><tr><th>AKUN</th><th>NIM / UNIT</th><th>EMAIL</th><th>PROGRAM STUDI</th><th>ROLE DIMINTA</th><th>ROLE AKTIF</th>{role === 'Admin' && <><th>STATUS AKUN</th><th>VERIFIKASI</th></>}</tr></thead><tbody>{students.filter(item => `${item.name} ${item.email}`.toLowerCase().includes(search.toLowerCase())).map(item => <tr key={item.uid}><td><div className="student-name"><div className="avatar avatar-green">{initials(item.name)}</div><b>{item.name}</b></div></td><td>{item.nim || '—'}</td><td>{item.email}</td><td>{item.programStudi || item.unitKerja || '—'}</td><td>{item.requestedRole || item.role}</td><td>{role === 'Admin' ? <select className="role-select" value={item.role} onChange={event => changeRole(item, event.target.value)}>{roles.map(option => <option key={option}>{option}</option>)}</select> : <Status value={item.role} />}</td>{role === 'Admin' && <><td><Status value={item.accountStatus || (item.role === 'Admin' ? 'Disetujui' : 'Menunggu verifikasi')} /></td><td>{(item.accountStatus === 'Menunggu verifikasi' || (!item.accountStatus && item.role !== 'Admin')) ? <div className="review-actions"><button className="approve-button" onClick={() => changeAccountStatus(item, 'Disetujui')}>Setujui</button><button className="revise-button" onClick={() => changeAccountStatus(item, 'Ditolak')}>Tolak</button></div> : item.accountStatus === 'Ditolak' ? <button className="approve-button" onClick={() => changeAccountStatus(item, 'Disetujui')}>Aktifkan</button> : '—'}</td></>}</tr>)}</tbody></table>{!students.length && <Empty text="Belum ada akun terdaftar. Mahasiswa dapat membuat akun dari halaman masuk." />}</div></section></>}

      {page === 'pengaturan' && <><PageTitle eyebrow="AKUN DAN PREFERENSI" title="Profil" subtitle="Kelola foto dan keamanan akun Magang Mandiri Humas." /><section className="panel settings-panel"><div className="settings-profile-summary"><div className="settings-avatar avatar avatar-green">{profilePhotoData || photoURL ? <img src={profilePhotoData || photoURL} alt={`Foto profil ${name}`} /> : initials(name)}</div><div className="settings-details"><h2>{name}</h2><p>{user.email}</p><Status value={role} /></div></div><div className="settings-section"><h2>Foto profil</h2><p>Foto dikompres sebelum disimpan ke database aplikasi. Pilih gambar hingga 10 MB.</p><div className="photo-actions"><input ref={galleryInputRef} className="visually-hidden-input" type="file" accept="image/*" onChange={saveProfilePhoto} /><input ref={cameraInputRef} className="visually-hidden-input" type="file" accept="image/*" capture="user" onChange={saveProfilePhoto} /><button className="button button-outline" type="button" disabled={profileBusy} onClick={() => galleryInputRef.current?.click()}>Pilih dari galeri</button><button className="button button-outline" type="button" disabled={profileBusy} onClick={() => cameraInputRef.current?.click()}>Ambil foto</button></div></div><div className="settings-section"><h2>Ubah kata sandi</h2><p>Masukkan kata sandi lama untuk memverifikasi identitas sebelum menyimpan kata sandi baru.</p><form className="password-change-form" onSubmit={saveNewPassword}><label>Kata sandi lama<input required type="password" autoComplete="current-password" value={passwordForm.current} onChange={event => setPasswordForm({ ...passwordForm, current: event.target.value })} /></label><label>Kata sandi baru<input required type="password" minLength="6" autoComplete="new-password" value={passwordForm.next} onChange={event => setPasswordForm({ ...passwordForm, next: event.target.value })} /></label><label>Ulangi kata sandi baru<input required type="password" minLength="6" autoComplete="new-password" value={passwordForm.confirm} onChange={event => setPasswordForm({ ...passwordForm, confirm: event.target.value })} /></label><button className="button button-primary" disabled={profileBusy}>{profileBusy ? 'Menyimpan…' : 'Simpan kata sandi'}</button></form></div><div className="settings-section settings-account-meta"><div className="profile-field"><small>UID Firebase</small><code>{user.uid}</code></div><p className="settings-help">Perubahan role hanya dapat dilakukan oleh Admin melalui koleksi <code>users</code> di Firebase Console.</p><button className="button button-outline" onClick={() => signOut(auth)}><LogOut size={15} /> Keluar dari akun</button></div></section></>}
      <footer className="footer"><span>MARIMAS · Magang Mandiri Humas · Universitas Sulawesi Barat</span><span>Ruang tumbuh, berkarya, dan berdampak <b>✳</b></span></footer>
    </div></main>
    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closeLogModal(); }}><section className="modal" role="dialog" aria-modal="true"><div className="modal-top"><div><div className="eyebrow"><span className="eyebrow-dot" />CATAT HARI INI</div><h2>Tambah logbook</h2><p>Ambil foto bukti dengan lokasi dan waktu kegiatan.</p></div><button className="icon-button" onClick={closeLogModal} aria-label="Tutup"><X size={18} /></button></div><form onSubmit={saveLog}><label>Tanggal kegiatan<input required type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} /></label><label>Judul aktivitas<input required value={logForm.title} onChange={e => setLogForm({ ...logForm, title: e.target.value })} placeholder="Contoh: Mendokumentasikan kegiatan humas" /></label><label>Kategori<select value={logForm.category} onChange={e => setLogForm({ ...logForm, category: e.target.value })}>{['Konten & Media', 'Hubungan Media', 'Dokumentasi', 'Riset & Analisis', 'Administrasi', 'Lainnya'].map(item => <option key={item}>{item}</option>)}</select></label><div className="form-pair"><label>Jam mulai<input required type="time" value={logForm.start} onChange={e => setLogForm({ ...logForm, start: e.target.value })} /></label><label>Jam selesai<input required type="time" value={logForm.end} onChange={e => setLogForm({ ...logForm, end: e.target.value })} /></label></div><div className="log-photo-field"><div><strong>Foto bukti kegiatan</strong><p>Foto akan diberi cap otomatis berisi hari, tanggal, jam, dan koordinat GPS, lalu diperkecil agar lebih cepat dikirim.</p></div><input ref={photoGalleryRef} className="visually-hidden-input" type="file" accept="image/*" onChange={chooseLogPhoto} /><div className="log-photo-actions"><button type="button" className="button button-primary" onClick={startCamera}><Camera size={16} /> Ambil foto langsung</button><button type="button" className="button button-outline" onClick={() => photoGalleryRef.current?.click()}><ImagePlus size={16} /> Pilih dari galeri</button></div>{geoError && <small className="geo-hint"><MapPin size={14} /> {geoError}</small>}{capturedPhoto && <div className="captured-photo-preview"><img src={capturedPhoto.previewUrl} alt="Pratinjau foto bukti kegiatan dengan cap lokasi dan waktu" /><div><strong>Foto bukti siap</strong><small>{capturedPhoto.metadata.day}, {capturedPhoto.metadata.date} · {capturedPhoto.metadata.time}</small><small>{capturedPhoto.metadata.latitude != null ? `Lat ${capturedPhoto.metadata.latitude.toFixed(6)} · Lon ${capturedPhoto.metadata.longitude.toFixed(6)}` : 'Lokasi tidak tersedia'}</small><button type="button" className="text-button" onClick={() => setCapturedPhoto(null)}>Hapus foto</button></div></div>}</div>{logSaveError && <div className="form-error log-save-error" role="alert">{logSaveError}</div>}<div className="modal-actions"><button type="button" className="button button-outline" onClick={closeLogModal}>Batal</button><button className="button button-primary" disabled={logSaving || !capturedPhoto}>{logSaving ? logSavingStage : 'Simpan logbook'} <ArrowRight size={14} /></button></div></form></section></div>}
    {cameraOpen && <div className="camera-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeCamera(); }}><section className="camera-dialog" role="dialog" aria-modal="true" aria-labelledby="camera-title"><div className="camera-dialog-top"><div><span className="eyebrow"><span className="eyebrow-dot" />BUKTI KEGIATAN</span><h2 id="camera-title">Ambil foto</h2></div><button className="icon-button" onClick={closeCamera} aria-label="Tutup kamera"><X size={18} /></button></div>{cameraError ? <div className="camera-error"><Camera size={24} /><p>{cameraError}</p><button className="button button-outline" onClick={closeCamera}>Tutup</button></div> : <><div className="camera-view"><video ref={cameraVideoRef} autoPlay muted playsInline /><div className="camera-live-stamp"><strong>MARIMAS · BUKTI KEGIATAN</strong><span>{photoMetadata(geoPosition).day}, {photoMetadata(geoPosition).date} · {photoMetadata(geoPosition).time}</span><span><LocateFixed size={13} /> {geoPosition ? `${geoPosition.latitude.toFixed(6)}, ${geoPosition.longitude.toFixed(6)}` : 'Menunggu koordinat GPS…'}</span></div></div>{geoError && <small className="geo-hint"><MapPin size={14} /> {geoError}</small>}<div className="camera-actions"><button className="button button-outline" onClick={closeCamera}>Batal</button><button className="button button-primary" disabled={!cameraStream} onClick={capturePhoto}><Camera size={17} /> Ambil foto</button></div></>}</section></div>}
    {reviewModal && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setReviewModal(null); }}><section className="modal review-modal" role="dialog" aria-modal="true" aria-labelledby="review-modal-title"><div className="modal-top"><div><div className="eyebrow"><span className="eyebrow-dot" />VERIFIKASI LOGBOOK</div><h2 id="review-modal-title">{reviewModal.status === 'Disetujui' ? 'Setujui aktivitas?' : 'Minta perbaikan?'}</h2><p>{reviewModal.log.title}</p></div><button className="icon-button" onClick={() => setReviewModal(null)} aria-label="Tutup"><X size={18} /></button></div><form onSubmit={event => { event.preventDefault(); reviewLog(reviewModal.log, reviewModal.status, reviewModal.comment); }}><label>Komentar untuk mahasiswa<textarea rows="4" maxLength="1000" required={reviewModal.status === 'Perlu revisi'} value={reviewModal.comment} onChange={event => setReviewModal({ ...reviewModal, comment: event.target.value })} placeholder={reviewModal.status === 'Disetujui' ? 'Tulis catatan atau apresiasi (opsional)...' : 'Jelaskan bagian yang perlu diperbaiki...'} /></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setReviewModal(null)}>Batal</button><button className="button button-primary">{reviewModal.status === 'Disetujui' ? 'Konfirmasi persetujuan' : 'Kirim komentar revisi'} <ArrowRight size={14} /></button></div></form></section></div>}
    {evidenceModal && <div className="modal-backdrop evidence-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setEvidenceModal(null); }}><section className="evidence-dialog" role="dialog" aria-modal="true" aria-labelledby="evidence-title"><div className="modal-top"><div><div className="eyebrow"><span className="eyebrow-dot" />FOTO BUKTI LOGBOOK</div><h2 id="evidence-title">{evidenceModal.title}</h2></div><button className="icon-button" onClick={() => setEvidenceModal(null)} aria-label="Tutup"><X size={18} /></button></div>{evidenceModal.loading ? <p>Memuat foto…</p> : evidenceModal.error ? <p>{evidenceModal.error}</p> : <><img className="evidence-image" src={evidenceModal.photoData} alt={`Foto bukti: ${evidenceModal.title}`} /><p className="evidence-metadata">{evidenceModal.metadata?.day}, {evidenceModal.metadata?.date} · {evidenceModal.metadata?.time}<br />{evidenceModal.metadata?.latitude != null ? `Latitude ${Number(evidenceModal.metadata.latitude).toFixed(6)} · Longitude ${Number(evidenceModal.metadata.longitude).toFixed(6)}` : 'Lokasi tidak tersedia'}</p></>}<div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setEvidenceModal(null)}>Tutup</button></div></section></div>}
    {toast && <div className="toast"><CheckCircle2 size={18} /><span>{toast}</span></div>}
  </div>;
}

function PageTitle({ eyebrow, title, subtitle, action }) { return <div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" />{eyebrow}</div><h1>{title} <span className="wave">✳</span></h1><p className="page-subtitle">{subtitle}</p></div>{action}</div>; }
function PanelHeading({ title, subtitle, action }) { return <div className="panel-heading"><div><h3>{title}</h3><p>{subtitle}</p></div>{action}</div>; }
function Stat({ icon, label, value, suffix, note, color = 'mint' }) { return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${color}`}>{icon}</span></div><div className="stat-value">{value} <small>{suffix}</small></div><div className="stat-note">{note}</div><div className="stat-progress"><span style={{ width: value === '—' ? '0%' : `${Math.min(Number(value) || 0, 100)}%` }} /></div></article>; }
function Empty({ text }) { return <div className="empty-state"><Activity size={19} /><span>{text}</span></div>; }
