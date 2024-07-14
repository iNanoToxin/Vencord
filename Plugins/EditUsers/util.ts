import {Channel, Message, User} from "discord-types/general";
import {getCurrentChannel} from "@utils/discord";
import {MessageStore} from "@webpack/common";
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
    }
}
