document.addEventListener('DOMContentLoaded', function() {
  // Không cần xử lý chuyển tab tự chế nữa, đã dùng Bootstrap tab
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const messageDiv = document.getElementById('message');

  // Đặt biến API_URL động theo IP máy chủ
  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : `https://${window.location.hostname}`;

  // Xử lý đăng nhập
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      messageDiv.textContent = '';
      const usernameInput = document.getElementById('loginUsername');
      if (usernameInput) usernameInput.value = usernameInput.value.toLowerCase();
      const data = {
        username: loginForm.username.value,
        password: loginForm.password.value
      };
      try {
        const res = await fetch(`${API_URL}/dangnhap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        console.log('API /dangnhap response:', result);
        localStorage.setItem('lastLoginResponse', JSON.stringify(result));
        messageDiv.textContent = result.message;
        messageDiv.style.color = res.ok ? '#43B02A' : '#d32f2f';
        if (res.ok && result.user) {
          localStorage.setItem('userId', result.user._id || result.user.username);
          localStorage.setItem('fullname', result.user.fullname || '');
          localStorage.setItem('gender', result.user.gender || '');
          localStorage.setItem('height', result.user.height || '');
          // Lưu group name nếu có
          if (result.user.group && result.user.group.name) {
            localStorage.setItem('groupName', result.user.group.name);
          } else {
            localStorage.removeItem('groupName');
          }
          // Tính tuổi nếu có birthday
          if (result.user.birthday) {
            const birth = new Date(result.user.birthday);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            localStorage.setItem('age', age);
          }
          setTimeout(() => window.location.href = 'dashboard.html', 500);
        }
      } catch {
        messageDiv.textContent = 'Lỗi kết nối máy chủ.';
        messageDiv.style.color = '#d32f2f';
      }
    };
  }

  // Xử lý đăng ký
  if (registerForm) {
    registerForm.onsubmit = async (e) => {
      e.preventDefault();
      messageDiv.textContent = '';
      const usernameInput = document.getElementById('registerUsername');
      if (usernameInput) usernameInput.value = usernameInput.value.toLowerCase();
      const data = {
        username: registerForm.username.value,
        password: registerForm.password.value,
        fullname: registerForm.fullname.value,
        birthday: registerForm.birthday.value,
        height: registerForm.height.value,
        gender: registerForm.gender.value
      };
      try {
        const res = await fetch(`${API_URL}/dangky`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (res.ok) {
          messageDiv.style.color = '#43B02A';
          messageDiv.textContent = 'Đăng ký thành công! Vui lòng đăng nhập.';
          // Chuyển sang tab đăng nhập sau khi đăng ký thành công
          setTimeout(() => {
            const loginTab = document.getElementById('login-tab');
            if (loginTab) loginTab.click();
          }, 1000);
        } else {
          messageDiv.style.color = '#d32f2f';
          messageDiv.textContent = result.message || 'Lỗi khi đăng ký.';
        }
      } catch {
        messageDiv.textContent = 'Lỗi kết nối máy chủ.';
        messageDiv.style.color = '#d32f2f';
      }
    };
  }

  // Xử lý ẩn/hiện mật khẩu với nút con mắt
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function() {
      const input = this.parentElement.querySelector('input[type="password"], input[type="text"]');
      if (input) {
        if (input.type === "password") {
          input.type = "text";
          this.querySelector('i').classList.remove('bi-eye');
          this.querySelector('i').classList.add('bi-eye-slash');
        } else {
          input.type = "password";
          this.querySelector('i').classList.remove('bi-eye-slash');
          this.querySelector('i').classList.add('bi-eye');
        }
      }
    });
  });

  // Reset form đăng ký khi chuyển sang tab Đăng ký
  const registerTab = document.getElementById('register-tab');
  if (registerTab) {
    registerTab.addEventListener('click', function() {
      if (registerForm) registerForm.reset();
    });
  }
}); 