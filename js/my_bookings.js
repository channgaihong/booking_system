import { State } from './state.js';
import { Utils } from './utils.js';
import { API } from './api.js';
import { Nav } from './nav.js';

// ==========================================
// 我的預約邏輯
// ==========================================
export const MyBookings = {
      search: () => {
        const data = State.db;
        if(!data) return;
        const tbody = document.getElementById('myBookingsTbody');
        const searchName = document.getElementById('searchBookingName').value.trim();
        
        if(!searchName) { 
          tbody.innerHTML=`<tr><td colspan="5" class="p-12 text-center text-gray-400 bg-gray-50 rounded-b-xl"><i class="fa-solid fa-magnifying-glass text-4xl mb-3 text-gray-300"></i><br>請在上方輸入姓名並點擊查詢</td></tr>`; 
          return;
        }

        const todayStr = new Date().toISOString().split('T')[0];

        const myBookings = data.bookings
          .filter(b => String(b.userName || '').toLowerCase().includes(searchName.toLowerCase()) && b.date >= todayStr)
          .sort((a,b) => {
            const dateDiff = new Date(b.date) - new Date(a.date);
            if (dateDiff !== 0) return dateDiff;
            return String(a.timeSlot).localeCompare(String(b.timeSlot));
          });
        
        if(myBookings.length === 0) { 
          tbody.innerHTML=`<tr><td colspan="5" class="p-12 text-center text-gray-400 bg-gray-50 rounded-b-xl"><i class="fa-solid fa-folder-open text-4xl mb-3 text-gray-300"></i><br>找不到包含「${searchName}」的有效預約記錄 (僅顯示今天及未來)</td></tr>`; 
          return;
        }
        
        tbody.innerHTML = myBookings.map(b => {
          const room = data.rooms.find(r => r.id === b.roomId);
          const rName = room ? `<span class="font-bold">${room.name}</span> <span class="text-xs text-gray-500">${room.roomNumber ? `(${room.roomNumber})`:''}</span>` : '<span class="text-gray-400">房間已刪除</span>';
          
          const isStudent = b.isStudent === true || b.isStudent === 'true';
          const displayUser = b.userName || '訪客';
          const displayClass = isStudent && b.className ? `<span class="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded mr-1">${b.className}</span>` : '';
          const displayParti = b.participants ? `<span class="text-[10px] text-gray-500 ml-1">(${b.participants}人)</span>` : '';

          const isLocked = b.isLocked === true || b.isLocked === 'true';
          const actionBtn = isLocked
            ? `<span class="text-gray-400 text-xs flex items-center justify-end gap-1"><i class="fa-solid fa-lock"></i> 已鎖定</span>`
            : `<button onclick="App.MyBookings.promptDelete('${b.id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 p-2.5 rounded-lg transition" title="取消預約"><i class="fa-solid fa-trash-can"></i></button>`;

          return `<tr class="hover:bg-blue-50/50 transition-colors">
            <td class="p-4 font-mono">${b.date}</td>
            <td class="p-4 font-bold text-blue-600 bg-blue-50/30">${b.timeSlot}</td>
            <td class="p-4">${rName}</td>
            <td class="p-4">
              <div class="font-medium text-gray-800">${displayClass}${displayUser}${displayParti}</div>
              <div class="text-xs text-gray-500 mt-0.5 truncate max-w-[150px] sm:max-w-[300px]">${b.purpose}</div>
            </td>
            <td class="p-4 text-right">
              ${actionBtn}
            </td>
          </tr>`;
        }).join('');
      },
      promptDelete: (id) => {
        const b = State.db.bookings.find(x => x.id === id);
        if (!b) return;
        
        if (b.cancelCode) {
            const enteredCode = prompt("此操作無法復原。\n請輸入您預約時設定的 4 位數取消預約密碼：");
            if (enteredCode === null) return;
            if (enteredCode !== b.cancelCode) {
                return Utils.showToast("取消密碼錯誤！您無權刪除此預約。", true);
            }
            Utils.showLoading(true, "取消預約中...");
            API.request('deleteRow', { table: 'bookings', id }).then(() => {
                API.deleteLocalData('bookings', id);
                Utils.showToast("已成功取消預約");
                Nav.renderActiveScreen();
            }).catch(err => {
                Utils.showToast("刪除失敗: " + err.message, true);
            }).finally(() => {
                Utils.showLoading(false);
            });
        } else {
            API.deleteData('bookings', id);
        }
      }
    };
