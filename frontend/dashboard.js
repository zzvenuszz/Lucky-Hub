// Lấy userId từ localStorage (giả lập đăng nhập)
const userId = localStorage.getItem('userId');
if (!userId || userId === 'null' || userId === null) {
  window.location.href = 'index.html';
}

const mainTitle = document.getElementById('main-title');
const mainContentArea = document.getElementById('main-content-area');
const btnLogout = document.getElementById('btn-logout');

// Sidebar menu
const menuDashboard = document.getElementById('menu-dashboard');
const menuUpdate = document.getElementById('menu-update');
const menuAdmin = document.getElementById('menu-admin');
const menuAdminMobile = document.getElementById('menu-admin-mobile');
const menuItems = [menuDashboard, menuUpdate, menuAdmin];

// Kiểm tra quyền quản trị viên từ localStorage
const userGroup = localStorage.getItem('groupName');
if (userGroup === 'Quản trị viên') {
  menuAdmin.classList.remove('d-none');
  if (menuAdminMobile) menuAdminMobile.classList.remove('d-none');
}

function setActiveMenu(menu) {
  menuItems.forEach(item => item.classList.remove('active'));
  menu.classList.add('active');
}

// Bảng lý tưởng cho các chỉ số sức khỏe (ẩn, chỉ dùng trong JS)
const idealTable = {
  weight: {
    // key: chiều cao (cm), value: { male: min-max, female: min-max }
    150: { male: [45, 56], female: [43, 52] },
    155: { male: [48, 59], female: [45, 55] },
    160: { male: [50, 62], female: [47, 58] },
    165: { male: [54, 66], female: [50, 62] },
    170: { male: [58, 70], female: [53, 66] },
    175: { male: [62, 75], female: [57, 70] },
    180: { male: [66, 80], female: [60, 74] },
    185: { male: [70, 85], female: [63, 78] },
    190: { male: [75, 90], female: [67, 82] }
  },
  fat: { male: [10, 20], female: [18, 28] }, // tỉ lệ mỡ lý tưởng (%)
  khoangChat: { male: [3, 4], female: [2.5, 3.5] }, // khoáng chất (giả định, đơn vị kg)
  nuoc: { male: [60, 65], female: [53, 55] }, // nước (%)
  coBap: { male: [36, 44], female: [30, 36] }, // cơ bắp lý tưởng (%)
  chiSoCanDoi: 5, // chỉ số cân đối lý tưởng
  moNoiTang: { male: [1, 9], female: [1, 9] } // mỡ nội tạng lý tưởng
};

// Thêm hàm showErrorModal ở đầu file (sau các import/khai báo biến toàn cục)
function showErrorModal(message) {
  let modalDiv = document.getElementById('errorModal');
  if (!modalDiv) {
    modalDiv = document.createElement('div');
    modalDiv.innerHTML = `
      <div class="modal fade" id="errorModal" tabindex="-1" aria-labelledby="errorModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="errorModalLabel">Lỗi</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="errorModalBody"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);
  }
  document.getElementById('errorModalBody').textContent = message;
  const modal = new bootstrap.Modal(document.getElementById('errorModal'));
  modal.show();
}

// Modal ghi chú cho chỉ số
let noteModalDiv = document.getElementById('noteModal');
if (!noteModalDiv) {
  noteModalDiv = document.createElement('div');
  noteModalDiv.innerHTML = `
    <div class="modal fade" id="noteModal" tabindex="-1" aria-labelledby="noteModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="noteModalLabel">Ghi chú chỉ số</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <textarea id="noteInput" class="form-control" rows="4" placeholder="Nhập ghi chú..."></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
            <button type="button" class="btn btn-primary" id="saveNoteBtn">Lưu ghi chú</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(noteModalDiv);
}
let currentNoteMetricId = null;
let currentNoteUserId = null;

// Tổng quan
function renderDashboard() {
  // Hiển thị thông tin cơ bản của user
  const fullname = localStorage.getItem('fullname') || '';
  const gender = localStorage.getItem('gender') || '';
  const height = localStorage.getItem('height') || '';
  const age = localStorage.getItem('age') || '';
  mainTitle.innerHTML = `
    <div style="font-size:2rem;font-weight:bold;color:#43B02A;line-height:1.2;">
      ${fullname}
    </div>
    <div style="font-size:1rem;color:#333;line-height:1.7;">
      ${[
        age ? `Tuổi: <b>${age}</b>` : '',
        gender ? `Giới tính: <b>${gender}</b>` : '',
        height ? `Chiều cao: <b>${height} cm</b>` : ''
      ].filter(Boolean).join(' | ')}
    </div>
  `;
  mainContentArea.innerHTML = `
    <div id="latest-metrics" class="dashboard-metrics"><div>Đang tải dữ liệu...</div></div>
    <div id="latest-analysis" class="dashboard-analysis"></div>
    <div id="chart-flex-row" style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;">
      <div id="chart-section" style="flex:1 1 320px;min-width:320px;max-width:600px;">
        <div style="margin:16px 0 8px 0;font-weight:bold">Biểu đồ chỉ số sức khỏe</div>
        <div class="mb-2">
          <label for="metricsTimeFilter" class="form-label">Khoảng thời gian:</label>
          <select id="metricsTimeFilter" class="form-select form-select-sm" style="width:auto;display:inline-block">
            <option value="3d">3 ngày</option>
            <option value="1w">1 tuần</option>
            <option value="2w">2 tuần</option>
            <option value="1m">1 tháng</option>
            <option value="2m">2 tháng</option>
            <option value="3m">3 tháng</option>
            <option value="6m">6 tháng</option>
            <option value="1y">1 năm</option>
            <option value="all" selected>Tất cả</option>
          </select>
        </div>
        <div id="metric-checkboxes"></div>
        <canvas id="metricsChart" height="180"></canvas>
      </div>
      <div id="body-structure-chart" style="flex:1 1 220px;min-width:220px;max-width:320px;">
        <div style="margin:16px 0 8px 0;font-weight:bold">Biểu đồ cấu trúc cơ thể (3D)</div>
        <canvas id="bodyPieChart" width="220" height="180"></canvas>
      </div>
    </div>
    <div id="user-metrics-table"></div>
  `;
  // Thêm Chart.js nếu chưa có
  if (!document.getElementById('chartjs-cdn')) {
    const script = document.createElement('script');
    script.id = 'chartjs-cdn';
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.body.appendChild(script);
    script.onload = setupChartSection;
  } else {
    setupChartSection();
  }
  fetchLatestMetrics();
  // Lấy toàn bộ chỉ số để render bảng cho user
  fetch('/api/body-metrics/all', { headers: { 'x-user-id': userId } })
    .then(res => res.json())
    .then(data => {
      document.getElementById('user-metrics-table').innerHTML = renderUserMetricsTable(data, window.innerWidth);
    });
}

function setupChartSection() {
  const metricsList = [
    { key: 'canNang', label: 'Cân nặng (kg)', checked: true },
    { key: 'tiLeMoCoThe', label: 'Tỉ lệ mỡ (%)', checked: true },
    { key: 'luongKhoangChat', label: 'Khoáng chất', checked: false },
    { key: 'chiSoNuoc', label: 'Nước (%)', checked: true },
    { key: 'luongCoBap', label: 'Cơ bắp (%)', checked: true },
    { key: 'chiSoCanDoi', label: 'Cân đối', checked: false },
    { key: 'nangLuong', label: 'Năng lượng (kcal)', checked: false },
    { key: 'tuoiSinhHoc', label: 'Tuổi sinh học', checked: true },
    { key: 'moNoiTang', label: 'Mỡ nội tạng', checked: true }
  ];
  const checkboxesDiv = document.getElementById('metric-checkboxes');
  checkboxesDiv.innerHTML = metricsList.map(m => `<label style="margin-right:12px"><input type="checkbox" class="metric-cb" value="${m.key}"${m.checked ? ' checked' : ''}> ${m.label}</label>`).join('');
  fetch('/api/body-metrics/all', { headers: { 'x-user-id': userId } })
    .then(res => res.json())
    .then(data => {
      let allData = data;
      const filterSelect = document.getElementById('metricsTimeFilter');
      function filterData() {
        let filtered = allData;
        const now = new Date();
        const val = filterSelect.value;
        let fromDate = null;
        if (val !== 'all') {
          if (val.endsWith('d')) fromDate = new Date(now.getTime() - parseInt(val) * 24 * 60 * 60 * 1000);
          if (val.endsWith('w')) fromDate = new Date(now.getTime() - parseInt(val) * 7 * 24 * 60 * 60 * 1000);
          if (val.endsWith('m')) fromDate = new Date(now.setMonth(now.getMonth() - parseInt(val)));
          if (val.endsWith('y')) fromDate = new Date(now.setFullYear(now.getFullYear() - parseInt(val)));
          if (fromDate) filtered = allData.filter(m => new Date(m.ngayKiemTra) >= fromDate);
        }
        drawMetricsChart(filtered, metricsList);
      }
      filterSelect.onchange = filterData;
      checkboxesDiv.querySelectorAll('.metric-cb').forEach(cb => {
        cb.onchange = filterData;
      });
      filterData();
    });
}

function drawMetricsChart(data, metricsList) {
  const ctx = document.getElementById('metricsChart').getContext('2d');
  const checked = Array.from(document.querySelectorAll('.metric-cb:checked')).map(cb => cb.value);
  const labels = data.map(m => m.ngayKiemTra ? new Date(m.ngayKiemTra).toLocaleDateString('vi-VN') : '');
  const colors = [
    '#43B02A', '#1976d2', '#d32f2f', '#fbc02d', '#7b1fa2', '#0097a7', '#c2185b', '#388e3c', '#f57c00'
  ];
  const datasets = metricsList.filter(m => checked.includes(m.key)).map((m, i) => ({
    label: m.label,
    data: data.map(row => typeof row[m.key] === 'number' ? row[m.key] : null),
    borderColor: colors[i % colors.length],
    backgroundColor: colors[i % colors.length] + '33',
    spanGaps: true,
    tension: 0.2
  }));
  if (window.metricsChartObj) window.metricsChartObj.destroy();
  window.metricsChartObj = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: false }
      },
      interaction: { mode: 'index', intersect: false },
      scales: { x: { title: { display: true, text: 'Ngày kiểm tra' } } }
    }
  });
}

