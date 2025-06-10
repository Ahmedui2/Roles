require('dotenv').config();
const { Client, GatewayIntentBits, Partials, ButtonBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { loadData, customRoles, saveData, setClient } = require('./utils/data');
const { isBotOwner, isAdminOrAuthorized } = require('./utils/permissions');
const roleManagement = require('./commands/roles/roleManagement');
const roleActions = require('./commands/roles/roleActions');
const createRole = require('./commands/roles/createRole');
const botSettings = require('./commands/botSettings');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildEmojisAndStickers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Set client and load data when bot starts
setClient(client);

client.once('ready', async () => {
  try {
    await loadData();
    console.log('Data loaded successfully');
  } catch (error) {
    console.error('Error loading data:', error);
  }
  console.log(`Logged in as ${client.user.tag}`);
});

// Handle commands
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const prefix = '!';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift();

  switch (command) {
    case 'رولك':
      await createRole.execute(message, args);
      break;
    case 'رولي':
      await roleManagement.execute(message);
      break;
    case 'settings':
      await botSettings.execute(message);
      break;
  }
});

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu() && !interaction.isModalSubmit() && !interaction.isButton()) return;

  // Role management interactions
  if (interaction.customId.startsWith('roleAction_')) {
    await roleActions.handleRoleAction(interaction);
  }

  // Settings interactions
  if (interaction.customId === 'settings_select' || 
      interaction.customId === 'roles_select' || 
      interaction.customId === 'select_all_roles' || 
      interaction.customId === 'edit_selected_roles' || 
      interaction.customId === 'delete_selected_roles') {
    await botSettings.handleInteraction(interaction);
  }

  // معالجة التفاعلات مع الرولات
  if (interaction.customId === 'roles_select') {
    const selectedRoles = interaction.values;
    const buttonRow = new ActionRowBuilder();
    
    // إنشاء الأزرار من جديد
    buttonRow.addComponents([
      new ButtonBuilder()
        .setCustomId('select_all_roles')
        .setLabel('اختيار الكل')
        .setStyle(1),
      new ButtonBuilder()
        .setCustomId('edit_selected_roles')
        .setLabel('تعديل')
        .setStyle(3)
        .setDisabled(selectedRoles.length === 0),
      new ButtonBuilder()
        .setCustomId('delete_selected_roles')
        .setLabel('حذف')
        .setStyle(4)
        .setDisabled(selectedRoles.length === 0)
    ]);

    try {
      await interaction.update({
        components: [interaction.message.components[0], buttonRow]
      });
    } catch (error) {
      if (error.code === 50027) { // Interaction already replied
        await interaction.editReply({
          components: [interaction.message.components[0], buttonRow]
        });
      } else {
        throw error;
      }
    }
  }

  // معالجة زر اختيار الكل
  if (interaction.customId === 'select_all_roles') {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('roles_select')
      .setPlaceholder('اختر الرولات')
      .setMinValues(1)
      .setMaxValues(interaction.message.components[0].components[0].options.length);

    // تحديد جميع الخيارات كمحددة
    const options = interaction.message.components[0].components[0].options.map(option => ({
      ...option,
      default: true
    }));
    selectMenu.addOptions(options);

    // إنشاء صف الأزرار مع تفعيل جميع الأزرار
    const buttonRow = new ActionRowBuilder();
    buttonRow.addComponents([
      new ButtonBuilder()
        .setCustomId('select_all_roles')
        .setLabel('اختيار الكل')
        .setStyle(1),
      new ButtonBuilder()
        .setCustomId('edit_selected_roles')
        .setLabel('تعديل')
        .setStyle(3)
        .setDisabled(false),
      new ButtonBuilder()
        .setCustomId('delete_selected_roles')
        .setLabel('حذف')
        .setStyle(4)
        .setDisabled(false)
    ]);

    await interaction.update({
      components: [new ActionRowBuilder().addComponents(selectMenu), buttonRow]
    });
  }

  // Modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'bot_settings_modal') {
      const name = interaction.fields.getTextInputValue('bot_name');
      const avatar = interaction.fields.getTextInputValue('bot_avatar');
      const banner = interaction.fields.getTextInputValue('bot_banner');
      const status = interaction.fields.getTextInputValue('bot_status');
      const activity = interaction.fields.getTextInputValue('bot_activity');

      try {
        // تحديث اسم البوت
        if (name) {
          await interaction.guild.members.me.setNickname(name);
        }

        // تحديث صورة البوت
        if (avatar) {
          await client.user.setAvatar(avatar);
        }

        // تحديث البنر
        if (banner) {
          try {
            await client.user.setBanner(banner);
          } catch (error) {
            console.error('Failed to set banner:', error);
          }
        }

        // تحديث الحالة والنشاط
        if (status || activity) {
          const presenceOptions = {};
          
          if (status) {
            presenceOptions.status = status;
          }
          
          if (activity) {
            if (activity.includes('twitch.tv/')) {
              presenceOptions.activities = [{
                name: activity.split('twitch.tv/')[1],
                type: 1, // STREAMING
                url: activity
              }];
            } else {
              presenceOptions.activities = [{
                name: activity,
                type: 3 // WATCHING
              }];
            }
          }

          await client.user.setPresence(presenceOptions);
        }

        await interaction.reply({
          content: '**تم تحديث إعدادات البوت بنجاح**',
          ephemeral: true
        });
      } catch (error) {
        console.error('Error updating bot settings:', error);
        await interaction.reply({
          content: '**حدث خطأ أثناء تحديث إعدادات البوت**',
          ephemeral: true
        });
      }
    } else if (interaction.customId.startsWith('edit_roles_')) {
      const editType = interaction.customId.split('edit_roles_')[1];
      let value;
      
      switch (editType) {
        case 'edit_name':
          value = interaction.fields.getTextInputValue('new_name');
          break;
        case 'edit_color':
          value = interaction.fields.getTextInputValue('new_color');
          break;
        case 'edit_emoji':
          value = interaction.fields.getTextInputValue('new_emoji');
          break;
        case 'edit_permissions':
          value = interaction.fields.getTextInputValue('new_permissions');
          break;
      }

      try {
        const selectedRoles = interaction.message.components[0].components[0].options
          .filter(option => option.default)
          .map(option => option.value);

        for (const roleId of selectedRoles) {
          const role = interaction.guild.roles.cache.get(roleId);
          if (role) {
            switch (editType) {
              case 'edit_name':
                await role.setName(value);
                break;
              case 'edit_color':
                await role.setColor(value);
                break;
              case 'edit_emoji':
                if (customRoles[interaction.guildId]?.[roleId]) {
                  customRoles[interaction.guildId][roleId].emoji = value;
                  saveData();
                }
                break;
              case 'edit_permissions':
                const permissions = value.split(',').map(p => p.trim());
                await role.setPermissions(permissions);
                break;
            }
          }
        }

        await interaction.reply({
          content: `**تم تعديل ${selectedRoles.length} رول بنجاح**`,
          ephemeral: true
        });
      } catch (error) {
        console.error('Error updating roles:', error);
        await interaction.reply({
          content: '**حدث خطأ أثناء تعديل الرولات**',
          ephemeral: true
        });
      }
    }
  }
});

