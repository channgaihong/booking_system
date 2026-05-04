import { MyBookings } from './my_bookings.js';
import {  Print} from './print.js';
import { Admin } from './admin.js';
import { State } from './state.js';
import { Booking } from './booking.js';
import { Auth } from './auth.js';

export const Nav = {
      switchTab: (tabId) => {
        if(tabId === 'admin' && !State.systemUser) return Auth.showLoginView();

        State.activeTab = tabId;
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-view'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden-view');
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
          if(btn.dataset.target === tabId) { btn.classList.add('bg-blue-800','text-white'); btn.classList.remove('hover:bg-blue-600','text-blue-100','text-yellow-400'); if(tabId==='admin') btn.classList.add('text-yellow-300'); }
          else { btn.classList.remove('bg-blue-800','text-white','text-yellow-300'); btn.classList.add('hover:bg-blue-600', btn.dataset.target==='admin'?'text-yellow-400':'text-blue-100'); }
        });
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
          if(btn.dataset.target === tabId) { btn.classList.add('bg-white','text-blue-800'); btn.classList.remove('text-blue-100','text-yellow-400'); }
          else { btn.classList.remove('bg-white','text-blue-800'); btn.classList.add(btn.dataset.target==='admin'?'text-yellow-400':'text-blue-100'); }
        });
        
        Nav.renderActiveScreen();
      },
      renderActiveScreen: () => {
        const tab = State.activeTab;
        if(tab === 'booking') Booking.render();
        else if(tab === 'my_bookings') MyBookings.search();
        else if(tab === 'print') {
    // 確保日期輸入框有值（如果萬一被清空了）
    const printDateInput = document.getElementById('printDateInput');
    if (printDateInput && !printDateInput.value) {
        printDateInput.value = Utils.getMonday(State.selectedDate);
    }
    
    // ⭐️ 自動觸發渲染
    Print.renderCheckboxes(); // 渲染課室勾選框
    Print.render();           // 根據日期渲染下方時間表
}
        else if(tab === 'admin' && State.systemUser) Admin.renderActiveTab();
      }
    };