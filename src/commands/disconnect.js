import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from 'discord.js';

const activeTargets = new Map();

export default {
    data: new SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Automatically disconnect a member whenever they join VC')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)

        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Member to automatically disconnect')
                .setRequired(true)
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

        const subcommand = interaction.options.getSubcommand(false);

        // STOP
        if (subcommand === 'stop') {
            const user = interaction.options.getUser('user');

            const key = `${guild.id}:${user.id}`;

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

        // START
        const user = interaction.options.getUser('user');
        const key = `${guild.id}:${user.id}`;

        activeTargets.set(key, {
            guildId: guild.id,
            userId: user.id,
            startedBy: interaction.user.id
        });

        // If target is already in VC, disconnect immediately
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
            `Whenever they join a voice channel, they will be automatically disconnected.\n\n` +
            `Use \`/disconnect stop\` to stop it.`
        );
    },

    activeTargets
};
