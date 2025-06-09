const { PermissionsBitField } = require('discord.js');
const { authorizedUsers, customRoles } = require('./data');

function isBotOwner(userId) {
  return userId === process.env.OWNER_ID;
}

function isAdminOrAuthorized(member) {
  return (
    isBotOwner(member.id) || // Bot owner check first
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    authorizedUsers[member.id] ||
    member.guild.ownerId === member.id
  );
}

function hasCustomRole(guildId, userId) {
  const guildRoles = customRoles[guildId] || {};
  return Object.values(guildRoles).some(role => role.members.includes(userId));
}

module.exports = {
  isBotOwner,
  isAdminOrAuthorized,
  hasCustomRole
};
