// api/syncData.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fetch from 'node-fetch';

// 初始化 Firebase Admin (憑證需存放於 Vercel Environment Variables)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!getFirestore()._app) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { action, payload } = req.body;
  const GAS_URL = process.env.GAS_URL; // 從 Vercel 環境變數讀取，不再暴露於前端

  try {
    // 1. 同步寫入 Firebase (極速回應)
    if (action === 'saveRow') {
      const collectionRef = db.collection(payload.table);
      if (Array.isArray(payload.data)) {
        const batch = db.batch();
        payload.data.forEach(item => {
          const docRef = collectionRef.doc(item.id);
          batch.set(docRef, item, { merge: true });
        });
        await batch.commit();
      } else {
        await collectionRef.doc(payload.data.id).set(payload.data, { merge: true });
      }
    } else if (action === 'deleteRow') {
      // 處理刪除邏輯...
      await db.collection(payload.table).doc(payload.id).delete();
    }

    // 2. 異步/同步發送給 Google Sheet 進行備份
    // 這裡我們不等待 GAS 回應就先回傳成功給前端 (Fire-and-forget)，極大化提升 UX
    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    }).catch(err => console.error("GAS Sync Error:", err));

    res.status(200).json({ success: true, message: "Data synced successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}