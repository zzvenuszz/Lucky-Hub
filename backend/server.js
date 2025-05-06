require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());

// Tăng giới hạn dung lượng cho body-parser và express
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/luckyhub';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Kết nối MongoDB thành công!'))
  .catch(err => console.log('Lỗi kết nối MongoDB:', err));

// Định nghĩa schema nhóm người dùng (thêm trường permissions)
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  permissions: {
    note: { type: Boolean, default: false }
  }
});
const Group = mongoose.model('Group', groupSchema);

// Định nghĩa schema người dùng
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullname: { type: String, required: true },
    birthday: { type: Date, required: true },
    height: { type: Number, required: true },
    gender: { type: String, required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }
});

const User = mongoose.model('User', userSchema);

// Model chỉ số sức khỏe
const bodyMetricSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ngayKiemTra: { type: Date, required: true },
  canNang: Number,
  tiLeMoCoThe: Number,
  luongKhoangChat: Number,
  chiSoNuoc: Number,
  luongCoBap: Number,
  chiSoCanDoi: Number,
  nangLuong: Number,
  tuoiSinhHoc: Number,
  moNoiTang: Number,
  phanTichBienDong: String, // Phân tích sự thay đổi (text hoặc json)
  note: { type: String, default: '' }, // Ghi chú cho từng chỉ số
  createdAt: { type: Date, default: Date.now }
});
const BodyMetric = mongoose.model('BodyMetric', bodyMetricSchema);

// Middleware xác thực đơn giản (giả lập, cần thay bằng JWT/session thực tế)
function auth(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId || userId === 'null' || userId === null) {
    console.error('Chưa đăng nhập hoặc userId không hợp lệ - thiếu x-user-id');
    return res.status(401).json({ message: 'Chưa đăng nhập hoặc userId không hợp lệ.' });
  }
  req.userId = userId;
  next();
}

// Middleware kiểm tra admin
async function adminOnly(req, res, next) {
  const user = await User.findById(req.userId).populate('group');
  if (!user || !user.group || user.group.name !== 'Quản trị viên') {
    return res.status(403).json({ message: 'Chỉ quản trị viên mới được phép.' });
  }
  next();
}

// Khi khởi động, đảm bảo có 2 group mặc định
async function ensureDefaultGroups() {
  const adminGroup = await Group.findOneAndUpdate(
    { name: 'Quản trị viên' },
    { name: 'Quản trị viên', description: 'Quản trị hệ thống' },
    { upsert: true, new: true }
  );
  const memberGroup = await Group.findOneAndUpdate(
    { name: 'Hội viên' },
    { name: 'Hội viên', description: 'Người dùng thông thường' },
    { upsert: true, new: true }
  );
}
ensureDefaultGroups();

