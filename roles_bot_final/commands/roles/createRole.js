const { hasCustomRole, isAdminOrAuthorized } = require('../../utils/permissions');
const { customRoles, saveData, settings, initGuildData, initSettings } = require('../../utils/data');

module.exports = {
  name: 'رولك',
  execute: async (message, args) => {
    if (!isAdminOrAuthorized(message.member)) {
      return message.reply('ليس لديك صلاحية لإنشاء الرول الخاص.');
    }
    if (args.length < 2) {
      return message.reply('يرجى استخدام الأمر بهذا الشكل: !رولك @عضو اسم_الرول');
    }

    try {
    const memberMention = args.shift();

    // تحقق من وجود إيموجي في بداية اسم الرول (مثلاً: <:emoji_name:emoji_id> أو إيموجي عادية)
    let roleIcon = null;
    let roleName = args.join(' ');

    const emojiMatch = roleName.match(/^<a?:\w+:(\d+)>/);
    if (emojiMatch) {
      roleIcon = emojiMatch[0];
      roleName = roleName.replace(/^<a?:\w+:(\d+)>/, '').trim();
    }

    if (!roleName) {
      return message.reply('يرجى إدخال اسم صحيح للرول.');
    }

      // تحقق من صحة المنشن
      if (!memberMention.startsWith('<@') || !memberMention.endsWith('>')) {
        return message.reply('يرجى منشن العضو بشكل صحيح.');
      }

      const memberId = memberMention.replace(/[<@!>]/g, '');
      if (!memberId || isNaN(memberId)) {
        return message.reply('يرجى منشن العضو بشكل صحيح.');
      }

      const member = await message.guild.members.fetch(memberId).catch(() => null);
      if (!member) {
        return message.reply('العضو غير موجود في السيرفر.');
      }

      if (member.user.bot) {
        return message.reply('لا يمكن إضافة بوتات للرول الخاص.');
      }

      // تهيئة بيانات السيرفر وفحص الرول
      const guildId = message.guild?.id;
      if (!guildId) {
        return message.reply('حدث خطأ في الحصول على معرف السيرفر.');
      }

      // Check if member already has a custom role
      if (hasCustomRole(guildId, member.id)) {
        return message.reply('هذا العضو لديه رول خاص بالفعل.');
      }

      // تهيئة وجلب الإعدادات الافتراضية
      const serverSettings = initSettings(guildId);
      const defaultPerms = serverSettings.defaultRolePerms;

      // Create role
      const role = await message.guild.roles.create({
        name: roleName,
        permissions: defaultPerms,
        reason: `Custom role created by ${message.author.tag}`,
      });

      // Set role icon if available and bot has permission
      if (roleIcon && role.edit) {
        try {
          await role.edit({ icon: roleIcon });
        } catch (error) {
          console.error('Failed to set role icon:', error);
        }
      }

      // Add role to member
      await member.roles.add(role);

      // Initialize guild data and save role info
      const guildRoles = initGuildData(guildId);
      guildRoles[role.id] = {
        ownerId: member.id,
        name: roleName,
        protected: true,
        members: [member.id],
        color: role.color,
        position: role.position,
        permissions: role.permissions.toArray(),
        mentionable: role.mentionable,
        hoist: role.hoist,
        createdAt: role.createdAt.toISOString(),
        createdBy: message.author.id
      };
      saveData();

      // React with checkmark
      await message.react('✅');
      message.channel.send(`تم إنشاء الرول الخاص **${roleName}** للعضو ${member.user.tag}`);
    } catch (error) {
      console.error(error);
      message.reply('حدث خطأ أثناء إنشاء الرول.');
    }
  }
};
