import {DataStore} from "@api/index";
import {UserStore} from "@webpack/common";
import {User} from "discord-types/general";

export interface StoredData
{
    name: string;
}

export type StoredMap = Map<string, StoredData>;


const RENAME_USERS_KEY = "RenameUsers";


let data: StoredMap = new Map<string, StoredData>();

export async function saveUserData(user: User, userData: StoredData)
{
    data.set(user.id, userData);
    await saveData();
}

export function getUserData(user: User)
{
    if (!user)
    {
        return;
    }
    return data.get(user.id);
}

export async function saveData()
{
    await DataStore.set(RENAME_USERS_KEY + UserStore.getCurrentUser().id, data);
}

export async function loadData()
{
    let loaded = await DataStore.get<StoredMap>(RENAME_USERS_KEY + UserStore.getCurrentUser().id);

    if (loaded)
    {
        data = loaded;
    }
}
