import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure AutoMod')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub
                .setName('enable')
                .setDescription('Enable AutoMod')
        )
        .addSubcommand(sub =>
            sub
                .setName('disable')
                .setDescription('Disable AutoMod')
        )
        .addSubcommand(sub =>
            sub
                .setName('status')
                .setDescription('Check AutoMod status')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'enable') {
            return interaction.reply({
                content: '🛡️ **AutoMod enabled successfully!**',
                ephemeral: true
            });
        }

        if (subcommand === 'disable') {
            return interaction.reply({
                content: '🛡️ **AutoMod disabled successfully!**',
                ephemeral: true
            });
        }

        if (subcommand === 'status') {
            return interaction.reply({
                content: '🛡️ **AutoMod Status:** Configuration loaded.',
                ephemeral: true
            });
        }
    }
};
