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

        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Member to automatically disconnect')
                .setRequired(true)
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

        // Stop if already active
        if (activeTargets.has(key)) {
            activeTargets.delete(key);

            return interaction.reply({
                content: `🛑 Automatic disconnect stopped for ${user}.`
            });
        }

        activeTargets.set(key, {
            guildId: guild.id,
            userId: user.id,
            startedBy: interaction.user.id
        });

        // Disconnect immediately if already in VC
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

        return interaction.reply({
            content:
                `🔒 **Automatic disconnect enabled for ${user}.**\n\n` +
                `Whenever they join a voice channel, they will be automatically disconnected.\n` +
                `Run \`/disconnect user:${user.username}\` again to stop it.`
        });
    },

    activeTargets
};
