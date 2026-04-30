// api/proxy.js
export default async function handler(req, res) {
  const GAS_URL = process.env.GAS_URL;

  // 1. 檢查環境變數
  if (!GAS_URL) {
    console.error("錯誤: 環境變數 GAS_URL 未設定");
    // 回傳符合前端預期的假資料結構，避免前端直接 crash，並提示錯誤
    return res.status(200).json({ 
      status: "error", 
      message: "伺服器未設定 GAS_URL" 
    });
  }

  try {
    const { method, body, query } = req;
    let finalUrl = GAS_URL;

    // 2. 如果是 GET 請求，必須將前端傳來的參數拼接到 Google 的網址後面
    if (method === 'GET' && Object.keys(query).length > 0) {
      const qs = new URLSearchParams(query).toString();
      finalUrl += `?${qs}`;
    }

    // 3. 設定轉發給 Google 的選項
    const options = {
      method: method,
      // 使用 text/plain 可以避免 Google Apps Script 處理 POST 時的格式錯誤
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      // Vercel 會自動跟隨 Google 的 302 重定向
      redirect: 'follow'
    };

    // 4. 如果是 POST，確保 body 轉為字串
    if (method !== 'GET' && body) {
      options.body = typeof body === 'object' ? JSON.stringify(body) : body;
    }

    // 5. 發送請求給 Google Apps Script
    const response = await fetch(finalUrl, options);
    const responseText = await response.text();

    let data;
    try {
      // 嘗試解析 Google 回傳的結果
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Google 回傳的不是有效的 JSON:", responseText);
      return res.status(200).json({ 
        status: "error", 
        message: "Google Apps Script 回傳異常格式" 
      });
    }

    // 6. 成功，將資料原封不動回傳給前端
    res.status(200).json(data);

  } catch (error) {
    console.error("Proxy 轉發失敗:", error);
    res.status(200).json({ 
      status: "error", 
      message: "Proxy 轉發請求失敗: " + error.message 
    });
  }
}
