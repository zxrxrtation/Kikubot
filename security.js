import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';
import { isSecurityAdmin, getSecurityConfig, saveSecurityConfig } from '../../services/security/securityService.js';
import { addScheduledMessage, listScheduledMessages, removeScheduledMessage } from '../../services/security/schedulerService.js';

const data = new SlashCommandBuilder()
  .setName('security')
  .setDescription('Configure server security, anti-spam, anti-nuke and scheduled messages')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommandGroup(group => group.setName('automod').setDescription('Configure automatic moderation')
    .addSubcommand(s => s.setName('enable').setDescription('Enable AutoMod'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable AutoMod'))
    .addSubcommand(s => s.setName('status').setDescription('Show AutoMod settings'))
    .addSubcommand(s => s.setName('word-add').setDescription('Block a word').addStringOption(o => o.setName('word').setDescription('Word or phrase').setRequired(true)))
    .addSubcommand(s => s.setName('word-remove').setDescription('Unblock a word').addStringOption(o => o.setName('word').setDescription('Word or phrase').setRequired(true)))
    .addSubcommand(s => s.setName('links').setDescription('Toggle normal link blocking').addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true)))
    .addSubcommand(s => s.setName('invites').setDescription('Toggle Discord invite blocking').addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true)))
    .addSubcommand(s => s.setName('action').setDescription('Set AutoMod action')
      .addStringOption(o => o.setName('type').setDescription('Action').setRequired(true).addChoices(
        { name: 'Delete', value: 'delete' }, { name: 'Delete + timeout', value: 'timeout' }
      )))
    .addSubcommand(s => s.setName('logchannel').setDescription('Set AutoMod log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText).setRequired(true))))
  .addSubcommandGroup(group => group.setName('antispam').setDescription('Configure anti-spam')
    .addSubcommand(s => s.setName('enable').setDescription('Enable anti-spam'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable anti-spam'))
    .addSubcommand(s => s.setName('status').setDescription('Show anti-spam settings'))
    .addSubcommand(s => s.setName('limits').setDescription('Set message rate limits')
      .addIntegerOption(o => o.setName('messages').setDescription('Maximum messages').setMinValue(2).setMaxValue(30).setRequired(true))
      .addIntegerOption(o => o.setName('seconds').setDescription('Time window').setMinValue(1).setMaxValue(60).setRequired(true)))
    .addSubcommand(s => s.setName('action').setDescription('Set anti-spam action')
      .addStringOption(o => o.setName('type').setDescription('Action').setRequired(true).addChoices(
        { name: 'Delete', value: 'delete' }, { name: 'Delete + timeout', value: 'timeout' }
      )))
    .addSubcommand(s => s.setName('logchannel').setDescription('Set anti-spam log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText).setRequired(true))))
  .addSubcommandGroup(group => group.setName('antinuke').setDescription('Configure anti-nuke protection')
    .addSubcommand(s => s.setName('enable').setDescription('Enable anti-nuke'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable anti-nuke'))
    .addSubcommand(s => s.setName('status').setDescription('Show anti-nuke settings'))
    .addSubcommand(s => s.setName('threshold').setDescription('Set actions required to trigger')
      .addIntegerOption(o => o.setName('count').setDescription('Actions in the window').setMinValue(2).setMaxValue(20).setRequired(true))
      .addIntegerOption(o => o.setName('seconds').setDescription('Window in seconds').setMinValue(5).setMaxValue(120).setRequired(true)))
    .addSubcommand(s => s.setName('action').setDescription('Choose response')
      .addStringOption(o => o.setName('type').setDescription('Response').setRequired(true).addChoices(
        { name: 'Timeout', value: 'timeout' }, { name: 'Remove manageable roles', value: 'strip' }
      )))
    .addSubcommand(s => s.setName('logchannel').setDescription('Set anti-nuke log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText).setRequired(true))))
    .addSubcommand(s => s.setName('whitelist-add').setDescription('Whitelist a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s => s.setName('whitelist-remove').setDescription('Remove user from whitelist')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
  .addSubcommandGroup(group => group.setName('schedule').setDescription('Manage recurring scheduled messages')
    .addSubcommand(s => s.setName('add').setDescription('Add a recurring scheduled message')
      .addChannelOption(o => o.setName('channel').setDescription('Text channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Message to send').setMaxLength(1900).setRequired(true))
      .addIntegerOption(o => o.setName('minutes').setDescription('Repeat every N minutes').setMinValue(1).setMaxValue(43200).setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List scheduled messages'))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a scheduled message')
      .addStringOption(o => o.setName('id').setDescription('Schedule ID').setRequired(true))));

export default {
  data,
  category: 'Security',
  async execute(interaction, client) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
    }
    if (!isSecurityAdmin(interaction)) {
      return interaction.reply({ content: 'You need Manage Server or Administrator permission.', flags: MessageFlags.Ephemeral });
    }

    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const cfg = await getSecurityConfig(client, guildId);

    if (group === 'automod') {
      if (sub === 'enable') cfg.automod.enabled = true;
      if (sub === 'disable') cfg.automod.enabled = false;
      if (sub === 'links') cfg.automod.blockLinks = interaction.options.getBoolean('enabled');
      if (sub === 'invites') cfg.automod.blockInvites = interaction.options.getBoolean('enabled');
      if (sub === 'word-add') {
        const word = interaction.options.getString('word').trim().toLowerCase();
        if (!cfg.automod.blockedWords.includes(word)) cfg.automod.blockedWords.push(word);
      }
      if (sub === 'word-remove') {
        const word = interaction.options.getString('word').trim().toLowerCase();
        cfg.automod.blockedWords = cfg.automod.blockedWords.filter(w => w !== word);
      }
      if (sub === 'action') {
        cfg.automod.action = interaction.options.getString('type');
        cfg.automod.timeoutSeconds = cfg.automod.action === 'timeout' ? 60 : 0;
      }
      if (sub === 'logchannel') cfg.automod.logChannelId = interaction.options.getChannel('channel').id;
      await saveSecurityConfig(client, guildId, cfg);
      if (sub === 'status') return replyStatus(interaction, 'AutoMod', cfg.automod);
      return interaction.reply({ content: `✅ AutoMod ${sub === 'disable' ? 'disabled' : 'settings updated'}.`, flags: MessageFlags.Ephemeral });
    }

    if (group === 'antispam') {
      if (sub === 'enable') cfg.antispam.enabled = true;
      if (sub === 'disable') cfg.antispam.enabled = false;
      if (sub === 'limits') {
        cfg.antispam.maxMessages = interaction.options.getInteger('messages');
        cfg.antispam.windowSeconds = interaction.options.getInteger('seconds');
      }
      if (sub === 'action') cfg.antispam.action = interaction.options.getString('type');
      if (sub === 'logchannel') cfg.antispam.logChannelId = interaction.options.getChannel('channel').id;
      await saveSecurityConfig(client, guildId, cfg);
      if (sub === 'status') return replyStatus(interaction, 'Anti-Spam', cfg.antispam);
      return interaction.reply({ content: `✅ Anti-spam ${sub === 'disable' ? 'disabled' : 'settings updated'}.`, flags: MessageFlags.Ephemeral });
    }

    if (group === 'antinuke') {
      if (sub === 'enable') cfg.antinuke.enabled = true;
      if (sub === 'disable') cfg.antinuke.enabled = false;
      if (sub === 'threshold') {
        cfg.antinuke.threshold = interaction.options.getInteger('count');
        cfg.antinuke.windowSeconds = interaction.options.getInteger('seconds');
      }
      if (sub === 'action') cfg.antinuke.action = interaction.options.getString('type');
      if (sub === 'logchannel') cfg.antinuke.logChannelId = interaction.options.getChannel('channel').id;
      if (sub === 'whitelist-add') {
        const id = interaction.options.getUser('user').id;
        if (!cfg.antinuke.whitelist.includes(id)) cfg.antinuke.whitelist.push(id);
      }
      if (sub === 'whitelist-remove') {
        const id = interaction.options.getUser('user').id;
        cfg.antinuke.whitelist = cfg.antinuke.whitelist.filter(x => x !== id);
      }
      await saveSecurityConfig(client, guildId, cfg);
      if (sub === 'status') return replyStatus(interaction, 'Anti-Nuke', cfg.antinuke);
      return interaction.reply({ content: `✅ Anti-nuke ${sub === 'disable' ? 'disabled' : 'settings updated'}.`, flags: MessageFlags.Ephemeral });
    }

    if (group === 'schedule') {
      if (sub === 'add') {
        const id = await addScheduledMessage(client, guildId, {
          channelId: interaction.options.getChannel('channel').id,
          message: interaction.options.getString('message'),
          intervalMinutes: interaction.options.getInteger('minutes'),
          createdBy: interaction.user.id,
        });
        return interaction.reply({ content: `✅ Scheduled message created with ID \`${id}\`. It will repeat every ${interaction.options.getInteger('minutes')} minute(s).`, flags: MessageFlags.Ephemeral });
      }
      if (sub === 'list') {
        const rows = await listScheduledMessages(client, guildId);
        if (!rows.length) return interaction.reply({ content: '📭 No scheduled messages configured.', flags: MessageFlags.Ephemeral });
        const text = rows.map(x => `\`${x.id}\` → <#${x.channelId}> every **${x.intervalMinutes}m** • ${x.enabled === false ? 'disabled' : 'enabled'}`).join('\n');
        return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⏰ Scheduled Messages').setDescription(text).setColor(0x5865f2)], flags: MessageFlags.Ephemeral });
      }
      const id = interaction.options.getString('id');
      const removed = await removeScheduledMessage(client, guildId, id);
      return interaction.reply({ content: removed ? '✅ Schedule removed.' : '❌ Schedule ID not found.', flags: MessageFlags.Ephemeral });
    }
  },
};

async function replyStatus(interaction, name, cfg) {
  const fields = Object.entries(cfg)
    .filter(([k]) => !['blockedWords', 'whitelist'].includes(k))
    .map(([k, v]) => ({ name: k, value: `\`${String(v)}\``, inline: true }));
  if (cfg.blockedWords?.length) fields.push({ name: 'blockedWords', value: cfg.blockedWords.slice(0, 20).map(w => `\`${w}\``).join(', '), inline: false });
  if (cfg.whitelist?.length) fields.push({ name: 'whitelist', value: cfg.whitelist.slice(0, 20).map(id => `<@${id}>`).join(', '), inline: false });
  return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🛡️ ${name}`).addFields(fields).setColor(0x5865f2)], flags: MessageFlags.Ephemeral });
}
