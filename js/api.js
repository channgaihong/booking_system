import { State } from './state.js';
import { Constants } from './constants.js';
import { Utils } from './utils.js';
import { Nav } from './nav.js'; // 如果 loadData 完需要呼叫 Nav.renderActiveScreen

export const API = {
      request: async (action, payload = {}) => {
        if (!Constants.GAS_URL) {
          const endpoint = Constants.GAS_URL;  
          return API.mockRequest(action, payload);
        }
        try {
          const res = await fetch(Constants.GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, payload })
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || "伺服器回傳失敗");
          return result;
        } catch (err) {
          console.error("API Error:", err);
          if (err.message && (err.message.includes("getDataRange") || err.message.includes("null"))) {
             document.getElementById('gasUpdateWarning').classList.remove('hidden-view');
             document.getElementById('gasGuideModal').classList.remove('hidden-view');
             throw new Error("⚠️ 後端 Google Apps Script 版本過舊，請更新代碼！");
          }
          if (err.message && (err.message.includes("Load failed") || err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
             document.getElementById('gasUpdateWarning').innerHTML = `
                <h4 class="font-bold text-base mb-1 flex items-center gap-2"><i class="fa-solid fa-triangle-exclamation"></i> 權限設定錯誤</h4>
                <p class="mt-2 text-sm text-red-800 font-bold bg-red-100 p-2 rounded">請回到 Apps Script，發布新版本並將「誰可以存取」設為「所有人 (Anyone)」</p>
             `;
             document.getElementById('gasUpdateWarning').classList.remove('hidden-view');
             document.getElementById('gasGuideModal').classList.remove('hidden-view');
             throw new Error("⚠️ 網路連線被拒絕，請確認權限設定。");
          }
          throw err;
        }
      },
      mockRequest: (action, payload) => {
        return new Promise(resolve => {
          setTimeout(async () => {
            let res = { success: true };
            if (action === 'getData') {
                if(State.db.users.length===0){
                    const hashedPw = await Utils.hashPassword("admin123");
                    State.db.users = [{ id: "admin", username: "admin", password: hashedPw, role: "superadmin", managedRooms: [] }];
                }
                let dbCopy = JSON.parse(JSON.stringify(State.db));
                if (!payload || !payload.isAdmin) {
                    delete dbCopy.users;
                    delete dbCopy.authCodes;
                }
                res.data = dbCopy;
            } else if (action === 'saveRow') {
              const table = State.db[payload.table];
              if(!table) State.db[payload.table] = [];
              const arr = Array.isArray(payload.data) ? payload.data : [payload.data];
              arr.forEach(item => {
                 const idx = State.db[payload.table].findIndex(x => x.id === item.id);
                 if (idx > -1) State.db[payload.table][idx] = { ...State.db[payload.table][idx], ...item };
                 else State.db[payload.table].push(item);
              });
            } else if (action === 'deleteRow') {
              const ids = Array.isArray(payload.id) ? payload.id : [payload.id];
              State.db[payload.table] = State.db[payload.table].filter(x => !ids.includes(x.id));
            } else if (action === 'restoreDB') {
              for (let table in payload) State.db[table] = payload[table];
            } else if (action === 'login') {
                const user = State.db.users.find(u => u.username === payload.username && u.password === payload.password);
                if (user) {
                    res.user = user;
                    res.adminData = { users: State.db.users, authCodes: State.db.authCodes };
                } else {
                    res.success = false; res.error = "帳號或密碼錯誤";
                }
            }
            resolve(res);
          }, 200);
        });
      },
      loadData: async (showLoader = false) => {
        if(showLoader) Utils.showLoading(true, "同步最新雲端資料...");
        try {
          const isAdmin = !!State.systemUser;
          const res = await API.request('getData', { isAdmin });
          if(res.success) {
            ['holidays', 'bookings'].forEach(t => {
                if(res.data[t]) res.data[t].forEach(r => {
                    if(r.date) r.date = Utils.formatLocalDate(r.date);
                    if(r.startDate) r.startDate = Utils.formatLocalDate(r.startDate);
                    if(r.endDate) r.endDate = Utils.formatLocalDate(r.endDate);
                });
            });
            ['classes', 'settings'].forEach(t => { if(!res.data[t]) res.data[t] = []; });
            
            if (!res.data.users) res.data.users = State.db.users || [];
            if (!res.data.authCodes) res.data.authCodes = State.db.authCodes || [];
            
            State.db = res.data;
            Nav.renderActiveScreen();
          }
        } catch (e) {
          Utils.showToast("資料讀取失敗: " + e.message, true);
        } finally {
          if(showLoader) Utils.showLoading(false);
        }
      },
      updateLocalData: (table, data) => {
          if (!State.db[table]) State.db[table] = [];
          const arr = Array.isArray(data) ? data : [data];
          arr.forEach(newItem => {
              const idx = State.db[table].findIndex(item => item.id === newItem.id);
              if (idx > -1) State.db[table][idx] = { ...State.db[table][idx], ...newItem };
              else State.db[table].push(newItem);
          });
      },
      deleteLocalData: (table, idOrIds) => {
          if (!State.db[table]) return;
          const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
          State.db[table] = State.db[table].filter(item => !ids.includes(item.id));
      },
      deleteData: (collectionName, id) => {
          if (collectionName === 'users' && State.systemUser.role !== 'superadmin') {
            const targetUser = State.db.users.find(u => u.id === id);
            if (targetUser && targetUser.role === 'superadmin') {
               return Utils.showToast("一般管理員無法刪除超級管理員", true);
            }
          }
          Utils.customConfirm("確定要刪除此筆資料嗎？此操作無法復原！", async () => {
            Utils.showLoading(true, "刪除資料中...");
            try {
              await API.request('deleteRow', { table: collectionName, id });
              API.deleteLocalData(collectionName, id);
              if(collectionName==='bookings') Utils.showToast("已成功刪除預約");
              else Utils.showToast("資料已刪除");
              Nav.renderActiveScreen();
            } catch (err) {
              Utils.showToast("刪除失敗: " + err.message, true);
            } finally {
              Utils.showLoading(false);
            }
          });
      }
    };