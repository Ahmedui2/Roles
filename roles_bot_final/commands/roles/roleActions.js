const { EmbedBuilder } = require('discord.js');
const { isBotOwner, isAdminOrAuthorized } = require('../../utils/permissions');
const { saveData, customRoles } = require('../../utils/data');

module.exports = {
  handleRoleAction: async (interaction) => {
    const guildId = interaction.guildId;
    const [_, roleId] = interaction.customId.split('_');
    const action = interaction.values[0];
    const roleData = customRoles[guildId]?.[roleId];
    
    if (!roleData) {
      return interaction.reply({ 
        content: '**الرول غير موجود**', 
        flags: [1 << 6] 
      });
    }

    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({ 
        content: '**الرول غير موجود في السيرفر**', 
        flags: [1 << 6] 
      });
    }

    // Permission check with protection bypass for owner, authorized, or role owner
    if (!isBotOwner(interaction.user.id) && !isAdminOrAuthorized(interaction.member) && roleData.ownerId !== interaction.member.id) {
      // If role is protected, check if user is owner, authorized, or role owner to bypass protection
      if (roleData.protected) {
        if (roleData.ownerId === interaction.user.id || isAdminOrAuthorized(interaction.member) || isBotOwner(interaction.user.id)) {
          // Allow action
        } else {
          return interaction.reply({
            content: '**هذا الرول محمي ولا يمكنك تعديله**',
            flags: [1 << 6]
          });
        }
      } else {
        return interaction.reply({
          content: '**ليس لديك صلاحية تعديل هذا الرول**',
          flags: [1 << 6]
        });
      }
    }

    switch (action) {
      case 'add':
        return handleAdd(interaction, role);
      case 'remove':
        return handleRemove(interaction, role);
      case 'delete':
        return handleDelete(interaction, role, roleId, guildId, customRoles);
      case 'rename':
        return handleRename(interaction, role, roleData);
      case 'color':
        return handleColor(interaction, role);
      case 'emojiAdd':
        return handleEmojiAdd(interaction, roleData);
      case 'emojiRemove':
        return handleEmojiRemove(interaction, roleData);
      case 'members':
        return handleMembers(interaction, role);
    }
  }
};

async function handleAdd(interaction, role) {
  try {
    const promptMessage = await interaction.reply({ 
      content: '**اكتب آيدي العضو أو منشن العضو في الشات**',
      flags: [1 << 6],
      fetchReply: true
    });
    const filter = m => m.author.id === interaction.user.id;
    
    const collected = await interaction.channel.awaitMessages({ 
      filter, 
      max: 1, 
      time: 30000,
      errors: ['time']
    });
    const response = collected.first();
    if (!response) {
      await interaction.deleteReply().catch(() => null);
      await interaction.followUp({ 
        content: '**انتهى الوقت**', 
        flags: [1 << 6] 
      });
      return;
    }

    const memberId = response.content.replace(/[<@!>]/g, '');
    const member = await interaction.guild.members.fetch(memberId).catch(() => null);

    if (!member) {
      await interaction.deleteReply().catch(() => null);
      await response.delete().catch(() => null);
      await interaction.followUp({ 
        content: '**لم يتم العثور على العضو**', 
        flags: [1 << 6] 
      });
      return;
    }

    if (member.user.bot) {
      await interaction.deleteReply().catch(() => null);
      await response.delete().catch(() => null);
      await interaction.followUp({
        content: '**لا يمكن إضافة بوتات للرول الخاص.**',
        flags: [1 << 6],
        ephemeral: true
      });
      return;
    }

    if (member.roles.cache.has(role.id)) {
      await interaction.deleteReply().catch(() => null);
      await response.delete().catch(() => null);
      await interaction.followUp({
        content: '**العضو لديه هذا الرول بالفعل.**',
        flags: [1 << 6]
      });
      return;
    }

    await member.roles.add(role);
    await interaction.deleteReply().catch(() => null);
    await response.delete().catch(() => null);
    await interaction.followUp({ 
      content: `**تم إضافة الرول للعضو ${member.user.tag}**`, 
      flags: [1 << 6] 
    });
  } catch (error) {
    await interaction.followUp({ 
      content: '**حدث خطأ أو انتهى الوقت**', 
      flags: [1 << 6] 
    });
  }
}

