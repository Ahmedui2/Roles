const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  name: 'settings',
  description: 'عرض قائمة إعدادات البوت',
  execute: async (message) => {
    const embed = new EmbedBuilder()
      .setTitle('اختر الإعداد')
      .setDescription('اختر من القائمة التالية الإعداد الذي تريد تعديله')
      .setColor(0x0099ff);

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('settings_select')
        .setPlaceholder('اختر الإعداد')
        .addOptions([
        {
          label: 'إعداد البوت',
          description: 'تغيير اسم، صورة، حالة، وبنر البوت',
          value: 'bot_settings',
        },
        /*
        {
          label: 'تغيير حالة البوت',
          description: 'تغيير حالة ولعبة البوت',
          value: 'change_bot_status',
        },
        {
          label: 'تغيير الصورة',
          description: 'تغيير صورة البوت',
          value: 'change_bot_avatar',
        },
        */
          {
            label: 'إدارة الرولات',
            description: 'التحكم بجميع الرولات الخاصة',
            value: 'manage_roles',
          },
          {
            label: 'إضافة رول خاص',
            description: 'إضافة رول خاص جديد',
            value: 'add_custom_role',
          },
          {
            label: 'إدارة المصرحين',
            description: 'إضافة أو إزالة المصرحين',
            value: 'manage_authorized',
          },
          {
            label: 'صلاحيات الرولات',
            description: 'تعيين صلاحيات الرولات الافتراضية',
            value: 'set_role_permissions',
          },
          {
            label: 'الخروج من السيرفر',
            description: 'إخراج البوت من السيرفر',
            value: 'leave_server',
          },
        ])
    );

    await message.reply({ embeds: [embed], components: [row], flags: [1 << 6] });
  }
};
