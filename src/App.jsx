import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, deleteDoc, query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Trash2, ExternalLink, RefreshCw, Plus, ShieldAlert } from 'lucide-react';

// Config cho Client (Công khai không sao vì có Rules bảo vệ)
const firebaseConfig = {
  apiKey: "AIzaSyAjgMEBvwLopIA0smZXY8zpWL3uxiLjQtE",
  authDomain: "tool-theo-doi-slot.firebaseapp.com",
  projectId: "tool-theo-doi-slot",
  storageBucket: "tool-theo-doi-slot.firebasestorage.app",
  messagingSenderId: "84464301578",
  appId: "1:84464301578:web:3ea64e467eca65e847d1f3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const APP_ID = 'duytan_sniper_v1';

export default function App() {
  const [targets, setTargets] = useState([]);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signInAnonymously(auth);
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'targets'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setTargets(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setLoading(false);
    });
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!url.includes('duytan.edu.vn')) return alert('Link không đúng định dạng!');
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'targets'), {
      name, url, lastSlots: -1, status: 'pending', createdAt: serverTimestamp()
    });
    setUrl(''); setName('');
  };

  const remove = async (id) => {
    if(confirm('Xóa lớp này?')) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'targets', id));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 border-b border-gray-700 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">DTU SLOT HUNTER</h1>
            <p className="text-xs text-gray-500">Auto-check mỗi 15 phút</p>
          </div>
          <div className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></div>
        </header>

        <form onSubmit={add} className="bg-gray-800 p-4 rounded-lg mb-6 shadow-lg border border-gray-700 flex flex-col md:flex-row gap-3">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tên môn (VD: CS101)" className="bg-gray-900 border border-gray-600 p-2 rounded text-white flex-1 focus:border-blue-500 outline-none"/>
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Dán URL chi tiết lớp học..." className="bg-gray-900 border border-gray-600 p-2 rounded text-white flex-[2] focus:border-blue-500 outline-none"/>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded font-bold transition-colors flex items-center justify-center"><Plus/></button>
        </form>

        <div className="space-y-3">
          {loading ? <div className="text-center text-gray-500">Đang tải dữ liệu...</div> : targets.map(t => (
            <div key={t.id} className={`p-4 rounded-lg border flex items-center justify-between transition-all ${t.lastSlots > 0 ? 'bg-green-900/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-gray-800 border-gray-700'}`}>
              <div className="overflow-hidden">
                <h3 className="font-bold text-lg">{t.name}</h3>
                <a href={t.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 truncate max-w-[200px] md:max-w-md">
                  <ExternalLink size={10}/> Mở Link Gốc
                </a>
                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                  <RefreshCw size={10}/> Cập nhật: {t.lastChecked ? new Date(t.lastChecked.seconds * 1000).toLocaleTimeString('vi-VN') : 'Chưa chạy'}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`text-3xl font-mono font-bold ${t.lastSlots > 0 ? 'text-green-400' : t.lastSlots === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    {t.lastSlots === -1 ? '?' : t.lastSlots}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">SLOTS</div>
                </div>
                <button onClick={() => remove(t.id)} className="p-2 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={18}/></button>
              </div>
            </div>
          ))}
          {targets.length === 0 && <div className="text-center text-gray-600 py-10 border-2 border-dashed border-gray-800 rounded-lg">Chưa có môn nào. Thêm link vào đi bạn!</div>}
        </div>
      </div>
    </div>
  );
}
