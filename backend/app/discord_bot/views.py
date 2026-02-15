from __future__ import annotations

import discord


class ConfirmSkipView(discord.ui.View):
    """Asks the user whether to skip a failed parse (due_date or CTI) or cancel."""

    def __init__(self, field_name: str):
        super().__init__(timeout=60)
        self.value: bool | None = None
        self.field_name = field_name

    @discord.ui.button(label="Create without it", style=discord.ButtonStyle.primary)
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.value = True
        self.stop()
        await interaction.response.edit_message(
            content=f"Continuing without {self.field_name}.", view=None
        )

    @discord.ui.button(label="Cancel", style=discord.ButtonStyle.secondary)
    async def cancel(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.value = False
        self.stop()
        await interaction.response.edit_message(
            content="Ticket creation cancelled.", view=None
        )

    async def on_timeout(self) -> None:
        self.value = False
        self.stop()


class PaginatedTicketsView(discord.ui.View):
    """Paginated view for /assigned results with >4 tickets."""

    def __init__(self, embeds: list[discord.Embed], per_page: int = 4):
        super().__init__(timeout=120)
        self.embeds = embeds
        self.per_page = per_page
        self.page = 0
        self.max_page = max(0, len(embeds) - 1)
        self._update_buttons()

    def _update_buttons(self) -> None:
        self.prev_button.disabled = self.page == 0
        self.next_button.disabled = self.page >= self.max_page

    @discord.ui.button(label="Previous", style=discord.ButtonStyle.secondary)
    async def prev_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.page = max(0, self.page - 1)
        self._update_buttons()
        await interaction.response.edit_message(embed=self.embeds[self.page], view=self)

    @discord.ui.button(label="Next", style=discord.ButtonStyle.primary)
    async def next_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.page = min(self.max_page, self.page + 1)
        self._update_buttons()
        await interaction.response.edit_message(embed=self.embeds[self.page], view=self)

    async def on_timeout(self) -> None:
        for item in self.children:
            if isinstance(item, discord.ui.Button):
                item.disabled = True
