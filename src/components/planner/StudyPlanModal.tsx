import { Modal, View , Text, Pressable} from "react-native";

interface StudyPlanModalProps {
    visible: boolean,
    onClose: () => void
}   

export default function StudyPlanModal( { visible, onClose }: StudyPlanModalProps) {
    return (
        <Modal visible={visible} onRequestClose={onClose} animationType="slide" transparent={true}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View>
                <Text>Study Plan Modal Content</Text>
            </View>
            <Pressable onPress={onClose} style={{ marginTop: 20, padding: 10, backgroundColor: 'white', borderRadius: 5 }}>
                <Text>Close</Text>
            </Pressable></View>
        </Modal>
    )
}