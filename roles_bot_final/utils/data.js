const fs = require('fs');
const path = require('path');
const { Client } = require('discord.js');

let client;
const DATA_DIR = path.join(__dirname, '..', 'data');

function setClient(discordClient) {
  client = discordClient;
}
const SERVERS_DIR = path.join(DATA_DIR, 'servers');

// إنشاء المجلدات إذا لم تكن موجودة
[DATA_DIR, SERVERS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

let customRoles = {};
let settings = {};

// تهيئة الإعدادات الافتراضية
function initSettings(guildId) {
  if (!settings[guildId]) {
    settings[guildId] = {
      defaultRolePerms: []
    };
  }
  return settings[guildId];
}

async function loadServerData(guildId) {
  const serverFile = path.join(SERVERS_DIR, `${guildId}.json`);
  try {
    if (fs.existsSync(serverFile)) {
      const data = fs.readFileSync(serverFile, 'utf8');
      const savedRoles = JSON.parse(data);
      customRoles[guildId] = {};

      // الحصول على السيرفر من الكاش
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;

      // إعادة إنشاء الرولات المحفوظة
      for (const roleId in savedRoles) {
        const roleData = savedRoles[roleId];
        const existingRole = guild.roles.cache.get(roleId);

        if (existingRole) {
          // تحديث الرول الموجود
          await existingRole.edit({
            name: roleData.name,
            color: roleData.color,
            position: roleData.position,
            permissions: roleData.permissions,
            mentionable: roleData.mentionable,
            hoist: roleData.hoist
          }).catch(console.error);

          customRoles[guildId][roleId] = roleData;
        } else {
          // إنشاء الرول من جديد
          try {
            const newRole = await guild.roles.create({
              name: roleData.name,
              color: roleData.color,
              permissions: roleData.permissions,
              mentionable: roleData.mentionable,
              hoist: roleData.hoist,
              reason: 'Restoring saved custom role'
            });

            // إضافة الرول للأعضاء
            for (const memberId of roleData.members) {
              const member = await guild.members.fetch(memberId).catch(() => null);
              if (member) {
                await member.roles.add(newRole).catch(console.error);
              }
            }

            customRoles[guildId][newRole.id] = {
              ...roleData,
              id: newRole.id
            };
          } catch (error) {
            console.error(`Error recreating role ${roleData.name}:`, error);
          }
        }
      }
    } else {
      customRoles[guildId] = {};
    }
  } catch (error) {
    console.error(`Error loading data for server ${guildId}:`, error);
    customRoles[guildId] = {};
  }
}

function saveServerData(guildId) {
  const serverFile = path.join(SERVERS_DIR, `${guildId}.json`);
  try {
    fs.writeFileSync(serverFile, JSON.stringify(customRoles[guildId], null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving data for server ${guildId}:`, error);
    return false;
  }
}

async function loadData() {
  // تحميل بيانات جميع السيرفرات
  if (!client) {
    console.log('Client not ready, skipping initial data load');
    return;
  }

  if (fs.existsSync(SERVERS_DIR)) {
    const files = fs.readdirSync(SERVERS_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const guildId = file.replace('.json', '');
        await loadServerData(guildId);
      }
    }
  }
}

// تهيئة البيانات لسيرفر جديد
function initGuildData(guildId) {
  if (!customRoles[guildId]) {
    customRoles[guildId] = {};
    saveServerData(guildId);
  }
  return customRoles[guildId];
}

function saveData() {
  // حفظ بيانات كل سيرفر في ملفه الخاص
  Object.keys(customRoles).forEach(guildId => {
    saveServerData(guildId);
  });
}

module.exports = {
  setClient,
  customRoles,
  settings,
  loadData,
  saveData,
  loadServerData,
  saveServerData,
  initGuildData,
  initSettings
};

// تحميل البيانات عند بدء التشغيل
loadData();
