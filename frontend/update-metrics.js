// Lấy userId từ localStorage
const userId = localStorage.getItem('userId');
if (!userId) window.location.href = 'index.html';

const form = document.getElementById('metricsForm');
const messageDiv = document.getElementById('message');
const btnUpload = document.getElementById('btn-upload');
const btnDashboard = document.getElementById('btn-dashboard');

// Mặc định ngày kiểm tra là hôm nay
form.ngayKiemTra.value = new Date().toISOString().slice(0, 10);

form.onsubmit = async (e) => {
  e.preventDefault();
  messageDiv.textContent = '';
  const data = {
    ngayKiemTra: form.ngayKiemTra.value,
    canNang: form.canNang.value,
    tiLeMoCoThe: form.tiLeMoCoThe.value,
    luongKhoangChat: form.luongKhoangChat.value,
    chiSoNuoc: form.chiSoNuoc.value,
    luongCoBap: form.luongCoBap.value,
    chiSoCanDoi: form.chiSoCanDoi.value,
    nangLuong: form.nangLuong.value,
    tuoiSinhHoc: form.tuoiSinhHoc.value,
    moNoiTang: form.moNoiTang.value
  };
  console.log('Gửi dữ liệu chỉ số:', data);
  try {
    const res = await fetch('/api/body-metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (res.ok) {
      messageDiv.style.color = '#43B02A';
      messageDiv.textContent = 'Lưu chỉ số thành công!';
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
    } else {
      messageDiv.style.color = '#d32f2f';
      messageDiv.textContent = result.message || 'Lỗi khi lưu chỉ số.';
    }
  } catch (err) {
    messageDiv.style.color = '#d32f2f';
    messageDiv.textContent = 'Lỗi kết nối máy chủ.';
    console.error('Lỗi khi gửi request lưu chỉ số:', err);
  }
};

btnUpload.onclick = () => {
  window.location.href = 'upload-metrics.html';
};
btnDashboard.onclick = () => {
  window.location.href = 'dashboard.html';
}; 