// 匯入所有拆分好的模組
import { Constants } from './constants.js';
import { State } from './state.js';
import { Utils } from './utils.js';
import { API } from './api.js';
import { Auth } from './auth.js';
import { Nav } from './nav.js';
import { Booking } from './booking.js';
import { MyBookings } from './my_bookings.js';
import { Print } from './print.js';
import { Admin } from './admin.js';

// 橋接回全域物件，讓 HTML 的 onclick 能夠繼續正常運作
window.App = {
  Constants,
  State,
  Utils,
  API,
  Auth,
  Nav,
  Booking,
  MyBookings,
  Print,
  Admin
};

// 系統初始化邏輯 (取代原本的 window.onload)
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化日期輸入框
  const dateInput = document.getElementById('bookingDateInput');
  if(dateInput) {
     dateInput.min = new Date().toISOString().split('T')[0];
     dateInput.value = window.App.State.selectedDate; // 注意這裡也要用 window.App.State 或直接用 State
  }
  // 日期輸入框初始化
  //document.getElementById('bookingDateInput').min = new Date().toISOString().split('T')[0];
  //document.getElementById('bookingDateInput').value = App.State.selectedDate;
  
  // ⭐️ 2. 關鍵修正：初始化「列印頁面」的週一日期
  const printDateInput = document.getElementById('printDateInput');
  if(printDateInput) {
     // 使用 Utils.getMonday 算出本週週一並填入
     printDateInput.value = Utils.getMonday(State.selectedDate);
  }

  // 載入資料
  //await loadComponents();
  await window.App.API.loadData();
  // 初始化導航列
  if(window.App.Nav && typeof window.App.Nav.init === 'function') {
    window.App.Nav.init(); // 初始化導航
  }
});