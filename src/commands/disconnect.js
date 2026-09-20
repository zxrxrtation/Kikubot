import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from 'discord.js';

const activeTargets = new Map();

export default {
    data: new SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Automatically disconnect a member from voice channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)

        .addSubcommand(sub =>
            sub
                .setName('start')
                .setDescription('Enable automatic disconnect for a member')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Member to automatically disconnect')
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName('stop')
                .setDescription('Stop automatic disconnect for a member')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Member')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const guild = interaction.guild;

        if (!guild) {
            return interaction.reply({
                content: '❌ This command can only be used in a server.',
                ephemeral: true
            });
        }

        const user = interaction.options.getUser('user');
        const key = `${guild.id}:${user.id}`;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'stop') {
            if (!activeTargets.has(key)) {
                return interaction.reply({
                    content: `ℹ️ ${user} is not currently protected.`,
                    ephemeral: true
                });
            }

            activeTargets.delete(key);

            return interaction.reply(
                `🛑 Automatic disconnect stopped for ${user}.`
            );
        }

        activeTargets.set(key, {
            guildId: guild.id,
            userId: user.id,
            startedBy: interaction.user.id
        });

        const member = await guild.members
            .fetch(user.id)
            .catch(() => null);

        if (member?.voice?.channel) {
            try {
                await member.voice.disconnect(
                    `Automatic disconnect enabled by ${interaction.user.tag}`
                );
            } catch (error) {
                console.error('[Disconnect] Failed:', error);
            }
        }

        return interaction.reply(
            `🔒 **Automatic disconnect enabled for ${user}.**\n\n` +
            `They will be disconnected whenever they join a voice channel.\n\n` +
            `Use \`/disconnect stop\` to disable it.`
        );
    },

    activeTargets
};