// Lấy chỉ số mới nhất cho dashboard
async function fetchLatestMetrics() {
  const metricsDiv = document.getElementById('latest-metrics');
  const analysisDiv = document.getElementById('latest-analysis');
  metricsDiv.innerHTML = '<div>Đang tải dữ liệu...</div>';
  analysisDiv.innerHTML = '';
  try {
    const res = await fetch('/api/body-metrics/latest-with-previous', {
      headers: { 'x-user-id': userId }
    });
    if (!res.ok) {
      metricsDiv.innerHTML = '<div>Chưa có dữ liệu chỉ số.</div>';
      return;
    }
    const { latest, previous } = await res.json();
    if (!latest) {
      // Hiển thị thông báo thay cho biểu đồ
      let pieDiv = document.getElementById('body-structure-chart');
      if (!pieDiv) {
        pieDiv = document.createElement('div');
        pieDiv.id = 'body-structure-chart';
        metricsDiv.parentNode.insertBefore(pieDiv, metricsDiv.nextSibling);
      }
      pieDiv.innerHTML = `<div style="margin:24px 0 8px 0;font-weight:bold">Biểu đồ cấu trúc cơ thể (3D)</div><div class='text-muted' style='font-size:0.98rem;margin-bottom:12px'>Cập nhật chỉ số để xem cấu trúc cơ thể</div>`;
      return;
    }
    // Lấy thông tin user
    const gender = (localStorage.getItem('gender') || '').toLowerCase();
    const height = parseInt(localStorage.getItem('height') || '0', 10);
    const age = parseInt(localStorage.getItem('age') || '0', 10);
    // Khai báo các biến cần dùng cho bảng chỉ số
    const weight = typeof latest.canNang === 'number' && latest.canNang > 0 ? latest.canNang : null;
    const muscleKg = typeof latest.luongCoBap === 'number' && latest.luongCoBap > 0 ? latest.luongCoBap : null;
    // Hàm so sánh và format với màu sắc
    function compareValue(key, unit = '', digits = 1) {
      if (!previous || typeof latest[key] !== 'number' || typeof previous[key] !== 'number') return '-';
      const diff = latest[key] - previous[key];
      if (diff === 0) return '-';
      const sign = diff > 0 ? '+' : '';
      let good = false;
      if (key === 'canNang') {
        // So sánh với bảng lý tưởng
        let ideal = null;
        // Tìm chiều cao gần nhất
        let h = Object.keys(idealTable.weight).map(Number).reduce((prev, curr) => Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev);
        if (idealTable.weight[h] && gender) {
          ideal = idealTable.weight[h][gender === 'nam' ? 'male' : 'female'];
        }
        if (ideal) {
          // Nếu tiến gần về khoảng lý tưởng thì là tốt
          const prevDist = Math.min(Math.abs(previous[key] - ideal[0]), Math.abs(previous[key] - ideal[1]));
          const nowDist = Math.min(Math.abs(latest[key] - ideal[0]), Math.abs(latest[key] - ideal[1]));
          good = nowDist < prevDist;
        }
      } else if (key === 'tiLeMoCoThe') {
        const ideal = idealTable.fat[gender === 'nam' ? 'male' : 'female'];
        const prevDist = Math.min(Math.abs(previous[key] - ideal[0]), Math.abs(previous[key] - ideal[1]));
        const nowDist = Math.min(Math.abs(latest[key] - ideal[0]), Math.abs(latest[key] - ideal[1]));
        good = nowDist < prevDist;
      } else if (key === 'luongKhoangChat') {
        const ideal = idealTable.khoangChat[gender === 'nam' ? 'male' : 'female'];
        const prevDist = Math.min(Math.abs(previous[key] - ideal[0]), Math.abs(previous[key] - ideal[1]));
        const nowDist = Math.min(Math.abs(latest[key] - ideal[0]), Math.abs(latest[key] - ideal[1]));
        good = nowDist < prevDist;
      } else if (key === 'chiSoNuoc') {
        const ideal = idealTable.nuoc[gender === 'nam' ? 'male' : 'female'];
        // Nếu tiến gần về khoảng lý tưởng thì là tốt
        const prevDist = Math.min(Math.abs(previous[key] - ideal[0]), Math.abs(previous[key] - ideal[1]));
        const nowDist = Math.min(Math.abs(latest[key] - ideal[0]), Math.abs(latest[key] - ideal[1]));
        good = nowDist < prevDist;
      } else if (key === 'luongCoBap') {
        // So sánh với bảng lý tưởng cơ bắp (%)
        const ideal = idealTable.coBap[gender === 'nam' ? 'male' : 'female'];
        const prevDist = Math.min(Math.abs(previous[key] - ideal[0]), Math.abs(previous[key] - ideal[1]));
        const nowDist = Math.min(Math.abs(latest[key] - ideal[0]), Math.abs(latest[key] - ideal[1]));
        good = nowDist < prevDist;
      } else if (key === 'chiSoCanDoi') {
        // Chỉ số 5 là lý tưởng
        good = latest[key] === idealTable.chiSoCanDoi;
      } else if (key === 'tuoiSinhHoc') {
        // Nếu tuổi sinh học bé hơn tuổi thật là tốt
        good = latest[key] < age && (previous[key] >= age || latest[key] < previous[key]);
      } else if (key === 'moNoiTang') {
        const ideal = idealTable.moNoiTang[gender === 'nam' ? 'male' : 'female'];
        const prevDist = Math.min(Math.abs(previous[key] - ideal[0]), Math.abs(previous[key] - ideal[1]));
        const nowDist = Math.min(Math.abs(latest[key] - ideal[0]), Math.abs(latest[key] - ideal[1]));
        good = nowDist < prevDist;
      }
      const color = good ? '#43B02A' : '#d32f2f';
      return `<span style="color:${color}">(${sign}${diff.toFixed(digits)}${unit})</span>`;
    }
    let html = `<table class="metrics-table table table-bordered table-hover align-middle bg-white shadow-sm">
      <tr class="table-success"><th>Chỉ số</th><th>Giá trị</th><th>Biến động</th></tr>
      <tr><td>📅 Ngày kiểm tra</td><td>${latest.ngayKiemTra ? new Date(latest.ngayKiemTra).toLocaleDateString('vi-VN') : '-'}</td><td>-</td></tr>
      <tr><td>⚖️ Cân nặng (kg)</td><td>${latest.canNang ?? '-'}</td><td>${compareValue('canNang', ' kg', 1)}</td></tr>
      <tr><td>🏷️ Tỉ lệ mỡ (%)</td><td>${latest.tiLeMoCoThe ?? '-'}</td><td>${compareValue('tiLeMoCoThe', ' %', 1)}</td></tr>
      <tr><td>🦴 Khoáng chất</td><td>${latest.luongKhoangChat ?? '-'}</td><td>${compareValue('luongKhoangChat', '', 1)}</td></tr>
      <tr><td>💧 Nước (%)</td><td>${latest.chiSoNuoc ?? '-'}</td><td>${compareValue('chiSoNuoc', ' %', 1)}</td></tr>
      <tr><td>💪 Cơ bắp (%)</td><td>${(weight && muscleKg) ? (muscleKg / weight * 100).toFixed(1) : '-'}</td><td>${compareValue('luongCoBap', ' %', 1)}</td></tr>
      <tr><td>🧍‍♀️ Cân đối</td><td>${latest.chiSoCanDoi ?? '-'}</td><td>${compareValue('chiSoCanDoi', '', 1)}</td></tr>
      <tr><td>🔥 Năng lượng (kcal)</td><td>${latest.nangLuong ?? '-'}</td><td>${compareValue('nangLuong', ' kcal', 0)}</td></tr>
      <tr><td>⏳ Tuổi sinh học</td><td>${latest.tuoiSinhHoc ?? '-'}</td><td>${compareValue('tuoiSinhHoc', '', 0)}</td></tr>
      <tr><td>🍔 Mỡ nội tạng</td><td>${latest.moNoiTang ?? '-'}</td><td>${compareValue('moNoiTang', '', 1)}</td></tr>
    </table>`;
    metricsDiv.innerHTML = html;
    if (latest.phanTichBienDong) {
      analysisDiv.innerHTML = `<div class="analysis-title">Phân tích biến động:</div><div class="analysis-content">${latest.phanTichBienDong}</div>`;
    }
    // Thêm biểu đồ cấu trúc cơ thể
    let pieDiv = document.getElementById('body-structure-chart');
    if (!pieDiv) {
      pieDiv = document.createElement('div');
      pieDiv.id = 'body-structure-chart';
      metricsDiv.parentNode.insertBefore(pieDiv, metricsDiv.nextSibling);
    }
    // Tính toán các thành phần
    // SỬA ĐIỀU KIỆN: Chỉ render khi các trường đều là số và > 0
    const fatPercent = typeof latest.tiLeMoCoThe === 'number' && latest.tiLeMoCoThe > 0 ? latest.tiLeMoCoThe : null;
    const waterPercent = typeof latest.chiSoNuoc === 'number' && latest.chiSoNuoc > 0 ? latest.chiSoNuoc : null;
    let musclePercent = null;
    if (weight && muscleKg) musclePercent = (muscleKg / weight) * 100;
    let otherPercent = null;
    if (fatPercent !== null && musclePercent !== null && waterPercent !== null)
      otherPercent = 100 - (fatPercent + musclePercent + waterPercent);
    // Nếu thiếu dữ liệu, ẩn biểu đồ và hiện thông báo rõ ràng
    if (weight === null || fatPercent === null || muscleKg === null || waterPercent === null) {
      let missing = [];
      if (weight === null) missing.push('Cân nặng');
      if (fatPercent === null) missing.push('Tỉ lệ mỡ');
      if (muscleKg === null) missing.push('Cơ bắp');
      if (waterPercent === null) missing.push('Nước');
      const msg = `Không đủ dữ liệu để render biểu đồ cấu trúc cơ thể. Thiếu: ${missing.join(', ')}.`;
      pieDiv.innerHTML = `<div style="margin:24px 0 8px 0;font-weight:bold">Biểu đồ cấu trúc cơ thể (3D)</div><div class='text-muted' style='font-size:0.98rem;margin-bottom:12px'>${msg} Hãy cập nhật chỉ số cơ thể để xem biểu đồ cấu trúc.</div>`;
    } else {
      pieDiv.innerHTML = `
        <div style="margin:24px 0 8px 0;font-weight:bold">Biểu đồ cấu trúc cơ thể (3D)</div>
        <canvas id="bodyPieChart" width="220" height="180"></canvas>
      `;
      // Dữ liệu cho biểu đồ
      const pieLabels = ['Mỡ', 'Cơ bắp', 'Nước', 'Phần còn lại'];
      const pieData = [
        fatPercent ?? 0,
        musclePercent ?? 0,
        waterPercent ?? 0,
        otherPercent !== null ? Math.max(0, otherPercent) : 0
      ];
      function drawBodyPieChart() {
        const canvas = document.getElementById('bodyPieChart');
        if (!canvas) {
          console.error('[BodyPieChart] Không tìm thấy canvas bodyPieChart!');
          return;
        }
        const ctx = canvas.getContext('2d');
        if (window.bodyPieChartObj) window.bodyPieChartObj.destroy();
        window.bodyPieChartObj = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: pieLabels.map((label, i) => `${label} (${pieData[i].toFixed(1)}%)`),
            datasets: [{
              data: pieData,
              backgroundColor: [
                '#f44336', // mỡ
                '#43B02A', // cơ bắp
                '#1976d2', // nước
                '#bdbdbd'  // phần còn lại
              ],
              borderWidth: 2,
              hoverOffset: 16,
              borderJoinStyle: 'round',
              borderAlign: 'inner',
              shadowOffsetX: 2,
              shadowOffsetY: 2,
              shadowBlur: 8,
              shadowColor: 'rgba(0,0,0,0.2)'
            }]
          },
          options: {
            plugins: {
              legend: { position: 'right' },
              title: { display: false }
            },
            cutout: '60%',
            animation: { animateRotate: true, animateScale: true },
            responsive: true
          }
        });
      }
      // Đảm bảo luôn gọi đúng lúc
      setTimeout(() => {
        if (window.Chart) drawBodyPieChart();
        else {
          const chartjsCdn = document.getElementById('chartjs-cdn');
          if (chartjsCdn) chartjsCdn.onload = () => drawBodyPieChart();
        }
      }, 0);
    }
  } catch {
    metricsDiv.innerHTML = '<div>Lỗi khi tải dữ liệu.</div>';
  }
}

