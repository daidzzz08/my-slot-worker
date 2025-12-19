const axios = require('axios');
const cheerio = require('cheerio');
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp 
} = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

// --- CẤU HÌNH ---
// Lấy từ biến môi trường (Secrets) để bảo mật
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "tool-theo-doi-slot.firebaseapp.com",
  projectId: "tool-theo-doi-slot",
  storageBucket: "tool-theo-doi-slot.firebasestorage.app",
  messagingSenderId: "84464301578",
  appId: "1:84464301578:web:3ea64e467eca65e847d1f3"
};

const APP_ID = 'duytan_sniper_v1';
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Headers giả lập trình duyệt thật
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
};

async function checkSlot(url) {
  try {
    console.log(`Checking: ${url}`);
    const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);
    let slots = -1;

    // --- LOGIC TÌM SLOT (Dựa trên cấu trúc DTU) ---
    // Tìm tất cả thẻ td, lọc thẻ nào chứa chữ "Còn lại"
    $('td').each((i, el) => {
      const text = $(el).text().trim();
      // Mẫu nhận diện: "Còn lại", "Số lượng còn"
      if (text.match(/còn lại|số lượng/i)) {
        // Cách 1: Số nằm ngay trong text (VD: "Còn lại: 5")
        const matchInText = text.match(/(\d+)/);
        
        // Cách 2: Số nằm ở ô (td) bên cạnh
        const nextText = $(el).next('td').text().trim();
        const matchInNext = nextText.match(/(\d+)/);

        if (matchInNext) {
          slots = parseInt(matchInNext[0]);
          return false; // Break loop
        } else if (matchInText) {
          slots = parseInt(matchInText[0]);
          return false; // Break loop
        }
      }
    });

    if (slots === -1) {
       console.log(" -> Không tìm thấy thông tin slot (Cấu trúc lạ).");
    } else {
       console.log(` -> Tìm thấy: ${slots} slots.`);
    }
    return slots;

  } catch (error) {
    console.error(` -> Lỗi: ${error.message}`);
    return -2; // Mã lỗi mạng
  }
}

async function main() {
  await signInAnonymously(auth);
  const targetsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'targets');
  const snapshot = await getDocs(targetsRef);

  if (snapshot.empty) {
    console.log('Chưa có link nào để check.');
    process.exit(0);
  }

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.url && data.url.includes('duytan.edu.vn')) {
      const slots = await checkSlot(data.url);
      
      // Chỉ update nếu tìm thấy số hoặc lỗi mạng (không update nếu lỗi parse -1 để tránh báo sai)
      if (slots >= -2) {
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'targets', docSnap.id), {
          lastSlots: slots,
          lastChecked: serverTimestamp(),
          status: slots > 0 ? 'available' : 'full'
        });
      }
      // Nghỉ 3s để server trường không chặn
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  process.exit(0);
}

main();
