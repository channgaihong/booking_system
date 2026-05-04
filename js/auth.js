import { Utils } from "./utils.js";
import { API } from "./api.js";
import { State } from "./state.js";
import { Nav } from "./nav.js";

export const Auth = {
      showLoginView: () => {
        document.getElementById('loginView').classList.remove('hidden-view');
        document.body.style.overflow = 'hidden';
      },
      hideLoginView: () => {
        document.getElementById('loginView').classList.add('hidden-view');
        document.body.style.overflow = '';
        document.getElementById('loginError').classList.add('hidden-view');
        document.getElementById('authPassword').value = '';
      },
      handleAuth: async (e) => {
        e.preventDefault();
        const btn = document.getElementById('authSubmitBtn');
        const err = document.getElementById('loginError');
        const userStr = document.getElementById('authUsername').value.trim();
        const passStr = document.getElementById('authPassword').value;
        
        err.classList.add('hidden-view');
        if(!userStr || !passStr) { err.textContent="請輸入帳號密碼"; err.classList.remove('hidden-view'); return; }
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 驗證中...';
        
        try {
          const hashedPw = await Utils.hashPassword(passStr);
          const res = await API.request('login', { username: userStr, password: hashedPw });
          if(!res.success) throw new Error(res.error || "登入失敗");
          
          if (!res.user || !res.adminData) {
              document.getElementById('gasUpdateWarningMsg').innerHTML = "系統無法驗證帳號，這是因為您的 Google Sheet 後端程式碼尚未更新，缺少了最新的「登入驗證」模組。<br><br>請複製下方最新程式碼並重新部署（選擇新版本），即可正常登入！";
              document.getElementById('gasUpdateWarning').classList.remove('hidden-view');
              document.getElementById('gasGuideModal').classList.remove('hidden-view');
              throw new Error("請先更新後端程式碼");
          }
          
          State.db.users = res.adminData.users;
          State.db.authCodes = res.adminData.authCodes;
          Auth.loginSuccess(res.user);
        } catch (error) { 
          err.textContent=error.message || "登入失敗"; err.classList.remove('hidden-view'); 
        }
        btn.disabled = false; btn.innerHTML = '安全登入';
      },
      loginSuccess: (user) => {
        State.systemUser = user;
        Auth.hideLoginView();
        Utils.showToast(`歡迎回來，${user.username} 管理員`);
        
        document.getElementById('guestUserGroup').classList.add('hidden-view');
        document.getElementById('loggedUserGroup').classList.remove('hidden-view');
        document.getElementById('displayUsername').textContent = user.username;
        document.getElementById('navAdminBtn').classList.remove('hidden-view');
        document.getElementById('mobileNavAdminBtn').classList.remove('hidden-view');
        
        const isSuper = user.role === 'superadmin';
        if(isSuper) document.getElementById('superAdminMenu').classList.remove('hidden-view');
        else document.getElementById('superAdminMenu').classList.add('hidden-view');

        let showAuthCodes = isSuper;
        if (!isSuper) {
           const mRooms = State.systemUser.managedRooms || [];
           const managedRoomsData = State.db.rooms.filter(r => mRooms.includes(r.id));
           showAuthCodes = managedRoomsData.some(r => r.requiresAuthCode === true || r.requiresAuthCode === 'true');
        }

        if (showAuthCodes) document.getElementById('adminMenuAuthCodesBtn').classList.remove('hidden-view');
        else document.getElementById('adminMenuAuthCodesBtn').classList.add('hidden-view');
        
        if (!isSuper && State.systemUser.managedRooms && State.systemUser.managedRooms.length > 0) {
           document.getElementById('adminMenuRoomsBtn').classList.remove('hidden-view');
        } else if (!isSuper) {
           document.getElementById('adminMenuRoomsBtn').classList.add('hidden-view');
        }

        Nav.switchTab('admin');
      },
      logout: () => {
        State.systemUser = null;
        document.getElementById('guestUserGroup').classList.remove('hidden-view');
        document.getElementById('loggedUserGroup').classList.add('hidden-view');
        document.getElementById('navAdminBtn').classList.add('hidden-view');
        document.getElementById('mobileNavAdminBtn').classList.add('hidden-view');
        Nav.switchTab('booking');
        Utils.showToast("已登出管理員身分");
      }
    };
