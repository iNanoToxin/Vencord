/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import {findGroupChildrenByChildId} from "@api/ContextMenu";
import {definePluginSettings} from "@api/Settings";
import {Devs} from "@utils/constants";
import definePlugin, {OptionType} from "@utils/types";
import {SelectedGuildStore, ChannelStore, GuildMemberStore, GuildChannelStore, MessageStore, FluxDispatcher, DraftStore} from "@webpack/common";
import {Channel, Message, User} from "discord-types/general";
import {getUserData, loadData} from "./datastore";
import {createPinMenuItem} from "./ui";
import {updateChannel} from "./util";
import {findByCodeLazy, findByPropsLazy, findComponentByCode, findStore, findStoreLazy} from "@webpack";


interface UserContextProps
{
    channel: Channel;
    guildId?: string;
    user: User;
}


const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "How to display usernames and nicks",
        options: [
            {label: "Username then nickname", value: "user-nick", default: true},
            {label: "Nickname then username", value: "nick-user"},
            {label: "Username only", value: "user"}
        ]
    },
    displayNames: {
        type: OptionType.BOOLEAN,
        description: "Use display names in place of usernames",
        default: false
    },
    inReplies: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Also apply functionality to reply previews"
    }
});

function notify(t: string, b: string)
{
    Vencord.Api.Notifications.showNotification({title: t, body: b});
}

function UserContext(children, {user}: UserContextProps)
{
    const container = findGroupChildrenByChildId("note", children);

    if (container)
    {
        const idx = container.findIndex(c => c?.props?.id === "note");
        // container.splice(idx, 0, createPinMenuItem(user));
        container.push(createPinMenuItem(user));
    }
};


const containsQuery = findByCodeLazy("length", "charCodeAt", "continue", "return", ":for", "===");

