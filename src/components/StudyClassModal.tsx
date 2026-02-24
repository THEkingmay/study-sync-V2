import { Modal , Text } from "react-native";
import type { StudyType } from "../screens/TimetableScreen";

interface ModalProps{
    visible : boolean , 
    onClose : ()=>void ,
    onSuccess : ()=>void ,
    selectedClass? : StudyType // if edit 
}

export default function StudyClassModal({visible , onClose , onSuccess , selectedClass} : ModalProps){
    return(
        <Modal visible={visible}>
            <Text>
                TEST
            </Text>
        </Modal>
    )
}