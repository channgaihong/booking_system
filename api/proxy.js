// api/proxy.js
export default async function handler(req, res) {
  // 從 Vercel 的環境變數中讀取真實的 GAS 網址
  const GAS_URL = process.env.GAS_URL;

  if (!GAS_URL) {
    return res.status(500).json({ error: "伺服器未設定 GAS_URL 環境變數" });
  }

  try {
    const { method, body, query } = req;

    // 設定轉發請求的參數
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (method !== 'GET' && body) {
      options.body = JSON.stringify(body);
    }

    // 將請求轉發給 Google Apps Script
    const response = await fetch(GAS_URL, options);
    const data = await response.json();

    // 將結果回傳給前端
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "轉發請求失敗: " + error.message });
  }
}