// Sự kiện menu
menuDashboard.onclick = () => {
  setActiveMenu(menuDashboard);
  renderDashboard();
};
menuUpdate.onclick = () => {
  setActiveMenu(menuUpdate);
  // Mở modal cập nhật chỉ số
  const openModalBtn = document.getElementById('open-update-modal');
  if (openModalBtn) openModalBtn.click();
};

// Sự kiện click menu quản trị viên
if (menuAdmin) menuAdmin.addEventListener('click', function() {
  setActiveMenu(menuAdmin);
  renderAdminPanel();
});
if (menuAdminMobile) menuAdminMobile.addEventListener('click', function() {
  setActiveMenu(menuAdmin);
  renderAdminPanel();
});

function renderAdminPanel() {
  mainTitle.innerHTML = '<span style="font-size:1.5rem;font-weight:bold;color:#43B02A;">👥 Quản lý người dùng</span>';
  mainContentArea.innerHTML = `
    <ul class="nav nav-tabs mb-3" id="adminTab" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="user-tab" data-bs-toggle="tab" data-bs-target="#user-pane" type="button" role="tab" aria-controls="user-pane" aria-selected="true">Người dùng</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="group-tab" data-bs-toggle="tab" data-bs-target="#group-pane" type="button" role="tab" aria-controls="group-pane" aria-selected="false">Nhóm</button>
      </li>
    </ul>
    <div class="tab-content" id="adminTabContent">
      <div class="tab-pane fade show active" id="user-pane" role="tabpanel" aria-labelledby="user-tab">
        <div id="admin-user-panel">Đang tải danh sách người dùng...</div>
      </div>
      <div class="tab-pane fade" id="group-pane" role="tabpanel" aria-labelledby="group-tab">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="fw-bold">Danh sách nhóm</span>
          <button class="btn btn-success btn-sm" id="btn-add-group"><i class="bi bi-plus-circle"></i> Thêm nhóm</button>
        </div>
        <div id="admin-group-panel">Đang tải danh sách nhóm...</div>
      </div>
    </div>
    <!-- Modal thêm/sửa nhóm -->
    <div class="modal fade" id="groupModal" tabindex="-1" aria-labelledby="groupModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="groupModalLabel">Thêm/Sửa nhóm</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="groupForm">
              <input type="hidden" id="groupId" />
              <div class="mb-3">
                <label for="groupName" class="form-label">Tên nhóm</label>
                <input type="text" class="form-control" id="groupName" required />
              </div>
              <div class="mb-3">
                <label for="groupDesc" class="form-label">Mô tả</label>
                <input type="text" class="form-control" id="groupDesc" />
              </div>
              <div class="mb-3">
                <label class="form-label">Quyền</label><br>
                <input type="checkbox" id="groupNotePermission" /> <label for="groupNotePermission">Ghi chú</label>
                <input type="checkbox" id="groupMessagePermission" style="margin-left:12px" /> <label for="groupMessagePermission">Nhắn tin</label>
              </div>
              <button type="submit" class="btn btn-primary">Lưu</button>
            </form>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal sửa user -->
    <div class="modal fade" id="userModal" tabindex="-1" aria-labelledby="userModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="userModalLabel">Sửa người dùng</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="userForm">
              <input type="hidden" id="editUserId" />
              <div class="mb-3">
                <label for="editFullname" class="form-label">Họ tên</label>
                <input type="text" class="form-control" id="editFullname" required />
              </div>
              <div class="mb-3">
                <label for="editBirthday" class="form-label">Ngày sinh</label>
                <input type="date" class="form-control" id="editBirthday" required />
              </div>
              <div class="mb-3">
                <label for="editHeight" class="form-label">Chiều cao (cm)</label>
                <input type="number" class="form-control" id="editHeight" required />
              </div>
              <div class="mb-3">
                <label for="editGender" class="form-label">Giới tính</label>
                <select class="form-select" id="editGender" required>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="editGroup" class="form-label">Nhóm</label>
                <select class="form-select" id="editGroup" required></select>
              </div>
              <button type="submit" class="btn btn-primary">Lưu</button>
            </form>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal xác nhận xóa -->
    <div class="modal fade" id="confirmModal" tabindex="-1" aria-labelledby="confirmModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="confirmModalLabel">Xác nhận</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="confirmModalBody"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
            <button type="button" class="btn btn-danger" id="btn-confirm-delete">Xóa</button>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal reset mật khẩu -->
    <div class="modal fade" id="resetModal" tabindex="-1" aria-labelledby="resetModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="resetModalLabel">Reset mật khẩu</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="resetForm">
              <input type="hidden" id="resetUserId" />
              <div class="mb-3">
                <label for="resetPassword" class="form-label">Mật khẩu mới</label>
                <input type="text" class="form-control" id="resetPassword" required />
              </div>
              <button type="submit" class="btn btn-warning">Reset</button>
            </form>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal xem chỉ số -->
    <div class="modal fade" id="metricsModal" tabindex="-1" aria-labelledby="metricsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="metricsModalLabel">Chỉ số người dùng</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="metricsModalBody">Đang tải...</div>
        </div>
      </div>
    </div>
  `;
  renderUserTable();
  renderGroupTable();
  // Sự kiện chuyển tab
  const userTab = document.getElementById('user-tab');
  const groupTab = document.getElementById('group-tab');
  if (userTab && groupTab) {
    userTab.addEventListener('shown.bs.tab', renderUserTable);
    groupTab.addEventListener('shown.bs.tab', renderGroupTable);
  }
  // Sự kiện thêm nhóm
  setTimeout(() => {
    const btnAddGroup = document.getElementById('btn-add-group');
    if (btnAddGroup) btnAddGroup.onclick = () => openGroupModal(null, []);
  }, 100);
}

async function renderUserTable() {
  const panel = document.getElementById('admin-user-panel');
  if (!panel) return;
  panel.innerHTML = 'Đang tải...';
  try {
    const res = await fetch('/admin/users', { headers: { 'x-user-id': userId } });
    const users = await res.json();
    const groups = await fetchGroups();
    if (window.innerWidth < 700) {
      // Mobile: render card
      let html = '';
      for (const u of users) {
        html += `<div class="user-card-admin mb-3 p-3 bg-white rounded shadow-sm">
          <div class="mb-1"><b>Tên đăng nhập:</b> ${u.username}</div>
          <div class="mb-1"><b>Họ tên:</b> ${u.fullname}</div>
          <div class="mb-1"><b>Nhóm:</b> ${u.group?.name || ''}</div>
          <div class="mb-1"><b>Giới tính:</b> ${u.gender}</div>
          <div class="mb-1"><b>Chiều cao:</b> ${u.height}</div>
          <div class="mb-1"><b>Ngày sinh:</b> ${u.birthday ? new Date(u.birthday).toLocaleDateString('vi-VN') : ''}</div>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <button class="btn btn-sm btn-primary" data-id="${u._id}" data-action="edit">Sửa</button>
            <button class="btn btn-sm btn-danger" data-id="${u._id}" data-action="delete">Xóa</button>
            <button class="btn btn-sm btn-warning" data-id="${u._id}" data-action="reset">Reset mật khẩu</button>
            <button class="btn btn-sm btn-info" data-id="${u._id}" data-action="metrics">Chỉ số</button>
          </div>
        </div>`;
      }
      panel.innerHTML = html;
      // Gán sự kiện cho các nút thao tác
      panel.querySelectorAll('button[data-action]').forEach(btn => {
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        if (action === 'edit') btn.onclick = () => openUserModal(id, users, groups);
        if (action === 'delete') btn.onclick = () => confirmDeleteUser(id);
        if (action === 'reset') btn.onclick = () => openResetModal(id);
        if (action === 'metrics') btn.onclick = () => openMetricsModal(id);
      });
    } else {
      // Desktop: render table như cũ
      let html = `<table class="table table-bordered table-hover align-middle bg-white shadow-sm"><thead><tr><th>Tên đăng nhập</th><th>Họ tên</th><th>Nhóm</th><th>Giới tính</th><th>Chiều cao</th><th>Ngày sinh</th><th>Thao tác</th></tr></thead><tbody>`;
      for (const u of users) {
        html += `<tr>
          <td>${u.username}</td>
          <td>${u.fullname}</td>
          <td>${u.group?.name || ''}</td>
          <td>${u.gender}</td>
          <td>${u.height}</td>
          <td>${u.birthday ? new Date(u.birthday).toLocaleDateString('vi-VN') : ''}</td>
          <td>
            <button class="btn btn-sm btn-primary me-1" data-id="${u._id}" data-action="edit">Sửa</button>
            <button class="btn btn-sm btn-danger me-1" data-id="${u._id}" data-action="delete">Xóa</button>
            <button class="btn btn-sm btn-warning me-1" data-id="${u._id}" data-action="reset">Reset mật khẩu</button>
            <button class="btn btn-sm btn-info" data-id="${u._id}" data-action="metrics">Chỉ số</button>
          </td>
        </tr>`;
      }
      html += '</tbody></table>';
      panel.innerHTML = html;
      // Gán sự kiện cho các nút thao tác
      panel.querySelectorAll('button[data-action]').forEach(btn => {
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        if (action === 'edit') btn.onclick = () => openUserModal(id, users, groups);
        if (action === 'delete') btn.onclick = () => confirmDeleteUser(id);
        if (action === 'reset') btn.onclick = () => openResetModal(id);
        if (action === 'metrics') btn.onclick = () => openMetricsModal(id);
      });
    }
  } catch {
    panel.innerHTML = '<span class="text-danger">Lỗi tải danh sách người dùng.</span>';
  }
}

