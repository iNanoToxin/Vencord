import {User} from "discord-types/general";
import {Button, Forms, Menu, Text, TextInput} from "@webpack/common";
import {ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal} from "@utils/modal";
import {saveUserData} from "./data_store";
import {updateChannel} from "./util";


export function createPinMenuItem(user: User)
{
    return (
        <Menu.MenuItem
            id="vc-edit-user"
            label="Edit"
            color="brand"
            action={() => openModal(modalProps => createModal(modalProps, user))}
        />
    );
}

export function createModal(modalProps: ModalProps, {user}: any)
{
    let saved: string = "";

    const onSave = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();

        console.log("USER__lol", user);

        await saveUserData(user, {name: saved});
        updateChannel({user: user});
        modalProps.onClose();
    };

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{flexGrow: 1}}>Edit Username</Text>
            </ModalHeader>

            <form onSubmit={onSave}>
                <ModalContent className={"edit-username"}>
                    <Forms.FormSection>
                        <Forms.FormTitle>Custom Username</Forms.FormTitle>
                        <TextInput
                            onChange={input => {
                                saved = input;
                            }}
                        />
                    </Forms.FormSection>
                    <Forms.FormDivider/>
                </ModalContent>
                <ModalFooter>
                    <Button type="submit" onClick={onSave} disabled={false}>Save</Button>
                </ModalFooter>
            </form>
        </ModalRoot>
    );
}
