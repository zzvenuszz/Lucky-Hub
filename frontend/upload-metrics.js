// Lấy userId từ localStorage
const userId = localStorage.getItem('userId');
if (!userId || userId === 'null' || userId === null) window.location.href = 'index.html';

const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const btnAnalyze = document.getElementById('btn-analyze');
const analyzeResult = document.getElementById('analyzeResult');
const btnUpdate = document.getElementById('btn-update');
const btnDashboard = document.getElementById('btn-dashboard');

let imageBase64 = '';

imageInput.onchange = () => {
  const file = imageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    imageBase64 = e.target.result.split(',')[1];
    imagePreview.innerHTML = `<img src="${e.target.result}" alt="preview" style="max-width:200px;max-height:200px;" />`;
  };
  reader.readAsDataURL(file);
};

btnAnalyze.onclick = async () => {
  if (!imageBase64) {
    analyzeResult.innerHTML = '<span style="color:#d32f2f">Vui lòng chọn ảnh trước!</span>';
    return;
  }
  analyzeResult.innerHTML = 'Đang phân tích...';
  // Lấy thông tin user (giả lập, thực tế nên lấy từ backend)
  const fullname = localStorage.getItem('fullname') || '';
  const gender = localStorage.getItem('gender') || '';
  const height = localStorage.getItem('height') || '';
  const age = localStorage.getItem('age') || '';
  try {
    const res = await fetch('/api/body-metrics/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({ imageBase64, fullname, gender, height, age })
    });
    const result = await res.json();
    if (res.ok && result) {
      analyzeResult.innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
      // TODO: tự động điền vào form cập nhật nếu muốn
    } else {
      analyzeResult.innerHTML = '<span style="color:#d32f2f">' + (result.message || 'Lỗi khi phân tích ảnh.') + '</span>';
    }
  } catch {
    analyzeResult.innerHTML = '<span style="color:#d32f2f">Lỗi kết nối máy chủ.</span>';
  }
};

btnUpdate.onclick = () => {
  window.location.href = 'update-metrics.html';
};
btnDashboard.onclick = () => {
  window.location.href = 'dashboard.html';
}; 