export default definePlugin({
    name: "_",
    description: "Set custom usernames locally.",
    authors: [Devs.Nobody],

    patches: [
        // TODO: Fix search in member list


        // Renders edited usernames in stream menu
        {
            find: "Messages.GUEST_NAME_SUFFIX):\"\")}",
            replacement: {
                // return getName(channel.getGuildId(), channel.id, participant.user)
                // return getSavedUsername(participant.user) || (__ORIGINAL_MATCH__)
                match: /(?:\w+\.)*?getName\(\w+\.getGuildId\(\),\w+\.id,(\w+\.user)\)/,
                replace: "$self.getSavedUsername($1) || ($&)"
            }
        },
        // Renders edited usernames in user inbox
        {
            find: "Messages.NOTIFICATION_CENTER_INCOMING_FRIEND_REQUEST_ACCEPTED",
            replacement: {
                //
                match: /(?<=return )null!==\(\w+=(\w+)\.body\)&&void 0!==\w+\?\w+:""/g,
                replace: "$self.getMessageBody($1) || ($&)"
            }
        },
        // Renders edited usernames in server members list
        {
            find: "Messages.MEMBER_SAFETY_TABLE_ADD_ROLES_TOOLTIP",
            replacement: {
                // name: getName(member.guildId, null, user)
                // name: getSavedUsername(user) || (__ORIGINAL_MATCH__)
                match: /(?<=name:).*?getName\(\w+\.guildId,null,(\w+)\)/,
                replace: "$self.getSavedUsername($1) || ($&)"
            }
        },
        // Renders edited usernames in reaction lists
        {
            find: "this.props.reaction",
            replacement: {
                // children: nickname
                // children: getSavedUsername(user) || (__ORIGINAL_MATCH__)
                match: /(?<=user:(\w+).*?guildId:(\w+).*?nickname,children:)\w+/,
                replace: "$self.applyRoleColor($self.getSavedUsername($1) || ($&), $1, $2)"
            }
        },
        // Renders edited usernames in the active now list
        {
            find: "__invalid_headerDetails",
            replacement: {
                // children: title
                // children: getSavedUsername(priorityUser.user) || (__ORIGINAL_MATCH__)
                match: /(?<=priorityUser:(\w+).*?__invalid_headerDetails.*?children:)\w+/,
                replace: "$self.getSavedUsername($1.user) || ($&)"
            }
        },
        // Renders edited usernames in the invite friend modal
        {
            find: "Messages.INVITE_FRIEND_MODAL_SENT",
            replacement: {
                // children: [..., getName(user), ...]
                // children: [..., getSavedUsername(user) || (__ORIGINAL_MATCH__), ...]
                match: /(?<=inviteRowName,children:\[).*?getName\((\w+)\)(?=,null)/,
                replace: "$self.getSavedUsername($1) || ($&)"
            }
        },
        // Renders edited usernames in threads
        {
            find: "ThreadEmptyMessage",
            replacement: {
                // name: nickname
                // name: getSavedUsername(user) || (__ORIGINAL_MATCH__)
                match: /(?<=user:(\w+).*?name:)\w+(?=,color)/,
                replace: "$self.getSavedUsername($1) || ($&)"
            }
        },
        // Renders edited usernames in the thread browser
        {
            find: "Messages.THREAD_BROWSER_LAST_ACTIVE_TIME.format",
            replacement: {
                // name: null !== ... getName(user)
                // name: getSavedUsername(user) || (__ORIGINAL_MATCH__)
                match: /(?<=user:(\w+).*?name:)null!==.*?(?=})/,
                replace: "$self.getSavedUsername($1) || ($&)"
            }
        },
        // Renders edited usernames in forum post titles
        {
            find: "useUsernameHook",
            replacement: {
                // name: nickname
                // name: getSavedUsername(user) || (__ORIGINAL_MATCH__)
                match: /(?<=user:(\w+).*?onContextMenu:\w+,name:)(\w+)/,
                replace: "$self.getSavedUsername($1) || ($&)"
            }
        },
        // Renders edited usernames in welcome messages
        {
            find: ".getSystemMessageUserJoin(",
            replacement: [
                {
                    // username: null != something ? something.nick : message.author.username
                    // username: getSavedUsername(message.author) || (__ORIGINAL_MATCH__)
                    match: /(?<=username:)null!=\w+\?\w+\.nick:(\w+\.author)\.username/g,
                    replace: "$self.getSavedUsername($1) || ($&)"
                },
                {
                    // username: user.nick
                    // username: getSavedUsername(user) || (__ORIGINAL_MATCH__)
                    match: /(?<=message:(\w+).*?username:)\w+\.nick/,
                    replace: "$self.getSavedUsername($1.author) || ($&)"
                }
            ],
            all: true,
            noWarn: true
        },
        // Renders edited usernames in direct messages list
        {
            find: "Messages.GROUP_DM_ALONE.format",
            replacement: [
                {
                    // null !== (nickname = getNickname(user.id)) && void 0 !== nickname ? nickname : getName(user)
                    // getSavedUsername(user) || (__ORIGINAL_MATCH__)
                    match: /null!==\(\w+=(?:\w+\.)*?getNickname\(\w+\.\w+\)\)&&void 0!==\w+\?\w+:(?:\w+\.)*?getName\((\w+)\)/g,
                    replace: "$self.getSavedUsername($1) || ($&)"
                },
                {
                    // null !== (name = null != nickname ? nickname : getName(user)) && void 0 !== name ? name : "???"
                    // getSavedUsername(user) || (__ORIGINAL_MATCH__)
                    match: /null!==.*?getName\((\w+)\).*?"\?\?\?"/,
                    replace: "$self.getSavedUsername($1) || ($&)"
                }
            ]
        },
        // Renders edited usernames in server boost messages
        {
            // nickname = user.nick
            // nickname = getSavedUsername(message.author) || (__ORIGINAL_MATCH__)
            find: "Messages.SYSTEM_MESSAGE_GUILD_MEMBER_SUBSCRIBED_HOOK.format",
            replacement: {
                match: /(?<=message:(\w+).*?)(?<=\w+=)\w+\.nick/,
                replace: "$self.getSavedUsername($1.author) || ($&)"
            }
        },
        // Renders edited usernames in messages
        {
            find: "?\"@\":\"\")+",
            replacement: {
                // children: (0, module.jsx)(module.Fragment, {children: (withMentionPrefix ? "@" : "") + nickname})
                // children: renderNameFromMessage(arguments[0].userOverride ?? arguments[0].message.author) || (__ORIGINAL_MATCH__)
                match: /(?<=onContextMenu:\w+,children:).*?\)(?=})/,
                replace: "$self.getSavedUsername(arguments[0].userOverride ?? arguments[0].message.author) || ($&)"
            }
        },
        // Renders edited usernames in voice chat channels
        {
            find: "renderPrioritySpeaker",
            replacement: {
                // null != nickname ? nickname : getName(user)
                // getSavedUsername(user) || (__ORIGINAL_MATCH__)
                match: /null!=.*?getName\((\w+)\)/,
                replace: "$self.getSavedUsername($1) || ($&)"
            }
        },
        // Renders edited usernames in mutual friends lists
        {
            find: "__invalid_username,",
            replacement: [
                {
                    // primary: user_tag_or_username_or_nickname_or_name
                    // primary: (!forceUsername && getSavedUsername(user)) || (__ORIGINAL_MATCH__)
                    match: /(?<=user:(\w+).*?forceUsername:(\w+).*?primary:)\w+(?=,secondary)/,
                    replace: "(!$2 && $self.getSavedUsername($1)) || ($&)"
                },
                {
                    // name: username_or_nickname_or_name
                    // name: (!forceUsername && getSavedUsername(user)) || (__ORIGINAL_MATCH__)
                    match: /(?<=user:(\w+).*?forceUsername:(\w+).*?name:)\w+(?=,botType)/,
                    replace: "(!$2 && $self.getSavedUsername($1)) || ($&)"
                }
            ]
        },
        // Renders edited usernames in user profiles
        {
            find: "userTag,usernameClass",
            replacement: {
                // children: nickname
                // children: getSavedUsername(user) || (__ORIGINAL_MATCH__)
                match: /(?<=user:(\w+).*?Heading.*?children:)\w+/,
                replace: "$self.getSavedUsername($1) || ($&)"
            }
        },
        // Renders edited usernames in member lists
        {
            find: "onContextMenu:this.renderUserContextMenu,",
            replacement: {
                // {..., user: user, currentUser: currentUser, nick: nickname, ...}
                // {..., nick: getSavedUsername(user) || (__ORIGINAL_MATCH__), ...}
                match: /(?<=user:(\w+),currentUser:\w+,nick:)\w+/,
                replace: "$self.getSavedUsername($1) || ($&)"
            }
        },
        // Renders edited usernames in channel permissions
        {
            find: "Messages.OVERWRITE_AUTOCOMPLETE_A11Y_LABEL",
            replacement: [
                {
                    // children: nickname_or_username
                    // children: applyRoleColor(getSavedUsername(user) || (__ORIGINAL_MATCH__), user, guildId)
                    match: /(?<=guildId:(\w+),channelId:\w+,user:(\w+).*?userRowText.*?children:)\w+/,
                    replace: "$self.applyRoleColor($self.getSavedUsername($2) || ($&), $2, $1)"
                },
                {
                    // null != nickname || user.hasAvatarForGuild(guildId)
                    // getSavedUsername(user) || (__ORIGINAL_MATCH__)
                    match: /(?<=guildId:\w+,channelId:\w+,user:(\w+).*?)null!=\w+\|\|\w+\.hasAvatarForGuild\(\w+\)/,
                    replace: "$self.getSavedUsername($1) || ($&)"
                }
            ]
        },
        // Renders edited usernames in server role settings
        {
            find: "Messages.ROLE_REMOVE_MEMBER_MANAGED",
            replacement: {
                // name: member.name
                // name: getSavedUsername(member) || (__ORIGINAL_MATCH__)
                match: /(?<=avatarURL,name:)(\w+)\.name/,
                replace: "$self.getSavedUsername($1) || ($&)"
            }
        },
        // Renders edited usernames in @ mentions
        {
            find: "location:\"UserMention",
            replacement: {
                // children: "@".concat(null != nickname ? nickname : name)
                // children: "@".concat(getSavedUsername(user) || (__ORIGINAL_MATCH__))
                match: /(?<=user:(\w+).*?)(?<=children:"@"\.concat\()null!=.*?(?=\))/,
                replace: "$self.getSavedUsername($1) || ($&)"
            }
        },
        // Renders edited usernames in mentions lists
        {
            find: "AutocompleteRow: renderContent must be extended",
            replacement: [
                {
                    // (0, module.jsx)(module.BR, {children: ...})
                    // (0, module.jsx)(module.Fragment, {children: ...})
                    match: /(?<=children:\(0,(\w+).jsx\)\()\w+\.\w+(?=,{children:null!=.*?getName\(\w+\))/,
                    replace: "$1.Fragment"
                },
                {
                    // children: null != nickname ? nickname : getName(user)
                    // children: applyRoleColor(getSavedUsername(user) || (__ORIGINAL_MATCH__), user, guildId, {fontSize: 16})
                    match: /(?<=let{.*?guildId:(\w+)}.*?)(?<=children:)null!=.*?getName\((\w+)\)/,
                    replace: "$self.applyRoleColor($self.getSavedUsername($2) || ($&), $2, $1, {fontSize: 16})"
                }
            ]
        },
        // Renders edited usernames in search options
        {
            find: "\"display-username-\".concat",
            replacement: {
                // nickname = null !== ... getNick(channel, user.id) ... getName(user)
                // nickname = applyRoleColor(getSavedUsername(user) || (__ORIGINAL_MATCH__), user)
                match: /null!==.*?getNick\(\w+,\w+\.id\).*?getName\((\w+)\)/,
                replace: "$self.applyRoleColor($self.getSavedUsername($1) || ($&), $1)"
            }
        },
        // Renders edited usernames on reaction hover
        {
            find: "Messages.REACTION_TOOLTIP_1_N_INTERACTIVE",
            replacement: {
                // user => getName(guildId, null == channel ? void 0 : channel.id, user)
                // user => (getSavedUsername(user) || (__ORIGINAL_MATCH__))
                match: /(?<=map\((\w+)=>).*?getName\(.*?\)/,
                replace: "($self.getSavedUsername($1) || ($&))"
            }
        },
        // Allows you to search for edited usernames in mentions list
        {
            find: "username.toLocaleLowerCase",
            replacement: [
                {
                    // username.substring(0, query.length) === query
                    // __ORIGINAL_MATCH__ || startsWithQuery(user, query) ...
                    match: /(?<=\w+===(\w+)\.id\|\|).*?===(\w+)/,
                    replace: "$& || $self.startsWithQuery($1, $2)"
                },
                {
                    // partialMatches < 50 && (...)
                    // partialMatches < 50 && (containsQuery(user, query) || ...)
                    match: /\w+<\d+&&\((?=\w+\(\)\((\w+).*?record:(\w+))/,
                    replace: "$& $self.containsQuery($2, $1) ||"
                }
            ]
        },
        // Allows you to search for edited usernames in server role settings
        {
            find: "userTag.toLowerCase",
            replacement: {
                // return member.id === query || ...
                // return member.id === query || containsQuery(member, query) || ...
                match: /(?<=return )(\w+)\.id===(\w+)/,
                replace: "$& || $self.containsQuery($1, $2)"
            }
        },
        // Allows you to search for edited usernames in advanced permissions
        {
            find: "Messages.REMOVE_ROLE_OR_USER.format",
            replacement: {
                // regex_test(user.username.toLowerCase())
                // regex_test(user, "user") :: regex_test -> queryWrapper
                match: /(?<=onFilterResults.*?&&\w+\()(\w+)\.username\.toLowerCase\(\)(?=\))/,
                replace: "$1, \"user\""
            }
        },
        {
            find: "this.memoizedGetRows",
            replacement: {
                // regex_test = input => regex.test(input)
                // regex_test = queryWrapper(query)
                match: /\w+=>\w+\.test\(\w+\)/,
                replace: "$self.queryWrapper(this.state.query)"
            }
        }
    ],

    settings,
    contextMenus: {
        "user-context": UserContext
    },


    getMessageBody(item: any)
    {
        const name = this.getSavedUsername(item.other_user)?.replace(/([\\`*_{}\[\]<>()#+\-.!|])/g, "\\$1");

        /*
        DONE: FRIEND_REQUEST_ACCEPTED       = "friend_request_accepted"
              FRIEND_REQUEST_PENDING        = "friend_request_pending"
              FRIEND_SUGGESTION_CREATED     = "friend_suggestion_created"
              FRIEND_REQUEST_REMINDER       = "friend_request_reminder"
              DM_FRIEND_NUDGE               = "dm_friend_nudge"
              RECENT_MENTION                = "recent_mention"
              REPLY_MENTION                 = "reply_mention"
              GUILD_SCHEDULED_EVENT_STARTED = "scheduled_guild_event_started"
              SYSTEM_DEMO                   = "system_demo"
              MISSED_MESSAGES               = "missed_messages"
              TOP_MESSAGES                  = "top_messages"
              LIFECYCLE_ITEM                = "lifecycle_item"
              TRENDING_CONTENT              = "trending_content"
        */

        if (!name)
        {
            return null;
        }

        switch (item.type)
        {
            case "trending_content":
            {
                return item.body.replace(/(?<=\*\*).*(?= and \d+ others\*\*)/, name);
            }
            case "friend_request_accepted":
            {
                return item.body.replace(/(?<=\*\*).*(?=\*\*)/, name);
            }
            default:
            {
                console.log(item);
                console.log(item.body);
                return null;
            }
        }
    },


    applyRoleColor(text: String, user: User, guildId?: string, styles?: any)
    {
        guildId = guildId ?? SelectedGuildStore.getGuildId();

        if (!guildId)
        {
            return text;
        }

        const guildMember = GuildMemberStore.getMember(guildId!, user.id);
        const colorStyle = {color: guildMember?.colorString};

        return <span style={{...colorStyle, ...styles}}>{text}</span>;
    },
    getSavedUsername(user: User): string | undefined
    {
        return getUserData(user)?.name;
        // return "__TEST__";
        // return getUserData(user)?.name ?? "__TEST__";
    },
    startsWithQuery(user: User, query: string)
    {
        return this.getSavedUsername(user)?.toLocaleLowerCase().startsWith(query);
    },
    containsQuery(user: User, query: string)
    {
        const name = this.getSavedUsername(user);
        return name && containsQuery(query, name.toLocaleLowerCase());
    },
    queryWrapper(query: string)
    {
        query = query?.trim().toLowerCase();

        return (user: any, type?: string) => {
            if (user && query)
            {
                if (type === "user")
                {
                    const username = user.username.toLowerCase();
                    return this.startsWithQuery(user, query) || this.containsQuery(user, query) || username.startsWith(query) || containsQuery(query, username);
                }
                // regular string
                return user.toLowerCase().startsWith(query) || containsQuery(query, user.toLowerCase());
            }
            return true;
        };
    },


    async start()
    {
        // notify("notify", "RenameUsers started");
        console.log("RenameUsers started");


        await loadData();
        updateChannel();
    }
});
