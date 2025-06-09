const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { customRoles } = require('../../utils/data');

module.exports = {
  name: 'رولي',
  execute: async (message) => {
    const member = message.member;
    const guildId = message.guild.id;
    
    // Get user's custom role
    const userRole = Object.entries(customRoles[guildId] || {})
      .find(([_, data]) => data.ownerId === member.id);

    if (!userRole) {
      try {
        await message.author.send('ليس لديك رول خاص.');
      } catch (error) {
        // If DM fails, fallback to public reply
        await message.reply('ليس لديك رول خاص.');
      }
      return;
    }

    const [roleId, roleData] = userRole;
    const role = message.guild.roles.cache.get(roleId);
    if (!role) {
      return message.reply('الرول غير موجود في السيرفر.');
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`**تحكم بالرول: ${roleData.name}**`)
      .setDescription(`**مالك الرول:** <@${roleData.ownerId}>\n**عدد الاعضاء** ~~${role.members ? role.members.size : 0}~~`)
      .setColor(role.color || 0x0099ff)
      .setThumbnail(message.member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ 
        text: message.member.user.tag,
        iconURL: message.member.user.displayAvatarURL({ dynamic: true })
      });

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`roleAction_${roleId}`)
        .setPlaceholder('اختر العملية')
        .addOptions([
          {
            label: 'اضافة',
            description: 'اضافة الرول الى عضو',
            value: 'add',
          },
          {
            label: 'ازالة',
            description: 'ازالة الرول من عضو',
            value: 'remove',
          },
          {
            label: 'حذف',
            description: 'حذف الرول نهائياً',
            value: 'delete',
          },
          {
            label: 'اسم',
            description: 'تغيير اسم الرول',
            value: 'rename',
          },
          {
            label: 'لون',
            description: 'تغيير لون الرول',
            value: 'color',
          },
          {
            label: 'ايموجي',
            description: 'اضافة ايموجي للرول',
            value: 'emojiAdd',
          },
          {
            label: 'ازالة ايموجي',
            description: 'ازالة الايموجي من الرول',
            value: 'emojiRemove',
          },
          {
            label: 'الاعضاء',
            description: 'اظهار الاعضاء في الرول',
            value: 'members',
          },
        ])
    );

    await message.reply({ embeds: [embed], components: [row], flags: [1 << 6] });
  }
};