// Đăng ký
app.post('/dangky', async (req, res) => {
    let { username, password, fullname, birthday, height, gender } = req.body;
    if (!username || !password || !fullname || !birthday || !height || !gender) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    username = username.toLowerCase();
    try {
        const userExist = await User.findOne({ username });
        if (userExist) {
            return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const memberGroup = await Group.findOne({ name: 'Hội viên' });
        const user = new User({
            username,
            password: hashedPassword,
            fullname,
            birthday,
            height,
            gender,
            group: memberGroup ? memberGroup._id : undefined
        });
        await user.save();
        res.status(201).json({ message: 'Đăng ký thành công!' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi máy chủ. Vui lòng thử lại sau.' });
    }
});

// Đăng nhập
app.post('/dangnhap', async (req, res) => {
    let { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }
    username = username.toLowerCase();
    try {
        const user = await User.findOne({ username }).populate('group');
        if (!user) {
            return res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }
        res.json({
            message: 'Đăng nhập thành công!',
            user: {
                _id: user._id,
                username: user.username,
                fullname: user.fullname,
                group: user.group,
                gender: user.gender,
                height: user.height,
                birthday: user.birthday
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi máy chủ. Vui lòng thử lại sau.' });
    }
});

// Route reset admin
app.get('/adminreset', async (req, res) => {
    try {
        const adminGroup = await Group.findOne({ name: 'Quản trị viên' });
        let admin = await User.findOne({ username: 'admin' });
        const hashedPassword = await bcrypt.hash('admin', 10);
        if (admin) {
            admin.password = hashedPassword;
            admin.fullname = 'Quản trị viên';
            admin.birthday = new Date('1990-01-01');
            admin.height = 170;
            admin.gender = 'Nam';
            admin.group = adminGroup ? adminGroup._id : undefined;
            await admin.save();
        } else {
            admin = new User({
                username: 'admin',
                password: hashedPassword,
                fullname: 'Quản trị viên',
                birthday: new Date('1990-01-01'),
                height: 170,
                gender: 'Nam',
                group: adminGroup ? adminGroup._id : undefined
            });
            await admin.save();
        }
        res.json({ message: 'Đã reset tài khoản quản trị về mặc định (admin/admin).' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi máy chủ. Vui lòng thử lại sau.' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Lưu chỉ số mới và phân tích biến động
app.post('/api/body-metrics', auth, async (req, res) => {
  try {
    const { ngayKiemTra, canNang, tiLeMoCoThe, luongKhoangChat, chiSoNuoc, luongCoBap, chiSoCanDoi, nangLuong, tuoiSinhHoc, moNoiTang, phanTichBienDong } = req.body;
    const metric = new BodyMetric({
      userId: req.userId,
      ngayKiemTra,
      canNang,
      tiLeMoCoThe,
      luongKhoangChat,
      chiSoNuoc,
      luongCoBap,
      chiSoCanDoi,
      nangLuong,
      tuoiSinhHoc,
      moNoiTang,
      phanTichBienDong
    });
    await metric.save();
    res.json({ message: 'Lưu chỉ số thành công!', metric });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ khi lưu chỉ số.' });
  }
});

// Lấy chỉ số mới nhất và chỉ số liền trước đó
app.get('/api/body-metrics/latest-with-previous', auth, async (req, res) => {
  try {
    const metrics = await BodyMetric.find({ userId: req.userId }).sort({ ngayKiemTra: -1 }).limit(2);
    const latest = metrics[0] || null;
    const previous = metrics[1] || null;
    res.json({ latest, previous });
  } catch (err) {
    console.error('Lỗi khi lấy chỉ số mới nhất và trước đó:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy chỉ số.' });
  }
});

// Lấy toàn bộ lịch sử chỉ số sức khỏe của user
app.get('/api/body-metrics/all', auth, async (req, res) => {
  try {
    const metrics = await BodyMetric.find({ userId: req.userId }).sort({ ngayKiemTra: 1 });
    res.json(metrics);
  } catch (err) {
    console.error('Lỗi khi lấy toàn bộ lịch sử chỉ số:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy lịch sử chỉ số.' });
  }
});

// Lấy chỉ số theo tháng cho user
app.get('/api/body-metrics/by-month', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ message: 'Thiếu tham số year hoặc month.' });
    // month: 1-12
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 1);
    const metrics = await BodyMetric.find({
      userId: req.userId,
      ngayKiemTra: { $gte: start, $lt: end }
    }).sort({ ngayKiemTra: 1 });
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy chỉ số theo tháng.' });
  }
});

// Phân tích ảnh chỉ số bằng Gemini
app.post('/api/body-metrics/analyze-image', auth, async (req, res) => {
  try {
    const { imageBase64, fullname, gender, height, age, lastMetrics, prompt } = req.body;
    // Sử dụng prompt truyền lên từ frontend nếu có
    let finalPrompt = prompt;
    if (!finalPrompt) {
      finalPrompt = `đây là hình ảnh ghi chỉ số sức khỏe của ${fullname}, giới tính ${gender}, chiều cao ${height} cm, tuổi ${age}. hãy phân tích chỉ số sức khỏe và trả về kết quả dưới dạng json và phân tích những thay đổi của từng chỉ số so với chỉ số gần nhất (nếu có)`;
      if (lastMetrics) {
        finalPrompt += `\nChỉ số gần nhất: ${JSON.stringify(lastMetrics)}`;
      }
    }
    // Loại bỏ tiền tố nếu có
    const base64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    const geminiRes = await axios.post(
      `${process.env.GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: finalPrompt },
              { inlineData: { mimeType: "image/png", data: base64 } }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(geminiRes.data);
  } catch (err) {
    console.error(err); // Thêm log chi tiết
    res.status(500).json({ message: 'Lỗi khi phân tích ảnh chỉ số.' });
  }
});

// API quản trị viên: quản lý user
app.get('/admin/users', auth, adminOnly, async (req, res) => {
  const users = await User.find().populate('group');
  res.json(users);
});
app.get('/admin/users/:id', auth, adminOnly, async (req, res) => {
  const user = await User.findById(req.params.id).populate('group');
  if (!user) return res.status(404).json({ message: 'Không tìm thấy user.' });
  res.json(user);
});
app.put('/admin/users/:id', auth, adminOnly, async (req, res) => {
  const { fullname, birthday, height, gender, group } = req.body;
  // Kiểm tra nếu admin tự đổi nhóm của mình
  const adminGroup = await Group.findOne({ name: 'Quản trị viên' });
  const userToUpdate = await User.findById(req.params.id);
  if (userToUpdate && userToUpdate._id.toString() === req.userId) {
    // Đếm số lượng quản trị viên hiện tại
    const adminCount = await User.countDocuments({ group: adminGroup._id });
    // Nếu chỉ còn 1 admin và đang tự chuyển mình sang nhóm khác
    if (adminCount === 1 && group !== String(adminGroup._id)) {
      return res.status(400).json({ message: 'Không thể chuyển nhóm. Hệ thống phải có ít nhất 1 quản trị viên.' });
    }
  }
  const user = await User.findByIdAndUpdate(req.params.id, { fullname, birthday, height, gender, group }, { new: true });
  res.json(user);
});
app.delete('/admin/users/:id', auth, adminOnly, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Đã xóa user.' });
});
app.post('/admin/users/:id/reset-password', auth, adminOnly, async (req, res) => {
  const { newPassword } = req.body;
  const hashed = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(req.params.id, { password: hashed });
  res.json({ message: 'Đã reset mật khẩu.' });
});
app.get('/admin/users/:id/metrics', auth, adminOnly, async (req, res) => {
  const metrics = await BodyMetric.find({ userId: req.params.id }).sort({ ngayKiemTra: 1 });
  res.json(metrics);
});
app.put('/admin/users/:userId/metrics/:metricId/note', auth, async (req, res) => {
  const user = await User.findById(req.userId).populate('group');
  const targetUser = await User.findById(req.params.userId).populate('group');
  if (!user || !targetUser) return res.status(404).json({ message: 'Không tìm thấy user.' });
  const isAdmin = user.group && user.group.name === 'Quản trị viên';
  const canNote = user.group && user.group.permissions?.note;
  if (!isAdmin && !canNote) {
    return res.status(403).json({ message: 'Bạn không có quyền ghi chú cho chỉ số này.' });
  }
  const { note } = req.body;
  const metric = await BodyMetric.findByIdAndUpdate(req.params.metricId, { note }, { new: true });
  if (!metric) return res.status(404).json({ message: 'Không tìm thấy chỉ số.' });
  res.json({ message: 'Đã cập nhật ghi chú.', metric });
});

// API quản trị viên: quản lý group
app.get('/admin/groups', auth, adminOnly, async (req, res) => {
  const groups = await Group.find();
  res.json(groups);
});
app.post('/admin/groups', auth, adminOnly, async (req, res) => {
  const { name, description, permissions } = req.body;
  const group = new Group({ name, description, permissions });
  await group.save();
  res.json(group);
});
app.put('/admin/groups/:id', auth, adminOnly, async (req, res) => {
  const { name, description, permissions } = req.body;
  const group = await Group.findByIdAndUpdate(
    req.params.id,
    { name, description, ...(permissions && { permissions }) },
    { new: true }
  );
  res.json(group);
});
app.delete('/admin/groups/:id', auth, adminOnly, async (req, res) => {
  await Group.findByIdAndDelete(req.params.id);
  res.json({ message: 'Đã xóa group.' });
});

// Khởi động server
const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Máy chủ đang chạy tại cổng ${PORT}`);
}); 