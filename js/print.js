import {State} from './state.js';
import {Utils} from './utils.js';

// ==========================================
    //  列印視圖邏輯 
    // ==========================================
    export const Print = {
      renderCheckboxes: () => {
        const data = State.db;
        if(!data) return;
        const container = document.getElementById('printRoomCheckboxes');
        
        let printRooms = Utils.getSortedRooms();
        if (State.systemUser && State.systemUser.role !== 'superadmin') {
            const managed = State.systemUser.managedRooms || [];
            printRooms = printRooms.filter(r => managed.includes(r.id));
        }
        
        const currentChecked = Array.from(document.querySelectorAll('.print-room-cb:checked')).map(cb => cb.value);
        const isFirstRender = container.innerHTML.trim() === '';

        if(printRooms.length === 0) {
          container.innerHTML = '<span class="text-sm text-gray-500 p-2">尚無課室可列印 (或無權限)</span>';
        } else {
          container.innerHTML = printRooms.map(r => {
            const isChecked = isFirstRender ? false : currentChecked.includes(r.id);
            return `<label class="flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors shadow-sm text-sm">
              <input type="checkbox" value="${r.id}" class="print-room-cb w-4 h-4 text-blue-600 rounded" ${isChecked ? 'checked' : ''} onchange="App.Print.render()">
              <span class="font-medium">${r.name} ${r.roomNumber ? `<span class="text-xs text-gray-500 font-normal">(${r.roomNumber})</span>` : ''}</span>
            </label>`;
          }).join('');
        }
        if(isFirstRender) App.Print.render();
      },
      toggleAllRooms: (check) => {
        document.querySelectorAll('.print-room-cb').forEach(cb => cb.checked = check);
        App.Print.render();
      },
      onDateChange: () => {
        const el = document.getElementById('printDateInput');
        if (el.value) {
          el.value = Utils.getMonday(el.value);
          App.Print.render();
        }
      },
      changeWeek: (dir) => {
        const el = document.getElementById('printDateInput');
        if (!el.value) return;
        const parts = el.value.split('-');
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setDate(d.getDate() + (dir * 7));
        el.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        App.Print.render();
      },
      render: () => {
        const data = State.db;
        if(!data) return;

        const startDateStr = document.getElementById('printDateInput').value;
        if(!startDateStr) return;
        
        const queryDates = [];
        const displayDates = [];
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

        const parts = startDateStr.split('-');
        const pDate = new Date(parts[0], parts[1] - 1, parts[2]);
        
        for(let i=0; i<6; i++) {
           const d = new Date(pDate);
           d.setDate(d.getDate() + i);
           const yyyy = d.getFullYear();
           const mm = String(d.getMonth() + 1).padStart(2, '0');
           const dd = String(d.getDate()).padStart(2, '0');
           const qDate = `${yyyy}-${mm}-${dd}`;
           
           queryDates.push(qDate);
           displayDates.push(`${qDate}<br><span class="text-xs font-normal text-gray-500">(星期${dayNames[d.getDay()]})</span>`);
        }

        const selectedRoomIds = Array.from(document.querySelectorAll('.print-room-cb:checked')).map(cb => cb.value);
        const roomsToPrint = Utils.getSortedRooms().filter(r => selectedRoomIds.includes(r.id));
        const container = document.getElementById('printContainer');

        if(roomsToPrint.length === 0) {
          container.innerHTML = '<div class="text-center p-12 text-gray-500 border-2 border-dashed rounded-xl">請至少勾選一個課室進行預覽與列印</div>';
          return;
        }

        const baseTimeSlots = Utils.getSortedTimeSlots().map(ts => ts.name);
        const weekBookings = data.bookings.filter(b => roomsToPrint.some(r => r.id === b.roomId) && queryDates.includes(b.date));
        
        const uniqueSlotsSet = new Set(baseTimeSlots);
        
        weekBookings.forEach(b => {
          if (baseTimeSlots.includes(b.timeSlot)) return;
          let overlapsBase = false;
          for (const baseSlot of baseTimeSlots) {
             if (Utils.isTimeOverlap(b.timeSlot, baseSlot)) { overlapsBase = true; break; }
          }
          if (!overlapsBase) uniqueSlotsSet.add(b.timeSlot);
        });
        
        const printSlots = Array.from(uniqueSlotsSet).sort((a, b) => {
          const getMin = (str) => {
            const m = str.match(/(\d{1,2}):(\d{2})/);
            return m ? parseInt(m[1])*60 + parseInt(m[2]) : 9999;
          };
          return getMin(a) - getMin(b);
        });

        if(printSlots.length === 0) {
          container.innerHTML = '<div class="text-center p-12 text-gray-500 border-2 border-dashed rounded-xl">尚無任何時間段設定或預約</div>';
          return;
        }

        let html = '';

        const showName = Utils.getSetting('print_show_name', true);
        const orderName = parseInt(Utils.getSettingStr('print_order_name', '1')) || 1;
        const showClass = Utils.getSetting('print_show_class', true);
        const orderClass = parseInt(Utils.getSettingStr('print_order_class', '2')) || 2;
        const showParti = Utils.getSetting('print_show_participants', true);
        const orderParti = parseInt(Utils.getSettingStr('print_order_participants', '3')) || 3;
        const showPurpose = Utils.getSetting('print_show_purpose', true);
        const orderPurpose = parseInt(Utils.getSettingStr('print_order_purpose', '4')) || 4;

        roomsToPrint.forEach(room => {
          html += `
          <div class="print-page-break mb-12 print:mb-0">
             <div class="text-center mb-4 print:mb-2">
                <h1 class="text-2xl font-bold text-gray-800">${room.name} ${room.roomNumber ? `(${room.roomNumber})` : ''} - 預約時間表</h1>
                <p class="text-gray-600 mt-1 font-medium">日期範圍：${queryDates[0]} 至 ${queryDates[5]}</p>
             </div>
             <div class="overflow-x-auto">
               <table class="w-full border-collapse text-sm min-w-[800px] table-fixed">
                  <thead class="bg-gray-100 border-b-2 border-gray-300">
                     <tr>
                        <th class="border-r border-gray-300 p-3 w-28 bg-gray-200 font-bold text-gray-700 align-middle">時間 \\ 日期</th>
                        ${displayDates.map(disp => `<th class="border-r border-gray-300 p-2 font-bold text-center text-gray-700 leading-snug align-middle w-[15%]">${disp}</th>`).join('')}
                     </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                     ${printSlots.map(slotName => `
                        <tr>
                           <td class="border-r border-gray-300 p-2 font-bold text-center bg-gray-50 text-gray-700 break-words whitespace-normal text-xs sm:text-sm">${slotName}</td>
                           ${queryDates.map(d => {
                              const tsObj = State.db.timeSlots.find(t => t.name === slotName);
                              const isClosed = tsObj && room.closedSlots && room.closedSlots.includes(tsObj.id);
                              
                              if (isClosed) {
                                  const noticeText = tsObj && room.customNotices && room.customNotices[tsObj.id] ? room.customNotices[tsObj.id] : '不開放預約';
                                  return `<td class="border-r border-b border-gray-300 p-1.5 align-middle bg-gray-100/50">
                                            <div class="text-[10px] text-gray-500 font-bold h-full flex flex-col items-center justify-center text-center opacity-80 min-h-[50px]">
                                              <i class="fa-solid fa-ban mb-0.5 text-xs"></i>
                                              <span class="whitespace-normal break-words leading-tight">${noticeText}</span>
                                            </div>
                                          </td>`;
                              }

                              const cellBookings = data.bookings.filter(bk => {
                                 if (bk.roomId !== room.id || bk.date !== d) return false;
                                 return Utils.isTimeOverlap(bk.timeSlot, slotName);
                              });

                              if (cellBookings.length > 0) {
                                  const b = cellBookings[0];
                                  const uName = b.userName || data.users.find(u=>u.id===b.userId)?.username || '訪客';
                                  const actualTimeStr = (b.timeSlot !== slotName) ? `<div class="text-[10px] text-red-600 font-bold mb-0.5 bg-red-50 rounded px-1 w-max mx-auto">[自訂] ${b.timeSlot}</div>` : '';
                                  
                                  const isStudent = b.isStudent === true || b.isStudent === 'true';
                                  
                                  let parts = [];
                                  if (showClass && isStudent && b.className) {
                                     parts.push({ order: orderClass, html: `<span class="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1 rounded inline-block mx-0.5 mb-0.5">${b.className}</span>` });
                                  }
                                  if (showName) {
                                     parts.push({ order: orderName, html: `<span class="font-bold text-blue-800 text-xs inline-block mx-0.5 mb-0.5 max-w-[90px] whitespace-normal break-words">${uName}</span>` });
                                  }
                                  if (showParti && b.participants) {
                                     parts.push({ order: orderParti, html: `<span class="text-[10px] text-gray-500 inline-block mx-0.5 mb-0.5">(${b.participants}人)</span>` });
                                  }
                                  if (showPurpose && b.purpose) {
                                     parts.push({ order: orderPurpose, html: `<div class="text-[10px] text-gray-600 leading-tight whitespace-normal break-words w-full mt-0.5 text-center">${b.purpose}</div>` });
                                  }
                                  
                                  parts.sort((x, y) => x.order - y.order);
                                  const contentHtml = `<div class="flex flex-wrap items-center justify-center w-full text-center">${parts.map(p => p.html).join('')}</div>`;

                                  return `<td class="border-r border-b border-gray-300 p-1.5 align-middle">
                                            <div class="bg-blue-50 border border-blue-200 text-blue-900 rounded p-1.5 text-xs h-full flex flex-col items-center justify-center text-center shadow-sm overflow-hidden min-h-[50px]">
                                              ${actualTimeStr}
                                              ${contentHtml}
                                            </div>
                                          </td>`;
                              }
                              return `<td class="border-r border-b border-gray-300 p-2 align-middle text-center"></td>`;
                           }).join('')}
                        </tr>
                     `).join('')}
                  </tbody>
               </table>
             </div>
          </div>`;
        });
        container.innerHTML = html;
      }
    };