async function renderGroupTable() {
  const panel = document.getElementById('admin-group-panel');
  if (!panel) return;
  panel.innerHTML = 'Đang tải...';
  try {
    const res = await fetch('/admin/groups', { headers: { 'x-user-id': userId } });
    const groups = await res.json();
    let html = `<table class="table table-bordered table-hover align-middle bg-white shadow-sm"><thead><tr><th>Tên nhóm</th><th>Mô tả</th><th>Thao tác</th></tr></thead><tbody>`;
    for (const g of groups) {
      html += `<tr>
        <td>${g.name}</td>
        <td>${g.description || ''}</td>
        <td>
          <button class="btn btn-sm btn-primary me-1" data-id="${g._id}" data-action="edit">Sửa</button>
          <button class="btn btn-sm btn-danger" data-id="${g._id}" data-action="delete">Xóa</button>
        </td>
      </tr>`;
    }
    html += '</tbody></table>';
    panel.innerHTML = html;
    // Gán sự kiện cho các nút thao tác
    panel.querySelectorAll('button[data-action]').forEach(btn => {
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      if (action === 'edit') btn.onclick = () => openGroupModal(id, groups);
      if (action === 'delete') btn.onclick = () => confirmDeleteGroup(id);
    });
  } catch {
    panel.innerHTML = '<span class="text-danger">Lỗi tải danh sách nhóm.</span>';
  }
}

// Helper: lấy danh sách nhóm
async function fetchGroups() {
  const res = await fetch('/admin/groups', { headers: { 'x-user-id': userId } });
  return await res.json();
}

// Modal nhóm
function openGroupModal(id, groups) {
  const modal = new bootstrap.Modal(document.getElementById('groupModal'));
  const form = document.getElementById('groupForm');
  form.reset();
  if (id) {
    const group = (groups || []).find(g => g._id === id);
    document.getElementById('groupId').value = group._id;
    document.getElementById('groupName').value = group.name;
    document.getElementById('groupDesc').value = group.description || '';
    const perms = group.permissions || {};
    document.getElementById('groupNotePermission').checked = !!perms.note;
    document.getElementById('groupMessagePermission').checked = !!perms.message;
    document.getElementById('groupModalLabel').innerText = 'Sửa nhóm';
  } else {
    document.getElementById('groupId').value = '';
    document.getElementById('groupName').value = '';
    document.getElementById('groupDesc').value = '';
    document.getElementById('groupNotePermission').checked = false;
    document.getElementById('groupMessagePermission').checked = false;
    document.getElementById('groupModalLabel').innerText = 'Thêm nhóm';
  }
  form.onsubmit = async e => {
    e.preventDefault();
    const id = document.getElementById('groupId').value;
    const name = document.getElementById('groupName').value;
    const description = document.getElementById('groupDesc').value;
    const note = document.getElementById('groupNotePermission').checked;
    const message = document.getElementById('groupMessagePermission').checked;
    if (id) {
      await fetch(`/admin/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ name, description, permissions: { note, message } })
      });
    } else {
      await fetch('/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ name, description, permissions: { note, message } })
      });
    }
    modal.hide();
    renderGroupTable();
    renderUserTable();
  };
  modal.show();
}

function confirmDeleteGroup(id) {
  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
  document.getElementById('confirmModalBody').innerText = 'Bạn có chắc chắn muốn xóa nhóm này?';
  document.getElementById('btn-confirm-delete').onclick = async () => {
    await fetch(`/admin/groups/${id}`, { method: 'DELETE', headers: { 'x-user-id': userId } });
    modal.hide();
    renderGroupTable();
    renderUserTable();
  };
  modal.show();
}

// Sửa openUserModal để dùng showErrorModal, KHÔNG lặp lại khai báo biến toàn cục
async function openUserModal(id, users, groups) {
  const modal = new bootstrap.Modal(document.getElementById('userModal'));
  const form = document.getElementById('userForm');
  const user = users.find(u => u._id === id);
  form.reset();
  document.getElementById('editUserId').value = user._id;
  document.getElementById('editFullname').value = user.fullname;
  document.getElementById('editBirthday').value = user.birthday ? new Date(user.birthday).toISOString().slice(0,10) : '';
  document.getElementById('editHeight').value = user.height;
  document.getElementById('editGender').value = user.gender;
  // Đổ nhóm
  const groupSelect = document.getElementById('editGroup');
  groupSelect.innerHTML = groups.map(g => `<option value="${g._id}"${user.group && user.group._id === g._id ? ' selected' : ''}>${g.name}</option>`).join('');
  form.onsubmit = async e => {
    e.preventDefault();
    const _id = document.getElementById('editUserId').value;
    const fullname = document.getElementById('editFullname').value;
    const birthday = document.getElementById('editBirthday').value;
    const height = document.getElementById('editHeight').value;
    const gender = document.getElementById('editGender').value;
    const group = document.getElementById('editGroup').value;
    try {
      const res = await fetch(`/admin/users/${_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ fullname, birthday, height, gender, group })
      });
      if (res.ok) {
        modal.hide();
        renderUserTable();
      } else {
        const result = await res.json();
        showErrorModal(result.message || 'Lỗi khi cập nhật người dùng.');
      }
    } catch (err) {
      showErrorModal('Lỗi kết nối máy chủ.');
    }
  };
  modal.show();
}

function confirmDeleteUser(id) {
  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
  document.getElementById('confirmModalBody').innerText = 'Bạn có chắc chắn muốn xóa người dùng này?';
  document.getElementById('btn-confirm-delete').onclick = async () => {
    await fetch(`/admin/users/${id}`, { method: 'DELETE', headers: { 'x-user-id': userId } });
    modal.hide();
    renderUserTable();
  };
  modal.show();
}

