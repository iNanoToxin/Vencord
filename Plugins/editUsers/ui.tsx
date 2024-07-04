import {User} from "discord-types/general";
import {Button, Forms, Menu, Text, TextInput} from "@webpack/common";
import {ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal} from "@utils/modal";
import {saveUserData} from "./datastore";
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

export function createModal(modalProps: ModalProps, user: User)
{
    let saved: string = "not set";

    const onSave = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();

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
                            // value={dog}
                            onChange={e => {
                                saved = e;
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
