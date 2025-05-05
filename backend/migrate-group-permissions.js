require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/luckyhub';
mongoose.connect(MONGO_URI);

const groupSchema = new mongoose.Schema({
  name: String,
  description: String,
  permissions: mongoose.Schema.Types.Mixed
});
const Group = mongoose.model('Group', groupSchema);

async function migrate() {
  const groups = await Group.find({});
  for (const group of groups) {
    const perms = group.permissions || {};
    // Nếu có bất kỳ quyền cũ nào là true thì set note = true
    if (perms.addNote || perms.editNote || perms.deleteNote) {
      perms.note = true;
    }
    // Xóa quyền cũ
    delete perms.addNote;
    delete perms.editNote;
    delete perms.deleteNote;
    group.permissions = perms;
    await group.save();
    console.log(`Migrated group: ${group.name}`);
  }
  console.log('Migration done!');
  process.exit(0);
}

migrate(); 