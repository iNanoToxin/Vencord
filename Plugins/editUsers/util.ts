import {Channel, Message, User} from "discord-types/general";
import {getCurrentChannel} from "@utils/discord";
import {FluxDispatcher, MessageStore} from "@webpack/common";
import {updateMessage} from "@api/MessageUpdater";

interface ChannelUpdateInfo
{
    user?: User;
    channel?: Channel;
}

export function updateChannel(info: ChannelUpdateInfo = {})
{
    const channel: Channel = info.channel ?? getCurrentChannel();

    if (channel)
    {
        MessageStore.getMessages(channel.id).forEach((message: Message) => {
            if (info.user)
            {
                if (info.user.id == message.author.id)
                {
                    updateMessage(channel.id, message.id);
                }
            }
            else
            {
                updateMessage(channel.id, message.id);
            }
        });

        FluxDispatcher.dispatch({
            type: "CHANNEL_TOGGLE_MEMBERS_SECTION"
        });
        FluxDispatcher.dispatch({
            type: "CHANNEL_TOGGLE_MEMBERS_SECTION"
        });
    }
}
