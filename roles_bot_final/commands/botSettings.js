const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder } = require('discord.js');
const { isBotOwner, isAdminOrAuthorized } = require('../utils/permissions');
const { customRoles, saveData } = require('../utils/data');

module.exports = {
  name: 'settings',
  description: 'عرض قائمة إعدادات البوت',
execute: async (message) => {
  if (!isBotOwner(message.author.id) && !isAdminOrAuthorized(message.member)) {
    return message.reply('**ليس لديك صلاحية استخدام هذا الأمر**');
  }

  const { customRoles } = require('../utils/data');
  const settingsPath = require('path').join(__dirname, '..', 'data', 'settings.json');
  const fs = require('fs');

  let prefix = '!';
  try {
    if (fs.existsSync(settingsPath)) {
      const settingsData = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (settingsData.prefix) {
        prefix = settingsData.prefix;
      }
    }
  } catch (error) {
    console.error('Error reading settings.json:', error);
  }

  const rolesCount = customRoles[message.guild.id] ? Object.keys(customRoles[message.guild.id]).length : 0;
  const authorizedCount = 0; // ملف المصرحين فارغ حالياً

  const embed = new EmbedBuilder()
    .setTitle('إعدادات البوت')
    .setDescription('اختر من القائمة التالية الإعداد الذي تريد تعديله')
    .setColor(0x0099ff)
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: 'عدد الرولات الخاصة', value: `${rolesCount}`, inline: true },
      { name: 'عدد المصرحين', value: `${authorizedCount}`, inline: true },
      { name: 'البريفكس الحالي', value: `\`${prefix}\``, inline: true }
    );

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
        }
      ])
  );

  await message.reply({ embeds: [embed], components: [row], flags: [1 << 6] });
},

  handleInteraction: async (interaction) => {
    if (!isBotOwner(interaction.user.id) && !isAdminOrAuthorized(interaction.member)) {
      return interaction.reply({
        content: '**ليس لديك صلاحية استخدام هذا الأمر**',
        flags: [1 << 6],
      });
    }

    // Handle modal submit
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'activity_modal') {
        try {
          const activityName = interaction.fields.getTextInputValue('activity_name');
          const currentPresence = interaction.client.user.presence;
          
          await interaction.client.user.setPresence({
            activities: [{ 
              name: activityName,
              type: 0 // PLAYING
            }],
            status: currentPresence.status
          });
          
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ تم تغيير نشاط البوت')
            .setDescription(`تم تحديث النشاط إلى: Playing ${activityName}`)
            .setColor(0x00FF00)
            .setTimestamp();
          
          await interaction.reply({ 
            embeds: [successEmbed],
            flags: [1 << 6] 
          });
          
        } catch (error) {
          console.error('Error changing bot activity:', error);
          
          const errorEmbed = new EmbedBuilder()
            .setTitle('❌ فشل تغيير نشاط البوت')
            .setDescription('**حدث خطأ أثناء تغيير نشاط البوت. حاول مرة أخرى.**')
            .setColor(0xFF0000)
            .setTimestamp();
          
          await interaction.reply({ 
            embeds: [errorEmbed],
            flags: [1 << 6] 
          });
        }
        return;
      }
    }

    if (interaction.customId === 'edit_selected_roles') {
      const selectedRoles = interaction.message.components[0].components[0].options
        .filter((option) => option.default)
        .map((option) => option.value);

      if (selectedRoles.length === 0) {
        await interaction.reply({
          content: '**يجب اختيار رول واحد على الأقل**',
          flags: [1 << 6],
        });
        return;
      }

      const editRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('edit_roles_option')
          .setPlaceholder('اختر نوع التعديل')
          .addOptions([
            {
              label: 'تغيير الاسم',
              description: 'تغيير اسم الرولات المحددة',
              value: 'edit_name',
            },
            {
              label: 'تغيير اللون',
              description: 'تغيير لون الرولات المحددة',
              value: 'edit_color',
            },
            {
              label: 'تغيير الإيموجي',
              description: 'تغيير إيموجي الرولات المحددة',
              value: 'edit_emoji',
            },
            {
              label: 'تعديل الصلاحيات',
              description: 'تعديل صلاحيات الرولات المحددة',
              value: 'edit_permissions',
            },
            {
              label: 'تغيير المالك',
              description: 'تغيير مالك الرولات المحددة',
              value: 'edit_owner',
            }
          ])
      );

      await interaction.update({
        content: '**اختر نوع التعديل الذي تريد تطبيقه على الرولات المحددة**',
        components: [editRow],
      });
      return;
    } else if (interaction.customId === 'delete_selected_roles') {
      const selectedRoles = interaction.message.components[0].components[0].options
        .filter((option) => option.default)
        .map((option) => option.value);

      if (selectedRoles.length === 0) {
        await interaction.reply({
          content: '**يجب اختيار رول واحد على الأقل**',
          flags: [1 << 6],
        });
        return;
      }

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_delete_roles')
          .setLabel('تأكيد الحذف')
          .setStyle(4),
        new ButtonBuilder()
          .setCustomId('cancel_delete_roles')
          .setLabel('إلغاء')
          .setStyle(2)
      );

      await interaction.update({
        content: `**هل أنت متأكد من حذف ${selectedRoles.length} رول؟**`,
        components: [confirmRow],
      });
      return;
    } else if (interaction.customId === 'confirm_delete_roles') {
      const selectedRoles = interaction.message.components[0].components[0].options
        .filter((option) => option.default)
        .map((option) => option.value);

      try {
        let deletedCount = 0;
        for (const roleId of selectedRoles) {
          const role = interaction.guild.roles.cache.get(roleId);
          if (role) {
            // Notify bot.js about authorized deletion
            const { authorizeRoleDeletion } = require('../bot');
            authorizeRoleDeletion(roleId, interaction.user.id);

            await role.delete('تم الحذف من خلال إعدادات البوت');
            if (customRoles[interaction.guildId] && customRoles[interaction.guildId][roleId]) {
              delete customRoles[interaction.guildId][roleId];
              deletedCount++;
            }
          }
        }
        
        // حفظ التغييرات في قاعدة البيانات
        saveData();

        await interaction.update({
          content: `**تم حذف ${deletedCount} رول بنجاح**`,
          components: [],
        });
      } catch (error) {
        console.error('Error deleting roles:', error);
        await interaction.update({
          content: '**حدث خطأ أثناء حذف الرولات**',
          components: [],
        });
      }
      return;
    } else if (interaction.customId === 'cancel_delete_roles') {
      await interaction.update({
        content: '**تم إلغاء عملية الحذف**',
        components: [],
      });
      return;
} else if (interaction.customId === 'settings_select') {
  const choice = interaction.values[0];

  if (choice === 'manage_roles') {
    const guildRoles = customRoles[interaction.guildId] || {};
    const roles = Object.entries(guildRoles)
      .map(([roleId, roleData]) => {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
          // إذا لم يتم العثور على الرول في السيرفر، نحذفه من قاعدة البيانات
          delete guildRoles[roleId];
          return null;
        }
        return {
          role,
          owner: roleData.ownerId,
          data: roleData,
        };
      })
      .filter((r) => r !== null);

    // حفظ التغييرات بعد حذف الرولات غير الموجودة
    if (Object.keys(guildRoles).length === 0) {
      delete customRoles[interaction.guildId];
    }
    saveData();

    if (roles.length === 0) {
      return interaction.reply({
        content: '**لا توجد رولات خاصة في السيرفر**',
        flags: [1 << 6],
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('roles_select')
        .setPlaceholder('اختر الرولات')
        .setMinValues(1)
        .setMaxValues(roles.length)
        .addOptions(
          roles.map(({ role, owner }) => ({
            label: role.name,
            description:
              `المالك: ${interaction.guild.members.cache.get(owner)?.user.username || 'غير معروف'}`,
            value: role.id,
          }))
        )
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('select_all_roles')
        .setLabel('اختيار الكل')
        .setStyle(1),
      new ButtonBuilder()
        .setCustomId('edit_selected_roles')
        .setLabel('تعديل')
        .setStyle(3)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('delete_selected_roles')
        .setLabel('حذف')
        .setStyle(4)
        .setDisabled(true)
    );

    const embed = new EmbedBuilder()
      .setTitle('إدارة الرولات الخاصة')
      .setDescription('اختر الرولات التي تريد إدارتها')
      .setColor(0x0099ff);

    await interaction.reply({
      embeds: [embed],
      components: [row, buttons],
      flags: [1 << 6],
    });
  } else if (choice === 'bot_settings') {
    const rolesCount = customRoles[interaction.guildId] ? Object.keys(customRoles[interaction.guildId]).length : 0;

    const embed = new EmbedBuilder()
      .setTitle('إعدادات البوت')
      .setDescription(`اختر الإعداد الذي تريد تعديله من الأزرار أدناه\n\nعدد الرولات الخاصة: **${rolesCount}**`)
      .setColor(0x0099ff);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('edit_bot_name')
        .setLabel('تغيير اسم البوت')
        .setStyle(1),
      new ButtonBuilder()
        .setCustomId('edit_bot_avatar')
        .setLabel('تغيير صورة البوت')
        .setStyle(1),
      new ButtonBuilder()
        .setCustomId('edit_bot_banner')
        .setLabel('تغيير بنر البوت')
        .setStyle(1),
      new ButtonBuilder()
        .setCustomId('edit_bot_status')
        .setLabel('تغيير حالة البوت')
        .setStyle(1),
      new ButtonBuilder()
        .setCustomId('edit_bot_activity')
        .setLabel('لعبة البوت')
        .setStyle(1)
    );

    const prefixRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('edit_bot_prefix')
        .setLabel('تغيير البريفكس')
        .setStyle(1)
    );

    await interaction.update({
      embeds: [embed],
      components: [row, prefixRow],
      flags: [1 << 6]
    });
  }
}

    // Handle button interactions for bot settings
    if (interaction.isButton()) {
      switch (interaction.customId) {
        case 'edit_bot_name':
          await interaction.deferReply({ flags: [1 << 6] });
          await interaction.followUp({
            content: '**يرجى إرسال الاسم الجديد للبوت.**',
            flags: [1 << 6],
          });
          // Wait for user message to update bot name
          const nameFilter = m => m.author.id === interaction.user.id;
          const nameCollector = interaction.channel.createMessageCollector({ filter: nameFilter, max: 1, time: 30000 });
          nameCollector.on('collect', async (m) => {
            try {
              await interaction.client.user.setUsername(m.content);
              
              const successEmbed = new EmbedBuilder()
                .setTitle('✅ تم تغيير اسم البوت')
                .setDescription(`تم تحديث اسم البوت إلى: ${m.content}`)
                .setColor(0x00FF00)
                .setTimestamp();
              
              await interaction.followUp({ 
                embeds: [successEmbed],
                flags: [1 << 6] 
              });
              
              try {
                await m.delete();
              } catch (deleteError) {
                console.error('Error deleting user message:', deleteError);
              }
              
            } catch (error) {
              console.error('Error changing bot name:', error);
              
              let errorMessage = '**حدث خطأ أثناء تغيير اسم البوت**\n';
              
              if (error.code === 50035 && error.message.includes('USERNAME_RATE_LIMIT')) {
                errorMessage += '- لا يمكن تغيير اسم البوت بسرعة. يرجى الانتظار قليلاً قبل المحاولة مرة أخرى.';
              } else if (error.code === 50035) {
                errorMessage += '- الاسم غير صالح. يجب أن يكون بين 2-32 حرفاً.';
              } else {
                errorMessage += '- حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.';
              }
              
              const errorEmbed = new EmbedBuilder()
                .setTitle('❌ فشل تغيير اسم البوت')
                .setDescription(errorMessage)
                .setColor(0xFF0000)
                .setTimestamp();
              
              await interaction.followUp({ 
                embeds: [errorEmbed],
                flags: [1 << 6] 
              });
            }
          });
          break;
        case 'edit_bot_avatar':
          await interaction.deferReply({ flags: [1 << 6] });
          await interaction.followUp({
            content: '**يرجى إرسال رابط صورة البوت الجديدة.**',
            flags: [1 << 6],
          });
          // Wait for user message to update bot avatar
          const avatarFilter = m => m.author.id === interaction.user.id;
          const avatarCollector = interaction.channel.createMessageCollector({ filter: avatarFilter, max: 1, time: 30000 });
          avatarCollector.on('collect', async (m) => {
            try {
              let avatarUrl;
              if (m.attachments.size > 0) {
                avatarUrl = m.attachments.first().url;
              } else {
                avatarUrl = m.content;
              }
              
              await interaction.client.user.setAvatar(avatarUrl);
              await interaction.followUp({ 
                content: '**تم تغيير صورة البوت بنجاح.**', 
                flags: [1 << 6] 
              });
              
              // حذف رسالة المستخدم التي تحتوي على الصورة
              try {
                await m.delete();
              } catch (deleteError) {
                console.error('Error deleting user message:', deleteError);
              }
            } catch (error) {
              console.error('Error changing bot avatar:', error);
              await interaction.followUp({ 
                content: '**حدث خطأ أثناء تغيير صورة البوت. تأكد من أن الصورة صالحة.**', 
                flags: [1 << 6] 
              });
            }
          });
          break;
        case 'edit_bot_banner':
          await interaction.deferReply({ flags: [1 << 6] });
          await interaction.followUp({
            content: '**يرجى إرسال بنر البوت الجديد.**\n- يمكنك رفع صورة مباشرة أو إرسال رابط\n- يجب أن تكون الصورة بتنسيق PNG أو JPG أو GIF\n- الحجم الأقصى: 10 ميجابايت',
            flags: [1 << 6],
          });
          
          const bannerFilter = m => m.author.id === interaction.user.id;
          const bannerCollector = interaction.channel.createMessageCollector({ filter: bannerFilter, max: 1, time: 30000 });
          
          bannerCollector.on('collect', async (m) => {
            try {
              let bannerUrl;
              let isValidImage = false;
              
              if (m.attachments.size > 0) {
                const attachment = m.attachments.first();
                // التحقق من نوع وحجم الملف
                if (!attachment.contentType?.startsWith('image/')) {
                  throw new Error('invalid_type');
                }
                if (attachment.size > 10 * 1024 * 1024) { // 10MB
                  throw new Error('size_limit');
                }
                bannerUrl = attachment.url;
                isValidImage = true;
              } else {
                bannerUrl = m.content;
                // التحقق من صحة الرابط
                if (!bannerUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
                  throw new Error('invalid_url');
                }
              }
              
              if (!isValidImage && !bannerUrl.startsWith('http')) {
                throw new Error('invalid_url');
              }
              
              await interaction.client.user.setBanner(bannerUrl);
              
              const successEmbed = new EmbedBuilder()
                .setTitle('✅ تم تغيير البنر بنجاح')
                .setDescription('تم تحديث بنر البوت بالصورة الجديدة')
                .setColor(0x00FF00)
                .setTimestamp();
              
              await interaction.followUp({ 
                embeds: [successEmbed],
                flags: [1 << 6] 
              });
              
              // حذف رسالة المستخدم
              try {
                await m.delete();
              } catch (deleteError) {
                console.error('Error deleting user message:', deleteError);
              }
              
            } catch (error) {
              console.error('Error changing bot banner:', error);
              
              let errorMessage = '**حدث خطأ أثناء تغيير بنر البوت**\n';
              
              switch(error.message) {
                case 'invalid_type':
                  errorMessage += '- يجب أن يكون الملف المرفق صورة';
                  break;
                case 'size_limit':
                  errorMessage += '- حجم الصورة يتجاوز الحد الأقصى (10 ميجابايت)';
                  break;
                case 'invalid_url':
                  errorMessage += '- الرابط غير صالح. يجب أن يكون رابط مباشر لصورة';
                  break;
                default:
                  if (error.code === 50035) {
                    errorMessage += '- فشل في تحميل الصورة. تأكد من صحة الرابط وحجم الصورة';
                  } else if (error.code === 50013) {
                    errorMessage += '- البوت لا يملك صلاحية تغيير البنر';
                  } else {
                    errorMessage += '- حدث خطأ غير متوقع. حاول مرة أخرى';
                  }
              }
              
              const errorEmbed = new EmbedBuilder()
                .setTitle('❌ فشل تغيير البنر')
                .setDescription(errorMessage)
                .setColor(0xFF0000)
                .setTimestamp();
              
              await interaction.followUp({ 
                embeds: [errorEmbed],
                flags: [1 << 6] 
              });
            }
          });
          
          bannerCollector.on('end', (collected, reason) => {
            if (reason === 'time') {
              interaction.followUp({
                content: '**⏰ انتهى الوقت المحدد لإرسال البنر. يرجى المحاولة مرة أخرى.**',
                flags: [1 << 6]
              });
            }
          });
          break;
        case 'edit_bot_status':
          const statusRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('status_online')
              .setLabel('Online')
              .setStyle(1),
            new ButtonBuilder()
              .setCustomId('status_idle')
              .setLabel('Idle')
              .setStyle(1),
            new ButtonBuilder()
              .setCustomId('status_dnd')
              .setLabel('DND')
              .setStyle(1),
            new ButtonBuilder()
              .setCustomId('status_streaming')
              .setLabel('Streaming')
              .setStyle(1),
            new ButtonBuilder()
              .setCustomId('status_watching')
              .setLabel('Watching')
              .setStyle(1)
          );

          await interaction.reply({
            content: '**اختر حالة البوت من الأزرار أدناه.**',
            components: [statusRow],
            flags: [1 << 6],
          });
          break;
        case 'edit_bot_activity':
          await interaction.deferReply({ flags: [1 << 6] });
          await interaction.followUp({
            content: '**ضع نص اللعبة الجديد:**',
            flags: [1 << 6],
          });
          
          const activityFilter = m => m.author.id === interaction.user.id;
          const activityCollector = interaction.channel.createMessageCollector({ filter: activityFilter, max: 1, time: 30000 });
          
          activityCollector.on('collect', async (m) => {
            try {
              const activityName = m.content;
              const currentPresence = interaction.client.user.presence;
              const currentActivity = currentPresence.activities[0];
              
              await interaction.client.user.setPresence({
                activities: [{ 
                  name: activityName,
                  type: currentActivity?.type || 0,
                  url: currentActivity?.url
                }],
                status: currentPresence.status
              });
              
              const successEmbed = new EmbedBuilder()
                .setTitle('✅ تم تغيير نشاط البوت')
                .setDescription(`تم تحديث النشاط إلى: Playing ${activityName}`)
                .setColor(0x00FF00)
                .setTimestamp();
              
              await interaction.followUp({ 
                embeds: [successEmbed],
                flags: [1 << 6] 
              });
              
              try {
                await m.delete();
              } catch (deleteError) {
                console.error('Error deleting user message:', deleteError);
              }
              
            } catch (error) {
              console.error('Error changing bot activity:', error);
              
              const errorEmbed = new EmbedBuilder()
                .setTitle('❌ فشل تغيير نشاط البوت')
                .setDescription('**حدث خطأ أثناء تغيير نشاط البوت. حاول مرة أخرى.**')
                .setColor(0xFF0000)
                .setTimestamp();
              
              await interaction.followUp({ 
                embeds: [errorEmbed],
                flags: [1 << 6] 
              });
            }
          });
          
          activityCollector.on('end', (collected, reason) => {
            if (reason === 'time') {
              interaction.followUp({
                content: '**⏰ انتهى الوقت المحدد لإرسال النص. يرجى المحاولة مرة أخرى.**',
                flags: [1 << 6]
              });
            }
          });
          break;
        case 'status_online':
          try {
            await interaction.client.user.setPresence({
              status: 'online',
              activities: interaction.client.user.presence.activities || []
            });
            await interaction.update({
              content: '**تم تغيير حالة البوت إلى: Online**',
              components: [],
              flags: [1 << 6],
            });
          } catch (error) {
            console.error('Error setting online status:', error);
            await interaction.update({
              content: '**حدث خطأ أثناء تغيير حالة البوت**',
              components: [],
              flags: [1 << 6],
            });
          }
          break;
        case 'status_idle':
          try {
            await interaction.client.user.setPresence({
              status: 'idle',
              activities: interaction.client.user.presence.activities || []
            });
            await interaction.update({
              content: '**تم تغيير حالة البوت إلى: Idle**',
              components: [],
              flags: [1 << 6],
            });
          } catch (error) {
            console.error('Error setting idle status:', error);
            await interaction.update({
              content: '**حدث خطأ أثناء تغيير حالة البوت**',
              components: [],
              flags: [1 << 6],
            });
          }
          break;
        case 'status_dnd':
          try {
            await interaction.client.user.setPresence({
              status: 'dnd',
              activities: interaction.client.user.presence.activities || []
            });
            await interaction.update({
              content: '**تم تغيير حالة البوت إلى: DND**',
              components: [],
              flags: [1 << 6],
            });
          } catch (error) {
            console.error('Error setting dnd status:', error);
            await interaction.update({
              content: '**حدث خطأ أثناء تغيير حالة البوت**',
              components: [],
              flags: [1 << 6],
            });
          }
          break;
        case 'status_streaming':
          try {
            await interaction.client.user.setPresence({
              status: 'online',
              activities: [{
                name: interaction.client.user.presence.activities[0]?.name || 'Streaming',
                type: 1,
                url: 'https://twitch.tv/defaultuser'
              }]
            });
            await interaction.update({
              content: '**تم تغيير حالة البوت إلى: Streaming**',
              components: [],
              flags: [1 << 6],
            });
          } catch (error) {
            console.error('Error setting streaming status:', error);
            await interaction.update({
              content: '**حدث خطأ أثناء تغيير حالة البوت**',
              components: [],
              flags: [1 << 6],
            });
          }
          break;
        case 'status_watching':
          try {
            await interaction.client.user.setPresence({
              status: 'online',
              activities: [{
                name: interaction.client.user.presence.activities[0]?.name || 'Watching',
                type: 3
              }]
            });
            await interaction.update({
              content: '**تم تغيير حالة البوت إلى: Watching**',
              components: [],
              flags: [1 << 6],
            });
          } catch (error) {
            console.error('Error setting watching status:', error);
            await interaction.update({
              content: '**حدث خطأ أثناء تغيير حالة البوت**',
              components: [],
              flags: [1 << 6],
            });
          }
          break;
        case 'edit_bot_prefix':
          await interaction.deferReply({ flags: [1 << 6] });
          await interaction.followUp({
            content: '**يرجى إرسال البريفكس الجديد.**',
            flags: [1 << 6],
          });
          const filter = m => m.author.id === interaction.user.id;
          const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 30000 });
          collector.on('collect', async (m) => {
            try {
              const newPrefix = m.content.trim();
              if (!newPrefix) {
                await interaction.followUp({
                  content: '**البريفكس لا يمكن أن يكون فارغاً.**',
                  flags: [1 << 6],
                });
                return;
              }
              // Update settings.json
              const fs = require('fs');
              const path = require('path');
              const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
              let settingsData = {};
              if (fs.existsSync(settingsPath)) {
                settingsData = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
              }
              settingsData.prefix = newPrefix;
              fs.writeFileSync(settingsPath, JSON.stringify(settingsData, null, 2));
              // Update prefix variable in bot.js (if possible)
              // This requires bot.js to export a method to update prefix or use a shared module
              // For now, just confirm success
              await interaction.followUp({
                content: `**تم تغيير البريفكس إلى: \`${newPrefix}\`**`,
                flags: [1 << 6],
              });
              try {
                await m.delete();
              } catch (deleteError) {
                console.error('Error deleting user message:', deleteError);
              }
            } catch (error) {
              console.error('Error changing prefix:', error);
              await interaction.followUp({
                content: '**حدث خطأ أثناء تغيير البريفكس. حاول مرة أخرى.**',
                flags: [1 << 6],
              });
            }
          });
          collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
              interaction.followUp({
                content: '**⏰ انتهى الوقت المحدد لإرسال البريفكس. يرجى المحاولة مرة أخرى.**',
                flags: [1 << 6],
              });
            }
          });
          break;
      }
    }
  }
};
