import {DataStore} from "@api/index";
import {UserStore} from "@webpack/common";
import {User} from "discord-types/general";

const DATA_STORE_KEY: string = "d80cdbf50d7ae7382327d4c06d72dd71401453c898e8ed5ff1e852e703406070";

export interface StoredData
{
    name: string;
}

export type StoredMap = Map<string, StoredData>;


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
    await DataStore.set(DATA_STORE_KEY + UserStore.getCurrentUser().id, data);
}

export async function loadData()
{
    let loaded = await DataStore.get<StoredMap>(DATA_STORE_KEY + UserStore.getCurrentUser().id);

    if (loaded)
    {
        data = loaded;
    }
}
