import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Manage automatic voice disconnect')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)

        .addSubcommand(sub =>
            sub
                .setName('start')
                .setDescription('Automatically disconnect a member when they join VC')
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

        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');

        if (!user) {
            return interaction.reply({
                content: '❌ Please select a user.',
                ephemeral: true
            });
        }

        // START
        if (subcommand === 'start') {
            interaction.client.disconnectTargets.set(
                guild.id,
                user.id
            );

            const member = await guild.members
                .fetch(user.id)
                .catch(() => null);

            // Disconnect immediately if already in VC
            if (member?.voice?.channel) {
                try {
                    await member.voice.disconnect(
                        `Automatic disconnect enabled by ${interaction.user.tag}`
                    );
                } catch (error) {
                    console.error('[Disconnect] Failed:', error);
                }
            }

            return interaction.reply({
                content:
                    `🔒 **Automatic disconnect enabled!**\n\n` +
                    `👤 Target: ${user}\n` +
                    `🔄 Whenever they join a voice channel, they will be automatically disconnected.\n\n` +
                    `🛑 Use \`/disconnect stop user:${user.username}\` to stop it.`,
                ephemeral: true
            });
        }

        // STOP
        if (subcommand === 'stop') {
            const currentTarget =
                interaction.client.disconnectTargets.get(guild.id);

            if (currentTarget !== user.id) {
                return interaction.reply({
                    content: `ℹ️ ${user} is not currently targeted.`,
                    ephemeral: true
                });
            }

            interaction.client.disconnectTargets.delete(guild.id);

            return interaction.reply({
                content: `🛑 **Automatic disconnect stopped for ${user}.**`,
                ephemeral: true
            });
        }
    }
};