async function handleRemove(interaction, role) {
  const membersList = [...role.members.values()];
  const members = membersList.map((m, index) => `**${index + 1}-** <@${m.id}>`);
  if (members.length === 0) {
    return interaction.reply({ 
      content: '**لا يوجد أعضاء في الرول**', 
      flags: [1 << 6] 
    });
  }

  try {
    const embed = new EmbedBuilder()
      .setTitle(`إزالة عضو من الرول ${role.name}`)
      .setDescription(`**اختر رقم العضو الذي تريد إزالته:**\n${'-'.repeat(40)}\n${members.join('\n')}`)
      .setColor(role.color || 0x0099ff);

    const promptMessage = await interaction.reply({ 
      embeds: [embed],
      flags: [1 << 6],
      fetchReply: true
    });
    const filter = m => m.author.id === interaction.user.id && !isNaN(m.content) && m.content > 0 && m.content <= members.length;

    const collected = await interaction.channel.awaitMessages({ 
      filter, 
      max: 1, 
      time: 30000,
      errors: ['time']
    });
    const response = collected.first();
    if (!response) {
      await interaction.deleteReply().catch(() => null);
      await interaction.followUp({ 
        content: '**انتهى الوقت**', 
        flags: [1 << 6] 
      });
      return;
    }

    const index = parseInt(response.content) - 1;
    const member = role.members.at(index);
    if (member) {
      await member.roles.remove(role);
      await interaction.deleteReply().catch(() => null);
      await response.delete().catch(() => null);
      await interaction.followUp({ 
        content: `**تم إزالة الرول من العضو ${member.user.tag}**`, 
        flags: [1 << 6] 
      });
    }
  } catch (error) {
    await interaction.followUp({ 
      content: '**حدث خطأ أو انتهى الوقت**', 
      flags: [1 << 6] 
    });
  }
}

async function handleDelete(interaction, role, roleId, guildId, customRoles) {
  try {
    const promptMessage = await interaction.reply({ 
      content: '**هل أنت متأكد من حذف الرول نهائياً؟ اكتب `نعم` للتأكيد**',
      flags: [1 << 6]
    });
    const filter = m => m.author.id === interaction.user.id;

    const collected = await interaction.channel.awaitMessages({ 
      filter, 
      max: 1, 
      time: 30000,
      errors: ['time']
    });
    const response = collected.first();
    if (!response) {
      await interaction.deleteReply().catch(() => null);
      await interaction.followUp({ 
        content: '**انتهى الوقت**', 
        flags: [1 << 6] 
      });
      return;
    }

    if (response.content === 'نعم') {
      // Notify bot.js about authorized deletion
      const { authorizeRoleDeletion } = require('../../bot');
      authorizeRoleDeletion(roleId, interaction.user.id);

      await role.delete('تم الحذف بواسطة المالك');
      if (customRoles[guildId] && customRoles[guildId][roleId]) {
        delete customRoles[guildId][roleId];
        saveData();
      }
      await interaction.deleteReply().catch(() => null);
      await response.delete().catch(() => null);
      await interaction.followUp({ 
        content: '**تم حذف الرول نهائياً**', 
        flags: [1 << 6] 
      });
    } else {
      await interaction.deleteReply().catch(() => null);
      await response.delete().catch(() => null);
      await interaction.followUp({ 
        content: '**تم إلغاء عملية الحذف**', 
        flags: [1 << 6] 
      });
    }
  } catch (error) {
    await interaction.followUp({ 
      content: '**حدث خطأ أثناء حذف الرول**', 
      flags: [1 << 6] 
    });
  }
}

async function handleRename(interaction, role, roleData) {
  try {
    const promptMessage = await interaction.reply({ 
      content: '**اكتب الاسم الجديد للرول**',
      flags: [1 << 6],
      fetchReply: true
    });
    const filter = m => m.author.id === interaction.user.id;

    const collected = await interaction.channel.awaitMessages({ 
      filter, 
      max: 1, 
      time: 30000,
      errors: ['time']
    });
    const response = collected.first();
    if (!response) {
      await interaction.deleteReply().catch(() => null);
      await interaction.followUp({ 
        content: '**انتهى الوقت**', 
        flags: [1 << 6] 
      });
      return;
    }

    const newName = response.content;
    await role.setName(newName);
    roleData.name = newName;
    saveData();
    await interaction.deleteReply().catch(() => null);
    await response.delete().catch(() => null);
    await interaction.followUp({ 
      content: `**تم تغيير اسم الرول إلى ${newName}**`, 
      flags: [1 << 6] 
    });
  } catch (error) {
    await interaction.followUp({ 
      content: '**حدث خطأ أو انتهى الوقت**', 
      flags: [1 << 6] 
    });
  }
}

async function handleColor(interaction, role) {
  try {
    const promptMessage = await interaction.reply({ 
      content: '**اكتب كود اللون (مثال: #ff0000)**',
      flags: [1 << 6],
      fetchReply: true
    });
    const filter = m => m.author.id === interaction.user.id;

    const collected = await interaction.channel.awaitMessages({ 
      filter, 
      max: 1, 
      time: 30000,
      errors: ['time']
    });
    const response = collected.first();
    if (!response) {
      await interaction.deleteReply().catch(() => null);
      await interaction.followUp({ 
        content: '**انتهى الوقت**', 
        flags: [1 << 6] 
      });
      return;
    }

    const newColor = response.content;
    await role.setColor(newColor);
    await interaction.deleteReply().catch(() => null);
    await response.delete().catch(() => null);
    await interaction.followUp({ 
      content: `**تم تغيير لون الرول إلى ${newColor}**`, 
      flags: [1 << 6] 
    });
  } catch (error) {
    await interaction.followUp({ 
      content: '**حدث خطأ أو انتهى الوقت**', 
      flags: [1 << 6] 
    });
  }
}

