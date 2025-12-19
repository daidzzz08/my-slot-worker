import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, deleteDoc, query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Trash2, ExternalLink, RefreshCw, Plus, ShieldAlert, Activity, WifiOff } from 'lucide-react';

// --- CẤU HÌNH ---
const firebaseConfig = {
  apiKey: "AIzaSyAjgMEBvwLopIA0smZXY8zpWL3uxiLjQtE",
  authDomain: "tool-theo-doi-slot.firebaseapp.com",
  projectId: "tool-theo-doi-slot",
  storageBucket: "tool-theo-doi-slot.firebasestorage.app",
  messagingSenderId: "84464301578",
  appId: "1:84464301578:web:3ea64e467eca65e847d1f3"
};

const APP_ID = 'duytan_sniper_v1';

// --- KHỞI TẠO AN TOÀN ---
// Tránh lỗi crash trắng màn hình nếu Firebase init thất bại
let app, db, auth, initError;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase Init Error:", e);
  initError = e.message;
}

export default function App() {
  const [targets, setTargets] = useState([]);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(initError || null);

  useEffect(() => {
    if (initError) return;

    // 1. Đăng nhập ẩn danh
    const initAuth = async () => {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.error("Auth Error:", e);
            setError("Lỗi xác thực: " + e.message);
        }
    };
    initAuth();

    // 2. Lắng nghe trạng thái user
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));

    // 3. Lắng nghe Data (chỉ khi có DB)
    let unsubData = () => {};
    if (db) {
        try {
            const q = query(
                collection(db, 'artifacts', APP_ID, 'public', 'data', 'targets'), 
                orderBy('createdAt', 'desc')
            );
            unsubData = onSnapshot(q, (snap) => {
                setTargets(snap.docs.map(d => ({id: d.id, ...d.data()})));
                setLoading(false);
            }, (err) => {
                console.error("Snapshot Error:", err);
                // Không set error toàn cục để tránh chặn UI, chỉ log
                setLoading(false); 
            });
        } catch (err) {
            console.error("Query Error:", err);
            setError("Lỗi truy vấn Database.");
            setLoading(false);
        }
    }

    return () => {
        unsubAuth();
        unsubData();
    };
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!url.includes('duytan.edu.vn')) return alert('Link phải chứa duytan.edu.vn!');
    if (!user) return alert('Đang kết nối server, vui lòng chờ...');
    
    try {
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'targets'), {
          name: name || 'Không tên', 
          url, 
          lastSlots: -1, 
          status: 'pending', 
          createdAt: serverTimestamp(),
          uid: user.uid
        });
        setUrl(''); setName('');
    } catch (err) {
        alert("Lỗi thêm: " + err.message);
    }
  };

  const remove = async (id) => {
    if(window.confirm('Xóa lớp này?')) { // Dùng window.confirm để tránh lỗi strict mode
        try {
            await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'targets', id));
        } catch(err) {
            alert("Lỗi xóa: " + err.message);
        }
    }
  };

  // --- GIAO DIỆN LỖI (Thay vì màn hình trắng) ---
  if (error) {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center text-red-500 p-4 font-mono">
              <div className="border border-red-800 p-6 rounded bg-red-900/10 max-w-md">
                  <ShieldAlert size={48} className="mb-4 mx-auto" />
                  <h2 className="text-xl font-bold mb-2 text-center">SYSTEM FAILURE</h2>
                  <p className="text-sm mb-4">{error}</p>
                  <button onClick={() => window.location.reload()} className="w-full bg-red-800 hover:bg-red-700 text-white py-2 rounded">
                      RELOAD SYSTEM
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-green-500 p-4 font-mono selection:bg-green-900 selection:text-white">
      <div className="max-w-4xl mx-auto border border-green-900 rounded-lg shadow-[0_0_30px_rgba(20,83,45,0.3)] bg-gray-900/80 backdrop-blur-md overflow-hidden">
        
        {/* Header */}
        <header className="p-6 border-b border-green-900 flex flex-col md:flex-row justify-between items-center bg-black/40 gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
                <Activity className="text-green-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-gray-100">
                DTU <span className="text-green-500">SNIPER</span>
              </h1>
              <p className="text-xs text-green-700 font-sans">
                STATUS: {loading ? 'CONNECTING...' : 'ONLINE'} | ID: {APP_ID}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="text-right">
                <div className="text-gray-500">TARGETS</div>
                <div className="text-xl text-white">{targets.length}</div>
            </div>
            <div className="h-8 w-px bg-green-900"></div>
            <div className="text-right">
                <div className="text-gray-500">AVAILABLE</div>
                <div className="text-xl text-green-400">
                    {targets.filter(t => t.lastSlots > 0).length}
                </div>
            </div>
          </div>
        </header>

        {/* Input Form */}
        <div className="p-6 bg-green-900/5 border-b border-green-900/50">
            <form onSubmit={add} className="flex flex-col md:flex-row gap-3">
            <input 
                value={name} onChange={e=>setName(e.target.value)} 
                placeholder="Tên gợi nhớ (VD: CS101)" 
                className="md:w-1/4 bg-gray-900 border border-green-800 p-3 rounded text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder-green-900/50"
            />
            <input 
                value={url} onChange={e=>setUrl(e.target.value)} 
                placeholder="Dán URL trang chi tiết lớp học..." 
                className="flex-1 bg-gray-900 border border-green-800 p-3 rounded text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder-green-900/50"
            />
            <button 
                type="submit" 
                disabled={!user}
                className="bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold px-6 py-3 rounded flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20"
            >
                <Plus size={18} /> TARGET
            </button>
            </form>
        </div>

        {/* Targets List */}
        <div className="divide-y divide-green-900/30 min-h-[300px]">
          {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-green-800 animate-pulse">
                  <RefreshCw size={32} className="animate-spin mb-4"/>
                  <p>SCANNING DATABASE...</p>
              </div>
          ) : targets.length === 0 ? (
            <div className="text-center py-20 text-green-900/50 flex flex-col items-center">
                <WifiOff size={48} className="mb-4 opacity-20"/>
                <p>[NO TARGETS ACQUIRED]</p>
                <p className="text-xs mt-2">Add a URL above to start monitoring</p>
            </div>
          ) : (
             targets.map(t => (
            <div key={t.id} className="group p-5 hover:bg-green-900/10 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              
              {/* Info Column */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg text-gray-200 truncate">{t.name}</h3>
                    {t.lastSlots > 0 ? (
                        <span className="bg-green-500 text-black text-[10px] px-2 py-0.5 rounded font-bold animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                            LIVE
                        </span>
                    ) : t.lastSlots === 0 ? (
                        <span className="bg-red-900/40 text-red-400 border border-red-900 text-[10px] px-2 py-0.5 rounded">
                            FULL
                        </span>
                    ) : (
                        <span className="bg-gray-800 text-gray-500 text-[10px] px-2 py-0.5 rounded">
                            PENDING
                        </span>
                    )}
                </div>
                
                <a href={t.url} target="_blank" rel="noreferrer" className="text-xs text-green-700 hover:text-green-400 flex items-center gap-1 transition-colors truncate mb-2">
                  <ExternalLink size={12}/> {t.url}
                </a>

                <div className="flex items-center gap-4 text-[10px] text-gray-500 font-sans">
                    <span className="flex items-center gap-1">
                        <RefreshCw size={10} /> 
                        Updated: {t.lastChecked ? new Date(t.lastChecked.seconds * 1000).toLocaleTimeString('vi-VN') : 'Waiting for worker...'}
                    </span>
                </div>
              </div>
              
              {/* Stats & Actions */}
              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-green-900/30 pt-4 md:pt-0">
                <div className="text-right">
                  <div className="text-[10px] text-green-800 uppercase tracking-widest mb-1">Capacity</div>
                  <div className={`text-3xl font-bold font-mono ${
                      t.lastSlots > 0 ? 'text-green-400' : 
                      t.lastSlots === 0 ? 'text-red-500' : 'text-gray-600'
                  }`}>
                    {t.lastSlots === -1 ? '--' : t.lastSlots}
                  </div>
                </div>
                
                <button 
                    onClick={() => remove(t.id)} 
                    className="p-3 text-green-900 hover:text-red-500 hover:bg-red-900/10 rounded transition-all ml-2"
                    title="Stop monitoring"
                >
                    <Trash2 size={20}/>
                </button>
              </div>
            </div>
          )))}
        </div>
      </div>
    </div>
  );
}
