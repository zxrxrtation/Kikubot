import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    AutoModerationRuleTriggerType,
    AutoModerationRuleEventType,
    AutoModerationActionType,
    AutoModerationRuleKeywordPresetType
} from 'discord.js';

const RULE_PREFIX = 'Kikubot AutoMod';

export default {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure server AutoMod')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addSubcommand(sub =>
            sub.setName('enable')
                .setDescription('Enable full AutoMod protection')
        )

        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Disable Kikubot AutoMod rules')
        )

        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('Show AutoMod status')
        ),

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({
                content: '❌ This command can only be used in a server.',
                ephemeral: true
            });
        }

        const guild = interaction.guild;
        const subcommand = interaction.options.getSubcommand();

        // ---------------- ENABLE ----------------
        if (subcommand === 'enable') {
            await interaction.deferReply({ ephemeral: true });

            try {
                // Remove old Kikubot rules so enable can safely be run again
                const existing = await guild.autoModerationRules.fetch();

                for (const rule of existing.values()) {
                    if (rule.name.startsWith(RULE_PREFIX)) {
                        try {
                            await rule.delete('Kikubot AutoMod reconfiguration');
                        } catch {}
                    }
                }

                const rules = [];

                // 1. Profanity
                rules.push(
                    await guild.autoModerationRules.create({
                        name: `${RULE_PREFIX} • Profanity`,
                        eventType: AutoModerationRuleEventType.MessageSend,
                        triggerType: AutoModerationRuleTriggerType.KeywordPreset,
                        triggerMetadata: {
                            presets: [
                                AutoModerationRuleKeywordPresetType.Profanity
                            ]
                        },
                        actions: [
                            {
                                type: AutoModerationActionType.BlockMessage
                            }
                        ],
                        enabled: true,
                        reason: 'Kikubot full AutoMod'
                    })
                );

                // 2. Sexual content
                rules.push(
                    await guild.autoModerationRules.create({
                        name: `${RULE_PREFIX} • Sexual Content`,
                        eventType: AutoModerationRuleEventType.MessageSend,
                        triggerType: AutoModerationRuleTriggerType.KeywordPreset,
                        triggerMetadata: {
                            presets: [
                                AutoModerationRuleKeywordPresetType.SexualContent
                            ]
                        },
                        actions: [
                            {
                                type: AutoModerationActionType.BlockMessage
                            }
                        ],
                        enabled: true,
                        reason: 'Kikubot full AutoMod'
                    })
                );

                // 3. Slurs / hate speech filter
                rules.push(
                    await guild.autoModerationRules.create({
                        name: `${RULE_PREFIX} • Slurs`,
                        eventType: AutoModerationRuleEventType.MessageSend,
                        triggerType: AutoModerationRuleTriggerType.KeywordPreset,
                        triggerMetadata: {
                            presets: [
                                AutoModerationRuleKeywordPresetType.Slurs
                            ]
                        },
                        actions: [
                            {
                                type: AutoModerationActionType.BlockMessage
                            }
                        ],
                        enabled: true,
                        reason: 'Kikubot full AutoMod'
                    })
                );

                // 4. Generic spam
                rules.push(
                    await guild.autoModerationRules.create({
                        name: `${RULE_PREFIX} • Spam`,
                        eventType: AutoModerationRuleEventType.MessageSend,
                        triggerType: AutoModerationRuleTriggerType.Spam,
                        actions: [
                            {
                                type: AutoModerationActionType.BlockMessage
                            }
                        ],
                        enabled: true,
                        reason: 'Kikubot full AutoMod'
                    })
                );

                // 5. Mention spam / raid protection
                rules.push(
                    await guild.autoModerationRules.create({
                        name: `${RULE_PREFIX} • Mention Spam`,
                        eventType: AutoModerationRuleEventType.MessageSend,
                        triggerType: AutoModerationRuleTriggerType.MentionSpam,
                        triggerMetadata: {
                            mentionTotalLimit: 5,
                            mentionRaidProtectionEnabled: true
                        },
                        actions: [
                            {
                                type: AutoModerationActionType.BlockMessage
                            }
                        ],
                        enabled: true,
                        reason: 'Kikubot full AutoMod'
                    })
                );

                // 6. Custom dangerous keyword filter
                const keywords = [
                    'discord.gg/*',
                    'discord.com/invite/*',
                    '@everyone',
                    '@here'
                ];

                rules.push(
                    await guild.autoModerationRules.create({
                        name: `${RULE_PREFIX} • Dangerous Keywords`,
                        eventType: AutoModerationRuleEventType.MessageSend,
                        triggerType: AutoModerationRuleTriggerType.Keyword,
                        triggerMetadata: {
                            keywordFilter: keywords
                        },
                        actions: [
                            {
                                type: AutoModerationActionType.BlockMessage
                            }
                        ],
                        enabled: true,
                        reason: 'Kikubot full AutoMod'
                    })
                );

                return interaction.editReply(
                    `🛡️ **Kikubot AutoMod Enabled**\n\n` +
                    `✅ Profanity filter\n` +
                    `✅ Sexual-content filter\n` +
                    `✅ Slur filter\n` +
                    `✅ Spam protection\n` +
                    `✅ Mention-spam protection\n` +
                    `✅ Mention-raid protection\n` +
                    `✅ Invite/mention keyword filter\n\n` +
                    `**${rules.length} protection rules active.**`
                );

            } catch (error) {
                console.error('AutoMod setup error:', error);

                return interaction.editReply(
                    `❌ **AutoMod setup failed.**\n\n` +
                    `\`${error.message}\`\n\n` +
                    `Make sure the bot has **Manage Guild** permission.`
                );
            }
        }

        // ---------------- DISABLE ----------------
        if (subcommand === 'disable') {
            await interaction.deferReply({ ephemeral: true });

            try {
                const existing = await guild.autoModerationRules.fetch();
                let disabled = 0;

                for (const rule of existing.values()) {
                    if (rule.name.startsWith(RULE_PREFIX)) {
                        await rule.edit({
                            enabled: false
                        });

                        disabled++;
                    }
                }

                return interaction.editReply(
                    `🛡️ **Kikubot AutoMod Disabled**\n\n` +
                    `Disabled **${disabled}** Kikubot protection rules.`
                );

            } catch (error) {
                console.error('AutoMod disable error:', error);

                return interaction.editReply(
                    `❌ Failed to disable AutoMod.\n\`${error.message}\``
                );
            }
        }

        // ---------------- STATUS ----------------
        if (subcommand === 'status') {
            await interaction.deferReply({ ephemeral: true });

            try {
                const rules = await guild.autoModerationRules.fetch();

                const kikubotRules = rules.filter(rule =>
                    rule.name.startsWith(RULE_PREFIX)
                );

                const enabled = kikubotRules.filter(rule => rule.enabled);

                return interaction.editReply(
                    `🛡️ **Kikubot AutoMod Status**\n\n` +
                    `📋 Rules: **${kikubotRules.size}**\n` +
                    `🟢 Enabled: **${enabled.size}**\n` +
                    `🔴 Disabled: **${kikubotRules.size - enabled.size}**`
                );

            } catch (error) {
                console.error('AutoMod status error:', error);

                return interaction.editReply(
                    `❌ Failed to get AutoMod status.\n\`${error.message}\``
                );
            }
        }
    }
};