async function handleEmojiAdd(interaction, roleData) {
  try {
    const promptMessage = await interaction.reply({ 
      content: '**اكتب الايموجي الذي تريد إضافته أو قم بلصقه (يمكن أن يكون إيموجي ديسكورد مخصص أو إيموجي افتراضية)**',
      flags: [1 << 6],
      fetchReply: true
    });
    const filter = m => m.author.id === interaction.user.id;

    const collected = await interaction.channel.awaitMessages({ 
      filter, 
      max: 1, 
      time: 30000,
      errors: ['time']
    });
    const response = collected.first();
    if (!response) {
      await interaction.deleteReply().catch(() => null);
      await interaction.followUp({ 
        content: '**انتهى الوقت**', 
        flags: [1 << 6] 
      });
      return;
    }

    let emojiInput = response.content.trim();

    // تحقق إذا كان الإيموجي هو إيموجي ديسكورد مخصص (ثابت أو متحرك)
    const customEmojiMatch = emojiInput.match(/^<a?:\w+:(\d+)>$/);
    let emojiUrl = null;

    if (customEmojiMatch) {
      // إيموجي مخصص، نحصل على URL الخاص به
      const emojiId = customEmojiMatch[1];
      let emoji = interaction.guild.emojis.cache.get(emojiId);
      if (!emoji) {
        // حاول البحث في جميع السيرفرات التي ينتمي لها البوت
        for (const guild of interaction.client.guilds.cache.values()) {
          emoji = guild.emojis.cache.get(emojiId);
          if (emoji) break;
        }
      }
      if (emoji) {
        // إذا كان إيموجي متحرك، نحولها إلى ثابتة (png)
        emojiUrl = emoji.animated ? emoji.url.replace('.gif', '.png') : emoji.url;
      }
    } else {
      // إيموجي عادي (Unicode)، نستخدمه كما هو كأيقونة (لا يمكن تعيين صورة، نستخدم null)
      emojiUrl = null;
    }

    if (emojiUrl) {
      // إذا كان إيموجي مخصص، نحدث أيقونة الرول
      try {
        const role = interaction.guild.roles.cache.get(roleData.id);
        if (role) {
          await role.edit({ icon: emojiUrl });
          roleData.emoji = emojiInput;
          saveData();
          await interaction.deleteReply().catch(() => null);
          await response.delete().catch(() => null);
          await interaction.followUp({ 
            content: `**تم إضافة الايموجي ${emojiInput} كرول للرول**`, 
            flags: [1 << 6] 
          });
          return;
        }
      } catch (error) {
        console.error('Failed to set role icon:', error);
        await interaction.followUp({ 
          content: '**حدث خطأ أثناء تعيين الايموجي كرول للرول**', 
          flags: [1 << 6] 
        });
        return;
      }
    }

    // إذا لم يكن إيموجي مخصص، نستخدم اسم الإيموجي كنص في اسم الرول
    try {
      const role = interaction.guild.roles.cache.get(roleData.id);
      if (role) {
        const newName = `${emojiInput} ${role.name}`;
        await role.setName(newName);
        roleData.name = newName;
        roleData.emoji = emojiInput;
        saveData();
        await interaction.deleteReply().catch(() => null);
        await response.delete().catch(() => null);
        await interaction.followUp({ 
          content: `**تم إضافة الايموجي ${emojiInput} في اسم الرول**`, 
          flags: [1 << 6] 
        });
        return;
      }
    } catch (error) {
      console.error('Failed to add emoji to role name:', error);
      await interaction.followUp({ 
        content: '**حدث خطأ أثناء إضافة الإيموجي لاسم الرول**', 
        flags: [1 << 6] 
      });
      return;
    }
  } catch (error) {
    await interaction.followUp({ 
      content: '**حدث خطأ أو انتهى الوقت**', 
      flags: [1 << 6] 
    });
  }
}

async function handleEmojiRemove(interaction, roleData) {
  try {
    if (!roleData.emoji) {
      return interaction.reply({ 
        content: '**لا يوجد ايموجي مضاف للرول**', 
        flags: [1 << 6] 
      });
    }

    const oldEmoji = roleData.emoji;
    delete roleData.emoji;
    saveData();
    
    await interaction.reply({ 
      content: `**تم إزالة الايموجي ${oldEmoji} من الرول**`, 
      flags: [1 << 6] 
    });
  } catch (error) {
    await interaction.reply({ 
      content: '**حدث خطأ أثناء إزالة الايموجي**', 
      flags: [1 << 6] 
    });
  }
}

async function handleMembers(interaction, role) {
  try {
    const membersList = [...role.members.values()];
    const members = membersList.map((m, index) => `**${index + 1}-** <@${m.id}>`);
    const embed = new EmbedBuilder()
      .setTitle(`أعضاء الرول ${role.name}`)
      .setDescription(members.length > 0 ? members.join('\n') : '**لا يوجد أعضاء**')
      .setColor(role.color || 0x0099ff);

    await interaction.reply({ embeds: [embed], flags: [1 << 6] });
  } catch (error) {
    await interaction.reply({ 
      content: '**حدث خطأ أثناء عرض الأعضاء**', 
      flags: [1 << 6] 
    });
  }
}
