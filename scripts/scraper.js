const axios = require('axios');
const cheerio = require('cheerio');
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp 
} = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

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

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Hàm giả lập headers giống trình duyệt để tránh bị chặn
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

async function checkSlot(url) {
  try {
    console.log(`Checking: ${url}`);
    
    // 1. Tải HTML trang web
    const response = await axios.get(url, { 
      headers: HEADERS,
      timeout: 10000 // 10 giây timeout
    });

    // 2. Phân tích HTML bằng Cheerio
    const $ = cheerio.load(response.data);
    let slots = 0;
    let found = false;

    // --- LOGIC TÌM SỐ SLOT ---
    // Web trường thường để thông tin trong bảng (table)
    // Chúng ta sẽ tìm tất cả các thẻ td, nếu thấy chữ "Còn lại" hoặc "Số lượng còn"
    // thì lấy số ở ngay bên cạnh hoặc trong chính nó.
    
    $('td').each((i, el) => {
      const text = $(el).text().trim().toLowerCase();
      // Logic nhận diện: Điều chỉnh từ khóa này dựa trên HTML thực tế của trường
      // Ví dụ: "còn lại", "đã đăng ký", "sĩ số"
      if (text.includes('còn lại') || text.includes('số lượng còn')) {
         // Thử lấy số từ nội dung text (VD: "Còn lại: 5")
         const match = text.match(/(\d+)/);
         if (match) {
           slots = parseInt(match[0]);
           found = true;
           return false; // Break loop
         }
         
         // Hoặc thử lấy ở cột (td) tiếp theo
         const nextTdText = $(el).next().text().trim();
         const nextMatch = nextTdText.match(/(\d+)/);
         if (nextMatch) {
            slots = parseInt(nextMatch[0]);
            found = true;
            return false;
         }
      }
    });

    // Fallback: Nếu logic trên không tìm thấy, thử tìm thẻ nào có class cụ thể 
    // (Cần inspect web trường để chính xác hơn, tạm thời dùng logic text search ở trên)
    
    if (!found) {
        console.log(` -> Không tìm thấy thông tin slot cho URL này.`);
        return -1; // Mã lỗi không tìm thấy cấu trúc
    }

    console.log(` -> Phát hiện: ${slots} slots.`);
    return slots;

  } catch (error) {
    console.error(` -> Lỗi khi request: ${error.message}`);
    return -2; // Mã lỗi mạng
  }
}

async function main() {
  console.log('--- BẮT ĐẦU QUÉT SLOT ---');
  
  // 1. Đăng nhập ẩn danh vào Firebase
  await signInAnonymously(auth);

  // 2. Lấy danh sách link cần check
  const targetsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'targets');
  const snapshot = await getDocs(targetsRef);

  if (snapshot.empty) {
    console.log('Chưa có link nào trong Database.');
    process.exit(0);
  }

  // 3. Duyệt qua từng link
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const docId = docSnap.id;
    
    // Chỉ check nếu có URL hợp lệ
    if (data.url && data.url.includes('http')) {
      const currentSlots = await checkSlot(data.url);
      
      // 4. Cập nhật lại vào Firebase
      if (currentSlots >= -1) { // Chỉ update nếu không lỗi mạng nghiêm trọng
        const targetRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'targets', docId);
        await updateDoc(targetRef, {
          lastSlots: currentSlots,
          lastChecked: serverTimestamp(),
          // Nếu slot > 0, đánh dấu status là available
          status: currentSlots > 0 ? 'available' : 'full'
        });
      }
    }
    
    // Nghỉ 2 giây giữa các lần request để tránh spam server trường
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('--- HOÀN THÀNH ---');
  process.exit(0);
}

main();