const { authorizeRoleDeletion, isRoleDeletionAuthorized, clearRoleDeletionAuth } = require('./utils/roleAuth');

// Role deletion protection
client.on('roleDelete', async (role) => {
  const guildId = role.guild.id;
  if (customRoles[guildId]?.[role.id]) {
    const roleData = customRoles[guildId][role.id];
    const member = role.guild.members.cache.get(roleData.ownerId);

    // التحقق من صلاحية الحذف
    if (isRoleDeletionAuthorized(role.id, member?.id) && (
      isBotOwner(member?.id) || 
      role.guild.ownerId === member?.id ||
      roleData.ownerId === member?.id ||
      (member?.permissions.has(PermissionsBitField.Flags.Administrator))
    )) {
      clearRoleDeletionAuth(role.id);
      delete customRoles[guildId][role.id];
      saveData();
      return;
    }
    
    try {
      // Recreate role with saved properties
      const newRole = await role.guild.roles.create({
        name: roleData.name,
        color: roleData.color,
        permissions: roleData.permissions,
        hoist: roleData.hoist,
        mentionable: roleData.mentionable,
        reason: 'Protected role restored'
      });

      // Update role ID in data
      if (!customRoles[guildId]) {
        customRoles[guildId] = {};
      }
      customRoles[guildId][newRole.id] = roleData;
      delete customRoles[guildId][role.id];
      saveData();

      // Reassign to all members
      for (const memberId of roleData.members) {
        const member = await role.guild.members.fetch(memberId).catch(() => null);
        if (member) {
          await member.roles.add(newRole).catch(console.error);
        }
      }

    } catch (error) {
      console.error('Error restoring protected role:', error);
    }
  }
  // تنظيف تصريح الحذف
  clearRoleDeletionAuth(role.id);
});

client.login(process.env.BOT_TOKEN);
