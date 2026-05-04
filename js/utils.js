import { State } from './state.js';
import { Constants } from './constants.js';

export const Utils = {
      hashPassword: async (password) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
      },
      showToast: (msg, isError = false) => {
        const t = document.getElementById('toastMessage');
        if(!t) return;
        t.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${msg}`;
        t.className = `fixed top-20 right-4 ${isError ? 'bg-red-600' : 'bg-green-600'} text-white px-5 py-3 rounded-lg shadow-xl z-[100] fade-in transition-all font-medium flex items-center gap-2`;
        t.classList.remove('hidden-view');
        setTimeout(() => t.classList.add('hidden-view'), 3000);
      },
      customConfirm: (msg, callback) => {
        document.getElementById('confirmMessage').textContent = msg;
        const btn = document.getElementById('confirmBtn');
        btn.onclick = () => {
            document.getElementById('confirmModal').classList.add('hidden-view');
            callback();
        };
        document.getElementById('confirmModal').classList.remove('hidden-view');
      },
      showLoading: (show, text = '系統處理中...') => {
        const el = document.getElementById('globalLoadingOverlay');
        const textEl = document.getElementById('globalLoadingText');
        if(el && textEl) {
           if(show) {
               textEl.textContent = text;
               el.classList.remove('hidden-view');
           } else {
               el.classList.add('hidden-view');
           }
        }
      },
      formatLocalDate: (val) => {
        if (!val) return '';
        const strVal = String(val);
        if (strVal.includes('T') && strVal.endsWith('Z')) {
          const d = new Date(strVal);
          if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
          }
        }
        return strVal.split('T')[0];
      },
      getMonday: (dateStr) => {
        const parts = dateStr.split('-');
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      },
      maskUsername: (name) => {
        if (!name) return "***";
        if (name.length <= 1) return "*";
        if (name.length === 2) return name[0] + "*";
        return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
      },
      isTimeOverlap: (slot1, slot2) => {
        const parseTime = (str) => {
          if(!str) return null;
          const m = str.match(/(\d{1,2}):(\d{2})/);
          return m ? parseInt(m[1])*60 + parseInt(m[2]) : null;
        };
        const getSE = (str) => {
          const p = str.split('-');
          if(p.length !== 2) return null;
          const s = parseTime(p[0]), e = parseTime(p[1]);
          return (s !== null && e !== null && s < e) ? {s, e} : null;
        };
        const a = getSE(slot1), b = getSE(slot2);
        if (!a || !b) return slot1 === slot2; 
        return a.s < b.e && a.e > b.s;
      },
      getSetting: (key, defaultVal) => {
         const data = State.db;
         if(!data || !data.settings) return defaultVal;
         const s = data.settings.find(x => x.settingKey === key);
         return s ? (String(s.settingValue).toLowerCase() === 'true') : defaultVal;
      },
      getSettingStr: (key, defaultVal) => {
         const data = State.db;
         if(!data || !data.settings) return defaultVal;
         const s = data.settings.find(x => x.settingKey === key);
         return s ? s.settingValue : defaultVal;
      },
      getSortedRooms: () => [...(State.db.rooms || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
      getSortedHolidays: () => [...(State.db.holidays || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
      getSortedTimeSlots: () => [...(State.db.timeSlots || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
      getSortedAuthCodes: () => [...(State.db.authCodes || [])].sort((a, b) => b.createdAt - a.createdAt),
      getSortedClasses: () => [...(State.db.classes || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
      isSlotClosed: (slotNameToCheck, roomObj, allTimeSlots) => {
          if (!roomObj || !roomObj.closedSlots || roomObj.closedSlots.length === 0) return false;
          const closedTsObjects = allTimeSlots.filter(ts => roomObj.closedSlots.includes(ts.id));
          for (const ts of closedTsObjects) {
              if (Utils.isTimeOverlap(slotNameToCheck, ts.name)) return true;
          }
          return false;
      },
      checkOverlap: (newSlotName, roomId, date) => {
          const dayB = State.db.bookings.filter(b => b.roomId === roomId && b.date === date);
          for(let b of dayB) {
              if (Utils.isTimeOverlap(newSlotName, b.timeSlot)) return true;
          }
          return false;
      },
      fixDatabase: () => {
        if(!Constants.GAS_URL) return Utils.showToast("請先設定 GAS_URL", true);
        Utils.customConfirm("即將在 Google Sheet 自動補齊所有缺少的標題列。\n\n⚠️ 請確認您已經複製最新的 Apps Script 程式碼並「發布新版本」，否則將無法真正寫入修復欄位！\n\n確定執行？", async () => {
          //Utils.showLoading(true, "資料庫修復中...");
          try {
            await API.request('initDB');
            Utils.showToast("資料庫標題列已成功修復/建立！");
            await API.loadData();
          } catch (err) {
            Utils.showToast("修復失敗：" + err.message, true);
            Utils.showLoading(false);
          }
        });
      }
    };