import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    AutoModerationRuleEventType,
    AutoModerationRuleTriggerType,
    AutoModerationActionType
} from 'discord.js';

const PREFIX = '[Zxrxtation AutoMod]';

export default {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure server AutoMod security')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addSubcommand(sub =>
            sub.setName('on')
                .setDescription('Enable full AutoMod security')
        )

        .addSubcommand(sub =>
            sub.setName('off')
                .setDescription('Disable AutoMod rules created by this bot')
        )

        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('Check AutoMod status')
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;

            if (!guild) {
                return interaction.editReply('❌ This command can only be used in a server.');
            }

            if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.editReply(
                    '❌ You need **Manage Server** permission.'
                );
            }

            // =========================
            // ENABLE
            // =========================
            if (interaction.options.getSubcommand() === 'on') {

                const existing = await guild.autoModerationRules.fetch();

                // Remove only rules created by this bot
                for (const [, rule] of existing) {
                    if (rule.name?.startsWith(PREFIX)) {
                        try {
                            await rule.delete();
                        } catch {}
                    }
                }

                // 1. Profanity / sexual / slur protection
                await guild.autoModerationRules.create({
                    name: `${PREFIX} Content Filter`,
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.KeywordPreset,
                    triggerMetadata: {
                        presets: [
                            1, // Profanity
                            2, // Sexual Content
                            3  // Slurs
                        ]
                    },
                    actions: [
                        {
                            type: AutoModerationActionType.BlockMessage,
                            metadata: {
                                customMessage: '🛡️ This message was blocked by AutoMod.'
                            }
                        }
                    ]
                });

                // 2. Spam protection
                await guild.autoModerationRules.create({
                    name: `${PREFIX} Spam`,
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.Spam,
                    actions: [
                        {
                            type: AutoModerationActionType.BlockMessage,
                            metadata: {
                                customMessage: '🚫 Spam detected.'
                            }
                        },
                        {
                            type: AutoModerationActionType.SendAlertMessage,
                            metadata: {
                                channelId: interaction.channelId
                            }
                        }
                    ]
                });

                // 3. Mention spam protection
                await guild.autoModerationRules.create({
                    name: `${PREFIX} Mention Spam`,
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.MentionSpam,
                    triggerMetadata: {
                        mentionTotalLimit: 5
                    },
                    actions: [
                        {
                            type: AutoModerationActionType.BlockMessage,
                            metadata: {
                                customMessage: '🚫 Too many mentions.'
                            }
                        }
                    ]
                });

                // 4. Common abusive keywords
                await guild.autoModerationRules.create({
                    name: `${PREFIX} Bad Words`,
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: AutoModerationRuleTriggerType.Keyword,
                    triggerMetadata: {
                        keywordFilter: [
                            'fuck',
                            'fucking',
                            'motherfucker',
                            'bitch',
                            'bastard',
                            'nigger',
                            'nigga'
                        ]
                    },
                    actions: [
                        {
                            type: AutoModerationActionType.BlockMessage,
                            metadata: {
                                customMessage: '🚫 Inappropriate language is not allowed.'
                            }
                        }
                    ]
                });

                return interaction.editReply(
                    '🛡️ **Full AutoMod Security Enabled!**\n\n' +
                    '✅ Profanity filter\n' +
                    '✅ Sexual content filter\n' +
                    '✅ Slur filter\n' +
                    '✅ Spam protection\n' +
                    '✅ Mention spam protection\n' +
                    '✅ Bad-word filter\n\n' +
                    '🔒 Your server is now protected by Discord AutoMod.'
                );
            }

            // =========================
            // DISABLE
            // =========================
            if (interaction.options.getSubcommand() === 'off') {

                const rules = await guild.autoModerationRules.fetch();
                let removed = 0;

                for (const [, rule] of rules) {
                    if (rule.name?.startsWith(PREFIX)) {
                        try {
                            await rule.delete();
                            removed++;
                        } catch {}
                    }
                }

                return interaction.editReply(
                    `🛡️ AutoMod disabled.\n\nRemoved **${removed}** rules created by this bot.`
                );
            }

            // =========================
            // STATUS
            // =========================
            if (interaction.options.getSubcommand() === 'status') {

                const rules = await guild.autoModerationRules.fetch();

                const mine = [...rules.values()].filter(rule =>
                    rule.name?.startsWith(PREFIX)
                );

                return interaction.editReply(
                    `🛡️ **AutoMod Status**\n\n` +
                    `Status: ${mine.length > 0 ? '🟢 ENABLED' : '🔴 DISABLED'}\n` +
                    `Active rules: **${mine.length}**`
                );
            }

        } catch (error) {
            console.error('AUTOMOD ERROR:', error);

            return interaction.editReply(
                '❌ **AutoMod failed to configure.**\n\n' +
                `Error: \`${error?.message || 'Unknown error'}\``
            ).catch(() => {});
        }
    }
};