function openResetModal(id) {
  const modal = new bootstrap.Modal(document.getElementById('resetModal'));
  const form = document.getElementById('resetForm');
  form.reset();
  document.getElementById('resetUserId').value = id;
  form.onsubmit = async e => {
    e.preventDefault();
    const _id = document.getElementById('resetUserId').value;
    const newPassword = document.getElementById('resetPassword').value;
    await fetch(`/admin/users/${_id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ newPassword })
    });
    modal.hide();
  };
  modal.show();
}

async function openMetricsModal(id) {
  const modal = new bootstrap.Modal(document.getElementById('metricsModal'));
  const body = document.getElementById('metricsModalBody');
  body.innerHTML = 'Đang tải...';
  const res = await fetch(`/admin/users/${id}/metrics`, { headers: { 'x-user-id': userId } });
  const metrics = await res.json();
  if (!metrics.length) {
    body.innerHTML = '<div>Chưa có dữ liệu chỉ số.</div>';
  } else {
    let html = `<table class="table table-bordered table-hover align-middle bg-white shadow-sm"><thead><tr><th>Ngày</th><th>Cân nặng</th><th>Tỉ lệ mỡ</th><th>Khoáng chất</th><th>Nước</th><th>Cơ bắp</th><th>Cân đối</th><th>Năng lượng</th><th>Tuổi sinh học</th><th>Mỡ nội tạng</th><th>Ghi chú</th><th></th></tr></thead><tbody>`;
    for (const m of metrics) {
      const hasNote = m.note && m.note.trim() !== '';
      html += `<tr${hasNote ? ' style="background:#fffbe6"' : ''}>
        <td>${m.ngayKiemTra ? new Date(m.ngayKiemTra).toLocaleDateString('vi-VN') : ''}</td>
        <td>${m.canNang ?? ''}</td>
        <td>${m.tiLeMoCoThe ?? ''}</td>
        <td>${m.luongKhoangChat ?? ''}</td>
        <td>${m.chiSoNuoc ?? ''}</td>
        <td>${m.luongCoBap ?? ''}</td>
        <td>${m.chiSoCanDoi ?? ''}</td>
        <td>${m.nangLuong ?? ''}</td>
        <td>${m.tuoiSinhHoc ?? ''}</td>
        <td>${m.moNoiTang ?? ''}</td>
        <td>${hasNote ? `<span title="${m.note.replace(/\"/g, '&quot;')}">📝</span>` : ''}</td>
        <td><button class="btn btn-outline-secondary btn-sm note-btn" data-metric="${m._id}" data-user="${id}" title="Ghi chú"><i class="bi bi-journal-text"></i></button></td>
      </tr>`;
    }
    html += '</tbody></table>';
    body.innerHTML = html;
    // Gán sự kiện cho nút note
    body.querySelectorAll('.note-btn').forEach(btn => {
      btn.onclick = () => {
        currentNoteMetricId = btn.getAttribute('data-metric');
        currentNoteUserId = btn.getAttribute('data-user');
        const metric = metrics.find(m => m._id === currentNoteMetricId);
        document.getElementById('noteInput').value = metric && metric.note ? metric.note : '';
        const noteModal = new bootstrap.Modal(document.getElementById('noteModal'));
        noteModal.show();
      };
    });
  }
  modal.show();
}

// Lưu ghi chú
const saveNoteBtn = document.getElementById('saveNoteBtn');
if (saveNoteBtn) {
  saveNoteBtn.onclick = async () => {
    const note = document.getElementById('noteInput').value;
    if (!currentNoteMetricId || !currentNoteUserId) return;
    await fetch(`/admin/users/${currentNoteUserId}/metrics/${currentNoteMetricId}/note`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ note })
    });
    // Đóng modal ghi chú
    const noteModalEl = document.getElementById('noteModal');
    const noteModal = bootstrap.Modal.getInstance(noteModalEl);
    if (noteModal) noteModal.hide();
    // Đợi modal ghi chú đóng xong rồi mới mở lại modal chỉ số
    noteModalEl.addEventListener('hidden.bs.modal', function handler() {
      // Xử lý triệt để: xóa mọi backdrop còn sót lại
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      openMetricsModal(currentNoteUserId);
      noteModalEl.removeEventListener('hidden.bs.modal', handler);
    });
  };
}

// Thêm bảng chỉ số cho user tự xem
function openReadNoteModal(note) {
  let noteModalDiv = document.getElementById('noteModal');
  if (!noteModalDiv) return;
  // Ẩn textarea và nút lưu, chỉ hiển thị note dạng readonly
  const modalBody = noteModalDiv.querySelector('.modal-body');
  const modalFooter = noteModalDiv.querySelector('.modal-footer');
  if (modalBody) {
    modalBody.innerHTML = `<div class="form-control" style="min-height:100px;white-space:pre-line;background:#f8f9fa" readonly>${note ? note.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</div>`;
  }
  if (modalFooter) {
    modalFooter.innerHTML = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>';
  }
  const modal = new bootstrap.Modal(document.getElementById('noteModal'));
  modal.show();
}

function renderUserMetricsTable(metrics, viewWidth) {
  if ((viewWidth ?? window.innerWidth) < 900) {
    // Mobile: render calendar
    return renderCalendarWithMetrics(metrics, viewWidth);
  }
  // Desktop: render table như cũ
  let html = `<div class="mt-4"><h5>Lịch sử chỉ số của bạn</h5><table class="table table-bordered table-hover align-middle bg-white shadow-sm"><thead><tr><th>Ngày</th><th>Cân nặng</th><th>Tỉ lệ mỡ</th><th>Khoáng chất</th><th>Nước</th><th>Cơ bắp</th><th>Cân đối</th><th>Năng lượng</th><th>Tuổi sinh học</th><th>Mỡ nội tạng</th><th>Ghi chú</th></tr></thead><tbody>`;
  metrics.forEach((m, idx) => {
    const hasNote = m.note && m.note.trim() !== '';
    html += `<tr${hasNote ? ' style=\"background:#fffbe6\"' : ''}>
      <td>${m.ngayKiemTra ? new Date(m.ngayKiemTra).toLocaleDateString('vi-VN') : ''}</td>
      <td>${m.canNang ?? ''}</td>
      <td>${m.tiLeMoCoThe ?? ''}</td>
      <td>${m.luongKhoangChat ?? ''}</td>
      <td>${m.chiSoNuoc ?? ''}</td>
      <td>${m.luongCoBap ?? ''}</td>
      <td>${m.chiSoCanDoi ?? ''}</td>
      <td>${m.nangLuong ?? ''}</td>
      <td>${m.tuoiSinhHoc ?? ''}</td>
      <td>${m.moNoiTang ?? ''}</td>
      <td>${hasNote ? `<span class=\"note-icon\" data-idx=\"${idx}\" style=\"cursor:pointer\" title=\"Xem ghi chú\">📝</span>` : ''}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  setTimeout(() => {
    document.querySelectorAll('.note-icon').forEach(el => {
      el.onclick = function() {
        const idx = this.getAttribute('data-idx');
        openReadNoteModal(metrics[idx].note);
      };
    });
  }, 0);
  return html;
}

// Hàm render lịch tháng, đánh dấu ngày có chỉ số
function renderCalendarWithMetrics(metrics, viewWidth, yearArg, monthArg) {
  // Tạo map ngày có chỉ số và map ngày có ghi chú
  const daysWithMetrics = {};
  const daysWithNote = {};
  metrics.forEach(m => {
    if (m.ngayKiemTra) {
      const d = new Date(m.ngayKiemTra);
      const key = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2,'0') + '-' + d.getDate().toString().padStart(2,'0');
      daysWithMetrics[key] = m;
      if (m.note && m.note.trim() !== '') daysWithNote[key] = true;
    }
  });
  // Lấy tháng/năm hiện tại hoặc truyền vào
  const now = new Date();
  let year = typeof yearArg === 'number' ? yearArg : now.getFullYear();
  let month = typeof monthArg === 'number' ? monthArg : now.getMonth();
  // Cho phép chuyển tháng
  let html = `<div class="metrics-calendar-container"><div class="calendar-header"><button id="prevMonthBtn">‹</button> <span id="calendarMonthLabel">${month+1}/${year}</span> <button id="nextMonthBtn">›</button></div>`;
  html += '<table class="metrics-calendar"><thead><tr>';
  ['CN','T2','T3','T4','T5','T6','T7'].forEach(d => html += `<th>${d}</th>`);
  html += '</tr></thead><tbody>';
  // Tìm ngày đầu tháng
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  let day = 1 - startDay;
  for (let w = 0; w < 6; w++) {
    html += '<tr>';
    for (let d = 0; d < 7; d++, day++) {
      if (day < 1 || day > daysInMonth) {
        html += '<td></td>';
      } else {
        const key = year + '-' + (month+1).toString().padStart(2,'0') + '-' + day.toString().padStart(2,'0');
        if (daysWithMetrics[key]) {
          const dotClass = daysWithNote[key] ? 'dot-note' : 'dot';
          html += `<td class="has-metrics" data-date="${key}">${day}<span class="${dotClass}"></span></td>`;
        } else {
          html += `<td>${day}</td>`;
        }
      }
    }
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  // Modal HTML (nếu chưa có)
  if (!document.getElementById('metricsDayModal')) {
    const modal = document.createElement('div');
    modal.id = 'metricsDayModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `<div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Chỉ số ngày <span id="metricsDayLabel"></span></h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="metricsDayBody"></div></div></div>`;
    document.body.appendChild(modal);
  }
  setTimeout(() => {
    // Sự kiện chuyển tháng: fetch dữ liệu mới cho tháng đó
    document.getElementById('prevMonthBtn').onclick = () => {
      let newMonth = month - 1;
      let newYear = year;
      if (newMonth < 0) { newMonth = 11; newYear--; }
      fetch(`/api/body-metrics/by-month?year=${newYear}&month=${newMonth+1}`, { headers: { 'x-user-id': userId } })
        .then(res => res.json())
        .then(newData => {
          document.getElementById('user-metrics-table').innerHTML = renderCalendarWithMetrics(newData, viewWidth, newYear, newMonth);
        });
    };
    document.getElementById('nextMonthBtn').onclick = () => {
      let newMonth = month + 1;
      let newYear = year;
      if (newMonth > 11) { newMonth = 0; newYear++; }
      fetch(`/api/body-metrics/by-month?year=${newYear}&month=${newMonth+1}`, { headers: { 'x-user-id': userId } })
        .then(res => res.json())
        .then(newData => {
          document.getElementById('user-metrics-table').innerHTML = renderCalendarWithMetrics(newData, viewWidth, newYear, newMonth);
        });
    };
    // Sự kiện click ngày có chỉ số
    document.querySelectorAll('.has-metrics').forEach(td => {
      td.onclick = () => {
        const key = td.getAttribute('data-date');
        showMetricsModalForDate(key, metrics);
      };
    });
  }, 0);
  return html;
}

function showMetricsModalForDate(dateKey, metrics) {
  const m = metrics.find(m => {
    const d = new Date(m.ngayKiemTra);
    const key = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2,'0') + '-' + d.getDate().toString().padStart(2,'0');
    return key === dateKey;
  });
  if (!m) return;
  document.getElementById('metricsDayLabel').textContent = new Date(m.ngayKiemTra).toLocaleDateString('vi-VN');
  let html = '<ul class="list-group">';
  html += `<li class="list-group-item">Cân nặng: <b>${m.canNang ?? ''}</b></li>`;
  html += `<li class="list-group-item">Tỉ lệ mỡ: <b>${m.tiLeMoCoThe ?? ''}</b></li>`;
  html += `<li class="list-group-item">Khoáng chất: <b>${m.luongKhoangChat ?? ''}</b></li>`;
  html += `<li class="list-group-item">Nước: <b>${m.chiSoNuoc ?? ''}</b></li>`;
  html += `<li class="list-group-item">Cơ bắp: <b>${m.luongCoBap ?? ''}</b></li>`;
  html += `<li class="list-group-item">Cân đối: <b>${m.chiSoCanDoi ?? ''}</b></li>`;
  html += `<li class="list-group-item">Năng lượng: <b>${m.nangLuong ?? ''}</b></li>`;
  html += `<li class="list-group-item">Tuổi sinh học: <b>${m.tuoiSinhHoc ?? ''}</b></li>`;
  html += `<li class="list-group-item">Mỡ nội tạng: <b>${m.moNoiTang ?? ''}</b></li>`;
  if (m.note) html += `<li class="list-group-item">Ghi chú: <b>${m.note}</b></li>`;
  html += '</ul>';
  document.getElementById('metricsDayBody').innerHTML = html;
  const modal = new bootstrap.Modal(document.getElementById('metricsDayModal'));
  modal.show();
}

window.addEventListener('DOMContentLoaded', () => {
  const sidebarHeader = document.querySelector('.sidebar-header');
  if (sidebarHeader) {
    sidebarHeader.style.cursor = 'pointer';
    sidebarHeader.onclick = () => {
      if (localStorage.getItem('userId')) {
        window.location.href = 'dashboard.html';
      } else {
        window.location.href = 'index.html';
      }
    };
  }

  // Gán sự kiện cho tất cả nút đăng xuất (desktop + mobile)
  document.querySelectorAll('#btn-logout').forEach(btn => {
    btn.onclick = () => {
      localStorage.removeItem('userId');
      window.location.href = 'index.html';
    };
  });

  // Gán sự kiện cho tất cả nút cập nhật chỉ số (desktop + mobile)
  document.querySelectorAll('#open-update-modal').forEach(btn => {
    btn.onclick = () => {
      // Nếu đang ở mobile/offcanvas, đóng offcanvas trước
      const offcanvasEl = document.getElementById('sidebarOffcanvas');
      const isOffcanvasOpen = offcanvasEl && offcanvasEl.classList.contains('show');
      if (isOffcanvasOpen) {
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl) || new bootstrap.Offcanvas(offcanvasEl);
        bsOffcanvas.hide();
        offcanvasEl.addEventListener('hidden.bs.offcanvas', function handler() {
          openUpdateMetricsModal();
          offcanvasEl.removeEventListener('hidden.bs.offcanvas', handler);
        });
      } else {
        openUpdateMetricsModal();
      }
    };
  });

  function openUpdateMetricsModal() {
    // Reset form mỗi lần mở
    var form = document.getElementById('metricsForm');
    if (form) {
      form.reset();
      form.ngayKiemTra.value = new Date().toISOString().slice(0, 10);
    }
    // Reset các trường ảnh khi mở modal
    imageBase64 = '';
    if (imagePreview) imagePreview.innerHTML = '';
    if (analyzeResult) analyzeResult.innerHTML = '';
    if (imageInput) imageInput.value = '';
    const modal = new bootstrap.Modal(document.getElementById('updateMetricsModal'));
    modal.show();
  }

  // Gán sự kiện cho input file, custom label, ... chỉ 1 lần duy nhất
  let imageBase64 = '';
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const analyzeResult = document.getElementById('analyzeResult');
  const customImageLabel = document.getElementById('custom-image-label');
  const btnAnalyze = document.getElementById('btn-analyze');

  if (imageInput) {
    imageInput.onchange = () => {
      const file = imageInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        imageBase64 = e.target.result.split(',')[1];
        if (imagePreview) imagePreview.innerHTML = `<img src="${e.target.result}" alt="preview" style="max-width:200px;max-height:200px;" />`;
        imageInput.value = "";
      };
      reader.readAsDataURL(file);
    };
  }
  if (customImageLabel && imageInput) {
    customImageLabel.ondragover = (e) => {
      e.preventDefault();
      customImageLabel.classList.add('shadow-lg', 'border-primary');
      customImageLabel.classList.remove('border-secondary');
    };
    customImageLabel.ondragleave = (e) => {
      e.preventDefault();
      customImageLabel.classList.remove('shadow-lg');
    };
    customImageLabel.ondrop = (e) => {
      e.preventDefault();
      customImageLabel.classList.remove('shadow-lg');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        imageInput.value = "";
        imageInput.files = e.dataTransfer.files;
        const event = new Event('change');
        imageInput.dispatchEvent(event);
      }
    };
  }
  if (btnAnalyze) {
    btnAnalyze.onclick = async () => {
      if (!imageBase64) {
        if (analyzeResult) analyzeResult.innerHTML = '<span style="color:#d32f2f">Vui lòng chọn ảnh trước!</span>';
        return;
      }
      if (analyzeResult) analyzeResult.innerHTML = 'Đang phân tích...';
      const fullname = localStorage.getItem('fullname') || '';
      const gender = localStorage.getItem('gender') || '';
      const height = localStorage.getItem('height') || '';
      const age = localStorage.getItem('age') || '';
      const prompt = `đây là hình ảnh ghi chỉ số sức khỏe của ${fullname}, giới tính ${gender}, chiều cao ${height} cm, tuổi ${age}. Hãy phân tích và chỉ trích xuất đầy đủ các chỉ số của ngày gần nhất (mới nhất) trong ảnh, gồm: cân nặng, tỉ lệ mỡ cơ thể, khoáng chất, nước, cơ bắp, chỉ số cân đối, năng lượng, tuổi sinh học, mỡ nội tạng. Trả lời hoàn toàn bằng tiếng Việt, trả về kết quả dưới dạng JSON với các trường: cân_nặng, mỡ_cơ_thể, khoáng_chất, nước, cơ_bắp, cân_đối, năng_lượng, tuổi_sinh_học, mỡ_nội_tạng, và phân tích sự thay đổi so với chỉ số gần nhất trước đó (nếu có)`;
      try {
        const res = await fetch('/api/body-metrics/analyze-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({ imageBase64, fullname, gender, height, age, prompt })
        });
        const result = await res.json();
        if (res.ok && result) {
          if (analyzeResult) analyzeResult.innerHTML = '<span style="color:#43B02A">Đã phân tích xong! Đã tự động điền vào form bên dưới.</span>';
          const form = document.getElementById('metricsForm');
          if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = result.candidates[0].content.parts[0].text;
            const match = text.match(/```json\s*([\s\S]*?)```/);
            if (match) {
              try {
                let jsonStr = match[1]
                  .replace(/\/\/.*$/gm, '')
                  .replace(/,([\s\n\r]*[}\]])/g, '$1')
                  .trim();
                const metricsObj = JSON.parse(jsonStr);
                const latest = metricsObj.measurements?.[0]
                  || metricsObj["thông_tin_sức_khỏe"]?.[0]
                  || metricsObj["chỉ_số_sức_khỏe"]?.[0]
                  || {};
                if (form && form.canNang && latest.weight) form.canNang.value = latest.weight;
                if (form && form.tiLeMoCoThe && latest.body_fat) form.tiLeMoCoThe.value = latest.body_fat;
                if (form && form.luongKhoangChat && latest.bone_density) form.luongKhoangChat.value = latest.bone_density;
                if (form && form.chiSoNuoc && latest.water) form.chiSoNuoc.value = latest.water;
                if (form && form.luongCoBap && latest.muscle_mass) form.luongCoBap.value = latest.muscle_mass;
                if (form && form.nangLuong && latest.energy) form.nangLuong.value = latest.energy;
                if (form && form.tuoiSinhHoc && latest.biological_age) form.tuoiSinhHoc.value = latest.biological_age;
                if (form && form.moNoiTang && latest.visceral_fat) form.moNoiTang.value = latest.visceral_fat;
                if (form && form.canNang && typeof metricsObj["cân_nặng"] === 'number') form.canNang.value = metricsObj["cân_nặng"];
                if (form && form.tiLeMoCoThe && typeof metricsObj["mỡ_cơ_thể"] === 'number') form.tiLeMoCoThe.value = metricsObj["mỡ_cơ_thể"];
                if (form && form.luongKhoangChat && typeof metricsObj["khoáng_chất"] === 'number') form.luongKhoangChat.value = metricsObj["khoáng_chất"];
                if (form && form.chiSoNuoc && typeof metricsObj["nước"] === 'number') form.chiSoNuoc.value = metricsObj["nước"];
                if (form && form.luongCoBap && typeof metricsObj["cơ_bắp"] === 'number') form.luongCoBap.value = metricsObj["cơ_bắp"];
                if (form && form.chiSoCanDoi && typeof metricsObj["cân_đối"] === 'number') form.chiSoCanDoi.value = metricsObj["cân_đối"];
                if (form && form.nangLuong && typeof metricsObj["năng_lượng"] === 'number') form.nangLuong.value = metricsObj["năng_lượng"];
                if (form && form.tuoiSinhHoc && typeof metricsObj["tuổi_sinh_học"] === 'number') form.tuoiSinhHoc.value = metricsObj["tuổi_sinh_học"];
                if (form && form.moNoiTang && typeof metricsObj["mỡ_nội_tạng"] === 'number') form.moNoiTang.value = metricsObj["mỡ_nội_tạng"];
              } catch (e) {
                if (analyzeResult) analyzeResult.innerHTML = '<span style="color:#d32f2f">Lỗi đọc dữ liệu chỉ số từ AI!</span>';
              }
            }
          } else {
            if (result.canNang) form.canNang.value = result.canNang;
            if (result.tiLeMoCoThe) form.tiLeMoCoThe.value = result.tiLeMoCoThe;
            if (result.luongKhoangChat) form.luongKhoangChat.value = result.luongKhoangChat;
            if (result.chiSoNuoc) form.chiSoNuoc.value = result.chiSoNuoc;
            if (result.luongCoBap) form.luongCoBap.value = result.luongCoBap;
            if (result.chiSoCanDoi) form.chiSoCanDoi.value = result.chiSoCanDoi;
            if (result.nangLuong) form.nangLuong.value = result.nangLuong;
            if (result.tuoiSinhHoc) form.tuoiSinhHoc.value = result.tuoiSinhHoc;
            if (result.moNoiTang) form.moNoiTang.value = result.moNoiTang;
          }
        } else {
          if (analyzeResult) analyzeResult.innerHTML = '<span style="color:#d32f2f">' + (result.message || 'Lỗi khi phân tích ảnh.') + '</span>';
        }
      } catch {
        if (analyzeResult) analyzeResult.innerHTML = '<span style="color:#d32f2f">Lỗi kết nối máy chủ.</span>';
      }
    };
  }

  // Khi đóng modal cập nhật chỉ số, reset các trường ảnh
  const updateMetricsModal = document.getElementById('updateMetricsModal');
  if (updateMetricsModal) {
    updateMetricsModal.addEventListener('hidden.bs.modal', () => {
      imageBase64 = '';
      if (imagePreview) imagePreview.innerHTML = '';
      if (analyzeResult) analyzeResult.innerHTML = '';
      if (imageInput) imageInput.value = '';
    });
  }

  // Gán sự kiện cho sidebar topbar mobile
  const dashboardMobileBtn = document.getElementById('menu-dashboard-mobile');
  if (dashboardMobileBtn) {
    dashboardMobileBtn.onclick = () => {
      setActiveMenu(menuDashboard);
      renderDashboard();
    };
  }
  const updateMobileBtn = document.getElementById('open-update-modal-mobile');
  if (updateMobileBtn) {
    updateMobileBtn.onclick = () => {
      openUpdateMetricsModal();
    };
  }
  const logoutMobileBtn = document.getElementById('btn-logout-mobile');
  if (logoutMobileBtn) {
    logoutMobileBtn.onclick = () => {
      localStorage.removeItem('userId');
      window.location.href = 'index.html';
    };
  }

  // Đặt sidebar mặc định là thu gọn trên desktop
  if (window.innerWidth >= 900) {
    const sidebar = document.querySelector('.sidebar');
    const mainLayout = document.querySelector('.main-layout');
    if (sidebar && !sidebar.classList.contains('collapsed')) sidebar.classList.add('collapsed');
    if (mainLayout && !mainLayout.classList.contains('sidebar-collapsed')) mainLayout.classList.add('sidebar-collapsed');
  }

  // Thêm nút toggle sidebar (desktop)
  if (window.innerWidth >= 900) {
    let sidebar = document.querySelector('.sidebar');
    if (sidebar && !document.querySelector('.sidebar-toggle-btn')) {
      const btn = document.createElement('button');
      btn.className = 'sidebar-toggle-btn';
      btn.innerHTML = '<span id="sidebar-toggle-arrow" style="font-size:1.3rem;display:inline-block;color:#43B02A;transition:transform 0.2s">&gt;&gt;</span>';
      // Đưa nút toggle vào cuối cùng trong sidebar
      sidebar.appendChild(btn);
      btn.onclick = function() {
        const mainLayout = document.querySelector('.main-layout');
        sidebar.classList.toggle('collapsed');
        if (mainLayout) mainLayout.classList.toggle('sidebar-collapsed');
        // Đổi hướng mũi tên
        const arrow = document.getElementById('sidebar-toggle-arrow');
        if (sidebar.classList.contains('collapsed')) {
          arrow.innerHTML = '&gt;&gt;';
        } else {
          arrow.innerHTML = '&lt;&lt;';
        }
      };
    }
  }

  // XỬ LÝ SUBMIT FORM CẬP NHẬT CHỈ SỐ TRONG DASHBOARD
  const metricsForm = document.getElementById('metricsForm');
  if (metricsForm) {
    metricsForm.onsubmit = async (e) => {
      e.preventDefault();
      const messageDiv = document.getElementById('message');
      messageDiv.textContent = '';
      const userId = localStorage.getItem('userId');
      const data = {
        ngayKiemTra: metricsForm.ngayKiemTra.value,
        canNang: metricsForm.canNang.value,
        tiLeMoCoThe: metricsForm.tiLeMoCoThe.value,
        luongKhoangChat: metricsForm.luongKhoangChat.value,
        chiSoNuoc: metricsForm.chiSoNuoc.value,
        luongCoBap: metricsForm.luongCoBap.value,
        chiSoCanDoi: metricsForm.chiSoCanDoi.value,
        nangLuong: metricsForm.nangLuong.value,
        tuoiSinhHoc: metricsForm.tuoiSinhHoc.value,
        moNoiTang: metricsForm.moNoiTang.value
      };
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
          setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('updateMetricsModal'));
            if (modal) modal.hide();
            window.location.reload();
          }, 1000);
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
  }

  // Thêm nút mở chat cho người có quyền nhắn tin, quản trị viên hoặc hội viên
  if (userGroup === 'Quản trị viên' || userGroup === 'Hội viên' || localStorage.getItem('canMessage') === 'true') {
    let chatBtn = document.getElementById('open-chat-btn');
    if (!chatBtn) {
      chatBtn = document.createElement('button');
      chatBtn.id = 'open-chat-btn';
      chatBtn.className = 'btn btn-success position-fixed';
      chatBtn.style = 'bottom:24px;right:24px;z-index:9999';
      chatBtn.innerHTML = '💬';
      document.body.appendChild(chatBtn);
      chatBtn.onclick = openChatModal;
    }
  }

  // Modal chat (tạo nếu chưa có)
  function ensureChatModal() {
    if (!document.getElementById('chatModal')) {
      const modalDiv = document.createElement('div');
      modalDiv.innerHTML = `
        <div class="modal fade" id="chatModal" tabindex="-1" aria-labelledby="chatModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-dialog-scrollable">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="chatModalLabel">Chat với quản trị viên/nhóm</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div id="chat-user-list" style="margin-bottom:12px"></div>
                <div id="chat-history" style="height:260px;overflow-y:auto;background:#f8f9fa;padding:8px 4px;margin-bottom:8px;border-radius:6px"></div>
                <div class="input-group">
                  <input type="text" id="chat-input" class="form-control" placeholder="Nhập tin nhắn..." />
                  <input type="file" id="chat-image-input" accept="image/*" style="display:none" />
                  <button class="btn btn-outline-secondary" id="chat-image-btn" type="button" title="Chọn ảnh"><span style="font-size:1.2em">🖼️</span></button>
                  <button class="btn btn-primary" id="chat-send-btn">➤</button>
                </div>
                <div id="chat-image-preview" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;"></div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalDiv);
    }
  }

  let currentChatUserId = null;
  let chatHistorySkip = 0;
  let chatHistoryDone = false;
  let chatHistoryLoading = false;
  let chatMessages = [];

  async function openChatModal() {
    ensureChatModal();
    const modal = new bootstrap.Modal(document.getElementById('chatModal'));
    // KHÔNG reset chatMessages, chatHistorySkip, chatHistoryDone nếu đã có dữ liệu và currentChatUserId không đổi
    const chatDivModal = document.getElementById('chat-history');
    const chatInputModal = document.getElementById('chat-input');
    if (!chatDivModal.innerHTML) {
      chatDivModal.innerHTML = '';
      chatInputModal.value = '';
    }
    // Lấy danh sách user có thể chat
    const res = await fetch('/api/chat/users', { headers: { 'x-user-id': userId } });
    const users = await res.json();
    const userListDiv = document.getElementById('chat-user-list');
    // Lấy group của user hiện tại
    const currentUserGroup = localStorage.getItem('groupName');
    let filteredUsers = users;
    if (currentUserGroup === 'Hội viên') {
      filteredUsers = users.filter(u =>
        u.group === 'Quản trị viên' ||
        (u.username !== 'hlvai' && u.group !== 'Hội viên' && u.permissions && u.permissions.message === true)
      );
      const adminUser = filteredUsers.find(u => u.group === 'Quản trị viên');
      if (adminUser && currentChatUserId !== adminUser._id) {
        currentChatUserId = adminUser._id;
        chatHistorySkip = 0;
        chatHistoryDone = false;
        chatMessages = [];
        await loadChatHistory(true);
      }
    } else {
      filteredUsers = users.filter(u => u.username !== 'hlvai');
    }
    userListDiv.innerHTML = filteredUsers
      .map(u => `<button class="btn btn-outline-secondary btn-sm m-1${currentChatUserId === u._id ? ' active-chat-user' : ''}" data-id="${u._id}">${u.fullname} (${u.group})</button>`)
      .join('');
    userListDiv.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        if (currentChatUserId !== btn.getAttribute('data-id')) {
          currentChatUserId = btn.getAttribute('data-id');
          chatHistorySkip = 0;
          chatHistoryDone = false;
          chatMessages = [];
          userListDiv.querySelectorAll('button').forEach(b => b.classList.remove('active-chat-user', 'btn-primary'));
          btn.classList.add('active-chat-user', 'btn-primary');
          loadChatHistory(true);
        }
      };
      if (btn.getAttribute('data-id') === currentChatUserId) {
        btn.classList.add('active-chat-user', 'btn-primary');
      }
    });
    // Gửi tin nhắn
    document.getElementById('chat-send-btn').onclick = sendChatMessage;
    document.getElementById('chat-input').onkeydown = e => { if (e.key === 'Enter') sendChatMessage(); };
    // Đảm bảo gán lại sự kiện cho nút chọn ảnh mỗi lần mở modal
    const chatImageBtn = document.getElementById('chat-image-btn');
    if (chatImageBtn) {
      chatImageBtn.onclick = function() {
        if (!currentChatUserId) {
          alert('Vui lòng chọn người nhận trước khi gửi ảnh!');
          return;
        }
        document.getElementById('chat-image-input').click();
      };
    }
    // Xử lý hiển thị ảnh đã chọn
    const chatImageInput = document.getElementById('chat-image-input');
    const chatImagePreview = document.getElementById('chat-image-preview');
    chatImageInput.onchange = function() {
      const file = chatImageInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        selectedImageBase64 = e.target.result;
        chatImagePreview.innerHTML = `<img src='${selectedImageBase64}' style='max-width:100px;max-height:100px;border-radius:8px;border:1px solid #ccc;'>`;
      };
      reader.readAsDataURL(file);
    };
    // Khi đóng modal chat, reset preview
    document.getElementById('chatModal').addEventListener('hidden.bs.modal', function() {
      chatImagePreview.innerHTML = '';
      selectedImageBase64 = null;
      chatImageInput.value = '';
      // Xử lý triệt để: xóa mọi backdrop còn sót lại
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
    });
    // Sự kiện cuộn lên để tải thêm tin nhắn (chỉ gán 1 lần khi mở chat hoặc chuyển người chat)
    const chatDiv = document.getElementById('chat-history');
    chatDiv.onscroll = async function() {
      if (chatDiv.scrollTop === 0 && !chatHistoryDone && !chatHistoryLoading) {
        await loadChatHistory(false);
      }
    };
    modal.show();
    // Đảm bảo cuộn xuống dưới cùng sau khi modal hiển thị hoàn toàn
    document.getElementById('chatModal').addEventListener('shown.bs.modal', function handler() {
      const chatDiv = document.getElementById('chat-history');
      setTimeout(() => {
        chatDiv.scrollTop = chatDiv.scrollHeight;
        //console.log('[DEBUG] Cuộn xuống dưới cùng sau khi modal hiển thị. scrollTop:', chatDiv.scrollTop, 'scrollHeight:', chatDiv.scrollHeight);
      }, 100);
      // Chỉ gán 1 lần
      document.getElementById('chatModal').removeEventListener('shown.bs.modal', handler);
    });
  }

  async function loadChatHistory(reset = false) {
    if (!currentChatUserId) return;
    const chatDiv = document.getElementById('chat-history');
    if (reset) {
      chatHistorySkip = 0;
      chatHistoryDone = false;
      chatMessages = [];
      chatDiv.innerHTML = '';
    }
    if (chatHistoryDone || chatHistoryLoading) return;
    chatHistoryLoading = true;
    // Hiển thị trạng thái đang tải
    let loadingStatus = document.getElementById('chat-loading-status');
    if (!loadingStatus) {
      loadingStatus = document.createElement('div');
      loadingStatus.id = 'chat-loading-status';
      loadingStatus.style = 'text-align:center;color:#888;font-size:0.95em;padding:4px 0;';
      chatDiv.prepend(loadingStatus);
    }
    loadingStatus.innerText = 'Đang tải tin nhắn...';
    // Gọi API lấy tổng số tin nhắn giữa 2 người
    let totalCount = null;
    if (chatHistorySkip === 0) {
      const countRes = await fetch(`/api/chat/history/${currentChatUserId}/count`, { headers: { 'x-user-id': userId } });
      totalCount = await countRes.json();
    }
    // Gọi API lấy tin nhắn phân trang
    const res = await fetch(`/api/chat/history/${currentChatUserId}?skip=${chatHistorySkip}&limit=20`, { headers: { 'x-user-id': userId } });
    const messages = await res.json();
    // Nếu tổng số tin nhắn <= 20 thì đã tải hết
    if (totalCount !== null && totalCount <= 20) chatHistoryDone = true;
    if (messages.length < 20) chatHistoryDone = true;
    chatHistorySkip += messages.length;
    // Nếu đã hết tin nhắn và không có tin nhắn mới, chỉ cập nhật trạng thái loading và return
    if (messages.length === 0) {
      if (chatHistoryDone) {
        let loadingStatus = document.getElementById('chat-loading-status');
        if (loadingStatus) loadingStatus.innerText = 'Đã hiển thị toàn bộ tin nhắn.';
      }
      chatHistoryLoading = false;
      return;
    }
    // Lưu vị trí cuộn trước khi render lại (chỉ khi tải thêm)
    let prevHeight = chatDiv.scrollHeight;
    let prevScroll = chatDiv.scrollTop;
    // Đảo ngược mảng để tin nhắn cũ ở trên, mới ở dưới
    chatMessages = [...messages.reverse(), ...chatMessages]; // Tin nhắn cũ ở trên, mới ở dưới
    // Render lại
    chatDiv.innerHTML = '';
    chatDiv.appendChild(loadingStatus);
    chatDiv.innerHTML += chatMessages.map(m => {
      // Hàm format thời gian
      function formatMsgTime(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
          return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleString('vi-VN');
      }
      // Bong bóng chat cho tin nhắn hình ảnh
      if (m.image) {
        const isMine = m.from === userId;
        return `<div style="display:flex;justify-content:${isMine ? 'flex-end' : 'flex-start'};margin-bottom:6px;">
          <div style="max-width:70%;min-width:80px;padding:8px 10px;border-radius:16px;box-shadow:0 1px 4px #0001;background:${isMine ? '#d1f5d3' : '#f1f1f1'};color:#222;margin-${isMine ? 'left' : 'right'}:30%;word-break:break-word;">
            <img src="${m.image}" alt="bữa ăn" style="max-width:120px;max-height:120px;border-radius:8px;display:block;margin:4px auto">
            <div style="font-size:0.85em;color:#888;text-align:${isMine ? 'right' : 'left'};margin-top:2px">${formatMsgTime(m.createdAt)}</div>
          </div>
        </div>`;
      }
      // Bong bóng chat cho HLV AI (giữa)
      if (m.from_fullname === 'HLV AI') {
        return `<div style="display:flex;justify-content:center;margin-bottom:6px;">
          <div style="max-width:70%;padding:8px 10px;border-radius:16px;box-shadow:0 1px 4px #0001;background:#e3f0fa;color:#1976d2;word-break:break-word;text-align:center">
            🤖 <b>HLV AI</b>: ${m.content}<br><span style="font-size:0.85em;color:#888">${formatMsgTime(m.createdAt)}</span>
          </div>
        </div>`;
      }
      // Bong bóng chat cho tin nhắn text
      const isMine = m.from === userId;
      return `<div style="display:flex;justify-content:${isMine ? 'flex-end' : 'flex-start'};margin-bottom:6px;">
        <div style="max-width:70%;min-width:80px;padding:8px 12px;border-radius:16px;box-shadow:0 1px 4px #0001;background:${isMine ? '#d1f5d3' : '#f1f1f1'};color:#222;margin-${isMine ? 'left' : 'right'}:30%;word-break:break-word;text-align:${isMine ? 'right' : 'left'}">
          ${m.content}<br><span style="font-size:0.85em;color:#888">${formatMsgTime(m.createdAt)}</span>
        </div>
      </div>`;
    }).join('');
    // Luôn cập nhật trạng thái loading đúng
    if (chatHistoryDone) {
      loadingStatus.innerText = 'Đã hiển thị toàn bộ tin nhắn.';
    } else {
      loadingStatus.innerText = '';
    }
    chatHistoryLoading = false;
    // Giữ nguyên vị trí cuộn khi tải thêm hoặc cuộn xuống dưới cùng khi mở chat
    if (!reset) {
      chatDiv.scrollTop = chatDiv.scrollHeight - prevHeight + prevScroll;
    } else {
      // Đảm bảo DOM đã render xong rồi mới cuộn
      setTimeout(() => {
        chatDiv.scrollTop = chatDiv.scrollHeight;
        // console.log('[DEBUG] Đã cuộn xuống dưới cùng (bất kể nội dung vượt khung hay không). scrollTop:', chatDiv.scrollTop, 'scrollHeight:', chatDiv.scrollHeight);
      }, 100);
    }
  }

  // Khi gửi tin nhắn mới, luôn cuộn xuống dưới cùng
  async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const chatImagePreview = document.getElementById('chat-image-preview');
    const content = input.value.trim();
    if (!currentChatUserId) {
      alert('Vui lòng chọn người nhận trước khi gửi tin nhắn!');
      return;
    }
    if (!content && !selectedImageBase64) return;
    // Hiển thị trạng thái gửi
    const chatDiv = document.getElementById('chat-history');
    let sendingMsgId = null;
    if (selectedImageBase64) {
      sendingMsgId = 'sending-' + Date.now();
      chatDiv.innerHTML += `<div id='${sendingMsgId}' style='text-align:right;opacity:0.6'><span class='badge bg-success'><img src='${selectedImageBase64}' style='max-width:100px;max-height:100px;border-radius:8px;vertical-align:middle;'> Đang gửi...</span></div>`;
      chatDiv.scrollTop = chatDiv.scrollHeight;
      // Gửi ảnh bữa ăn
      await fetch('/api/chat/send-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ to: currentChatUserId, imageBase64: selectedImageBase64 })
      });
      // Đã gửi
      const sendingDiv = document.getElementById(sendingMsgId);
      if (sendingDiv) sendingDiv.innerHTML = `<span class='badge bg-success'><img src='${selectedImageBase64}' style='max-width:100px;max-height:100px;border-radius:8px;vertical-align:middle;'> Đã gửi</span>`;
      chatImagePreview.innerHTML = '';
      selectedImageBase64 = null;
      document.getElementById('chat-image-input').value = '';
    }
    if (content) {
      sendingMsgId = 'sending-' + Date.now();
      chatDiv.innerHTML += `<div id='${sendingMsgId}' style='text-align:right;opacity:0.6'><span class='badge bg-success'>${content} Đang gửi...</span></div>`;
      chatDiv.scrollTop = chatDiv.scrollHeight;
      await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ to: currentChatUserId, content })
      });
      const sendingDiv = document.getElementById(sendingMsgId);
      if (sendingDiv) sendingDiv.innerHTML = `<span class='badge bg-success'>${content} Đã gửi</span>`;
    }
    input.value = '';
    setTimeout(() => { chatDiv.scrollTop = chatDiv.scrollHeight; loadChatHistory(true); }, 600);
  }

  // Thêm sự kiện cho nút chọn ảnh
  // document.getElementById('chat-image-btn').onclick = function() {
  //   document.getElementById('chat-image-input').click();
  // };
});

// Mặc định hiển thị dashboard
renderDashboard();

// Thêm CSS cho sidebar padding trên/dưới đồng bộ với phần nội dung
(function addSidebarPaddingStyle() {
  const style = document.createElement('style');
  style.innerHTML = `
    .sidebar {
      padding-top: 32px !important;
      padding-bottom: 24px !important;
    }
    @media (max-width: 900px) {
      .sidebar {
        padding-top: 18px !important;
        padding-bottom: 18px !important;
      }
    }
  `;
  document.head.appendChild(style);
})();

// Thêm sự kiện resize để tự động cập nhật giao diện bảng/lịch khi thay đổi kích thước
window.addEventListener('resize', () => {
  // Nếu đang ở dashboard (có user-metrics-table)
  const tableDiv = document.getElementById('user-metrics-table');
  if (tableDiv && typeof renderUserMetricsTable === 'function') {
    fetch('/api/body-metrics/all', { headers: { 'x-user-id': userId } })
      .then(res => res.json())
      .then(data => {
        tableDiv.innerHTML = renderUserMetricsTable(data, window.innerWidth);
      });
  }
});

// Thêm CSS cho .active-chat-user
(function addChatUserActiveStyle() {
  const style = document.createElement('style');
  style.innerHTML = `
    .active-chat-user { background: #43B02A !important; color: #fff !important; border-color: #43B02A !important; }
    @media (max-width: 700px) {
      #chat-history {
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE 10+ */
      }
      #chat-history::-webkit-scrollbar {
        display: none; /* Chrome, Safari, Opera */
      }
    }
  `;
  document.head.appendChild(style);
})();

let selectedImageBase64 = null;